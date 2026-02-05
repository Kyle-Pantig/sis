import prisma from "../db";

export class DashboardService {
    static async getStats() {
        const [studentCount, courseCount, subjectCount, userCount, reservationCount] = await Promise.all([
            prisma.student.count(),
            prisma.course.count(),
            prisma.subject.count(),
            prisma.user.count(),
            prisma.subjectReservation.count(),
        ]);

        return {
            students: studentCount,
            courses: courseCount,
            subjects: subjectCount,
            users: userCount,
            reservations: reservationCount,
        };
    }

    static async getStudentsPerCourse() {
        return await prisma.course.findMany({
            include: {
                _count: {
                    select: { students: true }
                }
            }
        });
    }
}
