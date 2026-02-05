import { SubjectService, CreateSubjectData, UpdateSubjectData } from "../services/subject.service";

export class SubjectController {
    static async checkAvailability({ query }: { query: { courseId: string; code: string; title: string; excludeId?: string } }) {
        try {
            if (!query.courseId || (!query.code && !query.title)) {
                return { error: "Missing required parameters" };
            }
            return await SubjectService.checkSubjectAvailability(
                query.courseId,
                query.code || "",
                query.title || "",
                query.excludeId
            );
        } catch (error) {
            console.error(error);
            return { error: "Failed to check subject availability" };
        }
    }

    static async getSubjects({ query }: { query: { page?: string; limit?: string; search?: string; courseId?: string } }) {
        try {
            const page = parseInt(query.page || "1");
            const limit = parseInt(query.limit || "10");
            return await SubjectService.getAllSubjects(page, limit, query.search, query.courseId);
        } catch (error) {
            console.error(error);
            return { error: "Failed to fetch subjects" };
        }
    }

    static async getSubject(id: string) {
        try {
            const subject = await SubjectService.getSubjectById(id);
            if (!subject) {
                return { error: "Subject not found" };
            }
            return subject;
        } catch (error) {
            console.error(error);
            return { error: "Failed to fetch subject" };
        }
    }

    static async getSubjectsByCourse({ params }: { params: { courseId: string } }) {
        try {
            return await SubjectService.getSubjectsByCourse(params.courseId);
        } catch (error) {
            console.error(error);
            return { error: "Failed to fetch subjects" };
        }
    }

    static async createSubject(ctx: any) {
        const { body, set, jwt, cookie: { session } } = ctx;
        let user = ctx.user;
        if (!user && session?.value) {
            try { user = await jwt.verify(session.value); } catch (e) { }
        }

        try {
            const subject = await SubjectService.createSubject(body, user?.id);
            set.status = 201;
            return subject;
        } catch (error: any) {
            console.error(error);
            if (error.code === "P2002") {
                set.status = 400;
                return { error: "Subject code already exists for this course" };
            }
            set.status = 500;
            return { error: "Failed to create subject" };
        }
    }

    static async updateSubject(ctx: any) {
        const { params, body, set, jwt, cookie: { session } } = ctx;
        let user = ctx.user;
        if (!user && session?.value) {
            try { user = await jwt.verify(session.value); } catch (e) { }
        }

        try {
            const subject = await SubjectService.updateSubject(params.id, body, user?.id);
            return subject;
        } catch (error: any) {
            console.error(error);
            if (error.code === "P2025") {
                set.status = 404;
                return { error: "Subject not found" };
            }
            if (error.code === "P2002") {
                set.status = 400;
                return { error: "Subject code already exists for this course" };
            }
            set.status = 500;
            return { error: "Failed to update subject" };
        }
    }

    static async deleteSubject(ctx: any) {
        const { params, query, set, jwt, cookie: { session } } = ctx;
        let user = ctx.user;
        if (!user && session?.value) {
            try { user = await jwt.verify(session.value); } catch (e) { }
        }

        try {
            const force = query.force === "true";
            await SubjectService.deleteSubject(params.id, force, user?.id);
            return { success: true };
        } catch (error: any) {
            console.error(error);
            if (error.code === "P2025") {
                set.status = 404;
                return { error: "Subject not found" };
            }
            if (error.code === "PREREQUISITE_FAILED") {
                set.status = 400;
                return { error: error.message };
            }
            set.status = 500;
            return { error: "Failed to delete subject" };
        }
    }

    static async bulkDeleteSubjects(ctx: any) {
        const { body, set, jwt, cookie: { session } } = ctx;
        let user = ctx.user;
        if (!user && session?.value) {
            try { user = await jwt.verify(session.value); } catch (e) { }
        }

        try {
            const result = await SubjectService.deleteSubjects(body.ids, body.force, user?.id);
            return {
                success: true,
                deletedCount: result.deletedCount,
                skippedCount: result.skippedCount,
                skippedCodes: result.skippedCodes
            };
        } catch (error: any) {
            console.error(error);
            set.status = 500;
            return { error: "Failed to delete subjects" };
        }
    }
}
