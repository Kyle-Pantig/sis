import { GradeService, CreateGradeData, UpdateGradeData } from "../services/grade.service";

export class GradeController {
    static async getGrades({ query }: { query: { page?: string; limit?: string; courseId?: string; subjectId?: string; search?: string } }) {
        try {
            const page = parseInt(query.page || "1");
            const limit = parseInt(query.limit || "10");
            return await GradeService.getAllGrades(page, limit, query.courseId, query.subjectId, query.search);
        } catch (error) {
            console.error(error);
            return { error: "Failed to fetch grades" };
        }
    }

    static async getGrade(id: string) {
        try {
            const grade = await GradeService.getGradeById(id);
            if (!grade) {
                return { error: "Grade not found" };
            }
            return grade;
        } catch (error) {
            console.error(error);
            return { error: "Failed to fetch grade" };
        }
    }

    static async getGradesByStudent({ params }: { params: { studentId: string } }) {
        try {
            return await GradeService.getGradesByStudent(params.studentId);
        } catch (error) {
            console.error(error);
            return { error: "Failed to fetch grades" };
        }
    }

    static async getGradesBySubject({ params }: { params: { subjectId: string } }) {
        try {
            return await GradeService.getGradesBySubject(params.subjectId);
        } catch (error) {
            console.error(error);
            return { error: "Failed to fetch grades" };
        }
    }

    static async createGrade({ body, set, user }: { body: CreateGradeData; set: any; user: any }) {
        if (user?.id) body.encodedByUserId = user.id;
        try {
            const grade = await GradeService.createGrade(body);
            set.status = 201;
            return grade;
        } catch (error: any) {
            console.error(error);
            if (error.code === "P2002") {
                set.status = 400;
                return { error: "Grade already exists for this student and subject" };
            }
            set.status = 500;
            return { error: "Failed to create grade" };
        }
    }

    static async updateGrade({ params, body, set, user }: { params: { id: string }; body: UpdateGradeData; set: any; user: any }) {
        try {
            const grade = await GradeService.updateGrade(params.id, body, user?.id);
            return grade;
        } catch (error: any) {
            console.error(error);
            if (error.message === "Grade not found" || error.code === "P2025") {
                set.status = 404;
                return { error: "Grade not found" };
            }
            set.status = 500;
            return { error: "Failed to update grade" };
        }
    }

    static async upsertGrade({ body, set, user }: { body: CreateGradeData; set: any; user: any }) {
        if (user?.id) body.encodedByUserId = user.id;
        try {
            const grade = await GradeService.upsertGrade(body);
            return grade;
        } catch (error: any) {
            console.error(error);
            set.status = 500;
            return { error: "Failed to save grade" };
        }
    }

    static async deleteGrade({ params, set, user }: { params: { id: string }; set: any; user: any }) {
        try {
            await GradeService.deleteGrade(params.id, user?.id);
            return { success: true };
        } catch (error: any) {
            console.error(error);
            if (error.code === "P2025") {
                set.status = 404;
                return { error: "Grade not found" };
            }
            set.status = 500;
            return { error: "Failed to delete grade" };
        }
    }
}
