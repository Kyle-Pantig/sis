import { Elysia, t } from "elysia";
import { UserController } from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth.middleware";

export const userRoutes = new Elysia({ prefix: "/users" })
    .use(authMiddleware)
    // Get all encoders
    .get("/encoders", () => UserController.getEncoders(), {
        requireRoles: ["admin"]
    })
    // Get pending invitations
    .get("/invitations", () => UserController.getInvitations(), {
        requireRoles: ["admin"]
    })
    // Revoke invitation
    .delete("/invitations/:id", (context: any) => UserController.deleteInvitation(context), {
        requireRoles: ["admin"]
    })
    // Invite new encoder
    .post("/encoders", (context: any) => UserController.inviteEncoder(context), {
        body: t.Object({
            email: t.String(),
        }),
        requireRoles: ["admin"]
    })
    // Toggle active status
    .patch("/:id/status", (context: any) => UserController.toggleStatus(context), {
        body: t.Object({
            isActive: t.Boolean(),
        }),
        requireRoles: ["admin"]
    })
    // Delete encoder
    .delete("/:id", (context: any) => UserController.deleteEncoder(context), {
        requireRoles: ["admin"]
    });
