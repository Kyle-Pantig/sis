import { Elysia, t } from "elysia";
import { ReservationController } from "../controllers/reservation.controller";
import { authMiddleware } from "../middleware/auth.middleware";

export const reservationRoutes = new Elysia({ prefix: "/reservations" })
    .use(authMiddleware)
    .get("/student/:studentId", ({ params: { studentId } }: any) =>
        ReservationController.getStudentReservations(studentId), {
        requireAuth: true
    })
    .get("/available/:studentId", ({ params: { studentId } }: any) =>
        ReservationController.getAvailableSubjects(studentId), {
        requireAuth: true
    })
    .post("/", (context: any) => ReservationController.createReservation(context), {
        body: t.Object({
            studentId: t.String(),
            subjectId: t.String(),
        }),
        requireRoles: ["admin", "encoder"]
    })
    .patch("/:id/cancel", (context: any) => ReservationController.cancelReservation(context), {
        requireRoles: ["admin", "encoder"]
    })
    .delete("/:id", (context: any) => ReservationController.deleteReservation(context), {
        requireRoles: ["admin", "encoder"]
    });
