"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardHeader } from "@/components/dashboard-header";
import { GlobalSearch } from "@/components/global-search";
import { useAuth } from "@/context/auth-context";

// Context for page title
const PageTitleContext = createContext<{
    title: string;
    setTitle: (title: string) => void;
}>({
    title: "Dashboard",
    setTitle: () => { },
});

export const usePageTitle = () => useContext(PageTitleContext);
export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [title, setTitle] = useState("Dashboard");
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-zinc-50">
                <div className="text-center">
                    <div className="size-8 border-4 border-zinc-200 border-t-zinc-800 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-zinc-500 font-medium">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <PageTitleContext.Provider value={{ title, setTitle }}>
            <SidebarProvider>
                <GlobalSearch />
                <AppSidebar />
                <SidebarInset className="min-w-0">
                    <DashboardHeader title={title} />
                    <main className="flex flex-1 flex-col gap-6 p-4 bg-zinc-50/50">
                        {children}
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </PageTitleContext.Provider>
    );
}
