import prisma from "../db";

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

    static async createCourse(data: CreateCourseData) {
        return await prisma.course.create({
            data: {
                code: data.code,
                name: data.name,
                description: data.description,
            },
        });
    }

    static async updateCourse(id: string, data: UpdateCourseData) {
        return await prisma.course.update({
            where: { id },
            data,
        });
    }

    static async deleteCourse(id: string, force: boolean = false) {
        if (force) {
            return await prisma.$transaction(async (tx) => {
                // 1. Get all subjects for this course
                const subjects = await tx.subject.findMany({
                    where: { courseId: id },
                    select: { id: true },
                });
                const subjectIds = subjects.map((s) => s.id);

                // 2. Delete all grades for these subjects
                await tx.grade.deleteMany({
                    where: { subjectId: { in: subjectIds } },
                });

                // 3. Delete all subject reservations for these subjects
                await tx.subjectReservation.deleteMany({
                    where: { subjectId: { in: subjectIds } },
                });

                // 4. Delete all subjects
                await tx.subject.deleteMany({
                    where: { courseId: id },
                });

                // 5. Unenroll all students (set courseId to null instead of deleting)
                await tx.student.updateMany({
                    where: { courseId: id },
                    data: { courseId: null },
                });

                // 6. Finally delete the course
                return await tx.course.delete({
                    where: { id },
                });
            });
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
            select: { code: true },
        });

        if (courseWithDeps) {
            const error: any = new Error(`Cannot delete course ${courseWithDeps.code} because it has students or subjects.`);
            error.code = "PREREQUISITE_FAILED";
            throw error;
        }

        return await prisma.course.delete({
            where: { id },
        });
    }

    static async deleteCourses(ids: string[], force: boolean = false) {
        if (force) {
            return await prisma.$transaction(async (tx) => {
                // 1. Get all subjects for these courses
                const subjects = await tx.subject.findMany({
                    where: { courseId: { in: ids } },
                    select: { id: true },
                });
                const subjectIds = subjects.map((s) => s.id);

                // 2. Delete all grades
                await tx.grade.deleteMany({
                    where: { subjectId: { in: subjectIds } },
                });

                // 3. Delete all reservations
                await tx.subjectReservation.deleteMany({
                    where: { subjectId: { in: subjectIds } },
                });

                // 4. Delete all subjects
                await tx.subject.deleteMany({
                    where: { courseId: { in: ids } },
                });

                // 5. Unenroll all students (set courseId to null instead of deleting)
                await tx.student.updateMany({
                    where: { courseId: { in: ids } },
                    data: { courseId: null },
                });

                // 6. Delete courses
                const result = await tx.course.deleteMany({
                    where: { id: { in: ids } },
                });
                return { deletedCount: result.count, skippedCount: 0, skippedCodes: [] };
            });
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
            const result = await prisma.course.deleteMany({
                where: { id: { in: idsToDelete } },
            });
            deletedCount = result.count;
        }

        return {
            deletedCount,
            skippedCount: coursesWithDeps.length,
            skippedCodes: coursesWithDeps.map((c) => c.code),
        };
    }
}
