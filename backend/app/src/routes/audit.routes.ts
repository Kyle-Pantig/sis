import { Elysia, t } from "elysia";
import { AuditController } from "../controllers/audit.controller";
import { authMiddleware } from "../middleware/auth.middleware";

export const auditRoutes = new Elysia({ prefix: "/audit" })
    .use(authMiddleware)
    .get("/filters", () => AuditController.getFilters(), {
        requireRoles: ["admin"]
    })
    .get("/", (context) => AuditController.getLogs(context as any), {
        query: t.Object({
            page: t.Optional(t.String()),
            limit: t.Optional(t.String()),
            search: t.Optional(t.String()),
            action: t.Optional(t.String()),
            entity: t.Optional(t.String()),
            entityId: t.Optional(t.String()),
            startDate: t.Optional(t.String()),
            endDate: t.Optional(t.String())
        }),
        requireRoles: ["admin"]
    })
    .delete("/:id", (context) => AuditController.deleteLog(context as any), {
        requireRoles: ["admin"]
    })
    .delete("/bulk", (context) => AuditController.deleteLogs(context as any), {
        body: t.Object({
            ids: t.Array(t.String())
        }),
        requireRoles: ["admin"]
    });
