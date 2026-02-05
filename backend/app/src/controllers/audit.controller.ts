import { AuditService } from "../services/audit.service";

export class AuditController {
    static async getLogs({ query }: { query: { limit?: string; entityId?: string } }) {
        try {
            if (query.entityId) {
                return await AuditService.getLogsByEntity(query.entityId);
            }
            const limit = parseInt(query.limit || "50");
            return await AuditService.getLogs(limit);
        } catch (error) {
            console.error(error);
            return { error: "Failed to fetch audit logs" };
        }
    }
}
