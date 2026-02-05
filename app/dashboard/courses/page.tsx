"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { coursesApi } from "@/lib/api";
import { type CourseFormValues } from "@/lib/validations/course";
import { usePageTitle } from "../layout";
import { useAuth } from "@/context/auth-context";
import { toast } from "sonner";
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
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { IconPlus, IconDotsVertical, IconPencil, IconTrash, IconUsers, IconBook, IconLoader2, IconSearch, IconExclamationCircle } from "@tabler/icons-react";
import {
    ColumnDef,
    SortingState,
} from "@tanstack/react-table";
import { GenericDataTable } from "@/components/generic-data-table";
import { CourseForm } from "@/components/forms/course-form";
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

import { Course, PaginatedCourses } from "@/types";

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
    const { data, isLoading: loading, isFetching } = useQuery<PaginatedCourses>({
        queryKey: ["courses", page, limit, search],
        queryFn: () => coursesApi.getAll(page, limit, search || undefined),
        placeholderData: (previousData) => previousData,
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
        const withDeps = selectedCourses.filter(c => (c._count?.students || 0) > 0 || (c._count?.subjects || 0) > 0);
        const deletable = selectedCourses.filter(c => (c._count?.students || 0) === 0 && (c._count?.subjects || 0) === 0);

        return {
            totalSelected: selectedIds.length,
            currentlyVisible: selectedCourses.length,
            withDeps: withDeps.length,
            deletable: deletable.length,
            deletableIds: deletable.map(c => c.id)
        };
    }, [courses, selectedIds]);

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

    function handleCreate() {
        setSelectedCourse(null);
        setFormMode("create");
        setFormOpen(true);
    }

    function handleEdit(course: Course) {
        setSelectedCourse(course);
        setFormMode("edit");
        setFormOpen(true);
    }

    function handleDeleteClick(course: Course) {
        setCourseToDelete(course);
        setDeleteOpen(true);
    }

    async function onSubmit(data: CourseFormValues) {
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

    const areAllSelected = courses.length > 0 && courses.every(c => selectedIds.includes(c.id));
    const isAnySelected = courses.length > 0 && courses.some(c => selectedIds.includes(c.id));

    function toggleAllRowSelection() {
        if (areAllSelected) {
            // Deselect all on current page
            const currentIds = courses.map(c => c.id);
            setSelectedIds(prev => prev.filter(id => !currentIds.includes(id)));
        } else {
            // Select all on current page
            const currentIds = courses.map(c => c.id);
            setSelectedIds(prev => Array.from(new Set([...prev, ...currentIds])));
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
                                checked={areAllSelected ? true : isAnySelected ? "indeterminate" : false}
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
                            {row.original._count?.students ?? 0}
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
                            {row.original._count?.subjects ?? 0}
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
                                    <DropdownMenuTrigger asChild disabled={selectedIds.length > 0}>
                                        <Button variant="ghost" size="icon" className="size-8" disabled={selectedIds.length > 0}>
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
            <Card className="gap-2">
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-xl">Course Masterlist</CardTitle>
                        <CardDescription>
                            Total courses: <span className="font-bold text-zinc-900">{total}</span>
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        {selectedIds.length > 0 && user?.role === "admin" && (
                            <Button
                                variant="destructive"
                                onClick={() => setBulkDeleteOpen(true)}
                                className="gap-2 flex-1 md:flex-none"
                            >
                                <IconTrash className="size-4" />
                                Delete ({selectedIds.length})
                            </Button>
                        )}
                        {user?.role === "admin" && selectedIds.length === 0 && (
                            <Button onClick={handleCreate} className="gap-2 flex-1 md:flex-none">
                                <IconPlus className="size-4" />
                                Add Course
                            </Button>
                        )}
                    </div>
                </CardHeader>

                {/* Search and Filters */}
                <div className="px-6 pb-4 flex flex-col lg:flex-row gap-4 items-start lg:items-center">
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
                                    className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
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
                </div>

                <CardContent className="p-0 relative min-h-[300px]">
                    {isFetching && !loading && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center transition-all duration-200">
                            <IconLoader2 className="size-8 animate-spin text-primary" />
                        </div>
                    )}
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
            {/* Create/Edit Dialog */}
            <CourseForm
                open={formOpen}
                onOpenChange={setFormOpen}
                onSubmit={onSubmit}
                defaultValues={selectedCourse ? {
                    code: selectedCourse.code,
                    name: selectedCourse.name,
                    description: selectedCourse.description || ""
                } : undefined}
                mode={formMode}
                isSubmitting={isSubmitting}
            />

            {/* Delete Dialog */}
            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={(open) => {
                    setDeleteOpen(open);
                    if (!open) setIsForceDelete(false);
                }}
                title="Delete Course"
                description={
                    <span>
                        Are you sure you want to delete <span className="font-semibold text-zinc-900">{courseToDelete?.name}</span>?
                    </span>
                }
                confirmText={isDeleting ? "Deleting..." : "Delete Course"}
                variant="destructive"
                isLoading={isDeleting}
                disabled={!isForceDelete && ((courseToDelete?._count?.students ?? 0) > 0 || (courseToDelete?._count?.subjects ?? 0) > 0)}
                onConfirm={(e) => {
                    e.preventDefault();
                    handleDelete();
                }}
            >
                <div className="space-y-4 py-2">
                    {((courseToDelete?._count?.students ?? 0) > 0 || (courseToDelete?._count?.subjects ?? 0) > 0) && (
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
                    )}
                    <div className="text-red-600 font-medium text-sm">This action cannot be undone.</div>
                </div>
            </ConfirmDialog>

            {/* Bulk Delete Dialog */}
            <ConfirmDialog
                open={bulkDeleteOpen}
                onOpenChange={(open) => {
                    setBulkDeleteOpen(open);
                    if (!open) setIsForceDelete(false);
                }}
                title="Delete Multiple Courses"
                description={
                    <span>
                        You have selected <span className="font-bold text-zinc-900">{selectionSummary.totalSelected}</span> courses.
                    </span>
                }
                confirmText={bulkDeleteMutation.isPending ? "Deleting..." : `Delete ${isForceDelete ? selectionSummary.totalSelected : selectionSummary.deletable} Courses`}
                variant="destructive"
                isLoading={bulkDeleteMutation.isPending}
                disabled={bulkDeleteMutation.isPending || (!isForceDelete && selectionSummary.deletable === 0)}
                onConfirm={(e) => {
                    e.preventDefault();
                    handleBulkDelete();
                }}
            >
                <div className="space-y-4 py-2">
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
                </div>
            </ConfirmDialog>
        </div>
    );
}
