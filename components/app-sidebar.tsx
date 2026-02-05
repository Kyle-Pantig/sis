"use client"

import * as React from "react"
import {
  IconChartBar,
  IconDashboard,
  IconFolder,
  IconInnerShadowTop,
  IconListDetails,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { NavQuickActions } from "@/components/nav-quick-actions"
import { useAuth } from "@/context/auth-context"
import Link from "next/link"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavSecondary } from "./nav-secondary"

const data = {
  user: {
    name: "Admin User",
    email: "admin@sis.com",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Students",
      url: "/dashboard/students",
      icon: IconUsers,
    },
    {
      title: "Courses",
      url: "/dashboard/courses",
      icon: IconFolder,
    },
    {
      title: "Subjects",
      url: "/dashboard/subjects",
      icon: IconListDetails,
    },
    {
      title: "Grading Sheet",
      url: "/dashboard/grades",
      icon: IconChartBar,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: IconSettings,
    },
  ],
  quickActions: [
    {
      title: "New Student",
      url: "/dashboard/students?create=true",
      icon: IconUsers,
      description: "Register a new student"
    },
    {
      title: "New Course",
      url: "/dashboard/courses?create=true",
      icon: IconFolder,
      description: "Setup a new degree program"
    },
    {
      title: "New Subject",
      url: "/dashboard/subjects?create=true",
      icon: IconListDetails,
      description: "Add a new curriculum item"
    },
    {
      title: "Add Grade",
      url: "/dashboard/grades?add=true",
      icon: IconChartBar,
      description: "Input academic marks"
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();

  const userData = {
    name: user?.role === 'admin' ? "Admin User" : "Encoder User",
    email: user?.email || "user@sis.com",
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="h-16 border-b flex justify-center px-4 shrink-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/dashboard">
                <IconInnerShadowTop className="!size-5 text-blue-600" />
                <span className="text-base font-bold tracking-tight">Mini SIS Admin</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="gap-0 py-4">
        <NavQuickActions actions={data.quickActions} />
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
