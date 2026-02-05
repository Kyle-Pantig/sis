import prisma from "../db";

export class AuditService {
    static async log(userId: string, action: string, entity: string, entityId: string, details?: any) {
        try {
            await prisma.auditLog.create({
                data: {
                    userId,
                    action,
                    entity,
                    entityId,
                    details: details ? JSON.stringify(details) : null
                }
            });
        } catch (error) {
            console.error("Failed to create audit log", error);
            // Don't throw, we don't want to break the main flow if logging fails
        }
    }

    static async getLogs(limit = 50) {
        return await prisma.auditLog.findMany({
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: { email: true, role: true }
                }
            }
        });
    }

    static async getLogsByEntity(entityId: string) {
        return await prisma.auditLog.findMany({
            where: { entityId },
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: { email: true, role: true }
                }
            }
        });
    }
}
