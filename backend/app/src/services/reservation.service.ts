import prisma from "../db";
import { AuditService } from "./audit.service";

export interface CreateReservationData {
    studentId: string;
    subjectId: string;
}

export class SubjectReservationService {
    // ... rest of the service methods
    static async getReservationsByStudent(studentId: string) {
        return await prisma.subjectReservation.findMany({
            where: { studentId },
            include: {
                subject: true,
            },
            orderBy: {
                reservedAt: "desc",
            },
        });
    }

    static async getAvailableSubjectsForStudent(studentId: string) {
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { courseId: true },
        });

        if (!student) {
            throw new Error("Student not found");
        }

        if (!student.courseId) {
            return [];
        }

        const reservedSubjectIds = await prisma.subjectReservation.findMany({
            where: { studentId },
            select: { subjectId: true },
        });

        const reservedIds = reservedSubjectIds.map((r: { subjectId: string }) => r.subjectId);

        return await prisma.subject.findMany({
            where: {
                courseId: student.courseId,
                id: { notIn: reservedIds },
            },
            orderBy: { code: "asc" },
        });
    }

    static async createReservation(data: CreateReservationData, userId?: string) {
        const [student, subject, existing, admin] = await Promise.all([
            prisma.student.findUnique({
                where: { id: data.studentId },
                select: { id: true, studentNo: true, firstName: true, lastName: true, courseId: true },
            }),
            prisma.subject.findUnique({
                where: { id: data.subjectId },
                select: { id: true, code: true, courseId: true },
            }),
            prisma.subjectReservation.findUnique({
                where: {
                    studentId_subjectId: {
                        studentId: data.studentId,
                        subjectId: data.subjectId,
                    },
                },
            }),
            prisma.user.findFirst(),
        ]);

        if (!student) throw new Error("Student not found");
        if (!student.courseId) throw new Error("Student not enrolled in a course");
        if (!subject) throw new Error("Subject not found");
        if (subject.courseId !== student.courseId) throw new Error("Cannot reserve subject from a different course");
        if (existing) throw new Error("Subject already reserved");

        const reservation = await prisma.$transaction(async (tx) => {
            const res = await tx.subjectReservation.create({
                data: {
                    studentId: data.studentId,
                    subjectId: data.subjectId,
                    status: "reserved",
                },
                include: {
                    subject: true,
                },
            });

            if (admin) {
                const courseIdString = student.courseId as string;
                await tx.grade.upsert({
                    where: {
                        studentId_subjectId_courseId: {
                            studentId: data.studentId,
                            subjectId: data.subjectId,
                            courseId: courseIdString,
                        }
                    },
                    update: {},
                    create: {
                        studentId: data.studentId,
                        subjectId: data.subjectId,
                        courseId: courseIdString,
                        encodedByUserId: admin.id,
                        remarks: "Pending"
                    }
                });
            }

            return res;
        });

        if (userId) {
            await AuditService.log(userId, "RESERVE_SUBJECT", "SubjectReservation", reservation.id, {
                student: `${student.firstName} ${student.lastName} (${student.studentNo})`,
                subject: subject.code
            });
        }

        return reservation;
    }

    static async bulkCreateReservations(studentId: string, subjectIds: string[], userId?: string) {
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { id: true, studentNo: true, firstName: true, lastName: true, courseId: true },
        });

        if (!student) throw new Error("Student not found");
        if (!student.courseId) throw new Error("Student is not enrolled in any course");

        const admin = await prisma.user.findFirst();
        const adminId = admin?.id;

        const subjects = await prisma.subject.findMany({
            where: {
                id: { in: subjectIds },
                courseId: student.courseId,
            },
            select: { id: true, code: true },
        });

        const validSubjectIds = subjects.map(s => s.id);
        if (validSubjectIds.length === 0) return [];

        const existingReservations = await prisma.subjectReservation.findMany({
            where: {
                studentId,
                subjectId: { in: validSubjectIds },
            },
            select: { subjectId: true },
        });

        const existingSet = new Set(existingReservations.map(r => r.subjectId));
        const finalSubjectIds = validSubjectIds.filter(id => !existingSet.has(id));

        if (finalSubjectIds.length === 0) return [];

        const results = await prisma.$transaction(async (tx) => {
            await tx.subjectReservation.createMany({
                data: finalSubjectIds.map(subjectId => ({
                    studentId,
                    subjectId,
                    status: "reserved",
                })),
                skipDuplicates: true,
            });

            if (adminId) {
                const courseIdString = student.courseId as string;
                await tx.grade.createMany({
                    data: finalSubjectIds.map(subjectId => ({
                        studentId,
                        subjectId,
                        courseId: courseIdString,
                        encodedByUserId: adminId,
                        remarks: "Pending",
                    })),
                    skipDuplicates: true,
                });
            }

            return await tx.subjectReservation.findMany({
                where: {
                    studentId,
                    subjectId: { in: finalSubjectIds },
                },
            });
        });

        if (userId && results.length > 0) {
            await AuditService.log(userId, "RESERVE_SUBJECTS", "SubjectReservation", "bulk", {
                student: `${student.firstName} ${student.lastName} (${student.studentNo})`,
                count: results.length,
                subjects: subjects.filter(s => finalSubjectIds.includes(s.id)).map(s => s.code)
            });
        }

        return results;
    }

    static async cancelReservation(id: string, userId?: string) {
        const reservation = await prisma.subjectReservation.update({
            where: { id },
            data: { status: "cancelled" },
            include: {
                student: true,
                subject: true
            }
        });

        if (userId) {
            await AuditService.log(userId, "CANCEL_RESERVATION", "SubjectReservation", id, {
                student: `${reservation.student.firstName} ${reservation.student.lastName}`,
                subject: reservation.subject.code
            });
        }

        return reservation;
    }

    static async deleteReservation(id: string, userId?: string) {
        const reservation = await prisma.subjectReservation.findUnique({
            where: { id },
            include: { student: true, subject: true }
        });

        if (!reservation) {
            return await prisma.subjectReservation.deleteMany({ where: { id } });
        }

        const result = await prisma.$transaction(async (tx) => {
            if (reservation.student.courseId) {
                try {
                    await tx.grade.delete({
                        where: {
                            studentId_subjectId_courseId: {
                                studentId: reservation.studentId,
                                subjectId: reservation.subjectId,
                                courseId: reservation.student.courseId,
                            }
                        }
                    });
                } catch (err) { }
            }

            return await tx.subjectReservation.delete({
                where: { id },
            });
        });

        if (userId) {
            await AuditService.log(userId, "REMOVE_RESERVATION", "SubjectReservation", id, {
                student: `${reservation.student.firstName} ${reservation.student.lastName}`,
                subject: reservation.subject.code
            });
        }

        return result;
    }

    static async bulkDeleteReservations(ids: string[], userId?: string) {
        const reservations = await prisma.subjectReservation.findMany({
            where: { id: { in: ids } },
            include: { student: true, subject: true },
        });

        if (reservations.length === 0) return { success: true };

        await prisma.$transaction(async (tx) => {
            const gradesToDelete = reservations
                .filter(r => r.student.courseId !== null)
                .map(r => ({
                    studentId: r.studentId,
                    subjectId: r.subjectId,
                    courseId: r.student.courseId as string,
                }));

            if (gradesToDelete.length > 0) {
                await tx.grade.deleteMany({
                    where: {
                        OR: gradesToDelete
                    }
                });
            }

            await tx.subjectReservation.deleteMany({
                where: { id: { in: ids } },
            });

            return { success: true };
        });

        if (userId) {
            await AuditService.log(userId, "REMOVE_RESERVATIONS", "SubjectReservation", "bulk", {
                count: reservations.length,
                details: reservations.map(r => ({
                    student: `${r.student.firstName} ${r.student.lastName}`,
                    subject: r.subject.code
                }))
            });
        }

        return { success: true };
    }
}
