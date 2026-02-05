import { SubjectService, CreateSubjectData, UpdateSubjectData } from "../services/subject.service";

export class SubjectController {
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

    static async createSubject({ body, set }: { body: CreateSubjectData; set: any }) {
        try {
            const subject = await SubjectService.createSubject(body);
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

    static async updateSubject({ params, body, set }: { params: { id: string }; body: UpdateSubjectData; set: any }) {
        try {
            const subject = await SubjectService.updateSubject(params.id, body);
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

    static async deleteSubject({ params, query, set }: { params: { id: string }; query: { force?: string }; set: any }) {
        try {
            const force = query.force === "true";
            await SubjectService.deleteSubject(params.id, force);
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

    static async bulkDeleteSubjects({ body, set }: { body: { ids: string[]; force?: boolean }; set: any }) {
        try {
            const result = await SubjectService.deleteSubjects(body.ids, body.force);
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
