"use client";

import { statsApi, coursesApi, studentsApi, auditApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  IconUsers,
  IconBook,
  IconBookmark,
  IconShieldCheck,
  IconChartBar,
  IconArrowUpRight,
  IconPlus,
  IconSearch,
  IconSparkles,
  IconClock,
  IconTrendingUp,
  IconFolder,
  IconActivity,
  IconCircleCheck,
  IconAlertCircle,
  IconEdit,
} from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { cn } from "@/lib/utils";
import { useEffect, ReactNode, useState } from "react";
import { usePageTitle } from "./layout";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts"
import { TrendingUp } from "lucide-react"
import { useAuth } from "@/context/auth-context";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

// Stats Card Component
function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color,
  bg,
  delay = 0,
}: {
  title: string;
  value: number;
  description: string;
  icon: any;
  color: string;
  bg: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="flex flex-col justify-between h-full"
    >
      <div className="flex items-start justify-between">
        <div className={cn("p-2.5 rounded-xl transition-colors", bg, "group-hover/bento:bg-white/10")}>
          <Icon className={cn("size-5 transition-colors", color, "group-hover/bento:text-white")} />
        </div>
        <IconArrowUpRight className="size-4 text-zinc-300 opacity-0 group-hover/bento:opacity-100 transition-all" />
      </div>
      <div className="mt-4">
        <div className="text-3xl font-bold text-zinc-900 tracking-tight group-hover/bento:text-white transition-colors">
          {value.toLocaleString()}
        </div>
        <div className="text-sm font-semibold text-zinc-700 mt-1 group-hover/bento:text-zinc-200 transition-colors">{title}</div>
        <div className="text-xs text-zinc-500 mt-0.5 group-hover/bento:text-zinc-400 transition-colors">{description}</div>
      </div>
    </motion.div>
  );
}

// Quick Action Button
function QuickAction({
  title,
  description,
  icon: Icon,
  onClick,
  color,
}: {
  title: string;
  description: string;
  icon: any;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="cursor-pointer flex items-center gap-4 p-4 rounded-xl border border-zinc-100 bg-white hover:bg-zinc-50 hover:border-zinc-200 transition-all text-left group w-full"
    >
      <div className={cn("p-2.5 rounded-xl", color)}>
        <Icon className="size-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-zinc-900">{title}</div>
        <div className="text-xs text-zinc-500 truncate">{description}</div>
      </div>
      <IconArrowUpRight className="size-4 text-zinc-300 group-hover:text-zinc-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
    </button>
  );
}

// Recent Activity (Audit logs)
function RecentActivityList() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: logs, isLoading } = useQuery({
    queryKey: ["recent-audit-logs"],
    queryFn: () => auditApi.getLogs(5),
    enabled: isAdmin,
    refetchInterval: isAdmin ? 30000 : false,
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200 group-hover/bento:bg-white/5 transition-colors">
        <IconShieldCheck className="size-8 text-zinc-300 mb-2 group-hover/bento:text-zinc-500" />
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold group-hover/bento:text-zinc-400">Access Restricted</p>
        <p className="text-[9px] text-zinc-400 mt-1 max-w-[120px] group-hover/bento:text-zinc-500">You don't have permission to view system activity logs.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const activityLogs = Array.isArray(logs) ? logs : [];

  return (
    <div className="space-y-4">
      {activityLogs.slice(0, 4).map((log: any, i: number) => {
        const isUpdate = log.action.toLowerCase().includes("update") || log.action.toLowerCase().includes("patch");
        const isDelete = log.action.toLowerCase().includes("delete");
        const isCreate = log.action.toLowerCase().includes("create") || log.action.toLowerCase().includes("post") || log.action.toLowerCase().includes("import");

        return (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex gap-3 text-xs"
          >
            <div className={cn(
              "size-7 rounded-full flex items-center justify-center shrink-0",
              isCreate ? "bg-emerald-500/10 text-emerald-600" :
                isDelete ? "bg-rose-500/10 text-rose-600" :
                  "bg-blue-500/10 text-blue-600"
            )}>
              {isCreate ? <IconPlus className="size-3.5" /> :
                isDelete ? <IconAlertCircle className="size-3.5" /> :
                  <IconEdit className="size-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-zinc-900 font-semibold group-hover/bento:text-white transition-colors">
                {log.action.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} {log.entity}
              </div>
              <div className="text-zinc-500 truncate flex items-center gap-1 group-hover/bento:text-zinc-400 transition-colors">
                <span className="font-medium text-zinc-700 group-hover/bento:text-zinc-300">{log.user?.email.split('@')[0]}</span>
                <span>•</span>
                <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </motion.div>
        );
      })}
      {activityLogs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <IconActivity className="size-6 text-zinc-300 mb-2" />
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">No recent activity</p>
        </div>
      )}
    </div>
  );
}

// Course Distribution Chart (Enhanced with Recharts)
function CourseDistribution() {
  const { data, isLoading } = useQuery({
    queryKey: ["course-stats"],
    queryFn: () => statsApi.getCourseStats(),
  });

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Skeleton className="h-[200px] w-full rounded-xl" />
      </div>
    );
  }

  const courses = Array.isArray(data) ? data : [];
  const chartData = courses.map((c: any) => ({
    course: c.code,
    students: c._count?.students || 0,
  }));

  const chartConfig = {
    students: {
      label: "Students",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 min-h-[220px]">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              top: 20,
              right: 10,
              left: 10,
              bottom: 0
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis
              dataKey="course"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tick={{ fill: '#71717a', fontSize: 11, fontWeight: 500 }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="students" fill="#3b82f6" radius={6}>
              <LabelList
                position="top"
                offset={10}
                className="fill-zinc-400 font-bold group-hover/bento:fill-zinc-300 transition-colors"
                fontSize={11}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
      <div className="mt-4 pt-4 border-t border-zinc-100 group-hover/bento:border-white/10 flex flex-col gap-1.5 transition-colors">
        <p className="text-[11px] text-zinc-500 group-hover/bento:text-zinc-600 transition-colors">
          Showing distribution of students across {courses.length} active programs.
        </p>
      </div>
    </div>
  );
}

// Recent Students List (Modified for sidebar fit)
function RecentStudentsList() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["recent-students"],
    queryFn: () => studentsApi.getAll(1, 7),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const students = data?.students || [];

  return (
    <div className="space-y-2">
      {students.slice(0, 7).map((student: any, i: number) => (
        <motion.div
          key={student.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 group-hover/bento:hover:bg-white/10 transition-colors cursor-pointer"
          onClick={() => router.push(`/dashboard/students/${student.id}`)}
        >
          <div className="size-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            {student.firstName[0]}{student.lastName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-zinc-900 truncate group-hover/bento:text-zinc-200 transition-colors">
              {student.lastName}, {student.firstName}
            </div>
            <div className="text-xs text-zinc-500 font-mono group-hover/bento:text-zinc-400 transition-colors">{student.studentNo}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { setTitle } = usePageTitle();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTitle("Dashboard");
  }, [setTitle]);

  const { data: stats, isLoading: loading } = useQuery({
    queryKey: ["summary-stats"],
    queryFn: () => statsApi.getSummary(),
  });

  if (!mounted || loading) {
    return (
      <BentoGrid className="md:auto-rows-[16rem]">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className={cn(
              "rounded-xl border border-zinc-200 bg-white p-6",
              i === 5 && "md:col-span-2 md:row-span-2", // Quick Actions
              i === 7 && "md:col-span-2 md:row-span-2", // Course Distribution
              i === 8 && "md:row-span-2", // Recent Students
            )}
          >
            <div className="flex flex-col gap-4 h-full">
              <div className="flex items-center gap-4">
                <Skeleton className="size-10 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="flex-1 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </BentoGrid>
    );
  }

  const statCards = [
    {
      title: "Total Students",
      value: stats?.students || 0,
      description: "Enrolled this semester",
      icon: IconUsers,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      title: "Active Reservations",
      value: stats?.reservations || 0,
      description: "Subject bookings",
      icon: IconBookmark,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
    {
      title: "Active Subjects",
      value: stats?.subjects || 0,
      description: "Available for enrollment",
      icon: IconBook,
      color: "text-orange-600",
      bg: "bg-orange-100",
    },
    {
      title: "Total Courses",
      value: stats?.courses || 0,
      description: "Academic programs",
      icon: IconFolder,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
  ];

  return (
    <BentoGrid className="md:auto-rows-[16rem]">
      {/* 1. First 3 Stat Cards (Row 1) */}
      {statCards.slice(0, 3).map((stat, i) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
          className="group/bento rounded-xl border border-zinc-200 bg-white p-5 transition-all duration-500 hover:bg-zinc-900 hover:shadow-2xl hover:border-zinc-800 cursor-pointer overflow-hidden relative"
          onClick={() => {
            if (stat.title === "Total Students") router.push("/dashboard/students");
            if (stat.title === "Active Reservations") router.push("/dashboard/grades");
            if (stat.title === "Active Subjects") router.push("/dashboard/subjects");
          }}
        >
          <StatCard {...stat} delay={i * 0.1} />
          <div className={cn(
            "absolute -right-6 -bottom-6 opacity-[0.04] group-hover/bento:opacity-20 transition-all duration-500 scale-100 group-hover/bento:scale-110",
            stat.color
          )}>
            <stat.icon className="size-24" />
          </div>
        </motion.div>
      ))}

      {/* 2. 4th Stat Card & Quick Actions (Row 2-3) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="group/bento rounded-xl border border-zinc-200 bg-white p-5 transition-all duration-500 hover:bg-zinc-900 hover:shadow-2xl hover:border-zinc-800 cursor-pointer overflow-hidden relative"
        onClick={() => router.push("/dashboard/courses")}
      >
        <StatCard {...statCards[3]} delay={0.3} />
        <div className="absolute -right-6 -bottom-6 opacity-[0.04] group-hover/bento:opacity-20 transition-all duration-500 scale-100 group-hover/bento:scale-110 text-purple-600">
          <IconFolder className="size-24" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="md:col-span-2 md:row-span-2 rounded-xl border border-zinc-200 bg-white p-6 flex flex-col transition-all duration-500 hover:bg-zinc-900 group/bento overflow-hidden relative"
      >
        <div className="flex items-center gap-2 mb-4 relative z-10">
          <IconSparkles className="size-5 text-amber-500" />
          <h3 className="font-bold text-zinc-900 group-hover/bento:text-white transition-colors">Quick Actions</h3>
        </div>
        <div className="grid gap-3 flex-1 relative z-10">
          <QuickAction
            title="Add New Student"
            description="Register a new student to the system"
            icon={IconPlus}
            color="bg-blue-600"
            onClick={() => router.push("/dashboard/students?create=true")}
          />
          <QuickAction
            title="Manage Grades"
            description="Update student grades and assessments"
            icon={IconChartBar}
            color="bg-purple-600"
            onClick={() => router.push("/dashboard/grades")}
          />
          <QuickAction
            title="Search Records"
            description="Find students, courses, or subjects"
            icon={IconSearch}
            color="bg-zinc-800"
            onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}
          />
        </div>
        <div className="absolute -right-8 -bottom-8 opacity-[0.04] group-hover/bento:opacity-[0.15] transition-all duration-500 scale-100 group-hover/bento:scale-110 text-amber-500">
          <IconSparkles className="size-48" />
        </div>
      </motion.div>

      {/* 3. Recent Activity (Fills the gap next to Quick Actions) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="group/bento rounded-xl border border-zinc-200 bg-white p-6 flex flex-col hover:bg-zinc-900 transition-all duration-500 overflow-hidden relative hover:shadow-2xl hover:border-zinc-800"
      >
        <div className="flex items-center gap-2 mb-4 relative z-10 transition-colors group-hover/bento:text-white">
          <IconActivity className="size-5 text-indigo-500" />
          <h3 className="font-bold text-sm text-zinc-900 group-hover/bento:text-white transition-colors">Recent Activity</h3>
        </div>
        <div className="flex-1 relative z-10">
          <RecentActivityList />
        </div>
        <div className="absolute -right-8 -bottom-8 opacity-[0.04] group-hover/bento:opacity-[0.15] transition-all duration-500 scale-100 group-hover/bento:scale-110 text-indigo-500">
          <IconActivity className="size-32" />
        </div>
      </motion.div>

      {/* 4. Course Distribution (Row 4-5) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="md:col-span-2 md:row-span-2 rounded-xl border border-zinc-200 bg-white p-6 flex flex-col transition-all duration-500 hover:bg-zinc-900 group/bento overflow-hidden relative hover:shadow-2xl hover:border-zinc-800"
      >
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <IconTrendingUp className="size-5 text-blue-600 group-hover/bento:text-white transition-colors" />
            <h3 className="font-bold text-zinc-900 group-hover/bento:text-white transition-colors">Students per Course</h3>
          </div>
          <button
            onClick={() => router.push("/dashboard/courses")}
            className="text-xs text-blue-600 font-semibold hover:underline relative z-20 cursor-pointer"
          >
            View All
          </button>
        </div>
        <div className="flex-1 overflow-auto relative z-10">
          <CourseDistribution />
        </div>
        <div className="absolute -right-8 -bottom-8 opacity-[0.04] group-hover/bento:opacity-[0.15] transition-all duration-500 scale-100 group-hover/bento:scale-110 text-blue-500">
          <IconTrendingUp className="size-48" />
        </div>
      </motion.div>

      {/* 5. Recent Students (1 Col Wide, 2 Rows High) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.7 }}
        className="md:row-span-2 rounded-xl border border-zinc-200 bg-white p-6 flex flex-col transition-all duration-500 hover:bg-zinc-900 group/bento overflow-hidden relative hover:shadow-2xl hover:border-zinc-800"
      >
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <IconUsers className="size-5 text-indigo-600 group-hover/bento:text-white transition-colors" />
            <h3 className="font-bold text-zinc-900 group-hover/bento:text-white transition-colors">Recent Students</h3>
          </div>
        </div>
        <div className="flex-1 overflow-auto relative z-10">
          <RecentStudentsList />
        </div>
        <div className="absolute -right-8 -bottom-8 opacity-[0.04] group-hover/bento:opacity-[0.15] transition-all duration-500 scale-100 group-hover/bento:scale-110 text-indigo-500">
          <IconUsers className="size-48" />
        </div>
      </motion.div>

    </BentoGrid>
  );
}
