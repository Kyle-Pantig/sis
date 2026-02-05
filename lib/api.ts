import {
    Student, PaginatedStudents, StudentProfile,
    Course, PaginatedCourses,
    Subject, PaginatedSubjects,
    Grade, PaginatedGrades,
    User, Invitation, PaginatedAuditLogs
} from "@/types";

const API_URL = ""; // Empty string for relative path because we use Next.js rewrites

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}, shouldThrow: boolean = true): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });
    const data = await response.json();

    if (!response.ok && shouldThrow) {
        throw new Error(data.error || "An error occurred");
    }

    return data;
}

export const authApi = {
    login: (email: string, password: string) =>
        fetchApi<any>("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        }),
    logout: () => fetchApi<any>("/api/auth/logout", { method: "POST" }),
    me: () => fetchApi<User & { error?: string }>("/api/auth/me"),
    changePassword: (data: any) => fetchApi<any>("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify(data),
    }),
    verifyInvite: (token: string) => fetchApi<any>(`/api/auth/verify-invite/${token}`),
    completeInvite: (data: any) => fetchApi<any>("/api/auth/complete-invite", {
        method: "POST",
        body: JSON.stringify(data),
    }),
};

export const studentsApi = {
    getAll: (page: number = 1, limit: number = 10, search?: string, courseId?: string) => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (search) params.set("search", search);
        if (courseId) params.set("courseId", courseId);
        return fetchApi<PaginatedStudents>(`/api/students?${params.toString()}`);
    },
    getCount: () => fetchApi<{ count: number }>("/api/students/count"),
    getById: (id: string) => fetchApi<StudentProfile & { error?: string }>(`/api/students/${id}`),
    create: (data: any) => fetchApi<Student & { error?: string }>("/api/students", {
        method: "POST",
        body: JSON.stringify(data),
    }, false),
    update: (id: string, data: any) => fetchApi<Student & { error?: string }>(`/api/students/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    }, false),
    delete: (id: string) => fetchApi<any>(`/api/students/${id}`, {
        method: "DELETE",
    }),
    bulkDelete: (ids: string[]) => fetchApi<any>("/api/students/bulk", {
        method: "DELETE",
        body: JSON.stringify({ ids }),
    }),
    importCsv: (students: any[]) => fetchApi<any>("/api/students/import", {
        method: "POST",
        body: JSON.stringify({ students }),
    }),
};

export const coursesApi = {
    getAll: (page: number = 1, limit: number = 10, search?: string) => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (search) params.set("search", search);
        return fetchApi<PaginatedCourses>(`/api/courses?${params.toString()}`);
    },
    checkCode: (code: string) => fetchApi<{ exists: boolean }>(`/api/courses/check-code?code=${encodeURIComponent(code)}`),
    getById: (id: string) => fetchApi<Course>(`/api/courses/${id}`),
    create: (data: any) => fetchApi<Course & { error?: string }>("/api/courses", {
        method: "POST",
        body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => fetchApi<Course & { error?: string }>(`/api/courses/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    }),
    delete: (id: string, force: boolean = false) => fetchApi<any>(`/api/courses/${id}${force ? "?force=true" : ""}`, {
        method: "DELETE",
    }),
    bulkDelete: (ids: string[], force: boolean = false) => fetchApi<{ count: number }>("/api/courses/bulk", {
        method: "DELETE",
        body: JSON.stringify({ ids, force }),
    }),
};

export const reservationsApi = {
    getByStudent: (studentId: string) => fetchApi<any[]>(`/api/reservations/student/${studentId}`),
    getAvailable: (studentId: string) => fetchApi(`/api/reservations/available/${studentId}`),
    create: (data: { studentId: string; subjectId: string }) => fetchApi("/api/reservations", {
        method: "POST",
        body: JSON.stringify(data),
    }),
    cancel: (id: string) => fetchApi(`/api/reservations/${id}/cancel`, {
        method: "PATCH",
    }),
    delete: (id: string) => fetchApi(`/api/reservations/${id}`, {
        method: "DELETE",
    }),
    bulkCreate: (studentId: string, subjectIds: string[]) => fetchApi("/api/reservations/bulk", {
        method: "POST",
        body: JSON.stringify({ studentId, subjectIds }),
    }),
    bulkDelete: (ids: string[]) => fetchApi("/api/reservations/bulk", {
        method: "DELETE",
        body: JSON.stringify({ ids }),
    }),
};

export const subjectsApi = {
    getAll: (page: number = 1, limit: number = 10, search?: string, courseId?: string) => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (search) params.set("search", search);
        if (courseId) params.set("courseId", courseId);
        return fetchApi<PaginatedSubjects>(`/api/subjects?${params.toString()}`);
    },
    getByCourse: (courseId: string) => fetchApi<Subject[]>(`/api/subjects/course/${courseId}`),
    getById: (id: string) => fetchApi<Subject>(`/api/subjects/${id}`),
    create: (data: any) => fetchApi<Subject & { error?: string }>("/api/subjects", {
        method: "POST",
        body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => fetchApi<Subject & { error?: string }>(`/api/subjects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    }),
    delete: (id: string, force: boolean = false) => fetchApi<any>(`/api/subjects/${id}${force ? "?force=true" : ""}`, {
        method: "DELETE",
    }),
    bulkDelete: (ids: string[], force: boolean = false) => fetchApi<any>("/api/subjects/bulk", {
        method: "DELETE",
        body: JSON.stringify({ ids, force }),
    }),
    checkAvailability: (courseId: string, code?: string, title?: string, excludeId?: string) => {
        const params = new URLSearchParams({ courseId });
        if (code) params.set("code", code);
        if (title) params.set("title", title);
        if (excludeId) params.set("excludeId", excludeId);
        return fetchApi<{ codeExists: boolean; titleExists: boolean }>(`/api/subjects/check-availability?${params.toString()}`);
    },
};

export const gradesApi = {
    getAll: (page: number = 1, limit: number = 10, courseId?: string, subjectId?: string, search?: string, remarks?: string) => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (courseId) params.set("courseId", courseId);
        if (subjectId) params.set("subjectId", subjectId);
        if (search) params.set("search", search);
        if (remarks) params.set("remarks", remarks);
        return fetchApi<PaginatedGrades>(`/api/grades?${params.toString()}`);
    },
    getByStudent: (studentId: string) => fetchApi<Grade[]>(`/api/grades/student/${studentId}`),
    getBySubject: (subjectId: string) => fetchApi<Grade[]>(`/api/grades/subject/${subjectId}`),
    getById: (id: string) => fetchApi<Grade>(`/api/grades/${id}`),
    create: (data: any) => fetchApi<Grade & { error?: string }>("/api/grades", {
        method: "POST",
        body: JSON.stringify(data),
    }),
    upsert: (data: any) => fetchApi<Grade & { error?: string }>("/api/grades/upsert", {
        method: "PUT",
        body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => fetchApi<Grade & { error?: string }>(`/api/grades/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    }),
    delete: (id: string) => fetchApi<any>(`/api/grades/${id}`, {
        method: "DELETE",
    }),
};

export const statsApi = {
    getSummary: () => fetchApi<{ students: number; courses: number; subjects: number; reservations: number }>("/api/stats"),
    getCourseStats: () => fetchApi<Array<{ id: string; code: string; name: string; _count: { students: number } }>>("/api/stats/courses"),
};

export const usersApi = {
    getEncoders: () => fetchApi<User[]>("/api/users/encoders"),
    getInvitations: () => fetchApi<Invitation[]>("/api/users/invitations"),
    deleteInvitation: (id: string) => fetchApi<any>(`/api/users/invitations/${id}`, {
        method: "DELETE",
    }),
    resendInvitation: (id: string) => fetchApi<any>(`/api/users/invitations/${id}/resend`, {
        method: "POST",
    }),
    createEncoder: (data: any) => fetchApi<any>("/api/users/encoders", {
        method: "POST",
        body: JSON.stringify(data),
    }),
    toggleStatus: (id: string, isActive: boolean) => fetchApi<any>(`/api/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
    }),
    deleteEncoder: (id: string) => fetchApi<any>(`/api/users/${id}`, {
        method: "DELETE",
    }),
};

export const auditApi = {
    getLogs: (page: number = 1, limit: number = 50, search?: string, action?: string, entity?: string, entityId?: string, startDate?: string, endDate?: string) => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (search) params.set("search", search);
        if (action) params.set("action", action);
        if (entity) params.set("entity", entity);
        if (entityId) params.set("entityId", entityId);
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);
        return fetchApi<PaginatedAuditLogs>(`/api/audit?${params.toString()}`);
    },
    getFilters: () => {
        return fetchApi<{ actions: string[]; entities: string[] }>("/api/audit/filters");
    },
    delete: (id: string) => fetchApi<any>(`/api/audit/${id}`, {
        method: "DELETE"
    }),
    bulkDelete: (ids: string[]) => fetchApi<{ count: number }>("/api/audit/bulk", {
        method: "DELETE",
        body: JSON.stringify({ ids })
    })
}
