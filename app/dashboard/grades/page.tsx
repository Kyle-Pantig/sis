"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { gradesApi, subjectsApi, studentsApi, reservationsApi } from "@/lib/api";
import { usePageTitle } from "../layout";
import { CourseCombobox } from "@/components/course-combobox";
import { GenericCombobox } from "@/components/generic-combobox";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { IconPlus, IconSearch, IconLoader2, IconPencil, IconCheck, IconX, IconChevronUp, IconChevronDown, IconSelector } from "@tabler/icons-react";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from "@tanstack/react-table";

import { gradeSchema, type GradeFormValues } from "@/lib/validations/grade";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { ListFilter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GenericDataTable } from "@/components/generic-data-table";

interface Grade {
    id: string;
    studentId: string;
    subjectId: string;
    courseId: string;
    prelim: string | null;
    midterm: string | null;
    finals: string | null;
    finalGrade: string | null;
    remarks: string | null;
    student: {
        id: string;
        studentNo: string;
        firstName: string;
        lastName: string;
    };
    subject: {
        id: string;
        code: string;
        title: string;
    };
    course: {
        id: string;
        code: string;
        name: string;
    };
}

interface PaginatedGrades {
    grades: Grade[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}



interface Subject {
    id: string;
    code: string;
    title: string;
    courseId: string;
    course: {
        code: string;
        name: string;
    };
}

interface Student {
    id: string;
    studentNo: string;
    firstName: string;
    lastName: string;
    courseId: string;
}

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

    const form = useForm<GradeFormValues>({
        resolver: zodResolver(gradeSchema) as any,
        defaultValues: {
            studentId: "",
            subjectId: "",
            courseId: "",
            prelim: "",
            midterm: "",
            finals: "",
            remarks: "",
        }
    });

    const formCourseId = form.watch("courseId");
    const formStudentId = form.watch("studentId");
    const formSubjectId = form.watch("subjectId");
    const formPrelim = form.watch("prelim");
    const formMidterm = form.watch("midterm");
    const formFinals = form.watch("finals");

    // Queries
    const { data, isLoading: loading, isFetching } = useQuery<PaginatedGrades>({
        queryKey: ["grades", page, limit, filterCourse, filterSubject, search, filterRemarks],
        queryFn: () => gradesApi.getAll(page, limit, filterCourse || undefined, filterSubject || undefined, search || undefined, filterRemarks || undefined),
        placeholderData: (previousData) => previousData,
    });

    const { data: existingGradesData, isLoading: loadingExistingGrades } = useQuery<Grade[]>({
        queryKey: ["student-grades", formStudentId],
        queryFn: () => gradesApi.getByStudent(formStudentId),
        enabled: addOpen && !!formStudentId,
    });

    const { data: reservationsData, isLoading: loadingReservations } = useQuery<any[]>({
        queryKey: ["student-reservations", formStudentId],
        queryFn: () => reservationsApi.getByStudent(formStudentId),
        enabled: addOpen && !!formStudentId,
    });



    const { data: subjectsData, isLoading: loadingSubjects } = useQuery<{ subjects: Subject[] }>({
        queryKey: ["subjects-list", filterCourse],
        queryFn: () => subjectsApi.getAll(1, 200, undefined, filterCourse || undefined),
        enabled: true,
    });

    const { data: studentsData, isLoading: loadingStudents } = useQuery<{ students: Student[] }>({
        queryKey: ["students-for-grade", formCourseId],
        queryFn: () => studentsApi.getAll(1, 500),
        enabled: addOpen,
    });

    // Auto-populate form when selecting an existing grade
    React.useEffect(() => {
        if (!formStudentId) return;

        if (!formSubjectId) {
            form.setValue("prelim", "");
            form.setValue("midterm", "");
            form.setValue("finals", "");
            form.setValue("remarks", "");
            return;
        }

        if (!Array.isArray(existingGradesData)) return;

        const existingGrade = existingGradesData.find((g: Grade) => g.subjectId === formSubjectId);

        if (existingGrade) {
            // If it's a "Pending" grade, we treat it as new, so don't show "Pending" in remarks
            const isPending = existingGrade.remarks === "Pending";

            form.setValue("prelim", existingGrade.prelim ? Number(existingGrade.prelim) : "");
            form.setValue("midterm", existingGrade.midterm ? Number(existingGrade.midterm) : "");
            form.setValue("finals", existingGrade.finals ? Number(existingGrade.finals) : "");
            form.setValue("remarks", isPending ? "" : (existingGrade.remarks || ""));
        } else {
            // Only clear if we really switched to a new subject
            form.setValue("prelim", "");
            form.setValue("midterm", "");
            form.setValue("finals", "");
            form.setValue("remarks", "");
        }
    }, [formSubjectId, existingGradesData, formStudentId, form]);

    const grades = data?.grades || [];
    const totalPages = data?.totalPages || 1;
    const total = data?.total || 0;
    const subjects = subjectsData?.subjects || [];
    const students = studentsData?.students?.filter((s: Student) => !formCourseId || s.courseId === formCourseId) || [];

    // Filter subjects for dropdown based on selected course for new grade
    // We treat "Pending" grades as if they haven't been graded yet (Add mode)
    // Real existing grades are those that are NOT "Pending"

    const reservedSubjectIds = Array.isArray(reservationsData) ? reservationsData.map((r: any) => r.subjectId) : [];

    const selectedGrade = Array.isArray(existingGradesData)
        ? existingGradesData.find((g: Grade) => g.subjectId === formSubjectId)
        : null;

    const isEditing = !!(selectedGrade && selectedGrade.remarks !== "Pending");

    // Build subject options with disabled states
    const subjectOptions = subjects
        .filter((s) => !formCourseId || s.courseId === formCourseId)
        .map((s) => {
            const existingGrade = Array.isArray(existingGradesData)
                ? existingGradesData.find((g: Grade) => g.subjectId === s.id)
                : null;

            const isFullyGraded = existingGrade && existingGrade.remarks !== "Pending";
            const isPending = existingGrade && existingGrade.remarks === "Pending";
            const isNotEnrolled = formStudentId && !reservedSubjectIds.includes(s.id);

            let disabled = false;
            let disabledReason = "";

            if (isFullyGraded) {
                // Allow selection for editing
                disabled = false;
                disabledReason = "Edit Grade"; // Indicates it has a grade
            } else if (isNotEnrolled) {
                disabled = true;
                disabledReason = "Not enrolled";
            } else if (isPending) {
                // It's pending, so it's available for "Add Grade"
                // We don't need a special label, or maybe distinct one?
                // Letting it appear as a normal subject implies "Add".
            }

            return {
                value: s.id,
                label: `${s.code} - ${s.title}`,
                disabled,
                disabledReason,
            };
        });

    const clearDeepLinkMetadata = () => {
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.delete("add");
        nextParams.delete("editId");
        nextParams.delete("subjectId");

        // We keep 'search', 'studentId', and 'courseId' to maintain the filtered view
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
            setAddOpen(false);
            form.reset();
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
            form.reset({
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
    }, [searchParams, data, loading, editingId, addOpen, form]);

    function startEdit(grade: Grade) {
        setEditingId(grade.id);
        setEditValues({
            prelim: grade.prelim || "",
            midterm: grade.midterm || "",
            finals: grade.finals || "",
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
        let calculatedRemarks = editValues.remarks;
        if (p !== null && m !== null && f !== null) {
            const finalGrade = (p * 0.3) + (m * 0.3) + (f * 0.4);
            calculatedRemarks = finalGrade <= 3.0 ? "Passed" : "Failed";
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
                        (editValues.prelim || "") !== (grade.prelim || "") ||
                        (editValues.midterm || "") !== (grade.midterm || "") ||
                        (editValues.finals || "") !== (grade.finals || "");
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
            // Clear subject filter if multiple courses are selected or course changes, 
            // as subjects are usually specific to a single course context in the filter dropdown logic?
            // Actually, we might want to keep it if valid, but simplest is to reset subject filter on course change.
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

    function getGradeColor(grade: string | null): string {
        if (!grade) return "text-zinc-400";
        const num = parseFloat(grade);
        if (num > 3.0) return "text-red-600 font-medium";
        return "text-zinc-900 font-medium";
    }

    function formatGrade(grade: string | null): string {
        if (!grade) return "-";
        return parseFloat(grade).toFixed(2);
    }

    const isUpdating = updateMutation.isPending;
    const isCreating = createMutation.isPending;

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
                        const hasAll = editValues.prelim && editValues.midterm && editValues.finals;
                        const final = hasAll ? (p * 0.3) + (m * 0.3) + (f * 0.4) : null;

                        return (
                            <div className={cn(
                                "text-center py-1 transition-colors font-medium",
                                final !== null ? (final <= 3.0 ? "bg-emerald-50/50 text-emerald-700" : "bg-red-50/50 text-red-700") : "text-zinc-400 bg-zinc-50/30"
                            )}>
                                {final !== null ? final.toFixed(2) : "-"}
                            </div>
                        );
                    }
                    return (
                        <div className={cn(
                            "text-center py-1 font-bold transition-colors",
                            grade.finalGrade ? (parseFloat(grade.finalGrade) <= 3.0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700") : "text-zinc-400 bg-zinc-50/30"
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
                        if (editValues.prelim && editValues.midterm && editValues.finals) {
                            const final = (p * 0.3) + (m * 0.3) + (f * 0.4);
                            status = final <= 3.0 ? "Passed" : "Failed";
                            remarks = status;
                        } else {
                            status = "Pending";
                            remarks = null;
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
                                            "text-zinc-400 border-zinc-200 bg-zinc-50"
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
                            <div className="flex gap-1 justify-end">
                                {hasChanges && (
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="size-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                        onClick={() => saveEdit(grade.id)}
                                        disabled={isUpdating}
                                    >
                                        {isUpdating ? <IconLoader2 className="size-4 animate-spin" /> : <IconCheck className="size-4" />}
                                    </Button>
                                )}
                                <Button size="icon" variant="ghost" className="size-7 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={cancelEdit}>
                                    <IconX className="size-4" />
                                </Button>
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
            <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-xl">Digital Grading Sheet</CardTitle>
                        <CardDescription>
                            Total records: <span className="font-bold text-zinc-900">{total}</span>
                        </CardDescription>
                    </div>
                    <Button onClick={() => setAddOpen(true)} className="gap-2">
                        <IconPlus className="size-4" />
                        Add Grade
                    </Button>
                </CardHeader>

                {/* Filters */}
                {/* Search and Filters */}
                <div className="px-6 pb-6 flex flex-col lg:flex-row gap-4 items-start lg:items-center">
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

                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto lg:flex-1 lg:justify-end items-center">
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
                                <IconLoader2 className="size-8 animate-spin text-emerald-600" />
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

            {/* Add Grade Dialog */}
            <Dialog open={addOpen} onOpenChange={(open) => {
                setAddOpen(open);
                if (!open) form.reset();
            }}>
                <DialogContent className="sm:max-w-[500px]!" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">{isEditing ? "Edit Grade" : "Add New Grade"}</DialogTitle>
                        <DialogDescription>{isEditing ? "Update existing grades for the selected subject." : "Enter grades for a student in a specific subject."}</DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control as any}
                                name="courseId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Course *</FormLabel>
                                        <FormControl>
                                            <CourseCombobox
                                                value={field.value}
                                                onValueChange={(v) => {
                                                    field.onChange(v);
                                                    form.setValue("studentId", "");
                                                    form.setValue("subjectId", "");
                                                }}
                                                placeholder="Select course"
                                                className="w-full"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control as any}
                                name="studentId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Student *</FormLabel>
                                        <FormControl>
                                            <GenericCombobox
                                                value={field.value}
                                                onValueChange={(v) => {
                                                    field.onChange(v);
                                                    form.setValue("subjectId", "");
                                                }}
                                                items={students.map((s: Student) => ({
                                                    value: s.id,
                                                    label: `${s.studentNo} - ${s.lastName}, ${s.firstName}`,
                                                }))}
                                                placeholder="Select student"
                                                className={!formCourseId ? "opacity-50 pointer-events-none w-full" : "w-full"}
                                                isLoading={loadingStudents}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control as any}
                                name="subjectId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Subject *</FormLabel>
                                        <FormControl>
                                            <GenericCombobox
                                                value={field.value}
                                                onValueChange={field.onChange}
                                                items={subjectOptions}
                                                placeholder="Select subject"
                                                className={!formCourseId ? "opacity-50 pointer-events-none w-full" : "w-full"}
                                                isLoading={loadingSubjects || loadingReservations || loadingExistingGrades}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-3 gap-3">
                                <FormField
                                    control={form.control as any}
                                    name="prelim"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Prelim</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                    placeholder="0-100"
                                                    {...field}
                                                    value={field.value ?? ""}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control as any}
                                    name="midterm"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Midterm</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                    placeholder="0-100"
                                                    {...field}
                                                    value={field.value ?? ""}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control as any}
                                    name="finals"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Finals</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                    placeholder="0-100"
                                                    {...field}
                                                    value={field.value ?? ""}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Remarks</Label>
                                <div className="h-10 flex items-center">
                                    {(() => {
                                        const p = parseFloat((formPrelim as string) || "0");
                                        const m = parseFloat((formMidterm as string) || "0");
                                        const f = parseFloat((formFinals as string) || "0");
                                        if (!formPrelim || !formMidterm || !formFinals) {
                                            return (
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] uppercase font-bold px-2 py-0.5 text-zinc-400 border-zinc-200 bg-zinc-50"
                                                >
                                                    Pending
                                                </Badge>
                                            );
                                        }
                                        const final = (p * 0.3) + (m * 0.3) + (f * 0.4);
                                        const status = final <= 3.0 ? "Passed" : "Failed";
                                        return (
                                            <Badge
                                                variant="secondary"
                                                className={cn(
                                                    "text-[10px] uppercase font-bold px-2 py-0.5 border shadow-none",
                                                    status === "Passed"
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                        : "bg-red-50 text-red-700 border-red-200"
                                                )}
                                            >
                                                {status}
                                            </Badge>
                                        );
                                    })()}
                                </div>
                            </div>

                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={isCreating}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isCreating}>
                                    {isCreating ? (
                                        <>
                                            <IconLoader2 className="size-4 mr-2 animate-spin" />
                                            {isEditing ? "Updating..." : "Creating..."}
                                        </>
                                    ) : (
                                        isEditing ? "Update Grade" : "Save Grade"
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
