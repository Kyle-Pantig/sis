import { useState } from "react";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { IconLoader2, IconShieldCheck } from "@tabler/icons-react";

export function SecurityTab() {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [passwords, setPasswords] = useState({
        current: "",
        new: "",
        confirm: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwords.new !== passwords.confirm) {
            toast.error("New passwords do not match");
            return;
        }

        if (passwords.new.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setIsLoading(true);
        try {
            const result = await authApi.changePassword({
                oldPassword: passwords.current,
                newPassword: passwords.new
            });

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Password updated successfully");
                setPasswords({ current: "", new: "", confirm: "" });
            }
        } catch (error) {
            toast.error("Failed to update password");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="overflow-hidden py-0">
            <CardHeader className="border-b bg-zinc-50/50 pb-8 pt-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-zinc-100">
                        <IconShieldCheck className="size-6 text-zinc-900" />
                    </div>
                    <div>
                        <CardTitle className="text-xl">Security Settings</CardTitle>
                        <CardDescription>Manage your account password and security preferences.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="current" className="text-sm font-semibold text-zinc-700">Current Password</Label>
                            <Input
                                id="current"
                                type={showPassword ? "text" : "password"}
                                autoComplete="off"
                                value={passwords.current}
                                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                placeholder="••••••••"
                                className="bg-zinc-50 border-zinc-200 focus:bg-white transition-all h-11"
                                required
                            />
                        </div>
                        <div className="h-px bg-zinc-100 my-2" />
                        <div className="space-y-2">
                            <Label htmlFor="new" className="text-sm font-semibold text-zinc-700">New Password</Label>
                            <Input
                                id="new"
                                type={showPassword ? "text" : "password"}
                                autoComplete="off"
                                value={passwords.new}
                                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                placeholder="••••••••"
                                className="bg-zinc-50 border-zinc-200 focus:bg-white transition-all h-11"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm" className="text-sm font-semibold text-zinc-700">Confirm New Password</Label>
                            <Input
                                id="confirm"
                                type={showPassword ? "text" : "password"}
                                autoComplete="off"
                                value={passwords.confirm}
                                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                placeholder="••••••••"
                                className="bg-zinc-50 border-zinc-200 focus:bg-white transition-all h-11"
                                required
                            />
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox
                                id="show-password"
                                checked={showPassword}
                                onCheckedChange={(checked) => setShowPassword(!!checked)}
                            />
                            <Label
                                htmlFor="show-password"
                                className="text-sm font-medium leading-none cursor-pointer select-none text-zinc-600 hover:text-zinc-900 transition-colors flex items-center gap-2"
                            >
                                Show Password
                            </Label>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full sm:w-auto min-w-[160px] h-10 rounded-full transition-all active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <>
                                    <IconLoader2 className="size-4 mr-2 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Update Password"
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}