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
        // Validate: Check if student exists and get their course
        const student = await prisma.student.findUnique({
            where: { id: data.studentId },
            select: { courseId: true },
        });

        if (!student) {
            throw new Error("Student not found");
        }

        // Validate: Check if subject exists and belongs to student's course
        const subject = await prisma.subject.findUnique({
            where: { id: data.subjectId },
            select: { courseId: true },
        });

        if (!subject) {
            throw new Error("Subject not found");
        }

        if (subject.courseId !== student.courseId) {
            throw new Error("Cannot reserve subject from a different course");
        }

        // Check for duplicate reservation
        const existing = await prisma.subjectReservation.findUnique({
            where: {
                studentId_subjectId: {
                    studentId: data.studentId,
                    subjectId: data.subjectId,
                },
            },
        });

        if (existing) {
            throw new Error("Subject already reserved");
        }

        const reservation = await prisma.subjectReservation.create({
            data: {
                studentId: data.studentId,
                subjectId: data.subjectId,
                status: "reserved",
            },
            include: {
                subject: true,
            },
        });

        // Automatically create a "Pending" grade record so it shows up in the Grading Sheet
        try {
            const admin = await prisma.user.findFirst();
            if (admin) {
                await prisma.grade.upsert({
                    where: {
                        studentId_subjectId_courseId: {
                            studentId: data.studentId,
                            subjectId: data.subjectId,
                            courseId: student.courseId,
                        }
                    },
                    update: {}, // Don't overwrite if it exists
                    create: {
                        studentId: data.studentId,
                        subjectId: data.subjectId,
                        courseId: student.courseId,
                        encodedByUserId: admin.id,
                        remarks: "Pending" // Explicitly set as Pending
                    }
                });
            }
        } catch (gradeErr) {
            console.error("Failed to auto-create grade record:", gradeErr);
            // We don't want to fail the reservation if the grade auto-creation fails
        }

        return reservation;
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

        if (reservation) {
            // Remove the associated grade record
            try {
                await prisma.grade.delete({
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

        return await prisma.subjectReservation.delete({
            where: { id },
        });
    }
}
