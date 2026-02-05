import { CourseService, CreateCourseData, UpdateCourseData } from "../services/course.service";

export class CourseController {
    static async checkCourseCode({ query }: { query: { code: string } }) {
        try {
            const course = await CourseService.getCourseByCode(query.code);
            return { exists: !!course };
        } catch (error) {
            console.error(error);
            return { error: "Failed to check course code" };
        }
    }

    static async getCourses({ query }: { query: { page?: string; limit?: string; search?: string } }) {
        try {
            const page = parseInt(query.page || "1");
            const limit = parseInt(query.limit || "10");
            return await CourseService.getAllCourses(page, limit, query.search);
        } catch (error) {
            console.error(error);
            return { error: "Failed to fetch courses" };
        }
    }

    static async getCourse(id: string) {
        try {
            const course = await CourseService.getCourseById(id);
            if (!course) {
                return { error: "Course not found" };
            }
            return course;
        } catch (error) {
            console.error(error);
            return { error: "Failed to fetch course" };
        }
    }

    static async createCourse(ctx: any) {
        const { body, set, jwt, cookie: { session } } = ctx;
        let user = ctx.user;
        if (!user && session?.value) {
            try { user = await jwt.verify(session.value); } catch (e) { }
        }

        try {
            const course = await CourseService.createCourse(body, user?.id);
            set.status = 201;
            return course;
        } catch (error: any) {
            console.error(error);
            if (error.code === "P2002") {
                set.status = 400;
                return { error: "Course code already exists" };
            }
            set.status = 500;
            return { error: "Failed to create course" };
        }
    }

    static async updateCourse(ctx: any) {
        const { params, body, set, jwt, cookie: { session } } = ctx;
        let user = ctx.user;
        if (!user && session?.value) {
            try { user = await jwt.verify(session.value); } catch (e) { }
        }

        try {
            const course = await CourseService.updateCourse(params.id, body, user?.id);
            return course;
        } catch (error: any) {
            console.error(error);
            if (error.code === "P2025") {
                set.status = 404;
                return { error: "Course not found" };
            }
            if (error.code === "P2002") {
                set.status = 400;
                return { error: "Course code already exists" };
            }
            set.status = 500;
            return { error: "Failed to update course" };
        }
    }

    static async deleteCourse(ctx: any) {
        const { params, query, set, jwt, cookie: { session } } = ctx;
        let user = ctx.user;
        if (!user && session?.value) {
            try { user = await jwt.verify(session.value); } catch (e) { }
        }

        try {
            const force = query.force === "true";
            await CourseService.deleteCourse(params.id, force, user?.id);
            return { success: true };
        } catch (error: any) {
            console.error(error);
            if (error.code === "P2025") {
                set.status = 404;
                return { error: "Course not found" };
            }
            if (error.code === "PREREQUISITE_FAILED") {
                set.status = 400;
                return { error: error.message };
            }
            set.status = 500;
            return { error: "Failed to delete course" };
        }
    }

    static async bulkDeleteCourses(ctx: any) {
        const { body, set, jwt, cookie: { session } } = ctx;
        let user = ctx.user;
        if (!user && session?.value) {
            try { user = await jwt.verify(session.value); } catch (e) { }
        }

        try {
            const result = await CourseService.deleteCourses(body.ids, body.force, user?.id);
            return {
                success: true,
                deletedCount: result.deletedCount,
                skippedCount: result.skippedCount,
                skippedCodes: result.skippedCodes
            };
        } catch (error: any) {
            console.error(error);
            set.status = 500;
            return { error: "Failed to delete courses" };
        }
    }
}
