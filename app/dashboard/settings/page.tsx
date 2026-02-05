"use client";

import { useEffect, useState } from "react";
import { usePageTitle } from "../layout";
import {
    IconLock,
    IconUsers,
    IconKey,
    IconChevronRight,
    IconHistory,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useSearchParams, useRouter } from "next/navigation";
import { SecurityTab } from "@/components/settings/security-tab";
import { EncodersTab } from "@/components/settings/encoders-tab";
import { StudentsTab } from "@/components/settings/students-tab";
import { AuditLogsTab } from "@/components/settings/auditlogs-tab";

type SettingsTab = "security" | "encoders" | "students" | "audit";

const tabs: { id: SettingsTab; label: string; shortLabel?: string; icon: typeof IconLock }[] = [
    { id: "security", label: "Security", shortLabel: "& Password", icon: IconLock },
    { id: "encoders", label: "Encoders", shortLabel: "Management", icon: IconUsers },
    { id: "students", label: "Students", shortLabel: "Credentials", icon: IconKey },
    { id: "audit", label: "Audit Logs", icon: IconHistory },
];

export default function SettingsPage() {
    const { setTitle } = usePageTitle();
    const searchParams = useSearchParams();
    const router = useRouter();
    const tabParam = searchParams.get("tab") as SettingsTab;

    const [activeTab, setActiveTab] = useState<SettingsTab>(tabParam || "security");

    useEffect(() => {
        setTitle("Settings");
    }, [setTitle]);

    useEffect(() => {
        if (tabParam && tabParam !== activeTab) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    const handleTabChange = (tab: SettingsTab) => {
        setActiveTab(tab);
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tab);
        router.replace(`/dashboard/settings?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 min-h-[calc(100vh-200px)]">
            {/* Sidebar Navigation */}
            <aside className="w-full lg:w-64 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide bg-zinc-50/50 lg:bg-transparent py-2 lg:py-0 border-b lg:border-none border-zinc-200 lg:mb-0 mb-2">
                <div className="hidden lg:block px-3 py-2 border-b border-zinc-100 mb-2">
                    <h2 className="text-xs font-semibold tracking-tight text-zinc-500 uppercase">
                        Account Settings
                    </h2>
                </div>

                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={cn(
                                "cursor-pointer flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                            )}
                        >
                            <Icon className="size-4 shrink-0" />
                            <span className="flex-1 text-left">
                                {tab.label}
                                {tab.shortLabel && <span className="hidden sm:inline"> {tab.shortLabel}</span>}
                            </span>
                            {isActive && <IconChevronRight className="hidden lg:block size-4 opacity-50" />}
                        </button>
                    );
                })}
            </aside>

            {/* Content Area */}
            <div className="flex-1">
                {activeTab === "security" && <SecurityTab />}
                {activeTab === "encoders" && <EncodersTab />}
                {activeTab === "students" && <StudentsTab />}
                {activeTab === "audit" && <AuditLogsTab />}
            </div>
        </div>
    );
}





