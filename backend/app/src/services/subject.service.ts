import prisma from "../db";
import { AuditService } from "./audit.service";

export interface CreateSubjectData {
    courseId: string;
    code: string;
    title: string;
    units: number;
}

export interface UpdateSubjectData {
    code?: string;
    title?: string;
    units?: number;
}

export class SubjectService {
    // ... rest of the service methods
    static async getAllSubjects(page: number = 1, limit: number = 10, search?: string, courseId?: string) {
        const skip = (page - 1) * limit;

        const where: any = {};

        if (search) {
            const searchParts = search.split(/\s+/).map(p => p.trim()).filter(p => p.length > 0);

            if (searchParts.length > 1) {
                where.OR = [
                    { code: { contains: search, mode: "insensitive" } },
                    { title: { contains: search, mode: "insensitive" } },
                    {
                        AND: searchParts.map(part => ({
                            OR: [
                                { code: { contains: part, mode: "insensitive" } },
                                { title: { contains: part, mode: "insensitive" } },
                            ]
                        }))
                    }
                ];
            } else {
                where.OR = [
                    { code: { contains: search, mode: "insensitive" } },
                    { title: { contains: search, mode: "insensitive" } },
                ];
            }
        }

        if (courseId) {
            if (courseId.includes(",")) {
                where.courseId = { in: courseId.split(",") };
            } else {
                where.courseId = courseId;
            }
        }

        const [subjects, total] = await Promise.all([
            prisma.subject.findMany({
                skip,
                take: limit,
                where,
                include: {
                    course: true,
                    _count: {
                        select: {
                            subjectReservations: true,
                            grades: true,
                        },
                    },
                },
                orderBy: [
                    { course: { code: "asc" } },
                    { code: "asc" },
                ],
            }),
            prisma.subject.count({ where }),
        ]);

        return {
            subjects,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    static async getSubjectsByCourse(courseId: string) {
        return await prisma.subject.findMany({
            where: { courseId },
            orderBy: { code: "asc" },
            include: {
                _count: {
                    select: {
                        subjectReservations: true,
                        grades: true
                    }
                }
            }
        });
    }

    static async getSubjectById(id: string) {
        return await prisma.subject.findUnique({
            where: { id },
            include: {
                course: true,
                _count: {
                    select: {
                        subjectReservations: true,
                        grades: true,
                    },
                },
            },
        });
    }

    static async checkSubjectAvailability(courseId: string, code: string, title: string, excludeId?: string) {
        const [existingCode, existingTitle] = await Promise.all([
            prisma.subject.findFirst({
                where: {
                    courseId,
                    code: { equals: code.toUpperCase() },
                    ...(excludeId && { id: { not: excludeId } })
                }
            }),
            prisma.subject.findFirst({
                where: {
                    courseId,
                    title: { equals: title, mode: "insensitive" },
                    ...(excludeId && { id: { not: excludeId } })
                }
            })
        ]);

        return {
            codeExists: !!existingCode,
            titleExists: !!existingTitle
        };
    }

    static async createSubject(data: CreateSubjectData, userId?: string) {
        // Validation: Unique by (courseId, title)
        const existingTitle = await prisma.subject.findFirst({
            where: {
                courseId: data.courseId,
                title: { equals: data.title, mode: "insensitive" }
            }
        });

        if (existingTitle) {
            throw new Error(`Subject with title "${data.title}" already exists for this course.`);
        }

        const result = await prisma.subject.create({
            data: {
                courseId: data.courseId,
                code: data.code.toUpperCase(),
                title: data.title,
                units: data.units,
            },
            include: {
                course: true,
            },
        });

        if (userId) {
            await AuditService.log(userId, "CREATE_SUBJECT", "Subject", result.id, {
                code: result.code,
                title: result.title,
                course: result.course.code
            });
        }

        return result;
    }

    static async updateSubject(id: string, data: UpdateSubjectData, userId?: string) {
        const existing = await prisma.subject.findUnique({
            where: { id },
            include: { course: true }
        });

        if (!existing) {
            throw new Error("Subject not found");
        }

        if (data.title) {
            const duplicate = await prisma.subject.findFirst({
                where: {
                    courseId: existing.courseId,
                    title: { equals: data.title, mode: "insensitive" },
                    id: { not: id }
                }
            });
            if (duplicate) {
                throw new Error(`Another subject with title "${data.title}" already exists for this course.`);
            }
        }

        const result = await prisma.subject.update({
            where: { id },
            data: {
                ...(data.code && { code: data.code.toUpperCase() }),
                ...(data.title && { title: data.title }),
                ...(data.units !== undefined && { units: data.units }),
            },
            include: {
                course: true,
            },
        });

        if (userId) {
            const changes: any = {};
            if (data.code && data.code.toUpperCase() !== existing.code) changes.code = { from: existing.code, to: data.code.toUpperCase() };
            if (data.title && data.title !== existing.title) changes.title = { from: existing.title, to: data.title };
            if (data.units !== undefined && data.units !== existing.units) changes.units = { from: existing.units, to: data.units };

            if (Object.keys(changes).length > 0) {
                await AuditService.log(userId, "UPDATE_SUBJECT", "Subject", id, changes);
            }
        }

        return result;
    }

    static async deleteSubject(id: string, force: boolean = false, userId?: string) {
        if (force) {
            const result = await prisma.$transaction(async (tx) => {
                await tx.grade.deleteMany({
                    where: { subjectId: id },
                });
                await tx.subjectReservation.deleteMany({
                    where: { subjectId: id },
                });
                return await tx.subject.delete({
                    where: { id },
                    include: { course: true }
                });
            });

            if (userId) {
                await AuditService.log(userId, "DELETE_SUBJECT", "Subject", id, {
                    code: result.code,
                    force: "Yes"
                });
            }

            return result;
        }

        // Check for dependencies (Reservations or Grades)
        const subjectWithDeps = await prisma.subject.findFirst({
            where: {
                id: id,
                OR: [
                    { subjectReservations: { some: {} } },
                    { grades: { some: {} } },
                ],
            },
            select: { code: true },
        });

        if (subjectWithDeps) {
            const error: any = new Error(`Cannot delete subject ${subjectWithDeps.code} because students are currently enrolled.`);
            error.code = "PREREQUISITE_FAILED";
            throw error;
        }

        const result = await prisma.subject.delete({
            where: { id },
        });

        if (userId) {
            await AuditService.log(userId, "DELETE_SUBJECT", "Subject", id, {
                code: result.code,
                force: "No"
            });
        }

        return result;
    }

    static async deleteSubjects(ids: string[], force: boolean = false, userId?: string) {
        if (force) {
            const result = await prisma.$transaction(async (tx) => {
                await tx.grade.deleteMany({
                    where: { subjectId: { in: ids } },
                });
                await tx.subjectReservation.deleteMany({
                    where: { subjectId: { in: ids } },
                });
                const delResult = await tx.subject.deleteMany({
                    where: { id: { in: ids } },
                });
                return { deletedCount: delResult.count, skippedCount: 0, skippedCodes: [] };
            });

            if (userId) {
                await AuditService.log(userId, "DELETE_SUBJECTS", "Subject", "bulk", {
                    count: result.deletedCount,
                    ids,
                    force: "Yes"
                });
            }

            return result;
        }

        // Standard delete: skip subjects with dependencies
        const subjectsWithDeps = await prisma.subject.findMany({
            where: {
                id: { in: ids },
                OR: [
                    { subjectReservations: { some: {} } },
                    { grades: { some: {} } },
                ],
            },
            select: { id: true, code: true },
        });

        const idsWithDeps = subjectsWithDeps.map((s) => s.id);
        const idsToDelete = ids.filter((id) => !idsWithDeps.includes(id));

        let deletedCount = 0;
        if (idsToDelete.length > 0) {
            const res = await prisma.subject.deleteMany({
                where: { id: { in: idsToDelete } },
            });
            deletedCount = res.count;
        }

        if (userId && deletedCount > 0) {
            await AuditService.log(userId, "DELETE_SUBJECTS", "Subject", "bulk", {
                deletedCount,
                skippedCount: subjectsWithDeps.length,
                skippedCodes: subjectsWithDeps.map((s) => s.code),
                force: "No"
            });
        }

        return {
            deletedCount,
            skippedCount: subjectsWithDeps.length,
            skippedCodes: subjectsWithDeps.map((s) => s.code),
        };
    }
}
