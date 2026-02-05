import { AuditService } from "../services/audit.service";

export class AuditController {
    static async getLogs({ query }: { query: { page?: string; limit?: string; entityId?: string; search?: string; action?: string; entity?: string } }) {
        try {
            if (query.entityId) {
                return await AuditService.getLogsByEntity(query.entityId);
            }
            const page = parseInt(query.page || "1");
            const limit = parseInt(query.limit || "50");
            const search = query.search;
            const action = query.action;
            const entity = query.entity;
            return await AuditService.getLogs(page, limit, search, action, entity);
        } catch (error) {
            console.error(error);
            return { error: "Failed to fetch audit logs" };
        }
    }

    static async deleteLog(ctx: any) {
        try {
            const { params } = ctx;
            await AuditService.deleteLog(params.id);
            return { success: true };
        } catch (error) {
            console.error(error);
            return { error: "Failed to delete audit log" };
        }
    }

    static async deleteLogs(ctx: any) {
        try {
            const { body } = ctx;
            const result = await AuditService.deleteLogs(body.ids);
            return { count: result.count };
        } catch (error) {
            console.error(error);
            return { error: "Failed to delete audit logs" };
        }
    }

    static async getFilters() {
        try {
            return await AuditService.getFilters();
        } catch (error) {
            console.error(error);
            return { error: "Failed to fetch audit filters" };
        }
    }
}
