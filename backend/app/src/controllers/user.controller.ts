import prisma from "../db";
import { EmailService } from "../services/email.service";
import { AuditService } from "../services/audit.service";

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
    deleteInvitation: async (ctx: any) => {
        const { params: { id }, jwt, cookie: { session } } = ctx;
        let currentUser = ctx.user;
        if (!currentUser && session?.value) {
            try { currentUser = await jwt.verify(session.value); } catch (e) { }
        }

        try {
            const invitation = await prisma.invitation.delete({
                where: { id },
            });

            if (currentUser?.id) {
                await AuditService.log(currentUser.id, "REVOKE_INVITATION", "Invitation", id, {
                    email: invitation.email
                });
            }

            return { message: "Invitation revoked successfully" };
        } catch (error) {
            console.error("Error deleting invitation:", error);
            return { error: "Failed to delete invitation" };
        }
    },

    // Resend invitation
    resendInvitation: async (ctx: any) => {
        const { params: { id }, jwt, cookie: { session } } = ctx;
        let currentUser = ctx.user;
        if (!currentUser && session?.value) {
            try { currentUser = await jwt.verify(session.value); } catch (e) { }
        }

        try {
            const existingInvitation = await prisma.invitation.findUnique({
                where: { id },
            });

            if (!existingInvitation) {
                return { error: "Invitation not found" };
            }

            const token = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            const updatedInvitation = await prisma.invitation.update({
                where: { id },
                data: {
                    token,
                    expiresAt,
                    createdAt: new Date(), // Refresh the creation date too
                },
            });

            await EmailService.resendInvitation(updatedInvitation.email, token);

            if (currentUser?.id) {
                await AuditService.log(currentUser.id, "RESEND_INVITATION", "Invitation", id, {
                    email: updatedInvitation.email
                });
            }

            return { message: "Invitation resent successfully" };
        } catch (error) {
            console.error("Error resending invitation:", error);
            return { error: "Failed to resend invitation" };
        }
    },

    // Invite a new encoder
    inviteEncoder: async (ctx: any) => {
        const { body: { email }, jwt, cookie: { session } } = ctx;
        let currentUser = ctx.user;
        if (!currentUser && session?.value) {
            try { currentUser = await jwt.verify(session.value); } catch (e) { }
        }

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

            const invitation = await prisma.invitation.create({
                data: {
                    email,
                    token,
                    expiresAt,
                    role: "encoder",
                },
            });

            await EmailService.sendInvitation(email, token);

            if (currentUser?.id) {
                await AuditService.log(currentUser.id, "INVITE_ENCODER", "Invitation", invitation.id, {
                    email
                });
            }

            return { message: "Invitation sent successfully" };
        } catch (error) {
            console.error("Error inviting encoder:", error);
            return { error: "Failed to invite encoder" };
        }
    },

    // Toggle encoder active status (Deactivate/Activate)
    toggleStatus: async (ctx: any) => {
        const { params: { id }, body: { isActive }, jwt, cookie: { session } } = ctx;
        let currentUser = ctx.user;
        if (!currentUser && session?.value) {
            try { currentUser = await jwt.verify(session.value); } catch (e) { }
        }

        try {
            const updatedUser = await prisma.user.update({
                where: { id },
                data: { isActive },
                select: {
                    id: true,
                    email: true,
                    isActive: true,
                },
            });

            if (currentUser?.id) {
                await AuditService.log(currentUser.id, "TOGGLE_ENCODER_STATUS", "User", id, {
                    email: updatedUser.email,
                    active: isActive
                });
            }

            return updatedUser;
        } catch (error) {
            console.error("Error updating user status:", error);
            return { error: "Failed to update user status" };
        }
    },

    // Delete encoder
    deleteEncoder: async (ctx: any) => {
        const { params: { id }, jwt, cookie: { session } } = ctx;
        let currentUser = ctx.user;
        if (!currentUser && session?.value) {
            try { currentUser = await jwt.verify(session.value); } catch (e) { }
        }

        try {
            // Check if encoder has associated grades to prevent foreign key errors
            const encoder = await prisma.user.findUnique({
                where: { id },
                select: { id: true, email: true }
            });

            if (!encoder) return { error: "Encoder not found" };

            const gradesCount = await prisma.grade.count({
                where: { encodedByUserId: id },
            });

            if (gradesCount > 0) {
                return { error: "Cannot delete encoder. They have associated grade records. Deactivate them instead." };
            }

            await prisma.user.delete({
                where: { id },
            });

            if (currentUser?.id) {
                await AuditService.log(currentUser.id, "DELETE_ENCODER", "User", id, {
                    email: encoder.email
                });
            }

            return { message: "Encoder deleted successfully" };
        } catch (error) {
            console.error("Error deleting encoder:", error);
            return { error: "Failed to delete encoder" };
        }
    },
};
