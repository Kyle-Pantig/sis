"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { gradesApi, subjectsApi } from "@/lib/api";
import { usePageTitle } from "../layout";
import { CourseCombobox } from "@/components/course-combobox";
import { GenericCombobox } from "@/components/generic-combobox";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { IconPlus, IconSearch, IconLoader2, IconPencil, IconCheck, IconX } from "@tabler/icons-react";
import {
    ColumnDef,
    SortingState,
} from "@tanstack/react-table";
import { type GradeFormValues } from "@/lib/validations/grade";
import { ListFilter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GenericDataTable } from "@/components/generic-data-table";
import { GradeForm } from "@/components/forms/grade-form";

import { Grade, PaginatedGrades, Subject } from "@/types";

export default function GradesPage() {
    const { setTitle } = usePageTitle();
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const filterCourse = searchParams.get("courseId") || "";
    const filterSubject = searchParams.get("subjectId") || "";
    const filterRemarks = searchParams.get("remarks") || "";
    const search = searchParams.get("search") || "";

    const [searchInput, setSearchInput] = useState(search);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<{
        prelim: string;
        midterm: string;
        finals: string;
        remarks: string;
    }>({ prelim: "", midterm: "", finals: "", remarks: "" });
    const [sorting, setSorting] = useState<SortingState>([]);

    // Dialog state for new grade
    const [addOpen, setAddOpen] = useState(false);

    // Track handled deep links to avoid re-triggering after save
    const handledDeepLinkRef = useRef<string | null>(null);
    const [defaultValues, setDefaultValues] = useState<Partial<GradeFormValues> | undefined>(undefined);

    // Queries
    const { data, isLoading: loading, isFetching } = useQuery<PaginatedGrades>({
        queryKey: ["grades", page, limit, filterCourse, filterSubject, search, filterRemarks],
        queryFn: () => gradesApi.getAll(page, limit, filterCourse || undefined, filterSubject || undefined, search || undefined, filterRemarks || undefined),
        placeholderData: (previousData) => previousData,
    });

    const { data: subjectsData } = useQuery({
        queryKey: ["subjects-filter", filterCourse],
        queryFn: () => subjectsApi.getAll(1, 1000, undefined, filterCourse || undefined),
        staleTime: 1000 * 60 * 5, // Cache for 5 mins
    });
    const subjects = (subjectsData?.subjects || []) as Subject[];

    // Keeping subjects list if used for filters (e.g. subject dropdown filter if it exists)

    const grades = data?.grades || [];
    const totalPages = data?.totalPages || 1;
    const total = data?.total || 0;

    const clearDeepLinkMetadata = () => {
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.delete("add");
        nextParams.delete("editId");
        nextParams.delete("subjectId");
        router.replace(`/dashboard/grades?${nextParams.toString()}`, { scroll: false });
    };

    // Mutations
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const result = await gradesApi.update(id, data);
            if (result.error) throw new Error(result.error);
            return result;
        },
        onSuccess: () => {
            toast.success("Grade updated successfully");
            queryClient.invalidateQueries({ queryKey: ["grades"] });
            queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
            setEditingId(null);
            clearDeepLinkMetadata();
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to update grade");
        },
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const result = await gradesApi.upsert({
                ...data,
                encodedByUserId: "system", // In real app, use actual user ID
            });
            if (result.error) throw new Error(result.error);
            return result;
        },
        onSuccess: () => {
            toast.success("Grade saved successfully");
            queryClient.invalidateQueries({ queryKey: ["grades"] });
            queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
            setAddOpen(false);
            clearDeepLinkMetadata();
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to create grade");
        },
    });

    useEffect(() => {
        setTitle("Grading Sheet");
    }, [setTitle]);

    // Consistently handle deep-linking for grading
    useEffect(() => {
        if (!data || loading) return;

        const editId = searchParams.get("editId");
        const studentId = searchParams.get("studentId");
        const subjectId = searchParams.get("subjectId");
        const add = searchParams.get("add");

        // Generate a unique key for the current deep link state
        const deepLinkKey = `${editId}-${studentId}-${subjectId}-${add}`;

        // If the URL is clean, reset our memory so we can handle future deep links
        if (!editId && !studentId && !subjectId && !add) {
            handledDeepLinkRef.current = null;
            return;
        }

        // If we've already handled this specific deep link state, skip
        if (handledDeepLinkRef.current === deepLinkKey) {
            return;
        }

        // 1. Try to find by explicit editId
        if (editId && !editingId) {
            const match = data.grades.find(g => g.id === editId);
            if (match) {
                handledDeepLinkRef.current = deepLinkKey;
                startEdit(match);
                return;
            }
        }

        // 2. Try to find by student and subject identifiers (robust fallback)
        if (studentId && subjectId && !editingId && !addOpen) {
            const match = data.grades.find(g =>
                g.studentId === studentId &&
                g.subjectId === subjectId
            );
            if (match) {
                handledDeepLinkRef.current = deepLinkKey;
                startEdit(match);
                return;
            }
        }

        // 3. Fallback to "Add" dialog ONLY if requested and no record was found above
        if (add === "true" && !editingId && !addOpen) {
            const courseId = searchParams.get("courseId") || "";
            handledDeepLinkRef.current = deepLinkKey;
            setDefaultValues({
                studentId: studentId || "",
                subjectId: subjectId || "",
                courseId: courseId || "",
                prelim: "",
                midterm: "",
                finals: "",
                remarks: "",
            });
            setAddOpen(true);
        }
    }, [searchParams, data, loading, editingId, addOpen]);

    function startEdit(grade: Grade) {
        setEditingId(grade.id);
        setEditValues({
            prelim: grade.prelim !== null ? String(grade.prelim) : "",
            midterm: grade.midterm !== null ? String(grade.midterm) : "",
            finals: grade.finals !== null ? String(grade.finals) : "",
            remarks: grade.remarks || "",
        });
    }

    function cancelEdit() {
        setEditingId(null);
        setEditValues({ prelim: "", midterm: "", finals: "", remarks: "" });
    }

    async function saveEdit(gradeId: string) {
        const p = editValues.prelim ? parseFloat(editValues.prelim) : null;
        const m = editValues.midterm ? parseFloat(editValues.midterm) : null;
        const f = editValues.finals ? parseFloat(editValues.finals) : null;

        // Auto-calculate remarks for the update
        // Auto-calculate remarks for the update
        let calculatedRemarks = editValues.remarks;
        const isMissing = (val: number | null) => val === null || val === 0;

        if (!isMissing(p) && !isMissing(m) && !isMissing(f)) {
            const finalGrade = (p! * 0.3) + (m! * 0.3) + (f! * 0.4);
            calculatedRemarks = finalGrade <= 3.0 ? "Passed" : "Failed";
        } else if ((p && p > 0) || (m && m > 0) || (f && f > 0)) {
            calculatedRemarks = "INC";
        }

        await updateMutation.mutateAsync({
            id: gradeId,
            data: {
                prelim: p,
                midterm: m,
                finals: f,
                remarks: calculatedRemarks || undefined,
            },
        });
    }

    // Global keyboard handler for inline editing
    useEffect(() => {
        if (!editingId) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                cancelEdit();
            }
            if (e.key === "Enter" && !e.shiftKey) {
                // Find the grade being edited
                const grade = grades.find(g => g.id === editingId);
                if (grade) {
                    const hasChanges =
                        editValues.prelim !== (grade.prelim !== null ? String(grade.prelim) : "") ||
                        editValues.midterm !== (grade.midterm !== null ? String(grade.midterm) : "") ||
                        editValues.finals !== (grade.finals !== null ? String(grade.finals) : "");
                    if (hasChanges) {
                        e.preventDefault();
                        saveEdit(grade.id);
                    }
                }
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [editingId, editValues, grades]);

    async function onSubmit(data: GradeFormValues) {
        const p = (data.prelim !== "" && data.prelim != null) ? Number(data.prelim) : null;
        const m = (data.midterm !== "" && data.midterm != null) ? Number(data.midterm) : null;
        const f = (data.finals !== "" && data.finals != null) ? Number(data.finals) : null;

        // Auto-calculate remarks based on the scores
        let calculatedRemarks = data.remarks;
        if (p !== null && m !== null && f !== null) {
            const finalGrade = (p * 0.3) + (m * 0.3) + (f * 0.4);
            calculatedRemarks = finalGrade <= 3.0 ? "Passed" : "Failed";
        }

        await createMutation.mutateAsync({
            studentId: data.studentId,
            subjectId: data.subjectId,
            courseId: data.courseId,
            prelim: p,
            midterm: m,
            finals: f,
            remarks: calculatedRemarks || undefined,
        });
    }

    function updatePage(newPage: number) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", newPage.toString());
        router.push(`?${params.toString()}`);
    }

    function updateLimit(newLimit: string) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("limit", newLimit);
        params.set("page", "1");
        router.push(`?${params.toString()}`);
    }

    function handleSearch() {
        const params = new URLSearchParams(searchParams.toString());
        if (searchInput) {
            params.set("search", searchInput);
        } else {
            params.delete("search");
        }
        params.set("page", "1");
        router.push(`?${params.toString()}`);
    }

    function handleFilterCourses(courseIds: string[]) {
        const params = new URLSearchParams(searchParams.toString());
        if (courseIds.length > 0) {
            params.set("courseId", courseIds.join(","));
            params.delete("subjectId");
        } else {
            params.delete("courseId");
            params.delete("subjectId");
        }
        params.set("page", "1");
        router.push(`?${params.toString()}`);
    }

    function handleFilterSubject(subjectId: string) {
        const params = new URLSearchParams(searchParams.toString());
        if (subjectId && subjectId !== "all") {
            params.set("subjectId", subjectId);
        } else {
            params.delete("subjectId");
        }
        params.set("page", "1");
        router.push(`?${params.toString()}`);
    }

    function handleFilterRemarks(remarks: string) {
        const params = new URLSearchParams(searchParams.toString());
        if (remarks && remarks !== "all") {
            params.set("remarks", remarks);
        } else {
            params.delete("remarks");
        }
        params.set("page", "1");
        router.push(`?${params.toString()}`);
    }

    function clearFilters() {
        setSearchInput("");
        router.push("/dashboard/grades");
    }

    function getGradeColor(grade: number | null): string {
        if (grade === null || grade === undefined) return "text-zinc-400";
        const numGrade = typeof grade === 'string' ? parseFloat(grade) : grade;
        if (isNaN(numGrade)) return "text-zinc-400";
        if (numGrade === 0) return "text-amber-600 font-medium";
        if (numGrade > 3.0) return "text-red-600 font-medium";
        return "text-zinc-900 font-medium";
    }

    function formatGrade(grade: number | null): string {
        if (grade === null || grade === undefined) return "-";
        const numGrade = typeof grade === 'string' ? parseFloat(grade) : grade;
        if (isNaN(numGrade)) return "-";
        return numGrade.toFixed(2);
    }

    const isUpdating = updateMutation.isPending;

    const columns = React.useMemo<ColumnDef<Grade>[]>(
        () => [
            {
                accessorKey: "student.studentNo",
                header: "Student No.",
                cell: ({ row }) => <Badge variant="outline" className="font-mono">{row.original.student.studentNo}</Badge>,
            },
            {
                id: "name",
                header: "Name",
                accessorFn: (row) => `${row.student.lastName}, ${row.student.firstName}`,
                cell: ({ row }) => <span className="font-medium">{row.original.student.lastName}, {row.original.student.firstName}</span>,
            },
            {
                accessorKey: "subject.code",
                header: "Subject",
                cell: ({ row }) => <Badge variant="secondary">{row.original.subject.code}</Badge>,
            },
            {
                accessorKey: "prelim",
                header: () => <div className="text-center">Prelim</div>,
                meta: { headerClassName: "justify-center" },
                cell: ({ row }) => {
                    const grade = row.original;
                    if (editingId === grade.id) {
                        return (
                            <div className="flex justify-center">
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={editValues.prelim}
                                    onChange={(e) => setEditValues({ ...editValues, prelim: e.target.value })}
                                    onKeyDown={(e) => {
                                        if (e.key === "Escape") {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            cancelEdit();
                                        }
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const hasChanges =
                                                editValues.prelim !== (grade.prelim !== null ? String(grade.prelim) : "") ||
                                                editValues.midterm !== (grade.midterm !== null ? String(grade.midterm) : "") ||
                                                editValues.finals !== (grade.finals !== null ? String(grade.finals) : "");
                                            if (hasChanges) saveEdit(grade.id);
                                        }
                                    }}
                                    className="w-16 h-8 text-center text-sm"
                                />
                            </div>
                        );
                    }
                    return <div className={cn("text-center", getGradeColor(grade.prelim))}>{formatGrade(grade.prelim)}</div>;
                },
            },
            {
                accessorKey: "midterm",
                header: () => <div className="text-center">Midterm</div>,
                meta: { headerClassName: "justify-center" },
                cell: ({ row }) => {
                    const grade = row.original;
                    if (editingId === grade.id) {
                        return (
                            <div className="flex justify-center">
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={editValues.midterm}
                                    onChange={(e) => setEditValues({ ...editValues, midterm: e.target.value })}
                                    onKeyDown={(e) => {
                                        if (e.key === "Escape") {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            cancelEdit();
                                        }
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const hasChanges =
                                                (editValues.prelim || "") !== (grade.prelim || "") ||
                                                (editValues.midterm || "") !== (grade.midterm || "") ||
                                                (editValues.finals || "") !== (grade.finals || "");
                                            if (hasChanges) saveEdit(grade.id);
                                        }
                                    }}
                                    className="w-16 h-8 text-center text-sm"
                                />
                            </div>
                        );
                    }
                    return <div className={cn("text-center", getGradeColor(grade.midterm))}>{formatGrade(grade.midterm)}</div>;
                },
            },
            {
                accessorKey: "finals",
                header: () => <div className="text-center">Finals</div>,
                meta: { headerClassName: "justify-center" },
                cell: ({ row }) => {
                    const grade = row.original;
                    if (editingId === grade.id) {
                        return (
                            <div className="flex justify-center">
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={editValues.finals}
                                    onChange={(e) => setEditValues({ ...editValues, finals: e.target.value })}
                                    onKeyDown={(e) => {
                                        if (e.key === "Escape") {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            cancelEdit();
                                        }
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const hasChanges =
                                                (editValues.prelim || "") !== (grade.prelim || "") ||
                                                (editValues.midterm || "") !== (grade.midterm || "") ||
                                                (editValues.finals || "") !== (grade.finals || "");
                                            if (hasChanges) saveEdit(grade.id);
                                        }
                                    }}
                                    className="w-16 h-8 text-center text-sm"
                                />
                            </div>
                        );
                    }
                    return <div className={cn("text-center", getGradeColor(grade.finals))}>{formatGrade(grade.finals)}</div>;
                },
            },
            {
                accessorKey: "finalGrade",
                header: () => <div className="text-center">Final Grade</div>,
                meta: { headerClassName: "justify-center" },
                cell: ({ row }) => {
                    const grade = row.original;
                    if (editingId === grade.id) {
                        const p = parseFloat(editValues.prelim || "0");
                        const m = parseFloat(editValues.midterm || "0");
                        const f = parseFloat(editValues.finals || "0");

                        const isMissing = (val: string | undefined, num: number) => !val || num === 0;
                        const hasAll = !isMissing(editValues.prelim, p) && !isMissing(editValues.midterm, m) && !isMissing(editValues.finals, f);

                        const final = hasAll ? (p * 0.3) + (m * 0.3) + (f * 0.4) : null;
                        const hasPartial = !hasAll && (p > 0 || m > 0 || f > 0);

                        return (
                            <div className={cn(
                                "text-center py-1 transition-colors font-medium",
                                final !== null
                                    ? (final <= 3.0 ? "bg-emerald-50/50 text-emerald-700" : "bg-red-50/50 text-red-700")
                                    : (hasPartial ? "bg-orange-50/50 text-orange-700" : "text-zinc-400 bg-zinc-50/30")
                            )}>
                                {final !== null ? final.toFixed(2) : "-"}
                            </div>
                        );
                    }
                    return (
                        <div className={cn(
                            "text-center py-1 font-bold transition-colors",
                            grade.finalGrade !== null && grade.finalGrade !== undefined
                                ? (grade.finalGrade <= 3.0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")
                                : (grade.remarks === "INC" ? "bg-orange-50 text-orange-700" : "text-zinc-400 bg-zinc-50/30")
                        )}>
                            {formatGrade(grade.finalGrade)}
                        </div>
                    );
                },
            },
            {
                accessorKey: "remarks",
                header: () => <div className="text-center">Remarks</div>,
                meta: { headerClassName: "justify-center" },
                cell: ({ row }) => {
                    const grade = row.original;
                    let remarks = grade.remarks;
                    let status: "Passed" | "Failed" | "Pending" = remarks === "Passed" ? "Passed" : remarks === "Failed" ? "Failed" : "Pending";

                    if (editingId === grade.id) {
                        const p = parseFloat(editValues.prelim || "0");
                        const m = parseFloat(editValues.midterm || "0");
                        const f = parseFloat(editValues.finals || "0");

                        const isMissing = (val: string | undefined, num: number) => !val || num === 0;

                        if (!isMissing(editValues.prelim, p) && !isMissing(editValues.midterm, m) && !isMissing(editValues.finals, f)) {
                            const final = (p * 0.3) + (m * 0.3) + (f * 0.4);
                            status = final <= 3.0 ? "Passed" : "Failed";
                            remarks = status;
                        } else {
                            const hasPartial = p > 0 || m > 0 || f > 0;
                            if (hasPartial) {
                                status = "Pending"; // We reusing Pending style or creating INC?
                                remarks = "INC";
                            } else {
                                status = "Pending";
                                remarks = null;
                            }
                        }
                    }

                    return (
                        <div className="flex justify-center">
                            <Badge
                                variant={status === "Pending" ? "outline" : "secondary"}
                                className={cn(
                                    "text-[10px] uppercase font-bold px-2 py-0.5 border shadow-none",
                                    status === "Passed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                        status === "Failed" ? "bg-red-50 text-red-700 border-red-200" :
                                            (remarks === "INC" ? "bg-orange-50 text-orange-700 border-orange-200" : "text-zinc-400 border-zinc-200 bg-zinc-50")
                                )}
                            >
                                {remarks || "Pending"}
                            </Badge>
                        </div>
                    );
                },
            },
            {
                id: "actions",
                header: () => <div className="text-right">Actions</div>,
                meta: { headerClassName: "justify-end" },
                cell: ({ row }) => {
                    const grade = row.original;
                    if (editingId === grade.id) {
                        const hasChanges =
                            (editValues.prelim || "") !== (grade.prelim || "") ||
                            (editValues.midterm || "") !== (grade.midterm || "") ||
                            (editValues.finals || "") !== (grade.finals || "");

                        return (
                            <div className="flex flex-col gap-1 items-end">
                                <div className="flex gap-1 justify-end">
                                    {hasChanges && (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="size-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                            onClick={() => saveEdit(grade.id)}
                                            disabled={isUpdating}
                                            title="Save (Enter)"
                                        >
                                            {isUpdating ? <IconLoader2 className="size-4 animate-spin" /> : <IconCheck className="size-4" />}
                                        </Button>
                                    )}
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="size-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={cancelEdit}
                                        title="Cancel (Esc)"
                                    >
                                        <IconX className="size-4" />
                                    </Button>
                                </div>
                                <div className="flex gap-1.5 text-[9px] text-zinc-400 font-medium pr-1">
                                    {hasChanges && (
                                        <>
                                            <span>Enter</span>
                                            <span>•</span>
                                        </>
                                    )}
                                    <span>ESC</span>
                                </div>
                            </div>
                        );
                    }
                    return (
                        <div className="text-right">
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => startEdit(grade)}>
                                <IconPencil className="size-4" />
                            </Button>
                        </div>
                    );
                },
                enableSorting: false,
            }
        ],
        [editingId, editValues, isUpdating, cancelEdit, saveEdit]
    );

    if (loading) {
        return (
            <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </CardHeader>

                {/* Filters Skeleton */}
                <div className="px-6 pb-6 flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                    <div className="flex w-full lg:max-w-md">
                        <Skeleton className="h-10 flex-1 rounded-r-none" />
                        <Skeleton className="h-10 w-10 rounded-l-none" />
                    </div>
                    <div className="flex w-full lg:w-auto lg:flex-1 lg:justify-end gap-3">
                        <Skeleton className="h-10 w-full sm:w-[200px]" />
                        <Skeleton className="h-10 w-full sm:w-[200px]" />
                        <Skeleton className="h-10 w-full sm:w-[200px]" />
                    </div>
                </div>

                <CardContent className="p-0">
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex px-6 py-4 gap-4 items-center border-b border-zinc-50">
                                <Skeleton className="h-5 w-[15%]" />
                                <Skeleton className="h-5 w-[20%]" />
                                <Skeleton className="h-5 w-[10%]" />
                                <Skeleton className="h-5 w-[10%]" />
                                <Skeleton className="h-5 w-[10%]" />
                                <Skeleton className="h-5 w-[10%]" />
                                <Skeleton className="h-5 w-[10%]" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="gap-2">
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-xl">Digital Grading Sheet</CardTitle>
                        <CardDescription>
                            Total records: <span className="font-bold text-zinc-900">{total}</span>
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Button onClick={() => setAddOpen(true)} className="gap-2 flex-1 md:flex-none">
                            <IconPlus className="size-4" />
                            Add Grade
                        </Button>
                    </div>
                </CardHeader>

                {/* Search and Filters */}
                <div className="px-6 pb-4 flex flex-col lg:flex-row gap-2 sm:gap-4 items-start lg:items-center">
                    {/* Search Group */}
                    <div className="flex w-full lg:max-w-md">
                        <div className="relative flex flex-1">
                            <Input
                                placeholder="Search student name or ID..."
                                value={searchInput}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSearchInput(val);
                                    if (val === "") {
                                        const params = new URLSearchParams(searchParams.toString());
                                        params.delete("search");
                                        params.set("page", "1");
                                        router.push(`?${params.toString()}`);
                                    }
                                }}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                className="rounded-r-none border-r-0 focus-visible:ring-0 focus-visible:ring-offset-0 pr-8"
                            />
                            {searchInput && (
                                <button
                                    onClick={() => {
                                        setSearchInput("");
                                        const params = new URLSearchParams(searchParams.toString());
                                        params.delete("search");
                                        params.set("page", "1");
                                        router.push(`?${params.toString()}`);
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                                >
                                    <X className="size-4" />
                                </button>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleSearch}
                            className="rounded-l-none border-zinc-200 hover:bg-zinc-50"
                        >
                            <IconSearch className="size-4" />
                        </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto lg:flex-1 lg:justify-end items-center">
                        {(search || filterCourse || filterSubject || filterRemarks) && (
                            <Button
                                variant="ghost"
                                onClick={clearFilters}
                                className="text-zinc-500 hover:text-zinc-900 gap-2 px-3 h-10 w-full sm:w-auto"
                            >
                                <IconX className="size-4" />
                                <span>Reset</span>
                            </Button>
                        )}
                        <CourseCombobox
                            multiple
                            value={filterCourse ? filterCourse.split(",") : []}
                            onValueChange={handleFilterCourses}
                            includeAll={false}
                            placeholder="Filter by course..."
                            className="w-full sm:w-[220px]"
                            showClear={true}
                            leftIcon={<ListFilter className="size-4" />}
                        />

                        <GenericCombobox
                            value={filterSubject}
                            onValueChange={handleFilterSubject}
                            items={Array.from(new Map(subjects.map(s => [s.id, s])).values()).map((s) => ({
                                value: s.id,
                                label: `${s.code} (${s.course?.code})`,
                            }))}
                            placeholder="Filter by subject"
                            className="w-full sm:w-[220px]"
                            leftIcon={<ListFilter className="size-4" />}
                        />

                        <GenericCombobox
                            value={filterRemarks}
                            onValueChange={handleFilterRemarks}
                            items={[
                                { value: "Passed", label: "Passed" },
                                { value: "Failed", label: "Failed" },
                                { value: "Pending", label: "Pending" },
                            ]}
                            placeholder="Filter by remarks"
                            className="w-full sm:w-[180px]"
                            leftIcon={<IconCheck className="size-4" />}
                        />
                    </div>
                </div>

                <CardContent className="p-0 overflow-x-auto relative">
                    {isFetching && !loading && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                            <div className="flex items-center justify-center">
                                <IconLoader2 className="size-8 animate-spin text-primary" />
                            </div>
                        </div>
                    )}
                    <div className="border-t">
                        <GenericDataTable
                            columns={columns}
                            data={grades}
                            sorting={sorting}
                            onSortingChange={setSorting}
                            noResultsText="No grade records found."
                            className="border-none rounded-none shadow-none"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 pb-10">
                <div className="flex items-center gap-2 text-sm text-zinc-500 font-medium">
                    <span>Rows per page</span>
                    <Select value={limit.toString()} onValueChange={updateLimit}>
                        <SelectTrigger className="h-8 w-20 border-zinc-200">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Pagination className="w-auto mx-0">
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (page > 1) updatePage(page - 1);
                                }}
                                className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>

                        {[...Array(totalPages)].map((_, i) => {
                            const pageNum = i + 1;
                            if (pageNum === 1 || pageNum === totalPages || (pageNum >= page - 1 && pageNum <= page + 1)) {
                                return (
                                    <PaginationItem key={pageNum}>
                                        <PaginationLink
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                updatePage(pageNum);
                                            }}
                                            isActive={page === pageNum}
                                            className="cursor-pointer"
                                        >
                                            {pageNum}
                                        </PaginationLink>
                                    </PaginationItem>
                                );
                            }
                            if (pageNum === page - 2 || pageNum === page + 2) {
                                return (
                                    <PaginationItem key={pageNum}>
                                        <PaginationEllipsis />
                                    </PaginationItem>
                                );
                            }
                            return null;
                        })}

                        <PaginationItem>
                            <PaginationNext
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (page < totalPages) updatePage(page + 1);
                                }}
                                className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>

            {/* Add/Edit Grade Dialog */}
            <GradeForm
                open={addOpen}
                onOpenChange={setAddOpen}
                onSubmit={onSubmit}
                defaultValues={defaultValues}
                isSubmitting={createMutation.isPending}
            />
        </div>
    );
}
