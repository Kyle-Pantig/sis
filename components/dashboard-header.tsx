"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { useEffect, useState } from "react";
import { authApi } from "@/lib/api";
import { IconSearch, IconChevronRight } from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";

export function DashboardHeader({ title }: { title: string }) {
    const [user, setUser] = useState<any>(null);
    const pathname = usePathname();

    // Split path and filter out empty strings
    const pathSegments = pathname.split("/").filter(Boolean);

    // We want to skip 'dashboard' if it's the first segment for better UX
    const breadcrumbSegments = pathSegments[0] === "dashboard" ? pathSegments.slice(1) : pathSegments;

    useEffect(() => {
        async function getUser() {
            try {
                const data = await authApi.me();
                if (!data.error) {
                    setUser(data);
                }
            } catch (err) {
                console.error(err);
            }
        }
        getUser();
    }, []);

    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-white sticky top-0 z-50">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1 px-2">
                <Breadcrumb>
                    <BreadcrumbList>
                        {breadcrumbSegments.length > 0 && (
                            <>
                                <BreadcrumbItem>
                                    <BreadcrumbLink asChild>
                                        <Link href="/dashboard" className="font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
                                            Dashboard
                                        </Link>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator>
                                    <IconChevronRight className="size-3.5 text-zinc-400" />
                                </BreadcrumbSeparator>
                            </>
                        )}

                        <BreadcrumbItem>
                            <BreadcrumbPage className="font-semibold text-zinc-900">
                                {title}
                            </BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
            <div className="hidden md:flex items-center gap-6 pr-4">
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}
                    className="flex items-center gap-2 px-3 py-1.5 text-zinc-400 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors mr-2 shadow-sm"
                >
                    <IconSearch className="size-4" />
                    <span className="text-xs">Search everything...</span>
                    <kbd className="ml-2 px-1.5 py-0.5 text-[10px] font-mono bg-zinc-100 border border-zinc-200 rounded-md">Ctrl K</kbd>
                </button>
            </div>
        </header>
    );
}
