import { Elysia } from "elysia";
import { DashboardController } from "../controllers/dashboard.controller";
import { authMiddleware } from "../middleware/auth.middleware";

export const statsRoutes = new Elysia({ prefix: "/stats" })
    .use(authMiddleware)
    .get("/", () => DashboardController.getStats(), {
        requireAuth: true
    })
    .get("/courses", () => DashboardController.getCourseStats(), {
        requireAuth: true
    });
