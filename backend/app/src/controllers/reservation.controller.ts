import { SubjectReservationService, CreateReservationData } from "../services/reservation.service";

export class ReservationController {
    static async getStudentReservations(studentId: string) {
        try {
            return await SubjectReservationService.getReservationsByStudent(studentId);
        } catch (error) {
            console.error(error);
            return { error: "Failed to fetch reservations" };
        }
    }

    static async getAvailableSubjects(studentId: string) {
        try {
            return await SubjectReservationService.getAvailableSubjectsForStudent(studentId);
        } catch (error: any) {
            console.error(error);
            return { error: error.message || "Failed to fetch available subjects" };
        }
    }

    static async createReservation(ctx: any) {
        const { body, set, jwt, cookie: { session } } = ctx;
        let user = ctx.user;
        if (!user && session?.value) {
            try { user = await jwt.verify(session.value); } catch (e) { }
        }

        try {
            const reservation = await SubjectReservationService.createReservation(body, user?.id);
            set.status = 201;
            return reservation;
        } catch (error: any) {
            console.error(error);
            set.status = 400;
            return { error: error.message || "Failed to create reservation" };
        }
    }

    static async cancelReservation(ctx: any) {
        const { params, set, jwt, cookie: { session } } = ctx;
        let user = ctx.user;
        if (!user && session?.value) {
            try { user = await jwt.verify(session.value); } catch (e) { }
        }

        try {
            const reservation = await SubjectReservationService.cancelReservation(params.id, user?.id);
            return reservation;
        } catch (error: any) {
            console.error(error);
            if (error.code === "P2025") {
                set.status = 404;
                return { error: "Reservation not found" };
            }
            set.status = 500;
            return { error: "Failed to cancel reservation" };
        }
    }

    static async deleteReservation(ctx: any) {
        const { params, set, jwt, cookie: { session } } = ctx;
        let user = ctx.user;
        if (!user && session?.value) {
            try { user = await jwt.verify(session.value); } catch (e) { }
        }

        try {
            await SubjectReservationService.deleteReservation(params.id, user?.id);
            return { success: true };
        } catch (error: any) {
            console.error(error);
            if (error.code === "P2025") {
                set.status = 404;
                return { error: "Reservation not found" };
            }
            set.status = 500;
            return { error: "Failed to delete reservation" };
        }
    }

    static async bulkCreateReservations(ctx: any) {
        const { body, set, jwt, cookie: { session } } = ctx;
        let user = ctx.user;
        if (!user && session?.value) {
            try { user = await jwt.verify(session.value); } catch (e) { }
        }

        try {
            const results = await SubjectReservationService.bulkCreateReservations(body.studentId, body.subjectIds, user?.id);
            set.status = 201;
            return results;
        } catch (error: any) {
            console.error(error);
            set.status = 400;
            return { error: error.message || "Failed to create reservations" };
        }
    }

    static async bulkDeleteReservations(ctx: any) {
        const { body, set, jwt, cookie: { session } } = ctx;
        let user = ctx.user;
        if (!user && session?.value) {
            try { user = await jwt.verify(session.value); } catch (e) { }
        }

        try {
            await SubjectReservationService.bulkDeleteReservations(body.ids, user?.id);
            return { success: true };
        } catch (error: any) {
            console.error(error);
            set.status = 500;
            return { error: "Failed to delete reservations" };
        }
    }
}
