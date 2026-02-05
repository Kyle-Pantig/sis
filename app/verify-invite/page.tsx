"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api";
import { InviteForm } from "@/components/invite-form";
import { IconLoader2, IconAlertCircle } from "@tabler/icons-react";

function VerifyInviteContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [status, setStatus] = useState<"loading" | "valid" | "invalid">("loading");
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (!token) {
            setStatus("invalid");
            setError("No invitation token provided.");
            return;
        }

        const verify = async () => {
            try {
                const res = await authApi.verifyInvite(token);
                if (res.error) {
                    setStatus("invalid");
                    setError(res.error);
                } else {
                    setEmail(res.email);
                    setStatus("valid");
                }
            } catch (err) {
                setStatus("invalid");
                setError("Failed to verify invitation.");
            }
        };

        verify();
    }, [token]);

    if (status === "loading") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50">
                <IconLoader2 className="size-8 animate-spin text-zinc-400" />
                <p className="mt-4 text-zinc-500 font-medium">Verifying invitation...</p>
            </div>
        );
    }

    if (status === "invalid") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 p-4">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-red-100 max-w-md w-full text-center space-y-4">
                    <div className="size-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                        <IconAlertCircle className="size-6 text-red-500" />
                    </div>
                    <h1 className="text-xl font-bold text-zinc-900">Invalid Invitation</h1>
                    <p className="text-zinc-500">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 p-4">
            <InviteForm token={token!} email={email} />
        </div>
    );
}

export default function VerifyInvitePage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><IconLoader2 className="size-8 animate-spin text-zinc-400" /></div>}>
            <VerifyInviteContent />
        </Suspense>
    );
}
