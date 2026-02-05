import prisma from "../db";
import { AuditService } from "./audit.service";

export interface CreateGradeData {
    studentId: string;
    subjectId: string;
    courseId: string;
    prelim?: number | null;
    midterm?: number | null;
    finals?: number | null;
    remarks?: string;
    encodedByUserId: string;
}

export interface UpdateGradeData {
    prelim?: number | null;
    midterm?: number | null;
    finals?: number | null;
    remarks?: string;
    encodedByUserId?: string;
}

function calculateFinalGrade(prelim?: number | null, midterm?: number | null, finals?: number | null): number | null {
    if (prelim == null || midterm == null || finals == null) {
        return null;
    }
    // Common grading: 30% prelim, 30% midterm, 40% finals
    return (prelim * 0.3) + (midterm * 0.3) + (finals * 0.4);
}

export class GradeService {
    static async getAllGrades(page: number = 1, limit: number = 10, courseId?: string, subjectId?: string, search?: string) {
        const skip = (page - 1) * limit;

        const where: any = {};

        if (courseId) {
            if (courseId.includes(",")) {
                where.courseId = { in: courseId.split(",") };
            } else {
                where.courseId = courseId;
            }
        }

        if (subjectId) {
            where.subjectId = subjectId;
        }

        if (search) {
            const searchParts = search.trim().split(/\s+/);
            if (searchParts.length > 1) {
                // If multiple words, try matching first name and last name combinations
                where.AND = searchParts.map(part => ({
                    OR: [
                        { student: { firstName: { contains: part, mode: "insensitive" } } },
                        { student: { lastName: { contains: part, mode: "insensitive" } } },
                        { student: { studentNo: { contains: part, mode: "insensitive" } } },
                        { course: { name: { contains: part, mode: "insensitive" } } },
                        { course: { code: { contains: part, mode: "insensitive" } } },
                    ]
                }));
            } else {
                where.OR = [
                    { student: { firstName: { contains: search, mode: "insensitive" } } },
                    { student: { lastName: { contains: search, mode: "insensitive" } } },
                    { student: { studentNo: { contains: search, mode: "insensitive" } } },
                    { course: { name: { contains: search, mode: "insensitive" } } },
                    { course: { code: { contains: search, mode: "insensitive" } } },
                ];
            }
        }

        const [grades, total] = await Promise.all([
            prisma.grade.findMany({
                skip,
                take: limit,
                where,
                include: {
                    student: true,
                    subject: true,
                    course: true,
                    encoder: {
                        select: { id: true, email: true },
                    },
                },
                orderBy: [
                    { student: { lastName: "asc" } },
                    { subject: { code: "asc" } },
                ],
            }),
            prisma.grade.count({ where }),
        ]);

        return {
            grades,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    static async getGradesByStudent(studentId: string) {
        return await prisma.grade.findMany({
            where: { studentId },
            include: {
                subject: true,
                course: true,
            },
            orderBy: { subject: { code: "asc" } },
        });
    }

    static async getGradesBySubject(subjectId: string) {
        return await prisma.grade.findMany({
            where: { subjectId },
            include: {
                student: true,
                course: true,
            },
            orderBy: { student: { lastName: "asc" } },
        });
    }

    static async getGradeById(id: string) {
        return await prisma.grade.findUnique({
            where: { id },
            include: {
                student: true,
                subject: true,
                course: true,
                encoder: {
                    select: { id: true, email: true },
                },
            },
        });
    }

    static async createGrade(data: CreateGradeData) {
        // Validation: course_id should match the student’s course
        const student = await prisma.student.findUnique({
            where: { id: data.studentId },
            select: { courseId: true }
        });

        if (!student) {
            throw new Error("Student not found");
        }

        if (student.courseId !== data.courseId) {
            throw new Error("Cannot encode grade: Course mismatch with student's current enrollment.");
        }

        const finalGrade = calculateFinalGrade(data.prelim, data.midterm, data.finals);

        const result = await prisma.grade.create({
            data: {
                studentId: data.studentId,
                subjectId: data.subjectId,
                courseId: data.courseId,
                prelim: data.prelim ?? null,
                midterm: data.midterm ?? null,
                finals: data.finals ?? null,
                finalGrade: finalGrade ?? null,
                remarks: data.remarks,
                encodedByUserId: data.encodedByUserId,
            },
            include: {
                student: true,
                subject: true,
                course: true,
            },
        });

        await AuditService.log(data.encodedByUserId, "CREATE_GRADE", "Grade", result.id, {
            prelim: data.prelim,
            midterm: data.midterm,
            finals: data.finals,
            finalGrade,
            remarks: data.remarks
        });

        return result;
    }

    static async updateGrade(id: string, data: UpdateGradeData, userId?: string) {
        // Get existing grade to calculate final grade
        const existing = await prisma.grade.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new Error("Grade not found");
        }

        const prelim = data.prelim !== undefined ? data.prelim : (existing.prelim ? Number(existing.prelim) : null);
        const midterm = data.midterm !== undefined ? data.midterm : (existing.midterm ? Number(existing.midterm) : null);
        const finals = data.finals !== undefined ? data.finals : (existing.finals ? Number(existing.finals) : null);

        const finalGrade = calculateFinalGrade(prelim, midterm, finals);

        const result = await prisma.grade.update({
            where: { id },
            data: {
                ...(data.prelim !== undefined && { prelim: data.prelim ?? null }),
                ...(data.midterm !== undefined && { midterm: data.midterm ?? null }),
                ...(data.finals !== undefined && { finals: data.finals ?? null }),
                finalGrade: finalGrade ?? null,
                ...(data.remarks !== undefined && { remarks: data.remarks }),
            },
            include: {
                student: true,
                subject: true,
                course: true,
            },
        });

        if (userId) {
            const changes: any = {};
            if (data.prelim !== undefined) changes.prelim = { from: existing.prelim, to: data.prelim };
            if (data.midterm !== undefined) changes.midterm = { from: existing.midterm, to: data.midterm };
            if (data.finals !== undefined) changes.finals = { from: existing.finals, to: data.finals };
            if (data.remarks !== undefined) changes.remarks = { from: existing.remarks, to: data.remarks };

            await AuditService.log(userId, "UPDATE_GRADE", "Grade", id, changes);
        }

        return result;
    }

    static async upsertGrade(data: CreateGradeData) {
        // Validation: course_id should match the student’s course
        const student = await prisma.student.findUnique({
            where: { id: data.studentId },
            select: { courseId: true }
        });

        if (!student) {
            throw new Error("Student not found");
        }

        if (student.courseId !== data.courseId) {
            throw new Error("Cannot encode grade: Course mismatch with student's current enrollment.");
        }

        const finalGrade = calculateFinalGrade(data.prelim, data.midterm, data.finals);

        // Ensure we have a valid encoder ID.
        // If "system" is passed or ID is invalid (simple check), fetch a fallback user (e.g. admin)
        let encoderId = data.encodedByUserId;
        if (encoderId === "system" || !encoderId) {
            const admin = await prisma.user.findFirst();
            if (admin) {
                encoderId = admin.id;
            }
        }

        const result = await prisma.grade.upsert({
            where: {
                studentId_subjectId_courseId: {
                    studentId: data.studentId,
                    subjectId: data.subjectId,
                    courseId: data.courseId,
                },
            },
            update: {
                prelim: data.prelim ?? null,
                midterm: data.midterm ?? null,
                finals: data.finals ?? null,
                finalGrade: finalGrade ?? null,
                remarks: data.remarks,
            },
            create: {
                studentId: data.studentId,
                subjectId: data.subjectId,
                courseId: data.courseId,
                prelim: data.prelim ?? null,
                midterm: data.midterm ?? null,
                finals: data.finals ?? null,
                finalGrade: finalGrade ?? null,
                remarks: data.remarks,
                encodedByUserId: encoderId,
            },
            include: {
                student: true,
                subject: true,
                course: true,
            },
        });

        await AuditService.log(encoderId, "UPSERT_GRADE", "Grade", result.id, {
            prelim: data.prelim,
            midterm: data.midterm,
            finals: data.finals,
            finalGrade,
            remarks: data.remarks
        });

        return result;
    }

    static async deleteGrade(id: string, userId?: string) {
        const result = await prisma.grade.delete({
            where: { id },
        });

        if (userId) {
            await AuditService.log(userId, "DELETE_GRADE", "Grade", id);
        }
        return result;
    }
}
