import prisma from "../db";

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

    static async getSubjectsByCourse(courseId: string) {
        return await prisma.subject.findMany({
            where: { courseId },
            orderBy: { code: "asc" },
        });
    }

    static async createSubject(data: CreateSubjectData) {
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

        return await prisma.subject.create({
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
    }

    static async updateSubject(id: string, data: UpdateSubjectData) {
        if (data.title) {
            const existing = await prisma.subject.findUnique({ where: { id } });
            if (existing) {
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
        }

        return await prisma.subject.update({
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
    }

    static async deleteSubject(id: string, force: boolean = false) {
        if (force) {
            return await prisma.$transaction(async (tx) => {
                await tx.grade.deleteMany({
                    where: { subjectId: id },
                });
                await tx.subjectReservation.deleteMany({
                    where: { subjectId: id },
                });
                return await tx.subject.delete({
                    where: { id },
                });
            });
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

        return await prisma.subject.delete({
            where: { id },
        });
    }

    static async deleteSubjects(ids: string[], force: boolean = false) {
        if (force) {
            // Force delete: remove dependencies first
            await prisma.$transaction([
                prisma.grade.deleteMany({
                    where: { subjectId: { in: ids } },
                }),
                prisma.subjectReservation.deleteMany({
                    where: { subjectId: { in: ids } },
                }),
                prisma.subject.deleteMany({
                    where: { id: { in: ids } },
                }),
            ]);

            return {
                deletedCount: ids.length,
                skippedCount: 0,
                skippedCodes: [],
            };
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
            const result = await prisma.subject.deleteMany({
                where: { id: { in: idsToDelete } },
            });
            deletedCount = result.count;
        }

        return {
            deletedCount,
            skippedCount: subjectsWithDeps.length,
            skippedCodes: subjectsWithDeps.map((s) => s.code),
        };
    }
}
