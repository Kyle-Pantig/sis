"use client"

import {
    IconCirclePlusFilled,
    type Icon,
} from "@tabler/icons-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"

interface QuickAction {
    title: string
    url: string
    icon: Icon
    description?: string
}

export function NavQuickActions({
    actions,
}: {
    actions: QuickAction[]
}) {
    const { isMobile } = useSidebar()
    const router = useRouter()

    return (
        <SidebarGroup className="py-0">
            <SidebarMenu>
                <SidebarMenuItem>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <SidebarMenuButton
                                size="lg"
                                className="cursor-pointer bg-blue-600 text-white hover:bg-blue-700 hover:text-white active:bg-blue-800 active:text-white transition-colors duration-200 shadow-sm"
                                tooltip="Quick Create New Records"
                            >
                                <IconCirclePlusFilled className="size-5" />
                                <span className="font-semibold">Quick Create</span>
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="w-56 rounded-xl p-2"
                            side={isMobile ? "bottom" : "right"}
                            align={isMobile ? "end" : "start"}
                            sideOffset={8}
                        >
                            <div className="px-2 py-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                Choose Record Type
                            </div>
                            {actions.map((action) => (
                                <DropdownMenuItem
                                    key={action.title}
                                    className="flex items-center gap-3 p-2.5 cursor-pointer rounded-lg focus:bg-blue-50 focus:text-blue-700"
                                    onClick={() => router.push(action.url)}
                                >
                                    <div className="flex size-8 items-center justify-center rounded-md bg-zinc-100 group-hover:bg-white text-zinc-600">
                                        <action.icon className="size-4.5" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{action.title}</span>
                                        {action.description && (
                                            <span className="text-[10px] text-zinc-400">{action.description}</span>
                                        )}
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroup>
    )
}
