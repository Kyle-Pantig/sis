const API_URL = ""; // Empty string for relative path because we use Next.js rewrites

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "An error occurred");
    }

    return data;
}

export const authApi = {
    login: (email: string, password: string) =>
        fetchApi("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
        }),
    logout: () => fetchApi("/api/auth/logout", { method: "POST" }),
    me: () => fetchApi("/api/auth/me"),
    changePassword: (data: any) => fetchApi("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify(data),
    }),
    verifyInvite: (token: string) => fetchApi(`/api/auth/verify-invite/${token}`),
    completeInvite: (data: any) => fetchApi("/api/auth/complete-invite", {
        method: "POST",
        body: JSON.stringify(data),
    }),
};

export const studentsApi = {
    getAll: (page: number = 1, limit: number = 10, search?: string, courseId?: string) => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (search) params.set("search", search);
        if (courseId) params.set("courseId", courseId);
        return fetchApi(`/api/students?${params.toString()}`);
    },
    getCount: () => fetchApi("/api/students/count"),
    getById: (id: string) => fetchApi(`/api/students/${id}`),
    create: (data: any) => fetchApi("/api/students", {
        method: "POST",
        body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => fetchApi(`/api/students/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    }),
    delete: (id: string) => fetchApi(`/api/students/${id}`, {
        method: "DELETE",
    }),
    bulkDelete: (ids: string[]) => fetchApi("/api/students/bulk", {
        method: "DELETE",
        body: JSON.stringify({ ids }),
    }),
    importCsv: (students: any[]) => fetchApi("/api/students/import", {
        method: "POST",
        body: JSON.stringify({ students }),
    }),
};

export const coursesApi = {
    getAll: (page: number = 1, limit: number = 10, search?: string) => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (search) params.set("search", search);
        return fetchApi(`/api/courses?${params.toString()}`);
    },
    getById: (id: string) => fetchApi(`/api/courses/${id}`),
    create: (data: any) => fetchApi("/api/courses", {
        method: "POST",
        body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => fetchApi(`/api/courses/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    }),
    delete: (id: string, force: boolean = false) => fetchApi(`/api/courses/${id}${force ? "?force=true" : ""}`, {
        method: "DELETE",
    }),
    bulkDelete: (ids: string[], force: boolean = false) => fetchApi("/api/courses/bulk", {
        method: "DELETE",
        body: JSON.stringify({ ids, force }),
    }),
};

export const reservationsApi = {
    getByStudent: (studentId: string) => fetchApi(`/api/reservations/student/${studentId}`),
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
        return fetchApi(`/api/subjects?${params.toString()}`);
    },
    getByCourse: (courseId: string) => fetchApi(`/api/subjects/course/${courseId}`),
    getById: (id: string) => fetchApi(`/api/subjects/${id}`),
    create: (data: any) => fetchApi("/api/subjects", {
        method: "POST",
        body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => fetchApi(`/api/subjects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    }),
    delete: (id: string, force: boolean = false) => fetchApi(`/api/subjects/${id}${force ? "?force=true" : ""}`, {
        method: "DELETE",
    }),
    bulkDelete: (ids: string[], force: boolean = false) => fetchApi("/api/subjects/bulk", {
        method: "DELETE",
        body: JSON.stringify({ ids, force }),
    }),
};

export const gradesApi = {
    getAll: (page: number = 1, limit: number = 10, courseId?: string, subjectId?: string, search?: string) => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (courseId) params.set("courseId", courseId);
        if (subjectId) params.set("subjectId", subjectId);
        if (search) params.set("search", search);
        return fetchApi(`/api/grades?${params.toString()}`);
    },
    getByStudent: (studentId: string) => fetchApi(`/api/grades/student/${studentId}`),
    getBySubject: (subjectId: string) => fetchApi(`/api/grades/subject/${subjectId}`),
    getById: (id: string) => fetchApi(`/api/grades/${id}`),
    create: (data: any) => fetchApi("/api/grades", {
        method: "POST",
        body: JSON.stringify(data),
    }),
    upsert: (data: any) => fetchApi("/api/grades/upsert", {
        method: "PUT",
        body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => fetchApi(`/api/grades/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
    }),
    delete: (id: string) => fetchApi(`/api/grades/${id}`, {
        method: "DELETE",
    }),
};

export const statsApi = {
    getSummary: () => fetchApi("/api/stats"),
    getCourseStats: () => fetchApi("/api/stats/courses"),
};

export const usersApi = {
    getEncoders: () => fetchApi("/api/users/encoders"),
    getInvitations: () => fetchApi("/api/users/invitations"),
    deleteInvitation: (id: string) => fetchApi(`/api/users/invitations/${id}`, {
        method: "DELETE",
    }),
    createEncoder: (data: any) => fetchApi("/api/users/encoders", {
        method: "POST",
        body: JSON.stringify(data),
    }),
    toggleStatus: (id: string, isActive: boolean) => fetchApi(`/api/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
    }),
    deleteEncoder: (id: string) => fetchApi(`/api/users/${id}`, {
        method: "DELETE",
    }),
};

export const auditApi = {
    getLogs: (limit: number = 50, entityId?: string) => {
        const params = new URLSearchParams({ limit: String(limit) });
        if (entityId) params.set("entityId", entityId);
        return fetchApi(`/api/audit?${params.toString()}`);
    }
};

