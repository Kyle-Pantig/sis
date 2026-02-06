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
    if (!prelim || !midterm || !finals) {
        return null;
    }
    // Common grading: 30% prelim, 30% midterm, 40% finals
    return (prelim * 0.3) + (midterm * 0.3) + (finals * 0.4);
}

export class GradeService {
    static async getAllGrades(page: number = 1, limit: number = 10, courseId?: string, subjectId?: string, search?: string, remarks?: string) {
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

        if (remarks) {
            if (remarks === "Pending") {
                where.OR = [
                    { remarks: null },
                    { remarks: "Pending" }
                ];
            } else {
                where.remarks = remarks;
            }
        }

        if (search) {
            // Split on whitespace and commas, remove empty strings and punctuation-only strings
            const searchParts = search.trim()
                .split(/[\s,]+/)
                .map(part => part.replace(/[^\w-]/g, '')) // Remove non-word characters except hyphens
                .filter(part => part.length > 0);

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
            } else if (searchParts.length === 1) {
                where.OR = [
                    { student: { firstName: { contains: searchParts[0], mode: "insensitive" } } },
                    { student: { lastName: { contains: searchParts[0], mode: "insensitive" } } },
                    { student: { studentNo: { contains: searchParts[0], mode: "insensitive" } } },
                    { course: { name: { contains: searchParts[0], mode: "insensitive" } } },
                    { course: { code: { contains: searchParts[0], mode: "insensitive" } } },
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
            where: {
                studentId,
                isActive: true // Only show active grades (current course)
            },
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
            const changes: any = {
                student: `${result.student.lastName}, ${result.student.firstName}`,
                studentNo: result.student.studentNo,
                course: result.course.code,
                subject: result.subject.code
            };
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

    static async bulkUpdateGrades(
        updates: Array<{ id: string; prelim?: number | null; midterm?: number | null; finals?: number | null; remarks?: string }>,
        userId?: string
    ) {
        if (updates.length === 0) return { count: 0, updated: [] };

        // Get all existing grades to calculate final grades
        const gradeIds = updates.map(u => u.id);
        const existingGrades = await prisma.grade.findMany({
            where: { id: { in: gradeIds } },
            select: {
                id: true,
                prelim: true,
                midterm: true,
                finals: true,
                student: { select: { firstName: true, lastName: true, studentNo: true } },
                subject: { select: { code: true } },
                course: { select: { code: true } },
            }
        });

        const existingMap = new Map(existingGrades.map(g => [g.id, g]));

        // Execute all updates in a single transaction
        const results = await prisma.$transaction(
            updates.map(update => {
                const existing = existingMap.get(update.id);
                if (!existing) return prisma.grade.findUnique({ where: { id: update.id } }); // Skip non-existent

                const prelim = update.prelim !== undefined ? update.prelim : (existing.prelim ? Number(existing.prelim) : null);
                const midterm = update.midterm !== undefined ? update.midterm : (existing.midterm ? Number(existing.midterm) : null);
                const finals = update.finals !== undefined ? update.finals : (existing.finals ? Number(existing.finals) : null);
                const finalGrade = calculateFinalGrade(prelim, midterm, finals);

                // Auto-calculate remarks
                let remarks = update.remarks;
                if (!remarks) {
                    if (finalGrade !== null) {
                        remarks = finalGrade <= 3.0 ? "Passed" : "Failed";
                    } else if ((prelim && prelim > 0) || (midterm && midterm > 0) || (finals && finals > 0)) {
                        remarks = "INC";
                    }
                }

                return prisma.grade.update({
                    where: { id: update.id },
                    data: {
                        ...(update.prelim !== undefined && { prelim: update.prelim ?? null }),
                        ...(update.midterm !== undefined && { midterm: update.midterm ?? null }),
                        ...(update.finals !== undefined && { finals: update.finals ?? null }),
                        finalGrade: finalGrade ?? null,
                        ...(remarks !== undefined && { remarks }),
                    },
                });
            })
        );

        // Audit log (non-blocking)
        if (userId) {
            const auditDetails = updates.map(u => {
                const existing = existingMap.get(u.id);
                const formatVal = (v: any) => v === null || v === undefined ? '-' : String(v);

                const details: any = {
                    student: existing ? `${existing.student.firstName} ${existing.student.lastName}` : 'Unknown',
                    studentNo: existing?.student.studentNo || '-',
                    course: (existing as any)?.course?.code || '-',
                    subject: existing?.subject.code || 'Unknown',
                };

                if (existing) {
                    if (u.prelim !== undefined) {
                        const oldP = existing.prelim ? Number(existing.prelim) : null;
                        if (oldP !== u.prelim) details.prelim = `${formatVal(oldP)} → ${formatVal(u.prelim)}`;
                        else details.prelim = formatVal(u.prelim);
                    }
                    if (u.midterm !== undefined) {
                        const oldM = existing.midterm ? Number(existing.midterm) : null;
                        if (oldM !== u.midterm) details.midterm = `${formatVal(oldM)} → ${formatVal(u.midterm)}`;
                        else details.midterm = formatVal(u.midterm);
                    }
                    if (u.finals !== undefined) {
                        const oldF = existing.finals ? Number(existing.finals) : null;
                        if (oldF !== u.finals) details.finals = `${formatVal(oldF)} → ${formatVal(u.finals)}`;
                        else details.finals = formatVal(u.finals);
                    }
                }
                return details;
            });
            AuditService.log(userId, "BULK_UPDATE_GRADES", "Grade", "bulk", {
                grades: auditDetails
            }).catch(console.error);
        }

        return { count: results.filter(r => r !== null).length, updated: results };
    }
}
