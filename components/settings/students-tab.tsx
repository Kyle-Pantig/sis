import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IconKey, IconLock, IconLoader2 } from "@tabler/icons-react";

export function StudentsTab() {
    const { user } = useAuth();

    if (user?.role !== "admin") {
        return (
            <Card className="border-none shadow-sm bg-white overflow-hidden py-0">
                <CardHeader className="border-b bg-zinc-50/50 pb-8 pt-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-zinc-100">
                            <IconKey className="size-6 text-zinc-900" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">Student Credentials</CardTitle>
                            <CardDescription>Manage login access and password resets for students.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-12 text-center">
                    <div className="max-w-sm mx-auto space-y-4">
                        <div className="size-16 bg-red-50 rounded-full flex items-center justify-center mx-auto border border-dashed border-red-200">
                            <IconLock className="size-8 text-red-500" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-zinc-900">Access Restricted</h3>
                            <p className="text-zinc-500 text-sm leading-relaxed">
                                You do not have permission to view this section.<br /> Only administrators can manage student credentials.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-sm bg-white overflow-hidden py-0">
            <CardHeader className="border-b bg-zinc-50/50 pb-8 pt-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-zinc-100">
                        <IconKey className="size-6 text-zinc-900" />
                    </div>
                    <div>
                        <CardTitle className="text-xl">Student Credentials</CardTitle>
                        <CardDescription>Manage login access and password resets for students.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-12 text-center">
                <div className="max-w-md mx-auto space-y-6 bg-zinc-50/50 p-8 rounded-2xl border border-zinc-100">
                    <div className="size-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto border border-zinc-100">
                        <IconLoader2 className="size-8 text-zinc-400" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-bold text-zinc-900">Feature Coming Soon</h3>
                        <p className="text-zinc-500 text-sm leading-relaxed">
                            The student portal is currently in development. You will be able to manage student credentials once the portal is launched.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 justify-center text-zinc-400 text-xs font-semibold tracking-wider uppercase">
                        <div className="h-px flex-1 bg-zinc-200" />
                        Phase 2 Development
                        <div className="h-px flex-1 bg-zinc-200" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}