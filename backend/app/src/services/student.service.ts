import prisma from "../db";

interface CreateStudentData {
    studentNo: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    birthDate: string | Date;
    courseId: string;
}

interface UpdateStudentData {
    studentNo?: string;
    firstName?: string;
    lastName?: string;
    email?: string | null;
    birthDate?: string | Date;
    courseId?: string;
}

export class StudentService {
    static async getAllStudents(page: number = 1, limit: number = 10, search?: string, courseId?: string) {
        const skip = (page - 1) * limit;

        const where: any = {};

        if (search) {
            const searchParts = search.trim().split(/\s+/);
            if (searchParts.length > 1) {
                where.AND = searchParts.map(part => ({
                    OR: [
                        { studentNo: { contains: part, mode: "insensitive" } },
                        { firstName: { contains: part, mode: "insensitive" } },
                        { lastName: { contains: part, mode: "insensitive" } },
                        { email: { contains: part, mode: "insensitive" } },
                        { course: { name: { contains: part, mode: "insensitive" } } },
                        { course: { code: { contains: part, mode: "insensitive" } } },
                    ]
                }));
            } else {
                where.OR = [
                    { studentNo: { contains: search, mode: "insensitive" } },
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                    { course: { name: { contains: search, mode: "insensitive" } } },
                    { course: { code: { contains: search, mode: "insensitive" } } },
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

        const [students, total] = await Promise.all([
            prisma.student.findMany({
                skip,
                take: limit,
                where,
                include: {
                    course: true,
                },
                orderBy: {
                    createdAt: "desc",
                },
            }),
            prisma.student.count({ where }),
        ]);

        return {
            students,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    static async getStudentById(id: string) {
        return await prisma.student.findUnique({
            where: { id },
            include: {
                course: true,
                subjectReservations: {
                    include: {
                        subject: true,
                    },
                },
                grades: {
                    include: {
                        subject: true,
                    },
                },
            },
        });
    }

    static async getStudentsCount() {
        return await prisma.student.count();
    }

    static async createStudent(data: CreateStudentData) {
        return await prisma.student.create({
            data: {
                studentNo: data.studentNo,
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email || null,
                birthDate: new Date(data.birthDate),
                courseId: data.courseId,
            },
            include: {
                course: true,
            },
        });
    }

    static async updateStudent(id: string, data: UpdateStudentData) {
        return await prisma.student.update({
            where: { id },
            data: {
                ...(data.studentNo && { studentNo: data.studentNo }),
                ...(data.firstName && { firstName: data.firstName }),
                ...(data.lastName && { lastName: data.lastName }),
                ...(data.email !== undefined && { email: data.email || null }),
                ...(data.birthDate && { birthDate: new Date(data.birthDate) }),
                ...(data.courseId && { courseId: data.courseId }),
            },
            include: {
                course: true,
            },
        });
    }

    static async deleteStudent(id: string) {
        return await prisma.student.delete({
            where: { id },
        });
    }

    static async deleteStudents(ids: string[]) {
        return await prisma.student.deleteMany({
            where: { id: { in: ids } },
        });
    }

    static async bulkCreateStudents(students: { studentNo: string; firstName: string; lastName: string; email?: string | null; birthDate: string; course: string }[]) {
        const results = {
            success: 0,
            failed: 0,
            errors: [] as { row: number; studentNo: string; error: string }[]
        };

        // Pre-load all courses for efficient lookup
        const allCourses = await prisma.course.findMany();

        // Create a lookup map for courses by code and name (case-insensitive)
        const courseMap = new Map<string, string>();
        for (const course of allCourses) {
            courseMap.set(course.code.toLowerCase(), course.id);
            courseMap.set(course.name.toLowerCase(), course.id);
        }

        for (let i = 0; i < students.length; i++) {
            const student = students[i];
            try {
                // Look up course by code or name (case-insensitive)
                const courseKey = student.course?.toLowerCase().trim();
                const courseId = courseMap.get(courseKey);

                if (!courseId) {
                    results.failed++;
                    results.errors.push({
                        row: i + 2,
                        studentNo: student.studentNo,
                        error: `Course not found: "${student.course}". Use course code (e.g., BSCPE) or full name.`
                    });
                    continue;
                }

                await prisma.student.create({
                    data: {
                        studentNo: student.studentNo,
                        firstName: student.firstName,
                        lastName: student.lastName,
                        email: student.email || null,
                        birthDate: new Date(student.birthDate),
                        courseId: courseId,
                    },
                });
                results.success++;
            } catch (error: any) {
                results.failed++;
                let errorMessage = "Unknown error";
                if (error.code === "P2002") {
                    errorMessage = "Student number already exists";
                }
                results.errors.push({
                    row: i + 2,
                    studentNo: student.studentNo,
                    error: errorMessage
                });
            }
        }

        return results;
    }
}
