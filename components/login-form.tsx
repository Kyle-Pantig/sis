"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormValues } from "@/lib/validations/user";
import { authApi } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setLoading(true);

    try {
      const response = await authApi.login(data.email, data.password);
      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success("Login successful");
        // refreshUser will handle the redirect to dashboard via auth-context
        await refreshUser();
      }
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0 border-zinc-200 shadow-xl dark:border-zinc-800">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
                <p className="text-zinc-500 text-sm">
                  Login to your Mini SIS Admin account
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@sis.com"
                  {...register("email")}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1 font-medium">{errors.email.message}</p>
                )}
              </Field>
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
                <Button
                  type="submit"
                  className="w-full transition-all font-semibold"
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Login"}
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
                <h3 className="text-xl font-bold">Mini School Information System</h3>
                <p className="text-sm text-zinc-600">The most intuitive way to manage students and academic performance.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
