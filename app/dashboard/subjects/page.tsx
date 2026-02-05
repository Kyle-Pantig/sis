"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { subjectsApi } from "@/lib/api";
import { usePageTitle } from "../layout";
import { CourseCombobox } from "@/components/course-combobox";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { ListFilter, X } from "lucide-react";
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
import { subjectSchema, type SubjectFormValues } from "@/lib/validations/subject";
import { Skeleton } from "@/components/ui/skeleton";
import { IconPlus, IconDotsVertical, IconPencil, IconTrash, IconSearch, IconLoader2, IconX, IconChevronUp, IconChevronDown, IconSelector, IconExclamationCircle } from "@tabler/icons-react";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { GenericDataTable } from "@/components/generic-data-table";

interface Subject {
    id: string;
    code: string;
    title: string;
    units: number;
    courseId: string;
    course: {
        id: string;
        code: string;
        name: string;
    };
    _count: {
        subjectReservations: number;
        grades: number;
    };
}

interface PaginatedSubjects {
    subjects: Subject[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}



import { useAuth } from "@/context/auth-context";

export default function SubjectsPage() {
    const { setTitle } = usePageTitle();
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const filterCourse = searchParams.get("courseId") || "";

    const [searchInput, setSearchInput] = useState(search);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [sorting, setSorting] = useState<SortingState>([]);

    // Queries
    const { data, isLoading: loading, isFetching } = useQuery<PaginatedSubjects>({
        queryKey: ["subjects", page, limit, search, filterCourse],
        queryFn: () => subjectsApi.getAll(page, limit, search || undefined, filterCourse || undefined),
        placeholderData: (previousData) => previousData,
    });



    const subjects = data?.subjects || [];
    const totalPages = data?.totalPages || 1;
    const total = data?.total || 0;

    // Mutations
    const mutation = useMutation({
        mutationFn: async ({ mode, data, id }: { mode: "create" | "edit"; data: SubjectFormValues; id?: string }) => {
            if (mode === "create") {
                const result = await subjectsApi.create(data);
                if (result.error) throw new Error(result.error);
                return result;
            } else {
                const result = await subjectsApi.update(id!, data);
                if (result.error) throw new Error(result.error);
                return result;
            }
        },
        onSuccess: (_, variables) => {
            toast.success(`Subject ${variables.mode === "create" ? "created" : "updated"} successfully`);
            queryClient.invalidateQueries({ queryKey: ["subjects"] });
            queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
            setFormOpen(false);
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to save subject");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: ({ id, force }: { id: string; force: boolean }) => subjectsApi.delete(id, force),
        onSuccess: () => {
            toast.success("Subject deleted successfully");
            queryClient.invalidateQueries({ queryKey: ["subjects"] });
            queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
            setDeleteOpen(false);
            setIsForceDelete(false);
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to delete subject");
        },
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: ({ ids, force }: { ids: string[]; force: boolean }) => subjectsApi.bulkDelete(ids, force),
        onSuccess: (result: any) => {
            if (result.deletedCount > 0) {
                toast.success(`Successfully deleted ${result.deletedCount} subjects`);
            }
            if (!isForceDelete && result.skippedCount > 0) {
                toast.warning(`${result.skippedCount} subjects were skipped because students are enrolled.`, {
                    description: `Skipped: ${result.skippedCodes.join(", ")}`,
                    duration: 5000,
                });
            }
            queryClient.invalidateQueries({ queryKey: ["subjects"] });
            queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
            setSelectedIds([]);
            setBulkDeleteOpen(false);
            setIsForceDelete(false);
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to delete subjects");
        },
    });

    // Form state
    const [formOpen, setFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<"create" | "edit">("create");
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [codeExists, setCodeExists] = useState(false);
    const [titleExists, setTitleExists] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

    // Delete state
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [isForceDelete, setIsForceDelete] = useState(false);

    const selectionSummary = React.useMemo(() => {
        const selectedSubjects = subjects.filter(s => selectedIds.includes(s.id));
        const withStudents = selectedSubjects.filter(s => (s._count.subjectReservations || 0) > 0 || (s._count.grades || 0) > 0);
        const deletable = selectedSubjects.filter(s => (s._count.subjectReservations || 0) === 0 && (s._count.grades || 0) === 0);

        return {
            totalSelected: selectedIds.length,
            currentlyVisible: selectedSubjects.length,
            withStudents: withStudents.length,
            deletable: deletable.length,
            deletableIds: deletable.map(s => s.id)
        };
    }, [subjects, selectedIds]);

    // React Hook Form
    const form = useForm<SubjectFormValues>({
        resolver: zodResolver(subjectSchema) as any,
        defaultValues: {
            courseId: "",
            code: "",
            title: "",
            units: 3,
        },
    });

    const checkAvailability = async (codeValue?: string, titleValue?: string, courseIdValue?: string) => {
        const cId = courseIdValue || form.getValues("courseId");
        const code = codeValue !== undefined ? codeValue : form.getValues("code");
        const title = titleValue !== undefined ? titleValue : form.getValues("title");

        if (!cId || (!code && !title)) {
            setCodeExists(false);
            setTitleExists(false);
            return;
        }

        if (code.length >= 2 || title.length >= 3) {
            try {
                const res = await subjectsApi.checkAvailability(cId, code, title, selectedSubject?.id);
                setCodeExists(!!res.codeExists);
                setTitleExists(!!res.titleExists);
            } catch (err) { }
        } else {
            setCodeExists(false);
            setTitleExists(false);
        }
    };

    useEffect(() => {
        setTitle("Subject Management");
    }, [setTitle]);

    useEffect(() => {
        const create = searchParams.get("create");
        if (create === "true" && !formOpen) {
            handleCreate();
            const nextParams = new URLSearchParams(searchParams.toString());
            nextParams.delete("create");
            router.replace(`/dashboard/subjects?${nextParams.toString()}`, { scroll: false });
        }
    }, [searchParams, formOpen, router]);

    function handleCreate() {
        setSelectedSubject(null);
        form.reset({ courseId: "", code: "", title: "", units: 3 });
        setFormMode("create");
        setCodeExists(false);
        setTitleExists(false);
        setFormOpen(true);
    }

    function handleEdit(subject: Subject) {
        setSelectedSubject(subject);
        form.reset({
            courseId: subject.courseId,
            code: subject.code,
            title: subject.title,
            units: subject.units,
        });
        setFormMode("edit");
        setCodeExists(false);
        setTitleExists(false);
        setFormOpen(true);
    }

    function handleDeleteClick(subject: Subject) {
        setSubjectToDelete(subject);
        setDeleteOpen(true);
    }

    async function onSubmit(data: SubjectFormValues) {
        // Final availability check before submitting
        try {
            setCheckingAvailability(true);
            const res = await subjectsApi.checkAvailability(
                data.courseId,
                data.code,
                data.title,
                selectedSubject?.id
            );

            if (res.codeExists) {
                setCodeExists(true);
                toast.error("Subject code already exists for this course");
                return;
            }

            if (res.titleExists) {
                setTitleExists(true);
                toast.error("Subject title already exists for this course");
                return;
            }
        } catch (error) {
            // If check fails, we might want to continue or show error
        } finally {
            setCheckingAvailability(false);
        }

        await mutation.mutateAsync({
            mode: formMode,
            data,
            id: selectedSubject?.id,
        });
    }

    async function handleDelete() {
        if (!subjectToDelete) return;
        await deleteMutation.mutateAsync({ id: subjectToDelete.id, force: isForceDelete });
    }

    async function handleBulkDelete() {
        await bulkDeleteMutation.mutateAsync({ ids: selectedIds, force: isForceDelete });
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
        } else {
            params.delete("courseId");
        }
        params.set("page", "1");
        router.push(`?${params.toString()}`);
    }

    function clearFilters() {
        setSearchInput("");
        router.push("/dashboard/subjects");
    }

    function toggleSelectAll() {
        if (selectedIds.length === subjects.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(subjects.map((s) => s.id));
        }
    }

    function toggleSelect(id: string) {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter((i) => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    }


    const columns = React.useMemo<ColumnDef<Subject>[]>(
        () => {
            const cols: ColumnDef<Subject>[] = [
                {
                    id: "select",
                    header: ({ table }) => (
                        <Checkbox
                            checked={subjects.length > 0 && selectedIds.length === subjects.length}
                            onCheckedChange={toggleSelectAll}
                        />
                    ),
                    cell: ({ row }) => (
                        <Checkbox
                            checked={selectedIds.includes(row.original.id)}
                            onCheckedChange={() => toggleSelect(row.original.id)}
                        />
                    ),
                    enableSorting: false,
                },
                {
                    accessorKey: "code",
                    header: "Code",
                    cell: ({ row }) => (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">
                            {row.original.code}
                        </Badge>
                    ),
                },
                {
                    accessorKey: "title",
                    header: "Title",
                    cell: ({ row }) => <span className="font-medium text-zinc-900">{row.original.title}</span>,
                },
                {
                    accessorKey: "course.code",
                    header: "Course",
                    cell: ({ row }) => <Badge variant="secondary">{row.original.course.code}</Badge>,
                },
                {
                    accessorKey: "units",
                    header: "Units",
                    meta: {
                        headerClassName: "justify-center",
                        cellClassName: "text-center"
                    },
                    cell: ({ row }) => <span className="font-bold">{row.original.units}</span>,
                },
                {
                    id: "actions",
                    header: () => <div className="text-right">Actions</div>,
                    meta: { headerClassName: "justify-end" },
                    cell: ({ row }) => {
                        const subject = row.original;
                        return (
                            <div className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="size-8">
                                            <IconDotsVertical className="size-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        {user?.role === "admin" && (
                                            <DropdownMenuItem onClick={() => handleEdit(subject)} className="cursor-pointer">
                                                <IconPencil className="size-4 mr-2" />
                                                Edit Subject
                                            </DropdownMenuItem>
                                        )}
                                        {user?.role === "admin" && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => handleDeleteClick(subject)}
                                                    className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                                                >
                                                    <IconTrash className="size-4 mr-2" />
                                                    Delete Subject
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        );
                    },
                    enableSorting: false,
                }
            ];

            if (user?.role !== "admin") {
                return cols.filter(col => col.id !== "actions");
            }

            return cols;
        },
        [selectedIds, user]
    );

    const isSubmitting = mutation.isPending;
    const isDeleting = deleteMutation.isPending;
    const isBulkDeleting = bulkDeleteMutation.isPending;

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

                {/* Search and Filter Skeleton */}
                <div className="px-6 pb-6 flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                    <div className="flex w-full lg:max-w-md">
                        <Skeleton className="h-10 flex-1 rounded-r-none" />
                        <Skeleton className="h-10 w-10 rounded-l-none" />
                    </div>
                    <div className="flex w-full lg:w-auto lg:flex-1 lg:justify-end gap-3">
                        <Skeleton className="h-10 w-full sm:w-[300px]" />
                    </div>
                </div>

                <CardContent className="p-0">
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex px-6 py-4 gap-4 items-center border-b border-zinc-50">
                                <Skeleton className="h-5 w-5" />
                                <Skeleton className="h-5 w-[10%]" />
                                <Skeleton className="h-5 w-[25%]" />
                                <Skeleton className="h-5 w-[15%]" />
                                <Skeleton className="h-5 w-[10%]" />
                                <div className="flex-1 flex justify-end">
                                    <Skeleton className="size-8 rounded-md" />
                                </div>
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
                        <CardTitle className="text-xl">Subject Masterlist</CardTitle>
                        <CardDescription>
                            Total subjects: <span className="font-bold text-zinc-900">{total}</span>
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedIds.length > 0 && user?.role === "admin" && (
                            <Button
                                variant="destructive"
                                onClick={() => setBulkDeleteOpen(true)}
                                className="gap-2"
                            >
                                <IconTrash className="size-4" />
                                Delete ({selectedIds.length})
                            </Button>
                        )}
                        {user?.role === "admin" && (
                            <Button onClick={handleCreate} className="gap-2">
                                <IconPlus className="size-4" />
                                Add Subject
                            </Button>
                        )}
                    </div>
                </CardHeader>

                {/* Search and Filter */}
                <div className="px-6 pb-6 flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                    {/* Search Group */}
                    <div className="flex w-full lg:max-w-md">
                        <div className="relative flex flex-1">
                            <Input
                                placeholder="Search code or title..."
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

                    <div className="flex w-full lg:w-auto lg:flex-1 lg:justify-end gap-3">
                        {(search || filterCourse) && (
                            <Button
                                variant="ghost"
                                onClick={clearFilters}
                                className="text-zinc-500 hover:text-zinc-900 gap-2 px-3 h-10"
                            >
                                <IconX className="size-4" />
                                <span className="hidden sm:inline">Reset</span>
                            </Button>
                        )}
                        <CourseCombobox
                            multiple
                            value={filterCourse ? filterCourse.split(",") : []}
                            onValueChange={handleFilterCourses}
                            includeAll={false}
                            placeholder="Filter by course..."
                            className="w-full sm:w-[300px]"
                            showClear={true}
                            leftIcon={<ListFilter className="size-4" />}
                        />
                    </div>
                </div>

                <CardContent className="p-0 relative">
                    {isFetching && !loading && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                            <IconLoader2 className="size-8 animate-spin text-primary" />
                        </div>
                    )}
                    <div className="border-t">
                        <GenericDataTable
                            columns={columns}
                            data={subjects}
                            sorting={sorting}
                            onSortingChange={setSorting}
                            noResultsText="No subjects found."
                            className="border-none rounded-none shadow-none"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 pb-10">
                <div className="flex items-center gap-2 text-sm text-zinc-500 font-medium">
                    <span>Rows per page</span>
                    <Select value={limit.toString()} onValueChange={updateLimit}>
                        <SelectTrigger className="h-8 w-20 border-zinc-200">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="5">5</SelectItem>
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
                            if (
                                pageNum === 1 ||
                                pageNum === totalPages ||
                                (pageNum >= page - 1 && pageNum <= page + 1)
                            ) {
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

            {/* Create/Edit Dialog */}
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-[500px]" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">
                            {formMode === "create" ? "Add New Subject" : "Edit Subject"}
                        </DialogTitle>
                        <DialogDescription>
                            {formMode === "create"
                                ? "Fill in the details below to create a new subject."
                                : "Update the subject information below."}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit) as any} className="space-y-4">
                            <FormField
                                control={form.control as any}
                                name="courseId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Course *</FormLabel>
                                        <FormControl>
                                            <CourseCombobox
                                                value={field.value}
                                                onValueChange={(val) => {
                                                    field.onChange(val);
                                                    checkAvailability(undefined, undefined, val);
                                                }}
                                                placeholder="Select a course"
                                                className="w-full"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control as any}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Subject Code *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g., CS101"
                                                {...field}
                                                onChange={(e) => {
                                                    const val = e.target.value.toUpperCase();
                                                    field.onChange(val);
                                                    checkAvailability(val);
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                        {codeExists && (
                                            <p className="text-[11px] font-medium text-red-500 mt-1 flex items-center gap-1">
                                                <IconExclamationCircle className="size-3" />
                                                This code is already used in this course.
                                            </p>
                                        )}
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control as any}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Subject Title *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g., Introduction to Programming"
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(e.target.value);
                                                    checkAvailability(undefined, e.target.value);
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                        {titleExists && (
                                            <p className="text-[11px] font-medium text-red-500 mt-1 flex items-center gap-1">
                                                <IconExclamationCircle className="size-3" />
                                                This title is already used in this course.
                                            </p>
                                        )}
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control as any}
                                name="units"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Units *</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={1} max={10} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter className="pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setFormOpen(false)}
                                    disabled={isSubmitting || checkingAvailability}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || checkingAvailability || codeExists || titleExists}
                                    className="min-w-[100px]"
                                >
                                    {isSubmitting || checkingAvailability ? (
                                        <>
                                            <IconLoader2 className="size-4 mr-2 animate-spin" />
                                            {checkingAvailability ? "Checking..." : (formMode === "create" ? "Creating..." : "Saving...")}
                                        </>
                                    ) : (
                                        formMode === "create" ? "Create Subject" : "Save Changes"
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={deleteOpen} onOpenChange={(open) => {
                setDeleteOpen(open);
                if (!open) {
                    setIsForceDelete(false);
                }
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Subject</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-4">
                            <div className="text-zinc-600 text-sm">
                                Are you sure you want to delete <span className="font-semibold text-zinc-900">{subjectToDelete?.title}</span>?
                            </div>

                            {(subjectToDelete?._count?.subjectReservations ?? 0) > 0 || (subjectToDelete?._count?.grades ?? 0) > 0 ? (
                                <>
                                    {!isForceDelete && (
                                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-800 text-xs flex items-start gap-2">
                                            <IconExclamationCircle className="size-4 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-semibold mb-1">Students are currently enrolled</p>
                                                <p>This subject has active reservations or grades. Standard deletion will fail.</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center space-x-2 pt-2 pb-1">
                                        <Checkbox
                                            id="force-delete-single"
                                            checked={isForceDelete}
                                            onCheckedChange={(checked) => setIsForceDelete(!!checked)}
                                        />
                                        <label
                                            htmlFor="force-delete-single"
                                            className="text-xs font-medium leading-none cursor-pointer select-none text-zinc-700"
                                        >
                                            Force delete (Auto-unenroll students & remove grades)
                                        </label>
                                    </div>

                                    {isForceDelete && (
                                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-800 text-xs flex items-start gap-2">
                                            <IconExclamationCircle className="size-4 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-bold mb-1 underline">DANGER: PERMANENT DATA LOSS</p>
                                                <p>This will permanently remove ALL associated student records for this subject.</p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-red-600 font-medium text-sm">This action cannot be undone.</div>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleDelete();
                            }}
                            disabled={isDeleting || (!isForceDelete && ((subjectToDelete?._count?.subjectReservations ?? 0) > 0 || (subjectToDelete?._count?.grades ?? 0) > 0))}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {isDeleting ? (
                                <>
                                    <IconLoader2 className="size-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete Subject"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Delete Dialog */}
            <AlertDialog open={bulkDeleteOpen} onOpenChange={(open) => {
                setBulkDeleteOpen(open);
                if (!open) {
                    setIsForceDelete(false);
                }
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Multiple Subjects</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-4">
                            <div className="text-zinc-600 text-sm">
                                You have selected <span className="font-bold text-zinc-900">{selectionSummary.totalSelected}</span> subjects.
                            </div>

                            {!isForceDelete && selectionSummary.withStudents > 0 && (
                                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-800 text-xs flex items-start gap-2">
                                    <IconExclamationCircle className="size-4 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold mb-1">{selectionSummary.withStudents} subjects cannot be deleted</p>
                                        <p>These subjects have students currently enrolled or have existing grades. They will be automatically skipped.</p>
                                    </div>
                                </div>
                            )}

                            {selectionSummary.withStudents > 0 && (
                                <div className="flex items-center space-x-2 pt-2 pb-1">
                                    <Checkbox
                                        id="force-delete"
                                        checked={isForceDelete}
                                        onCheckedChange={(checked) => setIsForceDelete(!!checked)}
                                    />
                                    <label
                                        htmlFor="force-delete"
                                        className="text-xs font-medium leading-none cursor-pointer select-none text-zinc-700"
                                    >
                                        Force delete (Auto-unenroll students & remove grades)
                                    </label>
                                </div>
                            )}

                            {isForceDelete && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-800 text-xs flex items-start gap-2">
                                    <IconExclamationCircle className="size-4 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold mb-1 underline">DANGER: PERMANENT DATA LOSS</p>
                                        <p>Forcing deletion will permanently remove ALL student reservations and grades associated with these subjects.</p>
                                    </div>
                                </div>
                            )}

                            <div className="text-zinc-600 text-sm leading-relaxed">
                                {isForceDelete ? (
                                    <>Are you sure you want to delete <span className="font-bold text-red-600">ALL {selectionSummary.totalSelected}</span> selected subjects?</>
                                ) : (
                                    <>Are you sure you want to delete the remaining <span className="font-bold text-red-600">{selectionSummary.deletable}</span> subjects?</>
                                )}
                                <p className="mt-1 font-medium text-red-500">This action cannot be undone.</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleBulkDelete();
                            }}
                            disabled={isBulkDeleting || (!isForceDelete && selectionSummary.deletable === 0)}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {isBulkDeleting ? (
                                <>
                                    <IconLoader2 className="size-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                `Delete ${isForceDelete ? selectionSummary.totalSelected : selectionSummary.deletable} Subjects`
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
