import { Elysia, t } from "elysia";
import { GradeController } from "../controllers/grade.controller";
import { authMiddleware } from "../middleware/auth.middleware";

export const gradeRoutes = new Elysia({ prefix: "/grades" })
    .use(authMiddleware)
    .get("/", (context: any) => GradeController.getGrades(context), {
        query: t.Object({
            page: t.Optional(t.String()),
            limit: t.Optional(t.String()),
            courseId: t.Optional(t.String()),
            subjectId: t.Optional(t.String()),
            search: t.Optional(t.String()),
            remarks: t.Optional(t.String()),
        }),
        requireAuth: true
    })
    .get("/student/:studentId", (context: any) => GradeController.getGradesByStudent(context), {
        requireAuth: true
    })
    .get("/subject/:subjectId", (context: any) => GradeController.getGradesBySubject(context), {
        requireAuth: true
    })
    .get("/:id", ({ params: { id } }: any) => GradeController.getGrade(id), {
        requireAuth: true
    })
    .post("/", (context: any) => GradeController.createGrade(context), {
        body: t.Object({
            studentId: t.String(),
            subjectId: t.String(),
            courseId: t.String(),
            prelim: t.Optional(t.Nullable(t.Number())),
            midterm: t.Optional(t.Nullable(t.Number())),
            finals: t.Optional(t.Nullable(t.Number())),
            remarks: t.Optional(t.String()),
            encodedByUserId: t.String(),
        }),
        requireRoles: ["admin", "encoder"]
    })
    .put("/upsert", (context: any) => GradeController.upsertGrade(context), {
        body: t.Object({
            studentId: t.String(),
            subjectId: t.String(),
            courseId: t.String(),
            prelim: t.Optional(t.Nullable(t.Number())),
            midterm: t.Optional(t.Nullable(t.Number())),
            finals: t.Optional(t.Nullable(t.Number())),
            remarks: t.Optional(t.String()),
            encodedByUserId: t.String(),
        }),
        requireRoles: ["admin", "encoder"]
    })
    .patch("/:id", async (context: any) => {
        // Manually extract user since derive doesn't propagate
        let user = context.user;
        if (!user && context.cookie?.session?.value) {
            try {
                user = await context.jwt.verify(context.cookie.session.value);
            } catch (e) {
                // Ignore verify error
            }
        }
        return GradeController.updateGrade({ ...context, user });
    }, {
        body: t.Object({
            prelim: t.Optional(t.Nullable(t.Number())),
            midterm: t.Optional(t.Nullable(t.Number())),
            finals: t.Optional(t.Nullable(t.Number())),
            remarks: t.Optional(t.String()),
        }),
        requireRoles: ["admin", "encoder"]
    })
    .delete("/:id", async (context: any) => {
        // Manually extract user since derive doesn't propagate
        let user = context.user;
        if (!user && context.cookie?.session?.value) {
            try {
                user = await context.jwt.verify(context.cookie.session.value);
            } catch (e) {
                // Ignore verify error
            }
        }
        return GradeController.deleteGrade({ ...context, user });
    }, {
        requireRoles: ["admin", "encoder"]
    });
