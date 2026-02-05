import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Helper to generate a random grade between 1.0 and 5.0
function randomGrade(): number {
    const grades = [1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 5.0];
    return grades[Math.floor(Math.random() * grades.length)];
}

// Helper to get remarks based on final grade
function getRemarks(grade: number): string {
    if (grade <= 3.0) return "Passed";
    return "Failed";
}

async function main() {
    console.log("Seeding started...");

    const passwordParams = (await bcrypt.hash("admin1234", 10));

    // 1. Create a default admin user
    const admin = await prisma.user.upsert({
        where: { email: "admin@sis.com" },
        update: {
            passwordHash: await bcrypt.hash("admin1234", 10),
        },
        create: {
            email: "admin@sis.com",
            passwordHash: await bcrypt.hash("admin1234", 10), // In a real app, use bcrypt/argon2
            role: "admin",
        },
    });
    console.log("Admin user created/found");

    // 1.1 Create a default encoder user
    const encoder = await prisma.user.upsert({
        where: { email: "encoder@sis.com" },
        update: {
            passwordHash: await bcrypt.hash("encoder123", 10),
        },
        create: {
            email: "encoder@sis.com",
            passwordHash: await bcrypt.hash("encoder123", 10),
            role: "encoder",
        },
    });
    console.log("Encoder user created/found");

    // 2. Create courses
    const coursesData = [
        { code: "BSCS", name: "Bachelor of Science in Computer Science" },
        { code: "BSIT", name: "Bachelor of Science in Information Technology" },
        { code: "BSCPE", name: "Bachelor of Science in Computer Engineering" },
    ];

    const courses = [];
    for (const c of coursesData) {
        const course = await prisma.course.upsert({
            where: { code: c.code },
            update: {},
            create: c,
        });
        courses.push(course);
    }
    console.log(`${courses.length} courses created/found`);

    // 3. Create subjects for each course
    for (const course of courses) {
        const subjectsCount = await prisma.subject.count({ where: { courseId: course.id } });
        if (subjectsCount === 0) {
            const subjectsData = [
                { code: "PROG1", title: "Programming 1", units: 3 },
                { code: "DSALGO", title: "Data Structures and Algorithms", units: 3 },
                { code: "NET1", title: "Networking 1", units: 3 },
                { code: "DB1", title: "Database Management 1", units: 3 },
                { code: "WEB1", title: "Web Development 1", units: 3 },
            ];

            for (const s of subjectsData) {
                await prisma.subject.create({
                    data: {
                        ...s,
                        courseId: course.id,
                    },
                });
            }
            console.log(`Added 5 subjects to ${course.code}`);
        }
    }

    // 4. Seed 50 students
    const studentCount = await prisma.student.count();
    if (studentCount < 50) {
        console.log(`Currently have ${studentCount} students. Adding more to reach 50...`);
        for (let i = studentCount; i < 50; i++) {
            const randomCourse = courses[Math.floor(Math.random() * courses.length)];
            await prisma.student.create({
                data: {
                    studentNo: `2026-${String(i + 1).padStart(4, "0")}`,
                    firstName: faker.person.firstName(),
                    lastName: faker.person.lastName(),
                    email: faker.internet.email().toLowerCase(),
                    birthDate: faker.date.birthdate({ min: 18, max: 25, mode: "age" }),
                    courseId: randomCourse.id,
                }
            });
        }
        console.log("Seeded 50 students");
    } else {
        console.log("Already have 50+ students, skipping student seeding.");
    }

    // 5. Seed subject reservations for all students
    const reservationCount = await prisma.subjectReservation.count();
    if (reservationCount === 0) {
        console.log("Seeding subject reservations...");
        const allStudents = await prisma.student.findMany({
            include: { course: true },
        });

        for (const student of allStudents) {
            if (!student.courseId) continue;
            // Get subjects for student's course
            const subjects = await prisma.subject.findMany({
                where: { courseId: student.courseId },
            });

            // Reserve 3-5 random subjects for each student
            const numSubjects = Math.floor(Math.random() * 3) + 3; // 3 to 5
            const shuffledSubjects = subjects.sort(() => Math.random() - 0.5).slice(0, numSubjects);

            for (const subject of shuffledSubjects) {
                await prisma.subjectReservation.create({
                    data: {
                        studentId: student.id,
                        subjectId: subject.id,
                        status: "reserved",
                    },
                });
            }
        }
        console.log("Subject reservations seeded for all students");
    } else {
        console.log(`Already have ${reservationCount} reservations, skipping.`);
    }

    // 6. Seed/Update grades for all reserved subjects
    console.log("Updating grades with new weighted computation...");
    const allReservations = await prisma.subjectReservation.findMany({
        include: {
            student: true,
            subject: true,
        },
    });

    let updatedCount = 0;
    for (const reservation of allReservations) {
        // 70% chance to have grades in seed, or update existing ones
        if (Math.random() < 0.9) {
            const prelim = randomGrade();
            const midterm = randomGrade();
            const finals = randomGrade();
            // Weighted: 30% Prelim, 30% Midterm, 40% Finals
            const finalGrade = Math.round(((prelim * 0.3) + (midterm * 0.3) + (finals * 0.4)) * 100) / 100;
            const remarks = getRemarks(finalGrade);

            if (!reservation.student.courseId) continue;

            await prisma.grade.upsert({
                where: {
                    studentId_subjectId_courseId: {
                        studentId: reservation.studentId,
                        subjectId: reservation.subjectId,
                        courseId: reservation.student.courseId,
                    }
                },
                update: {
                    prelim,
                    midterm,
                    finals,
                    finalGrade,
                    remarks,
                },
                create: {
                    studentId: reservation.studentId,
                    subjectId: reservation.subjectId,
                    courseId: reservation.student.courseId,
                    prelim,
                    midterm,
                    finals,
                    finalGrade,
                    remarks,
                    encodedByUserId: admin.id,
                },
            });
            updatedCount++;
        }
    }
    console.log(`Successfully updated/seeded ${updatedCount} grade records.`);

    console.log("Seeding complete!");
}

main()
    .catch((e) => {
        console.error("Seeding error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
