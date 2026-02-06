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
            where: {
                studentId,
                isActive: true // Only show active reservations (current course)
            },
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

        // Only consider active reservations when determining available subjects
        const reservedSubjectIds = await prisma.subjectReservation.findMany({
            where: {
                studentId,
                isActive: true // Only consider active reservations
            },
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

        // If reservation exists and is ACTIVE, throw error
        if (existing && existing.isActive) throw new Error("Subject already reserved");

        // If reservation exists but is INACTIVE, reactivate it instead of creating new
        if (existing && !existing.isActive) {
            const reservation = await prisma.$transaction(async (tx) => {
                // Reactivate the reservation
                const res = await tx.subjectReservation.update({
                    where: { id: existing.id },
                    data: {
                        isActive: true,
                        status: "reserved",
                    },
                    include: {
                        subject: true,
                    },
                });

                // Also reactivate or create the grade record
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
                        update: {
                            isActive: true // Reactivate if exists
                        },
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
                AuditService.log(userId, "REACTIVATE_RESERVATION", "SubjectReservation", reservation.id, {
                    student: `${student.firstName} ${student.lastName} (${student.studentNo})`,
                    subject: subject.code
                }).catch(console.error);
            }

            return reservation;
        }

        // Create new reservation
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
                    update: {
                        isActive: true // Reactivate if exists (restores previous grades)
                    },
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
            AuditService.log(userId, "RESERVE_SUBJECT", "SubjectReservation", reservation.id, {
                student: `${student.firstName} ${student.lastName} (${student.studentNo})`,
                subject: subject.code
            }).catch(console.error);
        }

        return reservation;
    }

    static async bulkCreateReservations(studentId: string, subjectIds: string[], userId?: string) {
        // Parallelize initial lookups
        const [student, admin, subjects, existingReservations] = await Promise.all([
            prisma.student.findUnique({
                where: { id: studentId },
                select: { id: true, studentNo: true, firstName: true, lastName: true, courseId: true },
            }),
            prisma.user.findFirst({ select: { id: true } }),
            prisma.subject.findMany({
                where: { id: { in: subjectIds } },
                select: { id: true, code: true, courseId: true },
            }),
            prisma.subjectReservation.findMany({
                where: { studentId, subjectId: { in: subjectIds } },
                select: { id: true, subjectId: true, isActive: true },
            }),
        ]);

        if (!student) throw new Error("Student not found");
        if (!student.courseId) throw new Error("Student is not enrolled in any course");

        // Filter to only subjects in student's course
        const validSubjects = subjects.filter(s => s.courseId === student.courseId);
        const validSubjectIds = validSubjects.map(s => s.id);
        if (validSubjectIds.length === 0) return { count: 0, reactivated: 0, created: 0 };

        // Categorize: active (skip), inactive (reactivate), new (create)
        const existingMap = new Map(existingReservations.map(r => [r.subjectId, r]));
        const inactiveReservationIds: string[] = [];
        const inactiveSubjectIds: string[] = [];
        const newSubjectIds: string[] = [];

        for (const subjectId of validSubjectIds) {
            const existing = existingMap.get(subjectId);
            if (!existing) {
                newSubjectIds.push(subjectId);
            } else if (!existing.isActive) {
                inactiveReservationIds.push(existing.id);
                inactiveSubjectIds.push(subjectId);
            }
            // If active, skip
        }

        if (inactiveReservationIds.length === 0 && newSubjectIds.length === 0) {
            return { count: 0, reactivated: 0, created: 0 };
        }

        const courseIdString = student.courseId as string;
        const adminId = admin?.id;

        // Execute all operations in a single transaction
        await prisma.$transaction(async (tx) => {
            const operations: Promise<any>[] = [];

            // Reactivate inactive reservations
            if (inactiveReservationIds.length > 0) {
                operations.push(
                    tx.subjectReservation.updateMany({
                        where: { id: { in: inactiveReservationIds } },
                        data: { isActive: true, status: "reserved" }
                    }),
                    tx.grade.updateMany({
                        where: { studentId, subjectId: { in: inactiveSubjectIds }, courseId: courseIdString, isActive: false },
                        data: { isActive: true }
                    })
                );
            }

            // Create new reservations
            if (newSubjectIds.length > 0) {
                operations.push(
                    tx.subjectReservation.createMany({
                        data: newSubjectIds.map(subjectId => ({ studentId, subjectId, status: "reserved" })),
                        skipDuplicates: true,
                    })
                );

                if (adminId) {
                    // Reactivate any existing inactive grades for new subjects
                    operations.push(
                        tx.grade.updateMany({
                            where: { studentId, subjectId: { in: newSubjectIds }, courseId: courseIdString, isActive: false },
                            data: { isActive: true }
                        })
                    );
                }
            }

            await Promise.all(operations);

            // Create grades for subjects that don't have any grade record (after reactivation)
            if (newSubjectIds.length > 0 && adminId) {
                const existingGrades = await tx.grade.findMany({
                    where: { studentId, subjectId: { in: newSubjectIds }, courseId: courseIdString },
                    select: { subjectId: true }
                });
                const subjectsWithGrades = new Set(existingGrades.map(g => g.subjectId));
                const subjectsNeedingNewGrades = newSubjectIds.filter(id => !subjectsWithGrades.has(id));

                if (subjectsNeedingNewGrades.length > 0) {
                    await tx.grade.createMany({
                        data: subjectsNeedingNewGrades.map(subjectId => ({
                            studentId, subjectId, courseId: courseIdString, encodedByUserId: adminId, remarks: "Pending",
                        })),
                        skipDuplicates: true,
                    });
                }
            }
        });

        const totalAffected = inactiveSubjectIds.length + newSubjectIds.length;

        // Audit log (non-blocking but still executed)
        if (userId && totalAffected > 0) {
            AuditService.log(userId, "RESERVE_SUBJECTS", "SubjectReservation", "bulk", {
                student: `${student.firstName} ${student.lastName} (${student.studentNo})`,
                count: totalAffected,
                reactivated: inactiveSubjectIds.length,
                created: newSubjectIds.length,
                subjects: validSubjects.filter(s => [...inactiveSubjectIds, ...newSubjectIds].includes(s.id)).map(s => s.code)
            }).catch(console.error); // Fire-and-forget but log errors
        }

        return { count: totalAffected, reactivated: inactiveSubjectIds.length, created: newSubjectIds.length };
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
                // Find the grade to check if it has actual values
                const grade = await tx.grade.findUnique({
                    where: {
                        studentId_subjectId_courseId: {
                            studentId: reservation.studentId,
                            subjectId: reservation.subjectId,
                            courseId: reservation.student.courseId,
                        }
                    }
                });

                if (grade) {
                    // Check if grade has any actual values (not just pending/empty)
                    const hasActualGrades = grade.prelim !== null ||
                        grade.midterm !== null ||
                        grade.finals !== null ||
                        (grade.remarks && grade.remarks !== "Pending");

                    if (hasActualGrades) {
                        // Mark as inactive instead of deleting (soft delete)
                        await tx.grade.update({
                            where: { id: grade.id },
                            data: { isActive: false }
                        });
                    } else {
                        // Delete empty/pending grade
                        await tx.grade.delete({
                            where: { id: grade.id }
                        });
                    }
                }
            }

            // Delete the reservation
            return await tx.subjectReservation.delete({
                where: { id },
            });
        });

        if (userId) {
            AuditService.log(userId, "REMOVE_RESERVATION", "SubjectReservation", id, {
                student: `${reservation.student.firstName} ${reservation.student.lastName}`,
                subject: reservation.subject.code
            }).catch(console.error);
        }

        return result;
    }

    static async bulkDeleteReservations(ids: string[], userId?: string) {
        if (ids.length === 0) return { success: true, count: 0 };

        // Fetch minimal data needed
        const reservations = await prisma.subjectReservation.findMany({
            where: { id: { in: ids } },
            select: {
                id: true,
                studentId: true,
                subjectId: true,
                student: { select: { firstName: true, lastName: true, courseId: true } },
                subject: { select: { code: true } },
            },
        });

        if (reservations.length === 0) return { success: true, count: 0 };

        // Build grade keys for lookup
        const gradeKeys = reservations
            .filter(r => r.student.courseId !== null)
            .map(r => ({
                studentId: r.studentId,
                subjectId: r.subjectId,
                courseId: r.student.courseId as string,
            }));

        await prisma.$transaction(async (tx) => {
            if (gradeKeys.length > 0) {
                // Fetch all grades to check their values
                const grades = await tx.grade.findMany({
                    where: { OR: gradeKeys },
                    select: { id: true, prelim: true, midterm: true, finals: true, remarks: true }
                });

                // Categorize grades
                const gradesToSoftDelete: string[] = [];
                const gradesToHardDelete: string[] = [];

                for (const grade of grades) {
                    const hasActualGrades = grade.prelim !== null ||
                        grade.midterm !== null ||
                        grade.finals !== null ||
                        (grade.remarks && grade.remarks !== "Pending");

                    if (hasActualGrades) {
                        gradesToSoftDelete.push(grade.id);
                    } else {
                        gradesToHardDelete.push(grade.id);
                    }
                }

                // Execute grade operations in parallel
                const gradeOps: Promise<any>[] = [];
                if (gradesToSoftDelete.length > 0) {
                    gradeOps.push(tx.grade.updateMany({
                        where: { id: { in: gradesToSoftDelete } },
                        data: { isActive: false }
                    }));
                }
                if (gradesToHardDelete.length > 0) {
                    gradeOps.push(tx.grade.deleteMany({
                        where: { id: { in: gradesToHardDelete } }
                    }));
                }
                await Promise.all(gradeOps);
            }

            // Delete all reservations
            await tx.subjectReservation.deleteMany({
                where: { id: { in: ids } },
            });
        });

        // Audit log (non-blocking)
        if (userId) {
            AuditService.log(userId, "REMOVE_RESERVATIONS", "SubjectReservation", "bulk", {
                count: reservations.length,
                details: reservations.map(r => ({
                    student: `${r.student.firstName} ${r.student.lastName}`,
                    subject: r.subject.code
                }))
            }).catch(console.error);
        }

        return { success: true, count: reservations.length };
    }
}
