import prisma from "../db";
import { AuditService } from "./audit.service";

export interface CreateCourseData {
    code: string;
    name: string;
    description?: string;
}

export interface UpdateCourseData {
    code?: string;
    name?: string;
    description?: string;
}

export class CourseService {
    // ... rest of the service methods
    static async getAllCourses(page: number = 1, limit: number = 10, search?: string) {
        const skip = (page - 1) * limit;

        const where: any = {};

        if (search) {
            where.OR = [
                { code: { contains: search, mode: "insensitive" } },
                { name: { contains: search, mode: "insensitive" } },
            ];
        }

        const [courses, total] = await Promise.all([
            prisma.course.findMany({
                skip,
                take: limit,
                where,
                orderBy: {
                    code: "asc",
                },
                include: {
                    _count: {
                        select: {
                            students: true,
                            subjects: true,
                        },
                    },
                },
            }),
            prisma.course.count({ where }),
        ]);

        return {
            courses,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    static async getCourseByCode(code: string) {
        return await prisma.course.findUnique({
            where: { code }
        });
    }

    static async getCourseById(id: string) {
        return await prisma.course.findUnique({
            where: { id },
            include: {
                subjects: true,
                _count: {
                    select: {
                        students: true,
                        subjects: true,
                    },
                },
            },
        });
    }

    static async createCourse(data: CreateCourseData, userId?: string) {
        const result = await prisma.course.create({
            data: {
                code: data.code,
                name: data.name,
                description: data.description,
            },
        });

        if (userId) {
            await AuditService.log(userId, "CREATE_COURSE", "Course", result.id, {
                code: result.code,
                name: result.name
            });
        }

        return result;
    }

    static async updateCourse(id: string, data: UpdateCourseData, userId?: string) {
        const existing = await prisma.course.findUnique({
            where: { id }
        });

        if (!existing) {
            throw new Error("Course not found");
        }

        const result = await prisma.course.update({
            where: { id },
            data,
        });

        if (userId) {
            const changes: any = {};
            if (data.code && data.code !== existing.code) changes.code = { from: existing.code, to: data.code };
            if (data.name && data.name !== existing.name) changes.name = { from: existing.name, to: data.name };
            if (data.description !== undefined && data.description !== existing.description) changes.description = { from: existing.description, to: data.description };

            if (Object.keys(changes).length > 0) {
                await AuditService.log(userId, "UPDATE_COURSE", "Course", id, changes);
            }
        }

        return result;
    }

    static async deleteCourse(id: string, force: boolean = false, userId?: string) {
        if (force) {
            const result = await prisma.$transaction(async (tx) => {
                // ... same force delete logic ...
                const subjects = await tx.subject.findMany({
                    where: { courseId: id },
                    select: { id: true },
                });
                const subjectIds = subjects.map((s) => s.id);

                await tx.grade.deleteMany({
                    where: { subjectId: { in: subjectIds } },
                });

                await tx.subjectReservation.deleteMany({
                    where: { subjectId: { in: subjectIds } },
                });

                await tx.subject.deleteMany({
                    where: { courseId: id },
                });

                await tx.student.updateMany({
                    where: { courseId: id },
                    data: { courseId: null },
                });

                return await tx.course.delete({
                    where: { id },
                });
            });

            if (userId) {
                await AuditService.log(userId, "DELETE_COURSE", "Course", id, {
                    code: result.code,
                    force: "Yes"
                });
            }

            return result;
        }

        // Standard delete: only if no students
        const courseWithDeps = await prisma.course.findFirst({
            where: {
                id: id,
                OR: [
                    { students: { some: {} } },
                    { subjects: { some: {} } },
                ],
            },
            select: { id: true, code: true },
        });

        if (courseWithDeps) {
            const error: any = new Error(`Cannot delete course ${courseWithDeps.code} because it has students or subjects.`);
            error.code = "PREREQUISITE_FAILED";
            throw error;
        }

        const result = await prisma.course.delete({
            where: { id },
        });

        if (userId) {
            await AuditService.log(userId, "DELETE_COURSE", "Course", id, {
                code: result.code,
                force: "No"
            });
        }

        return result;
    }

    static async deleteCourses(ids: string[], force: boolean = false, userId?: string) {
        if (force) {
            const result = await prisma.$transaction(async (tx) => {
                const subjects = await tx.subject.findMany({
                    where: { courseId: { in: ids } },
                    select: { id: true },
                });
                const subjectIds = subjects.map((s) => s.id);

                await tx.grade.deleteMany({
                    where: { subjectId: { in: subjectIds } },
                });

                await tx.subjectReservation.deleteMany({
                    where: { subjectId: { in: subjectIds } },
                });

                await tx.subject.deleteMany({
                    where: { courseId: { in: ids } },
                });

                await tx.student.updateMany({
                    where: { courseId: { in: ids } },
                    data: { courseId: null },
                });

                const delResult = await tx.course.deleteMany({
                    where: { id: { in: ids } },
                });
                return { deletedCount: delResult.count, skippedCount: 0, skippedCodes: [] };
            });

            if (userId) {
                await AuditService.log(userId, "DELETE_COURSES", "Course", "bulk", {
                    count: result.deletedCount,
                    ids,
                    force: "Yes"
                });
            }

            return result;
        }

        // Standard delete: skip courses with deputies
        const coursesWithDeps = await prisma.course.findMany({
            where: {
                id: { in: ids },
                OR: [
                    { students: { some: {} } },
                    { subjects: { some: {} } },
                ],
            },
            select: { id: true, code: true },
        });

        const idsWithDeps = coursesWithDeps.map((c) => c.id);
        const idsToDelete = ids.filter((id) => !idsWithDeps.includes(id));

        let deletedCount = 0;
        if (idsToDelete.length > 0) {
            const res = await prisma.course.deleteMany({
                where: { id: { in: idsToDelete } },
            });
            deletedCount = res.count;
        }

        if (userId && deletedCount > 0) {
            await AuditService.log(userId, "DELETE_COURSES", "Course", "bulk", {
                deletedCount,
                skippedCount: coursesWithDeps.length,
                skippedCodes: coursesWithDeps.map((c) => c.code),
                force: "No"
            });
        }

        return {
            deletedCount,
            skippedCount: coursesWithDeps.length,
            skippedCodes: coursesWithDeps.map((c) => c.code),
        };
    }
}
