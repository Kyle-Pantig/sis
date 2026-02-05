"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePageTitle } from "../../layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reservationsApi, subjectsApi, studentsApi } from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    IconArrowLeft,
    IconLoader2,
    IconUser,
    IconMail,
    IconCalendar,
    IconId,
    IconBook,
    IconChartBar,
    IconSettings,
    IconCheck,
    IconX,
    IconSearch,
    IconPlus,
    IconExternalLink,
    IconTrash,
    IconCopy,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Check, Search, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// ... existing interfaces ...
interface Subject {
    id: string;
    code: string;
    title: string;
    units: number;
}

interface Reservation {
    id: string;
    status: string;
    reservedAt: string;
    subject: Subject;
}

interface Grade {
    id: string;
    prelim: number | null;
    midterm: number | null;
    finals: number | null;
    finalGrade: number | null;
    remarks: string | null;
    subject: Subject;
}

interface StudentProfile {
    id: string;
    studentNo: string;
    firstName: string;
    lastName: string;
    email: string | null;
    birthDate: string;
    course: {
        id: string;
        code: string;
        name: string;
    };
    subjectReservations: Reservation[];
    grades: Grade[];
}

export default function StudentProfilePage() {
    const { setTitle } = usePageTitle();
    const params = useParams();
    const router = useRouter();
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [manageSearch, setManageSearch] = useState("");
    const [copied, setCopied] = useState(false);
    const queryClient = useQueryClient();

    const { data: student, isLoading: loading, error } = useQuery<StudentProfile>({
        queryKey: ["student", params.id],
        queryFn: () => studentsApi.getById(params.id as string).then(res => {
            if (res.error) throw new Error(res.error);
            return res;
        }),
        enabled: !!params.id,
    });

    useEffect(() => {
        if (student) {
            setTitle(`${student.firstName}'s Profile`);
        }
    }, [student, setTitle]);

    useEffect(() => {
        if (error) {
            toast.error(error.message || "Failed to load student details");
        }
    }, [error]);


    const reserveMutation = useMutation({
        mutationFn: (subjectId: string) =>
            reservationsApi.create({ studentId: params.id as string, subjectId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["student", params.id] });
            queryClient.invalidateQueries({ queryKey: ["course-subjects"] });
            toast.success("Subject reserved successfully");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to reserve subject");
        },
    });

    const unreserveMutation = useMutation({
        mutationFn: (reservationId: string) =>
            reservationsApi.delete(reservationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["student", params.id] });
            queryClient.invalidateQueries({ queryKey: ["course-subjects"] });
            toast.success("Subject unreserved successfully");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to remove reservation");
        },
    });

    const bulkReserveMutation = useMutation({
        mutationFn: (subjectIds: string[]) =>
            reservationsApi.bulkCreate(params.id as string, subjectIds),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["student", params.id] });
            queryClient.invalidateQueries({ queryKey: ["course-subjects"] });
            toast.success("All subjects reserved successfully");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to reserve subjects");
        },
    });

    const bulkUnreserveMutation = useMutation({
        mutationFn: (ids: string[]) =>
            reservationsApi.bulkDelete(ids),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["student", params.id] });
            queryClient.invalidateQueries({ queryKey: ["course-subjects"] });
            toast.success("All subjects unreserved successfully");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to unreserve records");
        },
    });

    const { data: courseSubjects, isLoading: loadingSubjects } = useQuery({
        queryKey: ["course-subjects", student?.course.id],
        queryFn: () => subjectsApi.getByCourse(student?.course.id as string),
        enabled: !!student?.course.id && isManageModalOpen,
    });

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const getGradeColor = (grade: number | null) => {
        if (!grade) return "text-zinc-400";
        if (grade <= 1.5) return "text-green-600 font-bold";
        if (grade <= 2.0) return "text-blue-600 font-bold";
        if (grade <= 3.0) return "text-orange-600 font-bold";
        return "text-red-600 font-bold";
    };

    if (loading) {
        return (
            <div className="space-y-6 max-w-full">
                {/* Header Skeleton */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/60 pb-6 w-full">
                    <div className="flex items-center gap-4">
                        <Skeleton className="size-10 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-64" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                    </div>
                    <Skeleton className="h-10 w-32 rounded-full" />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="space-y-6 xl:col-span-1">
                        {/* ID Card Skeleton */}
                        <div className="border border-zinc-200 shadow-sm rounded-xl overflow-hidden">
                            <div className="h-24 bg-zinc-100" />
                            <div className="p-6 pt-12 relative">
                                <Skeleton className="size-20 rounded-full absolute -top-10 left-6 border-4 border-white" />
                                <div className="space-y-4 mt-2">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="size-8 rounded-lg" />
                                        <div className="space-y-1">
                                            <Skeleton className="h-3 w-24" />
                                            <Skeleton className="h-4 w-32" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="size-8 rounded-lg" />
                                        <div className="space-y-1">
                                            <Skeleton className="h-3 w-24" />
                                            <Skeleton className="h-4 w-40" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="size-8 rounded-lg" />
                                        <div className="space-y-1">
                                            <Skeleton className="h-3 w-24" />
                                            <Skeleton className="h-4 w-32" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="size-8 rounded-lg" />
                                        <div className="space-y-1">
                                            <Skeleton className="h-3 w-24" />
                                            <Skeleton className="h-4 w-20" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Performance Card Skeleton */}
                        <div className="border border-zinc-200 shadow-sm rounded-xl p-6 space-y-4">
                            <Skeleton className="h-6 w-48" />
                            <div className="grid grid-cols-2 gap-3">
                                <Skeleton className="h-20 rounded-xl" />
                                <Skeleton className="h-20 rounded-xl" />
                            </div>
                            <div className="space-y-4 pt-2">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Skeleton className="h-4 w-12" />
                                        <Skeleton className="h-4 w-20" />
                                    </div>
                                    <Skeleton className="h-1.5 w-full rounded-full" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Skeleton className="h-4 w-12" />
                                        <Skeleton className="h-4 w-20" />
                                    </div>
                                    <Skeleton className="h-1.5 w-full rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Grades Table Skeleton */}
                    <div className="xl:col-span-2">
                        <div className="border border-zinc-200 shadow-sm rounded-xl h-full flex flex-col">
                            <div className="p-4 border-b border-zinc-100 bg-zinc-50/30 flex justify-between items-center">
                                <div className="space-y-2">
                                    <Skeleton className="h-6 w-40" />
                                    <Skeleton className="h-4 w-60" />
                                </div>
                            </div>
                            <div className="p-0">
                                {/* Table Header */}
                                <div className="flex border-b border-zinc-200 p-4 gap-4">
                                    <Skeleton className="h-4 w-[30%]" />
                                    <Skeleton className="h-4 w-[12%]" />
                                    <Skeleton className="h-4 w-[12%]" />
                                    <Skeleton className="h-4 w-[12%]" />
                                    <Skeleton className="h-4 w-[12%]" />
                                    <Skeleton className="h-4 w-[15%]" />
                                </div>
                                {/* Rows */}
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="flex p-4 gap-4 border-b border-zinc-100">
                                        <div className="w-[30%] space-y-2">
                                            <Skeleton className="h-4 w-16" />
                                            <Skeleton className="h-3 w-32" />
                                        </div>
                                        <Skeleton className="h-6 w-[12%] rounded-md" />
                                        <Skeleton className="h-6 w-[12%] rounded-md" />
                                        <Skeleton className="h-6 w-[12%] rounded-md" />
                                        <Skeleton className="h-6 w-[12%] rounded-md" />
                                        <Skeleton className="h-6 w-[15%] rounded-full" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!student) return null;

    const totalUnits = student.subjectReservations.reduce(
        (acc, r) => acc + r.subject.units,
        0
    );

    const passedCount = student.grades.filter((g) => g.remarks === "Passed").length;
    const failedCount = student.grades.filter((g) => g.remarks === "Failed").length;

    // Merge reservations and grades to show all enrolled subjects
    const enrolledSubjects = student.subjectReservations.map(res => {
        const grade = student.grades.find(g => g.subject.id === res.subject.id);
        return {
            subject: res.subject,
            grade: grade || null
        };
    });

    // Sort: Graded first, then by code
    const allRecords = enrolledSubjects.sort((a, b) => {
        if (a.grade && !b.grade) return -1;
        if (!a.grade && b.grade) return 1;
        return a.subject.code.localeCompare(b.subject.code);
    });

    return (
        <div className="space-y-6 max-w-full">
            {/* 1. Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/60 pb-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.push("/dashboard/students")}
                        className="shrink-0 size-10 rounded-full border-zinc-200 bg-white hover:bg-zinc-50 hover:text-zinc-900 transition-colors shadow-sm"
                    >
                        <IconArrowLeft className="size-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
                            {student.firstName} {student.lastName}
                        </h1>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-sm font-medium text-zinc-600">{student.course.name}</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* 2. Primary Layout Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Left Column: Info & Stats */}
                <div className="space-y-6 xl:col-span-1">

                    {/* Student ID Card */}
                    <Card className="border border-zinc-200 shadow-sm overflow-hidden">
                        <div className="h-24 bg-gradient-to-br from-blue-600 to-indigo-700 relative">
                            <div className="absolute -bottom-10 left-6 p-1 bg-white rounded-full">
                                <div className="size-20 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200 shadow-inner">
                                    <IconUser className="size-10 text-zinc-300" />
                                </div>
                            </div>
                        </div>
                        <CardContent className="pt-12 pb-6 px-6">
                            <div className="grid gap-4 mt-2">
                                <div className="flex items-center gap-3 group">
                                    <div className="size-8 rounded-lg bg-zinc-50 flex items-center justify-center border border-zinc-100 group-hover:border-zinc-200 transition-colors">
                                        <IconId className="size-4 text-zinc-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Student Number</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-zinc-800 font-mono">{student.studentNo}</p>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(student.studentNo);
                                                    setCopied(true);
                                                    setTimeout(() => setCopied(false), 2000);
                                                }}
                                                className="p-1 rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
                                                title="Copy Student Number"
                                            >
                                                {copied ? (
                                                    <IconCheck className="size-3.5 text-green-600" />
                                                ) : (
                                                    <IconCopy className="size-3.5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 group">
                                    <div className="size-8 rounded-lg bg-zinc-50 flex items-center justify-center border border-zinc-100 group-hover:border-zinc-200 transition-colors">
                                        <IconMail className="size-4 text-zinc-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Email Address</p>
                                        <p className="text-sm font-semibold text-zinc-800 break-all">{student.email || "—"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 group">
                                    <div className="size-8 rounded-lg bg-zinc-50 flex items-center justify-center border border-zinc-100 group-hover:border-zinc-200 transition-colors">
                                        <IconCalendar className="size-4 text-zinc-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Birth Date</p>
                                        <p className="text-sm font-semibold text-zinc-800">{formatDate(student.birthDate)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 group">
                                    <div className="size-8 rounded-lg bg-zinc-50 flex items-center justify-center border border-zinc-100 group-hover:border-zinc-200 transition-colors">
                                        <IconBook className="size-4 text-zinc-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Program</p>
                                        <p className="text-sm font-semibold text-zinc-800 line-clamp-1" title={student.course.name}>{student.course.code}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 group">
                                    <div className="size-8 rounded-lg bg-zinc-50 flex items-center justify-center border border-zinc-100 group-hover:border-zinc-200 transition-colors">
                                        <Check className="size-4 text-zinc-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Status</p>
                                        <p className="text-sm font-semibold text-zinc-800 line-clamp-1">Enrolled</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Academic Performance Summary */}
                    <Card className="border border-zinc-200 shadow-sm overflow-hidden">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-medium flex items-center gap-2 text-zinc-900">
                                <IconChartBar className="size-4 text-zinc-500" />
                                Performance Overview
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                                    <div className="text-2xl font-bold text-zinc-900 tracking-tight">{student.subjectReservations.length}</div>
                                    <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mt-1">Total Subjects</div>
                                </div>
                                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                                    <div className="text-2xl font-bold text-zinc-900 tracking-tight">{totalUnits}</div>
                                    <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mt-1">Total Units</div>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
                                    <span>Passed</span>
                                    <span className="text-green-600 font-bold">{passedCount} Subjects</span>
                                </div>
                                <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-500 rounded-full"
                                        style={{ width: `${(passedCount / (passedCount + failedCount || 1)) * 100}%` }}
                                    />
                                </div>

                                <div className="flex items-center justify-between text-xs font-medium text-zinc-500 mt-3 pt-2">
                                    <span>Failed</span>
                                    <span className="text-red-600 font-bold">{failedCount} Subjects</span>
                                </div>
                                <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-red-500 rounded-full"
                                        style={{ width: `${(failedCount / (passedCount + failedCount || 1)) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* Right Column: Grades Table */}
                <div className="xl:col-span-2 space-y-6">
                    <Card className="border border-zinc-200 shadow-sm h-full flex flex-col">
                        <CardHeader className="border-b border-zinc-100 bg-zinc-50/30 py-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg font-bold text-zinc-900">Academic Records</CardTitle>
                                    <p className="text-sm text-zinc-500">Official grades for enrolled subjects.</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 gap-2 font-semibold shadow-none border-zinc-200"
                                        onClick={() => setIsManageModalOpen(true)}
                                    >
                                        <IconSettings className="size-4" />
                                        Manage Enrollment
                                    </Button>
                                    {/* Future: Add Export/Print buttons here */}
                                </div>
                            </div>
                        </CardHeader>
                        <div className="overflow-x-auto flex-1">
                            <Table>
                                <TableHeader className="bg-zinc-50/50">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[20%] min-w-[160px] border-b border-zinc-200 font-bold text-xs uppercase tracking-widest text-zinc-500 pl-6 py-4">Subject Information</TableHead>
                                        <TableHead className="w-[8%] min-w-[60px] border-b border-zinc-200 font-bold text-xs uppercase tracking-widest text-zinc-500 text-center py-4">Units</TableHead>
                                        <TableHead className="w-[10%] min-w-[80px] border-b border-zinc-200 font-bold text-xs uppercase tracking-widest text-zinc-500 text-center py-4">Prelim</TableHead>
                                        <TableHead className="w-[10%] min-w-[80px] border-b border-zinc-200 font-bold text-xs uppercase tracking-widest text-zinc-500 text-center py-4">Midterm</TableHead>
                                        <TableHead className="w-[10%] min-w-[80px] border-b border-zinc-200 font-bold text-xs uppercase tracking-widest text-zinc-500 text-center py-4">Finals</TableHead>
                                        <TableHead className="w-[10%] min-w-[80px] border-b border-zinc-200 font-bold text-xs uppercase tracking-widest text-zinc-500 text-center py-4 bg-zinc-50/50">Final Grade</TableHead>
                                        <TableHead className="w-[12%] min-w-[100px] border-b border-zinc-200 font-bold text-xs uppercase tracking-widest text-zinc-500 text-center py-4">Assessment</TableHead>
                                        <TableHead className="w-[20%] min-w-[140px] border-b border-zinc-200 font-bold text-xs uppercase tracking-widest text-zinc-500 text-center pr-6 py-4">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allRecords.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-48 text-center">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <div className="size-10 rounded-full bg-zinc-100 flex items-center justify-center">
                                                        <IconBook className="size-5 text-zinc-300" />
                                                    </div>
                                                    <p className="text-zinc-500 font-medium text-sm">No enrolled subjects found.</p>
                                                    <Button
                                                        variant="link"
                                                        className="text-blue-600 font-bold"
                                                        onClick={() => setIsManageModalOpen(true)}
                                                    >
                                                        Manage Enrollment
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        allRecords.map(({ subject, grade }) => (
                                            <TableRow key={subject.id} className="group hover:bg-zinc-50/80 transition-colors">
                                                <TableCell className="pl-6 py-4 align-top">
                                                    <div className="space-y-1">
                                                        <div className="font-bold text-sm text-zinc-900 group-hover:text-blue-700 transition-colors">{subject.code}</div>
                                                        <div className="text-xs text-zinc-500 font-medium line-clamp-1">{subject.title}</div>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-center py-4 text-sm font-bold text-zinc-600 align-middle">
                                                    {subject.units.toFixed(1)}
                                                </TableCell>

                                                {/* Grade Columns */}
                                                <TableCell className="text-center py-4 text-sm font-medium text-zinc-600 align-middle">
                                                    {grade?.prelim ? Number(grade.prelim).toFixed(2) : <span className="text-zinc-300">—</span>}
                                                </TableCell>
                                                <TableCell className="text-center py-4 text-sm font-medium text-zinc-600 align-middle">
                                                    {grade?.midterm ? Number(grade.midterm).toFixed(2) : <span className="text-zinc-300">—</span>}
                                                </TableCell>
                                                <TableCell className="text-center py-4 text-sm font-medium text-zinc-600 align-middle">
                                                    {grade?.finals ? Number(grade.finals).toFixed(2) : <span className="text-zinc-300">—</span>}
                                                </TableCell>

                                                {/* Final Grade Highlight */}
                                                <TableCell className={cn(
                                                    "text-center py-4 text-sm align-middle transition-colors font-bold",
                                                    grade?.finalGrade ? (
                                                        Number(grade.finalGrade) <= 3.0
                                                            ? "bg-emerald-50 text-emerald-700"
                                                            : "bg-red-50 text-red-700"
                                                    ) : "text-zinc-400 bg-zinc-50/30 font-medium"
                                                )}>
                                                    {grade?.finalGrade ? Number(grade.finalGrade).toFixed(2) : "—"}
                                                </TableCell>

                                                {/* Remarks Badge */}
                                                <TableCell className="text-center py-4 align-middle">
                                                    <Badge
                                                        variant="secondary"
                                                        className={cn(
                                                            "text-[10px] uppercase font-bold px-2 py-0.5 border shadow-none",
                                                            grade?.remarks === "Passed"
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                : grade?.remarks === "Failed"
                                                                    ? "bg-red-50 text-red-700 border-red-200"
                                                                    : "bg-zinc-50 text-zinc-400 border-zinc-200"
                                                        )}
                                                    >
                                                        {grade?.remarks || "Pending"}
                                                    </Badge>
                                                </TableCell>

                                                {/* Actions Column */}
                                                <TableCell className="text-center pr-6 py-4 align-middle">
                                                    <Button
                                                        variant={(!grade || grade.remarks === "Pending") ? "default" : "outline"}
                                                        size="sm"
                                                        className={cn(
                                                            "h-8 text-[10px] uppercase font-bold px-3 gap-1.5 shadow-none transition-all",
                                                            (!grade || grade.remarks === "Pending")
                                                                ? "bg-blue-600 hover:bg-blue-700 text-white border-transparent"
                                                                : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                                                        )}
                                                        onClick={() => {
                                                            const params = new URLSearchParams();
                                                            params.set("search", student.studentNo);
                                                            params.set("studentId", student.id);
                                                            params.set("courseId", student.course.id);
                                                            params.set("subjectId", subject.id);

                                                            // Since we auto-create grade records on reservation,
                                                            // we can jump straight to inline editing.
                                                            if (grade) {
                                                                params.set("editId", grade.id);
                                                            } else {
                                                                params.set("add", "true");
                                                            }

                                                            router.push(`/dashboard/grades?${params.toString()}`);
                                                        }}
                                                    >
                                                        <IconExternalLink className="size-3" />
                                                        {(!grade || grade.remarks === "Pending") ? "Encode Grade" : "Modify Record"}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </div>
            </div >
            <Dialog open={isManageModalOpen} onOpenChange={(open) => {
                setIsManageModalOpen(open);
                if (!open) setManageSearch("");
            }}>
                <DialogContent className="sm:max-w-[500px] max-h-[85vh]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <IconBook className="size-5 text-blue-600" />
                            Academic Registration
                        </DialogTitle>
                        <DialogDescription>
                            Select or unreserve subjects for <strong>{student?.firstName} {student?.lastName}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-4">
                        <div className="relative">
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                            <Input
                                placeholder="Search subject code or title..."
                                value={manageSearch}
                                onChange={(e) => setManageSearch(e.target.value)}
                                className="pl-9 h-10 border-zinc-200 focus-visible:ring-blue-500 rounded-lg"
                            />
                            {manageSearch && (
                                <button
                                    onClick={() => setManageSearch("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                >
                                    <IconX className="size-4" />
                                </button>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 h-9 rounded-lg border-zinc-200 text-xs font-bold gap-2 hover:bg-zinc-50 transition-colors shadow-none"
                                onClick={() => {
                                    const subjectsToEnroll = courseSubjects
                                        ?.filter((sBySearch: any) =>
                                            sBySearch.code.toLowerCase().includes(manageSearch.toLowerCase()) ||
                                            sBySearch.title.toLowerCase().includes(manageSearch.toLowerCase())
                                        )
                                        .filter((sByEnroll: any) => !student?.subjectReservations.some(r => r.subject.id === sByEnroll.id))
                                        .map((s: any) => s.id);

                                    if (subjectsToEnroll && subjectsToEnroll.length > 0) {
                                        bulkReserveMutation.mutate(subjectsToEnroll);
                                    } else {
                                        toast.info("No new subjects to reserve in this view");
                                    }
                                }}
                                disabled={bulkReserveMutation.isPending || bulkUnreserveMutation.isPending || loadingSubjects}
                            >
                                <IconPlus className="size-3.5 text-blue-600" />
                                Reserve All {manageSearch ? "Visible" : ""}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 h-9 rounded-lg border-zinc-200 text-xs font-bold gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors shadow-none"
                                onClick={() => {
                                    const reservationsToRemove = student?.subjectReservations
                                        .filter(r =>
                                            r.subject.code.toLowerCase().includes(manageSearch.toLowerCase()) ||
                                            r.subject.title.toLowerCase().includes(manageSearch.toLowerCase())
                                        )
                                        .map(r => r.id);

                                    if (reservationsToRemove && reservationsToRemove.length > 0) {
                                        bulkUnreserveMutation.mutate(reservationsToRemove);
                                    } else {
                                        toast.info("No reserved subjects to unreserve in this view");
                                    }
                                }}
                                disabled={bulkReserveMutation.isPending || bulkUnreserveMutation.isPending || loadingSubjects}
                            >
                                <IconTrash className="size-3.5" />
                                Unreserve All {manageSearch ? "Visible" : ""}
                            </Button>
                        </div>
                    </div>

                    <ScrollArea className="h-[350px]">
                        {loadingSubjects ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <IconLoader2 className="size-8 animate-spin text-blue-600" />
                                <p className="text-sm text-zinc-500 font-medium">Loading available subjects...</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {(courseSubjects?.filter((s: any) =>
                                    s.code.toLowerCase().includes(manageSearch.toLowerCase()) ||
                                    s.title.toLowerCase().includes(manageSearch.toLowerCase())
                                ) || []).map((subject: any) => {
                                    const reservation = student?.subjectReservations.find(r => r.subject.id === subject.id);
                                    const isReserved = !!reservation;
                                    const isItemUnreserving = unreserveMutation.isPending && unreserveMutation.variables === reservation?.id;
                                    const isItemReserving = reserveMutation.isPending && reserveMutation.variables === subject.id;
                                    const isItemProcessing = isItemReserving || isItemUnreserving;
                                    const isAnyBulkProcessing = bulkReserveMutation.isPending || bulkUnreserveMutation.isPending;

                                    return (
                                        <div
                                            key={subject.id}
                                            className={cn(
                                                "flex items-center justify-between p-3 rounded-xl border transition-all duration-200 group",
                                                isReserved
                                                    ? "bg-zinc-50 border-zinc-200"
                                                    : "bg-white border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50/50"
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "size-10 rounded-lg flex items-center justify-center transition-colors",
                                                    isReserved ? "bg-zinc-200 text-zinc-900" : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200"
                                                )}>
                                                    <IconBook className="size-5" />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <div className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                                                        {subject.code}
                                                        {isReserved && (
                                                            <Badge variant="secondary" className="bg-zinc-200 text-zinc-700 hover:bg-zinc-200 border-none px-1.5 h-4 text-[9px] uppercase tracking-wider font-black">Reserved</Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-zinc-500 font-medium line-clamp-1">{subject.title}</div>
                                                    <div className="text-[10px] text-zinc-400 font-mono">{subject.units}.0 Units</div>
                                                </div>
                                            </div>

                                            <Button
                                                size="sm"
                                                variant={isReserved ? "outline" : "default"}
                                                className={cn(
                                                    "h-8 px-4 rounded-lg font-bold text-xs gap-2 transition-all shadow-none min-w-[100px]",
                                                    isReserved && "text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                                                )}
                                                onClick={() => {
                                                    if (isReserved) {
                                                        unreserveMutation.mutate(reservation.id);
                                                    } else {
                                                        reserveMutation.mutate(subject.id);
                                                    }
                                                }}
                                                disabled={isItemProcessing || isAnyBulkProcessing}
                                            >
                                                {isItemProcessing ? (
                                                    <>
                                                        <IconLoader2 className="size-3.5 animate-spin" />
                                                        Processing...
                                                    </>
                                                ) : isReserved ? (
                                                    <>
                                                        <IconTrash className="size-3.5" />
                                                        Unreserve
                                                    </>
                                                ) : (
                                                    <>
                                                        <IconPlus className="size-3.5" />
                                                        Reserve
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    );
                                })}
                                {(courseSubjects || []).length === 0 && (
                                    <div className="py-12 text-center space-y-3">
                                        <div className="size-12 rounded-full bg-zinc-50 flex items-center justify-center mx-auto">
                                            <IconBook className="size-6 text-zinc-300" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-zinc-900">No subjects found</p>
                                            <p className="text-xs text-zinc-500">There are no subjects listed for this course yet.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </ScrollArea>

                    <DialogFooter className="px-6 py-4 bg-zinc-50/50 border-t border-zinc-100">
                        <Button variant="outline" onClick={() => setIsManageModalOpen(false)} className="h-10 font-bold border-zinc-200 shadow-none">
                            Close Window
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
