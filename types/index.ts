/**
 * Core Data Models
 */

export interface User {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: "admin" | "encoder" | "student";
    isActive: boolean;
    createdAt: string;
}

export interface Student {
    id: string;
    studentNo: string;
    firstName: string;
    lastName: string;
    email: string;
    birthDate: string;
    courseId: string | null;
    course?: {
        id: string;
        code: string;
        name: string;
    } | null;
    createdAt?: string;
}

export interface Course {
    id: string;
    code: string;
    name: string;
    description: string | null;
    _count?: {
        students: number;
        subjects: number;
    };
}

export interface Subject {
    id: string;
    code: string;
    title: string;
    units: number;
    courseId: string;
    course?: {
        id: string;
        code: string;
        name: string;
    };
    _count?: {
        subjectReservations: number;
        grades: number;
    };
}

export interface Grade {
    id: string;
    studentId: string;
    subjectId: string;
    courseId: string;
    prelim: number | null;
    midterm: number | null;
    finals: number | null;
    finalGrade: number | null;
    remarks: string | null;
    student: {
        id: string;
        studentNo: string;
        firstName: string;
        lastName: string;
    };
    subject: {
        id: string;
        code: string;
        title: string;
    };
    course: {
        id: string;
        code: string;
        name: string;
    };
}

export interface Invitation {
    id: string;
    email: string;
    token: string;
    role: string;
    expiresAt: string;
    createdAt: string;
}

export interface AuditLog {
    id: string;
    action: string;
    entity: string;
    entityId: string;
    details: any;
    userId: string;
    createdAt: string;
    user: {
        email: string;
        role: string;
    };
}

/**
 * Paginated Response Wrappers
 */

export interface PaginatedResponse {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface PaginatedStudents extends PaginatedResponse {
    students: Student[];
}

export interface PaginatedCourses extends PaginatedResponse {
    courses: Course[];
}

export interface PaginatedSubjects extends PaginatedResponse {
    subjects: Subject[];
}

export interface PaginatedGrades extends PaginatedResponse {
    grades: Grade[];
}

export interface PaginatedAuditLogs extends PaginatedResponse {
    logs: AuditLog[];
}

/**
 * Student Profile Types (used for detailed student view)
 */

export interface SubjectReservation {
    id: string;
    status: string;
    reservedAt: string;
    subject: {
        id: string;
        code: string;
        title: string;
        units: number;
    };
}

export interface StudentGrade {
    id: string;
    prelim: number | null;
    midterm: number | null;
    finals: number | null;
    finalGrade: number | null;
    remarks: string | null;
    subject: {
        id: string;
        code: string;
        title: string;
    };
}

export interface StudentProfile extends Omit<Student, 'course'> {
    course: {
        id: string;
        code: string;
        name: string;
    };
    subjectReservations: SubjectReservation[];
    grades: StudentGrade[];
}
