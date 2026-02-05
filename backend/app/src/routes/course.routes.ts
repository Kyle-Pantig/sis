import { Elysia, t } from "elysia";
import { CourseController } from "../controllers/course.controller";
import { authMiddleware } from "../middleware/auth.middleware";

export const courseRoutes = new Elysia({ prefix: "/courses" })
    .use(authMiddleware)
    .get("/check-code", (context: any) => CourseController.checkCourseCode(context), {
        query: t.Object({
            code: t.String(),
        }),
        requireAuth: true
    })
    .get("/", (context: any) => CourseController.getCourses(context), {
        query: t.Object({
            page: t.Optional(t.String()),
            limit: t.Optional(t.String()),
            search: t.Optional(t.String()),
        }),
        requireAuth: true
    })
    .get("/:id", ({ params: { id } }: any) => CourseController.getCourse(id), {
        requireAuth: true
    })
    .post("/", (context: any) => CourseController.createCourse(context), {
        body: t.Object({
            code: t.String(),
            name: t.String(),
            description: t.Optional(t.String()),
        }),
        requireRoles: ["admin"]
    })
    .patch("/:id", (context: any) => CourseController.updateCourse(context), {
        body: t.Object({
            code: t.Optional(t.String()),
            name: t.Optional(t.String()),
            description: t.Optional(t.String()),
        }),
        requireRoles: ["admin"]
    })
    .delete("/:id", (context: any) => CourseController.deleteCourse(context), {
        query: t.Object({
            force: t.Optional(t.String()),
        }),
        requireRoles: ["admin"]
    })
    .delete("/bulk", (context: any) => CourseController.bulkDeleteCourses(context), {
        body: t.Object({
            ids: t.Array(t.String()),
            force: t.Optional(t.Boolean()),
        }),
        requireRoles: ["admin"]
    });
