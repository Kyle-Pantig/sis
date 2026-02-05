import prisma from "../db";

export interface CreateReservationData {
    studentId: string;
    subjectId: string;
}

export class SubjectReservationService {
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
        // Get the student's course
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

        // Get subjects from the student's course that are not already reserved
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

    static async createReservation(data: CreateReservationData) {
        // Optimize: Fetch all dependencies in parallel
        const [student, subject, existing, admin] = await Promise.all([
            prisma.student.findUnique({
                where: { id: data.studentId },
                select: { courseId: true },
            }),
            prisma.subject.findUnique({
                where: { id: data.subjectId },
                select: { courseId: true },
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

        // Execute writes atomically
        return await prisma.$transaction(async (tx) => {
            const reservation = await tx.subjectReservation.create({
                data: {
                    studentId: data.studentId,
                    subjectId: data.subjectId,
                    status: "reserved",
                },
                include: {
                    subject: true,
                },
            });

            // Automatically create a "Pending" grade record
            if (admin) {
                // We know courseId is present given the check above, but cast for TS safety
                const courseIdString = student.courseId as string;

                await tx.grade.upsert({
                    where: {
                        studentId_subjectId_courseId: {
                            studentId: data.studentId,
                            subjectId: data.subjectId,
                            courseId: courseIdString,
                        }
                    },
                    update: {}, // Don't overwrite if it exists
                    create: {
                        studentId: data.studentId,
                        subjectId: data.subjectId,
                        courseId: courseIdString,
                        encodedByUserId: admin.id,
                        remarks: "Pending"
                    }
                });
            }

            return reservation;
        });
    }

    static async bulkCreateReservations(studentId: string, subjectIds: string[]) {
        // 1. Validate student
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { id: true, courseId: true },
        });

        if (!student) throw new Error("Student not found");
        if (!student.courseId) throw new Error("Student is not enrolled in any course");

        const admin = await prisma.user.findFirst();
        const adminId = admin?.id;

        // 2. Fetch all valid subjects for this course (batch check)
        const subjects = await prisma.subject.findMany({
            where: {
                id: { in: subjectIds },
                courseId: student.courseId,
            },
            select: { id: true },
        });

        const validSubjectIds = subjects.map(s => s.id);
        if (validSubjectIds.length === 0) return [];

        // 3. Check existing reservations (batch check)
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

        // 4. Perform bulk writes in a transaction
        return await prisma.$transaction(async (tx) => {
            // Create reservations
            await tx.subjectReservation.createMany({
                data: finalSubjectIds.map(subjectId => ({
                    studentId,
                    subjectId,
                    status: "reserved",
                })),
                skipDuplicates: true,
            });

            // Create pending grades
            if (adminId) {
                // Ensure courseId is treated as string since we checked it above
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

            // Return the created records (fetching is fast enough here)
            return await tx.subjectReservation.findMany({
                where: {
                    studentId,
                    subjectId: { in: finalSubjectIds },
                },
            });
        });
    }

    static async cancelReservation(id: string) {
        return await prisma.subjectReservation.update({
            where: { id },
            data: { status: "cancelled" },
        });
    }

    static async deleteReservation(id: string) {
        // Find the reservation first to get student/subject info
        const reservation = await prisma.subjectReservation.findUnique({
            where: { id },
            include: { student: true }
        });

        if (!reservation) {
            // Already gone or doesn't exist
            return await prisma.subjectReservation.deleteMany({ where: { id } });
        }

        return await prisma.$transaction(async (tx) => {
            if (reservation.student.courseId) {
                // Remove the associated grade record
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
                } catch (err) {
                    // Ignore if grade record doesn't exist
                }
            }

            return await tx.subjectReservation.delete({
                where: { id },
            });
        });
    }

    static async bulkDeleteReservations(ids: string[]) {
        // 1. Fetch info for grade deletion
        const reservations = await prisma.subjectReservation.findMany({
            where: { id: { in: ids } },
            include: { student: true },
        });

        if (reservations.length === 0) return { success: true };

        return await prisma.$transaction(async (tx) => {
            // Delete associated grades
            /* 
               We construct an OR condition for composite keys. 
               We must filter out any where courseId might be null to allow Type safety,
               although logically reserved students should have a course.
            */
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

            // Delete reservations
            await tx.subjectReservation.deleteMany({
                where: { id: { in: ids } },
            });

            return { success: true };
        });
    }
}
