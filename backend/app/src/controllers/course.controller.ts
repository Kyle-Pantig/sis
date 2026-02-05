import { CourseService, CreateCourseData, UpdateCourseData } from "../services/course.service";

export class CourseController {
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

    static async createCourse({ body, set }: { body: CreateCourseData; set: any }) {
        try {
            const course = await CourseService.createCourse(body);
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

    static async updateCourse({ params, body, set }: { params: { id: string }; body: UpdateCourseData; set: any }) {
        try {
            const course = await CourseService.updateCourse(params.id, body);
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

    static async deleteCourse({ params, query, set }: { params: { id: string }; query: { force?: string }; set: any }) {
        try {
            const force = query.force === "true";
            await CourseService.deleteCourse(params.id, force);
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

    static async bulkDeleteCourses({ body, set }: { body: { ids: string[]; force?: boolean }; set: any }) {
        try {
            const result = await CourseService.deleteCourses(body.ids, body.force);
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
