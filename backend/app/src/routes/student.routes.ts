import { Elysia, t } from "elysia";
import { StudentController } from "../controllers/student.controller";
import { authMiddleware } from "../middleware/auth.middleware";

export const studentRoutes = new Elysia({ prefix: "/students" })
    .use(authMiddleware)
    .get("/", (context: any) => StudentController.getStudents(context), {
        query: t.Object({
            page: t.Optional(t.String()),
            limit: t.Optional(t.String()),
            search: t.Optional(t.String()),
            courseId: t.Optional(t.String()),
        }),
        requireAuth: true
    })
    .get("/count", () => StudentController.getCount(), {
        requireAuth: true
    })
    .get("/:id", ({ params: { id } }: any) => StudentController.getStudent(id), {
        requireAuth: true
    })
    .post("/", (context: any) => StudentController.createStudent(context), {
        body: t.Object({
            studentNo: t.String(),
            firstName: t.String(),
            lastName: t.String(),
            email: t.Optional(t.Nullable(t.String())),
            birthDate: t.String(),
            courseId: t.String(),
        }),
        requireRoles: ["admin", "encoder"]
    })
    .patch("/:id", (context: any) => StudentController.updateStudent(context), {
        body: t.Object({
            studentNo: t.Optional(t.String()),
            firstName: t.Optional(t.String()),
            lastName: t.Optional(t.String()),
            email: t.Optional(t.Nullable(t.String())),
            birthDate: t.Optional(t.String()),
            courseId: t.Optional(t.String()),
        }),
        requireRoles: ["admin", "encoder"]
    })
    .post("/import", (context: any) => StudentController.importStudents(context), {
        body: t.Object({
            students: t.Array(t.Object({
                studentNo: t.String(),
                firstName: t.String(),
                lastName: t.String(),
                email: t.Optional(t.Nullable(t.String())),
                birthDate: t.String(),
                course: t.String(),
            })),
        }),
        requireRoles: ["admin"]
    })
    .delete("/bulk", (context: any) => StudentController.deleteStudents(context), {
        body: t.Object({
            ids: t.Array(t.String()),
        }),
        requireRoles: ["admin"]
    })
    .delete("/:id", (context: any) => StudentController.deleteStudent(context), {
        requireRoles: ["admin"]
    });
