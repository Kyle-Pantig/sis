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

    static async getLogs(page = 1, limit = 50, search?: string, action?: string, entity?: string, startDate?: string, endDate?: string) {
        const skip = (page - 1) * limit;

        const where: any = {};

        const andFilters: any[] = [];

        if (action) {
            andFilters.push({ action: { equals: action, mode: "insensitive" } });
        }

        if (entity) {
            andFilters.push({ entity: { equals: entity, mode: "insensitive" } });
        }

        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            andFilters.push({ createdAt: { gte: start } });
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            andFilters.push({ createdAt: { lte: end } });
        }

        if (search) {
            andFilters.push({
                OR: [
                    { action: { contains: search, mode: "insensitive" } },
                    { entity: { contains: search, mode: "insensitive" } },
                    { entityId: { contains: search, mode: "insensitive" } },
                    { details: { contains: search, mode: "insensitive" } },
                    {
                        user: {
                            email: { contains: search, mode: "insensitive" }
                        }
                    }
                ]
            });
        }

        if (andFilters.length > 0) {
            where.AND = andFilters;
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                take: limit,
                skip,
                orderBy: { createdAt: "desc" },
                include: {
                    user: {
                        select: { email: true, role: true }
                    }
                }
            }),
            prisma.auditLog.count({ where })
        ]);

        return {
            logs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
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

    static async deleteLog(id: string) {
        return await prisma.auditLog.delete({
            where: { id }
        });
    }

    static async deleteLogs(ids: string[]) {
        return await prisma.auditLog.deleteMany({
            where: { id: { in: ids } }
        });
    }

    static async getFilters() {
        const [actions, entities] = await Promise.all([
            prisma.auditLog.findMany({
                distinct: ["action"],
                select: { action: true },
                orderBy: { action: "asc" }
            }),
            prisma.auditLog.findMany({
                distinct: ["entity"],
                select: { entity: true },
                orderBy: { entity: "asc" }
            })
        ]);

        return {
            actions: actions.map(a => a.action),
            entities: entities.map(e => e.entity)
        };
    }
}
