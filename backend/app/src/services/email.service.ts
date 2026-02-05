import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_123"); // Fallback for dev if env missing

export class EmailService {
    static async sendInvitation(email: string, token: string) {
        // In a real app, this URL would come from env
        const inviteUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-invite?token=${token}`;

        try {
            const data = await resend.emails.send({
                from: "SIS Admin <buildwithkyle@kylepantig.site>",
                to: email,
                subject: "Invitation to Join SIS as Encoder",
                html: `
                    <h1>Welcome to SIS</h1>
                    <p>You have been invited to join the Student Information System as an Grade Encoder.</p>
                    <p>Click the link below to verify your email and set your password:</p>
                    <a href="${inviteUrl}">Accept Invitation</a>
                    <p>This link will expire in 24 hours.</p>
                `,
            });
            return data;
        } catch (error) {
            console.error("Failed to send email:", error);
            throw new Error("Failed to send invitation email");
        }
    }
}
