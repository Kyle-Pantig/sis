import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { cookie } from "@elysiajs/cookie";
import { AuthController } from "../controllers/auth.controller";

export const authRoutes = new Elysia({ prefix: "/auth" })
    .use(
        jwt({
            name: "jwt",
            secret: process.env.JWT_SECRET || "sis-secret-key-2026",
        })
    )
    .use(cookie())
    .post("/login", (context) => AuthController.login(context), {
        body: t.Object({
            email: t.String(),
            password: t.String(),
        }),
    })
    .get("/verify-invite/:token", (context) => AuthController.verifyInvite(context))
    .post("/complete-invite", (context) => AuthController.completeInvite(context), {
        body: t.Object({
            token: t.String(),
            password: t.String(),
        }),
    })
    .derive(async ({ jwt, cookie: { session } }: any) => {
        if (!session?.value) {
            return { user: null };
        }

        try {
            const user = await jwt.verify(session.value);
            return { user };
        } catch (error) {
            return { user: null };
        }
    })
    .get("/me", ({ user }: any) => {
        return user || null;
    })
    .post("/logout", ({ cookie: { session } }: any) => {
        session.remove();
        return { message: "Logout successful" };
    })
    .post("/change-password", (context: any) => AuthController.changePassword(context), {
        body: t.Object({
            oldPassword: t.String(),
            newPassword: t.String(),
        }),
    });
