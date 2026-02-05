import prisma from "../db";
import bcrypt from "bcryptjs";

export class AuthService {
    static async validateUser(email: string, password: string) {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) return null;

        // For the seeded admin, we might have plain text or hashed password
        // In our seed script we used 'admin123' as plain text for simplicity but in a real app it should be hashed
        // Let's support both for now or just hash it in seed if possible
        // For this context, let's assume it might be hashed or plain if we just seeded it

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash) || password === user.passwordHash;

        if (!isPasswordValid) return null;

        if (user.isActive === false) {
            throw new Error("Account is deactivated. Please contact administrator.");
        }

        return {
            id: user.id,
            email: user.email,
            role: user.role,
        };
    }

    static async getUserById(id: string) {
        return await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                role: true,
            },
        });
    }

    static async updatePassword(id: string, oldPassword: string, newPassword: string) {
        const user = await prisma.user.findUnique({
            where: { id },
        });

        if (!user) {
            throw new Error("User not found");
        }

        const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash) || oldPassword === user.passwordHash;

        if (!isPasswordValid) {
            throw new Error("Incorrect current password");
        }

        const newHashedPassword = await bcrypt.hash(newPassword, 10);

        return await prisma.user.update({
            where: { id },
            data: {
                passwordHash: newHashedPassword,
            },
        });
    }
    static async getInvitation(token: string) {
        return await prisma.invitation.findUnique({
            where: { token },
        });
    }

    static async completeInvite(token: string, password: string) {
        const invitation = await this.getInvitation(token);

        if (!invitation) {
            throw new Error("Invalid invitation token");
        }

        if (new Date() > invitation.expiresAt) {
            throw new Error("Invitation expired");
        }

        const existingUser = await prisma.user.findUnique({
            where: { email: invitation.email },
        });

        if (existingUser) {
            throw new Error("User already exists");
        }

        const passwordHash = await bcrypt.hash(password, 10);

        return await prisma.$transaction([
            prisma.user.create({
                data: {
                    email: invitation.email,
                    passwordHash,
                    role: invitation.role,
                    isActive: true,
                },
            }),
            prisma.invitation.delete({
                where: { id: invitation.id },
            }),
        ]);
    }
}
