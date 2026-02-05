import { Elysia, t } from "elysia";
import { AuditController } from "../controllers/audit.controller";
import { authMiddleware } from "../middleware/auth.middleware";

export const auditRoutes = new Elysia({ prefix: "/audit" })
    .use(authMiddleware)
    .get("/", (context) => AuditController.getLogs(context as any), {
        query: t.Object({
            limit: t.Optional(t.String()),
            entityId: t.Optional(t.String())
        }),
        requireRoles: ["admin"]
    });
