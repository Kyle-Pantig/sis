import { Elysia, t } from "elysia";
import { SubjectController } from "../controllers/subject.controller";
import { authMiddleware } from "../middleware/auth.middleware";

export const subjectRoutes = new Elysia({ prefix: "/subjects" })
    .use(authMiddleware)
    .get("/check-availability", (context: any) => SubjectController.checkAvailability(context), {
        query: t.Object({
            courseId: t.String(),
            code: t.Optional(t.String()),
            title: t.Optional(t.String()),
            excludeId: t.Optional(t.String()),
        }),
        requireAuth: true
    })
    .get("/", (context: any) => SubjectController.getSubjects(context), {
        query: t.Object({
            page: t.Optional(t.String()),
            limit: t.Optional(t.String()),
            search: t.Optional(t.String()),
            courseId: t.Optional(t.String()),
        }),
        requireAuth: true
    })
    .get("/course/:courseId", (context: any) => SubjectController.getSubjectsByCourse(context), {
        requireAuth: true
    })
    .get("/:id", ({ params: { id } }: any) => SubjectController.getSubject(id), {
        requireAuth: true
    })
    .post("/", (context: any) => SubjectController.createSubject(context), {
        body: t.Object({
            courseId: t.String(),
            code: t.String(),
            title: t.String(),
            units: t.Number(),
        }),
        requireRoles: ["admin"]
    })
    .patch("/:id", (context: any) => SubjectController.updateSubject(context), {
        body: t.Object({
            code: t.Optional(t.String()),
            title: t.Optional(t.String()),
            units: t.Optional(t.Number()),
        }),
        requireRoles: ["admin"]
    })
    .delete("/:id", (context: any) => SubjectController.deleteSubject(context), {
        query: t.Object({
            force: t.Optional(t.String()),
        }),
        requireRoles: ["admin"]
    })
    .delete("/bulk", (context: any) => SubjectController.bulkDeleteSubjects(context), {
        body: t.Object({
            ids: t.Array(t.String()),
            force: t.Optional(t.Boolean()),
        }),
        requireRoles: ["admin"]
    });
