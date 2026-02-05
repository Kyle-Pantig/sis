import prisma from "../db";
import { EmailService } from "../services/email.service";

export const UserController = {
    // Get all encoders
    getEncoders: async () => {
        try {
            const encoders = await prisma.user.findMany({
                where: {
                    role: "encoder",
                },
                select: {
                    id: true,
                    email: true,
                    role: true,
                    isActive: true, // Fetch isActive status
                    createdAt: true,
                    _count: {
                        select: { grades: true },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            });
            return encoders;
        } catch (error) {
            console.error("Error fetching encoders:", error);
            return { error: "Failed to fetch encoders" };
        }
    },

    // Get pending invitations
    getInvitations: async () => {
        try {
            const invitations = await prisma.invitation.findMany({
                where: { role: "encoder" },
                orderBy: { createdAt: "desc" },
            });
            return invitations;
        } catch (error) {
            console.error("Error fetching invitations:", error);
            return { error: "Failed to fetch invitations" };
        }
    },

    // Delete invitation
    deleteInvitation: async ({ params: { id } }: any) => {
        try {
            await prisma.invitation.delete({
                where: { id },
            });
            return { message: "Invitation revoked successfully" };
        } catch (error) {
            console.error("Error deleting invitation:", error);
            return { error: "Failed to delete invitation" };
        }
    },

    // Invite a new encoder
    inviteEncoder: async ({ body }: any) => {
        const { email } = body;

        try {
            // check if email exists
            const existingUser = await prisma.user.findUnique({
                where: { email },
            });

            if (existingUser) {
                return { error: "User with this email already exists" };
            }

            // Cleanup old invitations for this email
            await prisma.invitation.deleteMany({
                where: { email }
            });

            const token = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            await prisma.invitation.create({
                data: {
                    email,
                    token,
                    expiresAt,
                    role: "encoder",
                },
            });

            await EmailService.sendInvitation(email, token);

            return { message: "Invitation sent successfully" };
        } catch (error) {
            console.error("Error inviting encoder:", error);
            return { error: "Failed to invite encoder" };
        }
    },

    // Toggle encoder active status (Deactivate/Activate)
    toggleStatus: async ({ params: { id }, body }: any) => {
        const { isActive } = body;

        try {
            const user = await prisma.user.update({
                where: { id },
                data: { isActive },
                select: {
                    id: true,
                    email: true,
                    isActive: true,
                },
            });
            return user;
        } catch (error) {
            console.error("Error updating user status:", error);
            return { error: "Failed to update user status" };
        }
    },

    // Delete encoder
    deleteEncoder: async ({ params: { id } }: any) => {
        try {
            // Check if encoder has associated grades to prevent foreign key errors
            const gradesCount = await prisma.grade.count({
                where: { encodedByUserId: id },
            });

            if (gradesCount > 0) {
                return { error: "Cannot delete encoder. They have associated grade records. Deactivate them instead." };
            }

            await prisma.user.delete({
                where: { id },
            });

            return { message: "Encoder deleted successfully" };
        } catch (error) {
            console.error("Error deleting encoder:", error);
            return { error: "Failed to delete encoder" };
        }
    },
};
