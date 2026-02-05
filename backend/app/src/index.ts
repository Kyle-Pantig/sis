import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import {
  authRoutes,
  studentRoutes,
  courseRoutes,
  subjectRoutes,
  reservationRoutes,
  gradeRoutes,
  statsRoutes,
  userRoutes,
  auditRoutes,
} from "./routes";
import { authMiddleware } from "./middleware/auth.middleware";

const app = new Elysia()
  .use(cors({
    credentials: true,
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"]
  }))
  .get("/", () => ({ status: "Online", message: "SIS API is running" }))
  .group("/api", (app) =>
    app
      .use(authMiddleware)
      .use(authRoutes)
      .use(statsRoutes)
      .use(courseRoutes)
      .use(subjectRoutes)
      .use(reservationRoutes)
      .use(gradeRoutes)
      .use(studentRoutes)
      .use(userRoutes)
      .use(auditRoutes)
  )
  .listen(3001);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
