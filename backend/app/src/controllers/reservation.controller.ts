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

    static async createReservation({ body, set }: { body: CreateReservationData; set: any }) {
        try {
            const reservation = await SubjectReservationService.createReservation(body);
            set.status = 201;
            return reservation;
        } catch (error: any) {
            console.error(error);
            set.status = 400;
            return { error: error.message || "Failed to create reservation" };
        }
    }

    static async cancelReservation({ params, set }: { params: { id: string }; set: any }) {
        try {
            const reservation = await SubjectReservationService.cancelReservation(params.id);
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

    static async deleteReservation({ params, set }: { params: { id: string }; set: any }) {
        try {
            await SubjectReservationService.deleteReservation(params.id);
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

    static async bulkCreateReservations({ body, set }: { body: { studentId: string; subjectIds: string[] }; set: any }) {
        try {
            const results = await SubjectReservationService.bulkCreateReservations(body.studentId, body.subjectIds);
            set.status = 201;
            return results;
        } catch (error: any) {
            console.error(error);
            set.status = 400;
            return { error: error.message || "Failed to create reservations" };
        }
    }

    static async bulkDeleteReservations({ body, set }: { body: { ids: string[] }; set: any }) {
        try {
            await SubjectReservationService.bulkDeleteReservations(body.ids);
            return { success: true };
        } catch (error: any) {
            console.error(error);
            set.status = 500;
            return { error: "Failed to delete reservations" };
        }
    }
}
