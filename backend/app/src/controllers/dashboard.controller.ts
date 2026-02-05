import { DashboardService } from "../services/dashboard.service";

export class DashboardController {
    static async getStats() {
        try {
            return await DashboardService.getStats();
        } catch (error) {
            console.error(error);
            return { error: "Failed to fetch dashboard stats" };
        }
    }

    static async getCourseStats() {
        try {
            return await DashboardService.getStudentsPerCourse();
        } catch (error) {
            console.error(error);
            return { error: "Failed to fetch course stats" };
        }
    }
}
