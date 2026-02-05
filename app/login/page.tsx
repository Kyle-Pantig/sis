"use client";

import { LoginForm } from "@/components/login-form"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="size-8 border-4 border-zinc-200 border-t-zinc-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-zinc-50 p-6 md:p-10 dark:bg-black">
      <div className="w-full max-w-sm md:max-w-3xl">
        <LoginForm />
      </div>
    </div>
  )
}
