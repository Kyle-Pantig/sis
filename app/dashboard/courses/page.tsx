"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { coursesApi } from "@/lib/api";
import { courseSchema, type CourseFormValues } from "@/lib/validations/course";
import { usePageTitle } from "../layout";
import { useAuth } from "@/context/auth-context";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { IconPlus, IconDotsVertical, IconPencil, IconTrash, IconUsers, IconBook, IconLoader2, IconSearch, IconX, IconChevronUp, IconChevronDown, IconSelector, IconExclamationCircle } from "@tabler/icons-react";
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
import { CourseCodeCombobox, COMMON_COURSES } from "@/components/course-code-combobox";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

interface Course {
    id: string;
    code: string;
    name: string;
    description: string | null;
    _count: {
        students: number;
        subjects: number;
    };
}

interface PaginatedCourses {
    courses: Course[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export default function CoursesPage() {
    const { setTitle } = usePageTitle();
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();

    useEffect(() => {
        setTitle("Course Management");
    }, [setTitle]);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

    const [searchInput, setSearchInput] = useState(search);
    const { user } = useAuth();

    // Queries
    const { data, isLoading: loading } = useQuery<PaginatedCourses>({
        queryKey: ["courses", page, limit, search],
        queryFn: () => coursesApi.getAll(page, limit, search || undefined),
    });

    const courses = data?.courses || [];
    const totalPages = data?.totalPages || 1;
    const total = data?.total || 0;

    // Mutations
    const mutation = useMutation({
        mutationFn: async ({ mode, data, id }: { mode: "create" | "edit", data: CourseFormValues, id?: string }) => {
            if (mode === "create") {
                const result = await coursesApi.create(data);
                if (result.error) throw new Error(result.error);
                return result;
            } else {
                const result = await coursesApi.update(id!, data);
                if (result.error) throw new Error(result.error);
                return result;
            }
        },
        onSuccess: (data, variables) => {
            toast.success(`Course ${variables.mode === "create" ? "created" : "updated"} successfully`);
            queryClient.invalidateQueries({ queryKey: ["courses"] });
            queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
            // Also invalidate dashboard stats
            queryClient.invalidateQueries({ queryKey: ["summary-stats"] });
            queryClient.invalidateQueries({ queryKey: ["course-stats"] });
            queryClient.invalidateQueries({ queryKey: ["courses-list"] });
            setFormOpen(false);
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to save course");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: ({ id, force }: { id: string; force: boolean }) => coursesApi.delete(id, force),
        onSuccess: () => {
            toast.success("Course deleted successfully");
            queryClient.invalidateQueries({ queryKey: ["courses"] });
            queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
            // Also invalidate dashboard and course list stats
            queryClient.invalidateQueries({ queryKey: ["summary-stats"] });
            queryClient.invalidateQueries({ queryKey: ["course-stats"] });
            queryClient.invalidateQueries({ queryKey: ["courses-list"] });
            setDeleteOpen(false);
            setIsForceDelete(false);
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to delete course");
        }
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: ({ ids, force }: { ids: string[]; force: boolean }) => coursesApi.bulkDelete(ids, force),
        onSuccess: (result: any) => {
            if (result.deletedCount > 0) {
                toast.success(`Successfully deleted ${result.deletedCount} courses`);
            }
            if (!isForceDelete && result.skippedCount > 0) {
                toast.warning(`${result.skippedCount} courses were skipped because they have subjects or students.`, {
                    description: `Skipped: ${result.skippedCodes.join(", ")}`,
                    duration: 5000,
                });
            }
            queryClient.invalidateQueries({ queryKey: ["courses"] });
            queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
            // Also invalidate dashboard and course list stats
            queryClient.invalidateQueries({ queryKey: ["summary-stats"] });
            queryClient.invalidateQueries({ queryKey: ["course-stats"] });
            queryClient.invalidateQueries({ queryKey: ["courses-list"] });
            setSelectedIds([]);
            setBulkDeleteOpen(false);
            setIsForceDelete(false);
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to delete courses");
        },
    });

    // Form state
    const [formOpen, setFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<"create" | "edit">("create");
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

    // Selection state
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [isForceDelete, setIsForceDelete] = useState(false);

    // Delete state
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);

    const selectionSummary = React.useMemo(() => {
        const selectedCourses = courses.filter(c => selectedIds.includes(c.id));
        const withDeps = selectedCourses.filter(c => (c._count.students || 0) > 0 || (c._count.subjects || 0) > 0);
        const deletable = selectedCourses.filter(c => (c._count.students || 0) === 0 && (c._count.subjects || 0) === 0);

        return {
            totalSelected: selectedIds.length,
            currentlyVisible: selectedCourses.length,
            withDeps: withDeps.length,
            deletable: deletable.length,
            deletableIds: deletable.map(c => c.id)
        };
    }, [courses, selectedIds]);

    // React Hook Form with Zod
    const form = useForm<CourseFormValues>({
        resolver: zodResolver(courseSchema),
        defaultValues: {
            code: "",
            name: "",
            description: "",
        },
    });

    useEffect(() => {
        setTitle("Course Management");
    }, [setTitle]);

    useEffect(() => {
        const create = searchParams.get("create");
        if (create === "true" && !formOpen) {
            handleCreate();
            const nextParams = new URLSearchParams(searchParams.toString());
            nextParams.delete("create");
            router.replace(`/dashboard/courses?${nextParams.toString()}`, { scroll: false });
        }
    }, [searchParams, formOpen, router]);

    // Validation state
    const [checkingCode, setCheckingCode] = useState(false);
    const [codeExists, setCodeExists] = useState(false);

    function handleCreate() {
        setSelectedCourse(null);
        form.reset({ code: "", name: "", description: "" });
        setFormMode("create");
        setCodeExists(false);
        setFormOpen(true);
    }

    function handleEdit(course: Course) {
        setSelectedCourse(course);
        form.reset({
            code: course.code,
            name: course.name,
            description: course.description || "",
        });
        setFormMode("edit");
        setCodeExists(false);
        setFormOpen(true);
    }

    function handleDeleteClick(course: Course) {
        setCourseToDelete(course);
        setDeleteOpen(true);
    }

    async function onSubmit(data: CourseFormValues) {
        if (formMode === "create") {
            setCheckingCode(true);
            try {
                const check = await coursesApi.checkCode(data.code);
                if (check.exists) {
                    toast.error("Course code already exists", {
                        description: `A course with code "${data.code}" is already in the system.`,
                    });
                    setCheckingCode(false);
                    return;
                }
            } catch (err) {
                // Ignore check errors and proceed to let backend handle it
            } finally {
                setCheckingCode(false);
            }
        }

        await mutation.mutateAsync({
            mode: formMode,
            data,
            id: selectedCourse?.id
        });
    }

    async function handleDelete() {
        if (!courseToDelete) return;
        await deleteMutation.mutateAsync({ id: courseToDelete.id, force: isForceDelete });
    }

    async function handleBulkDelete() {
        await bulkDeleteMutation.mutateAsync({ ids: selectedIds, force: isForceDelete });
    }

    function toggleAllRowSelection() {
        if (selectedIds.length === courses.length && courses.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(courses.map(c => c.id));
        }
    }

    function updatePage(newPage: number) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", newPage.toString());
        router.push(`?${params.toString()}`);
    }

    function updateLimit(newLimit: string) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("limit", newLimit);
        params.set("page", "1"); // Reset to page 1 on limit change
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

    function clearFilters() {
        setSearchInput("");
        router.push("/dashboard/courses");
    }

    const columns = React.useMemo<ColumnDef<Course>[]>(
        () => {
            const cols: ColumnDef<Course>[] = [
                {
                    id: "select",
                    header: ({ table }) => (
                        user?.role === "admin" ? (
                            <Checkbox
                                checked={selectedIds.length === courses.length && courses.length > 0}
                                onCheckedChange={() => toggleAllRowSelection()}
                                aria-label="Select all"
                            />
                        ) : null
                    ),
                    cell: ({ row }) => (
                        user?.role === "admin" ? (
                            <Checkbox
                                checked={selectedIds.includes(row.original.id)}
                                onCheckedChange={(checked) => {
                                    if (checked) {
                                        setSelectedIds((prev) => [...prev, row.original.id]);
                                    } else {
                                        setSelectedIds((prev) => prev.filter((id) => id !== row.original.id));
                                    }
                                }}
                                aria-label="Select row"
                            />
                        ) : null
                    ),
                    enableSorting: false,
                    enableHiding: false,
                },
                {
                    accessorKey: "code",
                    header: "Code",
                    cell: ({ row }) => (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold">
                            {row.original.code}
                        </Badge>
                    ),
                },
                {
                    accessorKey: "name",
                    header: "Course Name",
                    cell: ({ row }) => (
                        <div>
                            <p className="font-semibold text-sm text-zinc-900">{row.original.name}</p>
                            {row.original.description && (
                                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{row.original.description}</p>
                            )}
                        </div>
                    ),
                },
                {
                    accessorKey: "_count.students",
                    header: () => (
                        <div className="text-center">
                            <IconUsers className="size-4 inline mr-1" />
                            Students
                        </div>
                    ),
                    meta: { headerClassName: "justify-center" },
                    cell: ({ row }) => (
                        <div className="text-center font-bold text-zinc-900">
                            {row.original._count.students}
                        </div>
                    ),
                },
                {
                    accessorKey: "_count.subjects",
                    header: () => (
                        <div className="text-center">
                            <IconBook className="size-4 inline mr-1" />
                            Subjects
                        </div>
                    ),
                    meta: { headerClassName: "justify-center" },
                    cell: ({ row }) => (
                        <div className="text-center font-bold text-zinc-900">
                            {row.original._count.subjects}
                        </div>
                    ),
                },
                {
                    id: "actions",
                    header: () => <div className="text-right">Actions</div>,
                    meta: { headerClassName: "justify-end" },
                    cell: ({ row }) => {
                        const course = row.original;
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
                                            <DropdownMenuItem onClick={() => handleEdit(course)} className="cursor-pointer">
                                                <IconPencil className="size-4 mr-2" />
                                                Edit Course
                                            </DropdownMenuItem>
                                        )}
                                        {user?.role === "admin" && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => handleDeleteClick(course)}
                                                    className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                                                >
                                                    <IconTrash className="size-4 mr-2" />
                                                    Delete Course
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
                return cols.filter(col => col.id !== "actions" && col.id !== "select");
            }

            return cols;
        },
        [user, selectedIds, courses]
    );

    const isSubmitting = mutation.isPending;
    const isDeleting = deleteMutation.isPending;

    if (loading) {
        return (
            <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-4 w-56" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </CardHeader>

                {/* Search and Filters Skeleton */}
                <div className="px-6 pb-6 flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                    <div className="flex w-full lg:max-w-md">
                        <Skeleton className="h-10 flex-1 rounded-r-none" />
                        <Skeleton className="h-10 w-10 rounded-l-none" />
                    </div>
                </div>

                <CardContent className="p-0">
                    <div className="space-y-4">
                        <div className="flex px-6 py-4 border-b border-zinc-100 gap-4">
                            <Skeleton className="h-4 w-[15%]" />
                            <Skeleton className="h-4 w-[35%]" />
                            <Skeleton className="h-4 w-[15%]" />
                            <Skeleton className="h-4 w-[15%]" />
                            <Skeleton className="h-4 w-[20%]" />
                        </div>
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex px-6 py-4 gap-4 items-center border-b border-zinc-50">
                                <Skeleton className="h-5 w-[15%]" />
                                <Skeleton className="h-5 w-[35%]" />
                                <Skeleton className="h-5 w-[15%]" />
                                <Skeleton className="h-5 w-[15%]" />
                                <div className="w-[20%] flex justify-end">
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
                        <CardTitle className="text-xl">Course Masterlist</CardTitle>
                        <CardDescription>
                            Total courses: <span className="font-bold text-zinc-900">{total}</span>
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
                                Add Course
                            </Button>
                        )}
                    </div>
                </CardHeader>

                {/* Search and Filters */}
                <div className="px-6 pb-6 flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                    {/* Search Group */}
                    <div className="flex w-full lg:max-w-md">
                        <div className="relative flex flex-1">
                            <Input
                                placeholder="Search by code or name..."
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
                        {search && (
                            <Button
                                variant="ghost"
                                onClick={clearFilters}
                                className="text-zinc-500 hover:text-zinc-900 gap-2 px-3 h-10"
                            >
                                <IconX className="size-4" />
                                <span className="hidden sm:inline">Reset</span>
                            </Button>
                        )}
                    </div>
                </div>

                <CardContent className="p-0">
                    <div className="border-t">
                        <GenericDataTable
                            columns={columns}
                            data={courses}
                            sorting={sorting}
                            onSortingChange={setSorting}
                            noResultsText="No courses found. Create your first course."
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

            {/* Create/Edit Dialog with React Hook Form */}
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-[500px]" onOpenAutoFocus={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">
                            {formMode === "create" ? "Add New Course" : "Edit Course"}
                        </DialogTitle>
                        <DialogDescription>
                            {formMode === "create"
                                ? "Fill in the details below to create a new course."
                                : "Update the course information below."}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Course Code *</FormLabel>
                                        <FormControl>
                                            <CourseCodeCombobox
                                                value={field.value}
                                                onValueChange={(code, name) => {
                                                    field.onChange(code);
                                                    const currentName = form.getValues("name");
                                                    const isNameFromKnownCourse = COMMON_COURSES.some(c => c.name === currentName);

                                                    if (name) {
                                                        // Known course - auto-fill the name if empty or was previously auto-filled
                                                        if (!currentName || isNameFromKnownCourse) {
                                                            form.setValue("name", name);
                                                        }
                                                    } else if (isNameFromKnownCourse) {
                                                        // Custom code but name still shows a known course name - clear it
                                                        form.setValue("name", "");
                                                    }

                                                    // Real-time check if code exists (only in create mode)
                                                    if (formMode === "create" && code.trim().length >= 2) {
                                                        coursesApi.checkCode(code).then(res => {
                                                            setCodeExists(!!res.exists);
                                                        }).catch(() => { });
                                                    } else {
                                                        setCodeExists(false);
                                                    }
                                                }}
                                                placeholder="Select or type course code..."
                                            />
                                        </FormControl>
                                        <FormMessage />
                                        {codeExists && (
                                            <p className="text-[11px] font-medium text-red-500 mt-1 flex items-center gap-1">
                                                <IconExclamationCircle className="size-3" />
                                                This course code is already registered in the system.
                                            </p>
                                        )}
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Course Name *</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g., Bachelor of Science in Computer Science"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Optional course description..."
                                                rows={3}
                                                {...field}
                                            />
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
                                    disabled={isSubmitting || checkingCode}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting || checkingCode || codeExists} className="min-w-[100px]">
                                    {isSubmitting || checkingCode ? (
                                        <>
                                            <IconLoader2 className="size-4 mr-2 animate-spin" />
                                            {checkingCode ? "Checking..." : (formMode === "create" ? "Creating..." : "Saving...")}
                                        </>
                                    ) : (
                                        formMode === "create" ? "Create Course" : "Save Changes"
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
                        <AlertDialogTitle>Delete Course</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-4">
                            <div className="text-zinc-600 text-sm">
                                Are you sure you want to delete <span className="font-semibold text-zinc-900">{courseToDelete?.name}</span>?
                            </div>

                            {(courseToDelete?._count?.students ?? 0) > 0 || (courseToDelete?._count?.subjects ?? 0) > 0 ? (
                                <>
                                    {!isForceDelete && (
                                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-800 text-xs flex items-start gap-2">
                                            <IconExclamationCircle className="size-4 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-semibold mb-1">Course has active students or subjects</p>
                                                <p>Standard deletion will fail because this course is in use.</p>
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
                                            Force delete (Auto-unenroll students & remove subjects)
                                        </label>
                                    </div>

                                    {isForceDelete && (
                                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-800 text-xs flex items-start gap-2">
                                            <IconExclamationCircle className="size-4 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-bold mb-1 underline">WARNING: Data will be affected</p>
                                                <p>Students will be <span className="font-semibold">unenrolled</span> (not deleted). Subjects and grades under this course will be permanently removed.</p>
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
                            disabled={isDeleting || (!isForceDelete && ((courseToDelete?._count?.students ?? 0) > 0 || (courseToDelete?._count?.subjects ?? 0) > 0))}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {isDeleting ? (
                                <>
                                    <IconLoader2 className="size-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete Course"
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
                        <AlertDialogTitle>Delete Multiple Courses</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-4">
                            <div className="text-zinc-600 text-sm">
                                You have selected <span className="font-bold text-zinc-900">{selectionSummary.totalSelected}</span> courses.
                            </div>

                            {!isForceDelete && selectionSummary.withDeps > 0 && (
                                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-800 text-xs flex items-start gap-2">
                                    <IconExclamationCircle className="size-4 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold mb-1">{selectionSummary.withDeps} courses cannot be deleted</p>
                                        <p>These courses have active students or subjects. They will be automatically skipped.</p>
                                    </div>
                                </div>
                            )}

                            {selectionSummary.withDeps > 0 && (
                                <div className="flex items-center space-x-2 pt-2 pb-1">
                                    <Checkbox
                                        id="force-delete-bulk"
                                        checked={isForceDelete}
                                        onCheckedChange={(checked) => setIsForceDelete(!!checked)}
                                    />
                                    <label
                                        htmlFor="force-delete-bulk"
                                        className="text-xs font-medium leading-none cursor-pointer select-none text-zinc-700"
                                    >
                                        Force delete (Auto-unenroll students & remove subjects)
                                    </label>
                                </div>
                            )}

                            {isForceDelete && (
                                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-800 text-xs flex items-start gap-2">
                                    <IconExclamationCircle className="size-4 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold mb-1 underline">WARNING: Data will be affected</p>
                                        <p>Students will be <span className="font-semibold">unenrolled</span> (not deleted). Subjects and grades associated with these courses will be permanently removed.</p>
                                    </div>
                                </div>
                            )}

                            <div className="text-zinc-600 text-sm leading-relaxed">
                                {isForceDelete ? (
                                    <>Are you sure you want to delete <span className="font-bold text-red-600">ALL {selectionSummary.totalSelected}</span> selected courses?</>
                                ) : (
                                    <>Are you sure you want to delete the remaining <span className="font-bold text-red-600">{selectionSummary.deletable}</span> courses?</>
                                )}
                                <p className="mt-1 font-medium text-red-500">This action cannot be undone.</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={bulkDeleteMutation.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleBulkDelete();
                            }}
                            disabled={bulkDeleteMutation.isPending || (!isForceDelete && selectionSummary.deletable === 0)}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {bulkDeleteMutation.isPending ? (
                                <>
                                    <IconLoader2 className="size-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                `Delete ${isForceDelete ? selectionSummary.totalSelected : selectionSummary.deletable} Courses`
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
