"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { inviteSchema, type InviteFormValues } from "@/lib/validations/user";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Field,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface InviteFormProps {
    token: string;
    email: string;
}

export function InviteForm({ token, email }: InviteFormProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<InviteFormValues>({
        resolver: zodResolver(inviteSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    async function onSubmit(data: InviteFormValues) {
        setLoading(true);

        try {
            const response = await authApi.completeInvite({
                token,
                password: data.password
            });

            if (response.error) {
                toast.error(response.error);
            } else {
                toast.success("Account created successfully. Please login.");
                router.push("/login");
            }
        } catch (error: any) {
            toast.error(error.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
            <Card className="overflow-hidden p-0 border-zinc-200 shadow-xl dark:border-zinc-800">
                <CardContent className="grid p-0 md:grid-cols-2">
                    <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8">
                        <FieldGroup>
                            <div className="flex flex-col items-center gap-2 text-center mb-6">
                                <h1 className="text-2xl font-bold tracking-tight">Setup Account</h1>
                                <p className="text-zinc-500 text-sm">
                                    Complete your registration for <br /><strong className="text-zinc-900">{email}</strong>
                                </p>
                            </div>
                            <Field>
                                <FieldLabel htmlFor="password">Password</FieldLabel>
                                <Input
                                    id="password"
                                    type="password"
                                    {...register("password")}
                                    className={errors.password ? "border-red-500" : ""}
                                />
                                {errors.password && (
                                    <p className="text-xs text-red-500 mt-1 font-medium">{errors.password.message}</p>
                                )}
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    {...register("confirmPassword")}
                                    className={errors.confirmPassword ? "border-red-500" : ""}
                                />
                                {errors.confirmPassword && (
                                    <p className="text-xs text-red-500 mt-1 font-medium">{errors.confirmPassword.message}</p>
                                )}
                            </Field>
                            <Field>
                                <Button
                                    type="submit"
                                    className="w-full transition-all font-semibold"
                                    disabled={loading}
                                >
                                    {loading ? "Creating Account..." : "Create Account"}
                                </Button>
                            </Field>
                        </FieldGroup>
                    </form>
                    <div className="bg-zinc-100 relative hidden md:block">
                        <div
                            className="absolute inset-0 h-full w-full bg-cover bg-center grayscale opacity-50 dark:brightness-[0.2]"
                            style={{ backgroundImage: "url('/placeholder.svg')" }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center p-12 text-center">
                            <div className="space-y-4">
                                <h3 className="text-xl font-bold">Welcome to Mini SIS</h3>
                                <p className="text-sm text-zinc-600">Join our platform to efficiently manage student grades and records.</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
