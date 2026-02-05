import { AuthService } from "../services/auth.service";

export class AuthController {
    static async login({ body, jwt, cookie: { session }, set }: any) {
        const { email, password } = body;

        if (!email || !password) {
            set.status = 400;
            return { error: "Email and password are required" };
        }

        try {
            const user = await AuthService.validateUser(email, password);

            if (!user) {
                set.status = 401;
                return { error: "Invalid email or password" };
            }

            const token = await jwt.sign({
                id: user.id,
                email: user.email,
                role: user.role,
            });

            session.set({
                value: token,
                httpOnly: true,
                maxAge: 7 * 86400, // 7 days
                path: "/",
                sameSite: "lax",
                secure: false, // Set to true if using HTTPS
            });

            return {
                message: "Login successful",
                user,
            };
        } catch (error: any) {
            if (error.message.includes("deactivated")) {
                set.status = 403;
                return { error: error.message };
            }
            throw error; // Re-throw other errors
        }
    }

    static async me({ user }: any) {
        if (!user) {
            return { error: "Unauthorized", status: 401 };
        }
        return user;
    }

    static async logout({ cookie: { session } }: any) {
        session.remove();
        return { message: "Logout successful" };
    }

    static async changePassword({ body, user, set }: any) {
        if (!user) {
            set.status = 401;
            return { error: "Unauthorized" };
        }

        const { oldPassword, newPassword } = body;

        if (!oldPassword || !newPassword) {
            set.status = 400;
            return { error: "Current password and new password are required" };
        }

        try {
            await AuthService.updatePassword(user.id, oldPassword, newPassword);
            return { message: "Password updated successfully" };
        } catch (error: any) {
            set.status = 400;
            return { error: error.message || "Failed to update password" };
        }
    }
    static async verifyInvite({ params: { token }, set }: any) {
        try {
            const invitation = await AuthService.getInvitation(token);
            if (!invitation) {
                set.status = 404;
                return { error: "Invalid invitation token" };
            }
            if (new Date() > invitation.expiresAt) {
                set.status = 400;
                return { error: "Invitation expired" };
            }
            return { valid: true, email: invitation.email };
        } catch (error) {
            console.error("Error verifying invite:", error);
            set.status = 500;
            return { error: "Failed to verify invitation" };
        }
    }

    static async completeInvite({ body, set }: any) {
        const { token, password } = body;

        if (!token || !password) {
            set.status = 400;
            return { error: "Token and password are required" };
        }

        try {
            await AuthService.completeInvite(token, password);
            return { message: "Account setup successful" };
        } catch (error: any) {
            set.status = 400;
            return { error: error.message };
        }
    }
}
