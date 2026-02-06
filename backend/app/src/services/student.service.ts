import prisma from "../db";
import { AuditService } from "./audit.service";

interface CreateStudentData {
    studentNo?: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    birthDate: string | Date;
    courseId?: string | null;
}

interface UpdateStudentData {
    studentNo?: string;
    firstName?: string;
    lastName?: string;
    email?: string | null;
    birthDate?: string | Date;
    courseId?: string | null;
}


export class StudentService {
    // ... rest of the service methods
    static async getAllStudents(page: number = 1, limit: number = 10, search?: string, courseId?: string) {
        const skip = (page - 1) * limit;

        const where: any = {};

        if (search) {
            // Split on whitespace and commas, remove empty strings and punctuation-only strings
            const searchParts = search.trim()
                .split(/[\s,]+/)
                .map(part => part.replace(/[^\w-]/g, '')) // Remove non-word characters except hyphens
                .filter(part => part.length > 0);

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
            } else if (searchParts.length === 1) {
                where.OR = [
                    { studentNo: { contains: searchParts[0], mode: "insensitive" } },
                    { firstName: { contains: searchParts[0], mode: "insensitive" } },
                    { lastName: { contains: searchParts[0], mode: "insensitive" } },
                    { email: { contains: searchParts[0], mode: "insensitive" } },
                    { course: { name: { contains: searchParts[0], mode: "insensitive" } } },
                    { course: { code: { contains: searchParts[0], mode: "insensitive" } } },
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
                    where: {
                        isActive: true // Only show active reservations (current course)
                    },
                    include: {
                        subject: true,
                    },
                },
                grades: {
                    where: {
                        isActive: true // Only show active grades (current course)
                    },
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

    static async generateStudentNo() {
        const currentYear = new Date().getFullYear();
        const yearPrefix = currentYear.toString();

        // Find the last student number for the current year
        // We order by studentNo desc to get the highest one
        const lastStudent = await prisma.student.findFirst({
            where: {
                studentNo: {
                    startsWith: `${yearPrefix}-`,
                },
            },
            orderBy: {
                studentNo: "desc",
            },
        });

        let nextSequence = 1;
        if (lastStudent) {
            const lastStudentNo = lastStudent.studentNo;
            const sequencePart = lastStudentNo.split("-")[1];
            if (sequencePart && !isNaN(parseInt(sequencePart, 10))) {
                nextSequence = parseInt(sequencePart, 10) + 1;
            }
        }

        const formattedSequence = nextSequence.toString().padStart(4, "0");
        return `${yearPrefix}-${formattedSequence}`;
    }

    static async createStudent(data: CreateStudentData, userId?: string) {
        let studentNo = data.studentNo;
        if (!studentNo) {
            studentNo = await this.generateStudentNo();
        }

        const result = await prisma.student.create({
            data: {
                studentNo: studentNo,
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email || null,
                birthDate: new Date(data.birthDate),
                ...(data.courseId ? { course: { connect: { id: data.courseId } } } : {}),
            },
            include: {
                course: true,
            },
        });

        if (userId) {
            await AuditService.log(userId, "CREATE_STUDENT", "Student", result.id, {
                studentNo: result.studentNo,
                name: `${result.firstName} ${result.lastName}`,
                course: result.course?.code
            });
        }

        return result;
    }

    static async updateStudent(id: string, data: UpdateStudentData, userId?: string) {
        const existing = await prisma.student.findUnique({
            where: { id },
            include: { course: true }
        });

        if (!existing) {
            throw new Error("Student not found");
        }

        // Check if course is changing
        const isCourseChanging = data.courseId && data.courseId !== existing.courseId;

        // Use transaction if course is changing to ensure atomicity
        const result = await prisma.$transaction(async (tx) => {
            // If course is changing, handle academic records
            if (isCourseChanging) {
                // 1. Mark all CURRENT course reservations as inactive (held)
                await tx.subjectReservation.updateMany({
                    where: {
                        studentId: id,
                        isActive: true,
                        subject: {
                            courseId: existing.courseId! // Only current course subjects
                        }
                    },
                    data: {
                        isActive: false
                    }
                });

                // 2. Mark all CURRENT course grades as inactive (held)
                await tx.grade.updateMany({
                    where: {
                        studentId: id,
                        courseId: existing.courseId!, // Only current course grades
                        isActive: true
                    },
                    data: {
                        isActive: false
                    }
                });

                // 3. Reactivate any EXISTING reservations for the NEW course (if student is switching back)
                await tx.subjectReservation.updateMany({
                    where: {
                        studentId: id,
                        isActive: false,
                        subject: {
                            courseId: data.courseId! // New course subjects
                        }
                    },
                    data: {
                        isActive: true
                    }
                });

                // 4. Reactivate any EXISTING grades for the NEW course (if student is switching back)
                await tx.grade.updateMany({
                    where: {
                        studentId: id,
                        courseId: data.courseId!, // New course grades
                        isActive: false
                    },
                    data: {
                        isActive: true
                    }
                });
            }

            // Update the student
            return await tx.student.update({
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
        });

        if (userId) {
            const changes: any = {};
            if (data.studentNo && data.studentNo !== existing.studentNo) changes.studentNo = { from: existing.studentNo, to: data.studentNo };
            if (data.firstName && data.firstName !== existing.firstName) changes.firstName = { from: existing.firstName, to: data.firstName };
            if (data.lastName && data.lastName !== existing.lastName) changes.lastName = { from: existing.lastName, to: data.lastName };
            if (data.email !== undefined && data.email !== existing.email) changes.email = { from: existing.email, to: data.email };
            if (isCourseChanging) {
                changes.course = { from: existing.course?.code, to: result.course?.code };
                changes.academicRecordsSwitched = true; // Old course records held, new course records reactivated
            }

            if (Object.keys(changes).length > 0) {
                await AuditService.log(userId, "UPDATE_STUDENT", "Student", id, changes);
            }
        }

        return result;
    }

    static async deleteStudent(id: string, userId?: string) {
        const result = await prisma.student.delete({
            where: { id },
        });

        if (userId) {
            await AuditService.log(userId, "DELETE_STUDENT", "Student", id, {
                studentNo: result.studentNo,
                name: `${result.firstName} ${result.lastName}`
            });
        }

        return result;
    }

    static async deleteStudents(ids: string[], userId?: string) {
        const result = await prisma.student.deleteMany({
            where: { id: { in: ids } },
        });

        if (userId) {
            await AuditService.log(userId, "DELETE_STUDENTS", "Student", "bulk", {
                count: result.count,
                ids
            });
        }

        return result;
    }

    static async bulkCreateStudents(students: { studentNo?: string; firstName: string; lastName: string; email?: string | null; birthDate: string; course: string }[], userId?: string) {
        const results = {
            success: 0,
            failed: 0,
            errors: [] as { row: number; studentNo: string; error: string }[]
        };

        if (students.length === 0) return results;

        // ============ PHASE 1: Pre-load all existing data in parallel ============
        const currentYear = new Date().getFullYear();
        const yearPrefix = currentYear.toString();

        const [allCourses, lastStudent, existingStudents] = await Promise.all([
            // Get all courses for lookup
            prisma.course.findMany(),
            // Get the last student number for auto-generation
            prisma.student.findFirst({
                where: { studentNo: { startsWith: `${yearPrefix}-` } },
                orderBy: { studentNo: "desc" },
            }),
            // Get all existing student numbers and emails to check for duplicates upfront
            prisma.student.findMany({
                select: { studentNo: true, email: true },
            }),
        ]);

        // Build lookup maps
        const courseMap = new Map<string, string>();
        for (const course of allCourses) {
            courseMap.set(course.code.toLowerCase(), course.id);
            courseMap.set(course.name.toLowerCase(), course.id);
        }

        const existingStudentNos = new Set(existingStudents.map(s => s.studentNo.toLowerCase()));
        const existingEmails = new Set(existingStudents.filter(s => s.email).map(s => s.email!.toLowerCase()));

        // Track sequence for auto-generation
        let lastGeneratedSequence = 0;
        if (lastStudent) {
            const sequencePart = lastStudent.studentNo.split("-")[1];
            if (sequencePart && !isNaN(parseInt(sequencePart, 10))) {
                lastGeneratedSequence = parseInt(sequencePart, 10);
            }
        }

        // ============ PHASE 2: Pre-process all students and collect new courses ============
        const newCoursesToCreate = new Set<string>();
        const processedStudents: {
            rowIndex: number;
            studentNo: string;
            firstName: string;
            lastName: string;
            email: string | null;
            birthDate: Date;
            courseKey: string;
        }[] = [];

        // Track student numbers and emails being added in this batch to detect duplicates within the CSV
        const batchStudentNos = new Set<string>();
        const batchEmails = new Set<string>();

        for (let i = 0; i < students.length; i++) {
            const student = students[i];
            let studentNo = student.studentNo?.trim();

            // Generate student number if not provided
            if (!studentNo) {
                lastGeneratedSequence++;
                const formattedSequence = lastGeneratedSequence.toString().padStart(4, "0");
                studentNo = `${yearPrefix}-${formattedSequence}`;
            }

            const studentNoLower = studentNo.toLowerCase();
            const emailLower = student.email?.toLowerCase().trim() || null;

            // Check for duplicate student number (in DB or within this batch)
            if (existingStudentNos.has(studentNoLower) || batchStudentNos.has(studentNoLower)) {
                results.failed++;
                results.errors.push({
                    row: i + 2,
                    studentNo: studentNo,
                    error: `Student number "${studentNo}" already exists`
                });
                continue;
            }

            // Check for duplicate email (in DB or within this batch)
            if (emailLower && (existingEmails.has(emailLower) || batchEmails.has(emailLower))) {
                results.failed++;
                results.errors.push({
                    row: i + 2,
                    studentNo: studentNo,
                    error: `Email "${student.email}" already exists`
                });
                continue;
            }

            // Validate course
            const courseKey = student.course?.toLowerCase().trim();
            if (!courseKey) {
                results.failed++;
                results.errors.push({
                    row: i + 2,
                    studentNo: studentNo,
                    error: `Course is required`
                });
                continue;
            }

            // If course doesn't exist, mark it for creation
            if (!courseMap.has(courseKey)) {
                newCoursesToCreate.add(student.course.trim().toUpperCase());
            }

            // Mark as used in this batch
            batchStudentNos.add(studentNoLower);
            if (emailLower) batchEmails.add(emailLower);

            // Add to processed list
            processedStudents.push({
                rowIndex: i,
                studentNo: studentNo,
                firstName: student.firstName.trim(),
                lastName: student.lastName.trim(),
                email: student.email?.trim() || null,
                birthDate: new Date(student.birthDate),
                courseKey: courseKey,
            });
        }

        // ============ PHASE 3: Create any new courses (batch) ============
        const courseCodeToName: Record<string, string> = {
            "BSCPE": "Bachelor of Science in Computer Engineering",
            "BSCE": "Bachelor of Science in Civil Engineering",
            "BSEE": "Bachelor of Science in Electrical Engineering",
            "BSECE": "Bachelor of Science in Electronics Engineering",
            "BSME": "Bachelor of Science in Mechanical Engineering",
            "BSCHE": "Bachelor of Science in Chemical Engineering",
            "BSIE": "Bachelor of Science in Industrial Engineering",
            "BSIT": "Bachelor of Science in Information Technology",
            "BSCS": "Bachelor of Science in Computer Science",
            "BSIS": "Bachelor of Science in Information Systems",
            "BSA": "Bachelor of Science in Accountancy",
            "BSAIS": "Bachelor of Science in Accounting Information System",
            "BSBA": "Bachelor of Science in Business Administration",
            "BSMA": "Bachelor of Science in Management Accounting",
            "BSHM": "Bachelor of Science in Hospitality Management",
            "BSTM": "Bachelor of Science in Tourism Management",
            "BEED": "Bachelor of Elementary Education",
            "BSED": "Bachelor of Secondary Education",
            "BTLED": "Bachelor of Technology and Livelihood Education",
            "BSN": "Bachelor of Science in Nursing",
            "BSMT": "Bachelor of Science in Medical Technology",
            "BSPT": "Bachelor of Science in Physical Therapy",
            "BSRT": "Bachelor of Science in Radiologic Technology",
            "BSPHARMA": "Bachelor of Science in Pharmacy",
            "BSP": "Bachelor of Science in Psychology",
            "AB": "Bachelor of Arts",
            "ABCOMM": "Bachelor of Arts in Communication",
            "ABPOLSCI": "Bachelor of Arts in Political Science",
            "ABENG": "Bachelor of Arts in English",
            "BSCRIM": "Bachelor of Science in Criminology",
            "BSSW": "Bachelor of Science in Social Work",
            "BSAGRI": "Bachelor of Science in Agriculture",
            "BSFORESTRY": "Bachelor of Science in Forestry",
            "BSARCH": "Bachelor of Science in Architecture",
            "BSOA": "Bachelor of Science in Office Administration",
            "BSHRM": "Bachelor of Science in Hotel and Restaurant Management",
            "BSMLS": "Bachelor of Science in Medical Laboratory Science",
        };

        if (newCoursesToCreate.size > 0) {
            const coursesToInsert = Array.from(newCoursesToCreate).map(code => ({
                code: code,
                name: courseCodeToName[code] || code,
                description: courseCodeToName[code]
                    ? `${code} - Auto-created during student import`
                    : "Auto-created during student import",
            }));

            try {
                await prisma.course.createMany({
                    data: coursesToInsert,
                    skipDuplicates: true,
                });

                const updatedCourses = await prisma.course.findMany();
                for (const course of updatedCourses) {
                    courseMap.set(course.code.toLowerCase(), course.id);
                    courseMap.set(course.name.toLowerCase(), course.id);
                }
            } catch (error) {
                console.error("Error creating courses:", error);
            }
        }

        // ============ PHASE 4: Resolve course IDs and prepare final data ============
        const studentsToCreate: {
            studentNo: string;
            firstName: string;
            lastName: string;
            email: string | null;
            birthDate: Date;
            courseId: string;
        }[] = [];

        for (const student of processedStudents) {
            const courseId = courseMap.get(student.courseKey);
            if (!courseId) {
                results.failed++;
                results.errors.push({
                    row: student.rowIndex + 2,
                    studentNo: student.studentNo,
                    error: `Course not found: "${student.courseKey}"`
                });
                continue;
            }

            studentsToCreate.push({
                studentNo: student.studentNo,
                firstName: student.firstName,
                lastName: student.lastName,
                email: student.email,
                birthDate: student.birthDate,
                courseId: courseId,
            });
        }

        // ============ PHASE 5: Batch insert all valid students ============
        if (studentsToCreate.length > 0) {
            try {
                const result = await prisma.student.createMany({
                    data: studentsToCreate,
                    skipDuplicates: true,
                });
                results.success = result.count;
                const skippedCount = studentsToCreate.length - result.count;
                if (skippedCount > 0) {
                    results.failed += skippedCount;
                }
            } catch (error: any) {
                console.error("Bulk insert error:", error);
                for (const student of studentsToCreate) {
                    try {
                        await prisma.student.create({ data: student });
                        results.success++;
                    } catch (innerError: any) {
                        results.failed++;
                        results.errors.push({
                            row: 0,
                            studentNo: student.studentNo,
                            error: "Failed to insert"
                        });
                    }
                }
            }
        }

        if (userId && (results.success > 0 || results.failed > 0)) {
            await AuditService.log(userId, "IMPORT_STUDENTS", "Student", "bulk", {
                success: results.success,
                failed: results.failed,
                total: students.length
            });
        }

        return results;
    }
}
