"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { subjectsApi } from "@/lib/api";
import { usePageTitle } from "../layout";
import { toast } from "sonner";
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
import { ConfirmDialog } from "@/components/confirm-dialog";
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
import { type SubjectFormValues } from "@/lib/validations/subject";
import { Skeleton } from "@/components/ui/skeleton";
import { IconPlus, IconDotsVertical, IconPencil, IconTrash, IconSearch, IconLoader2, IconX, IconExclamationCircle } from "@tabler/icons-react";
import {
    ColumnDef,
    SortingState,
} from "@tanstack/react-table";
import { GenericDataTable } from "@/components/generic-data-table";
import { SubjectForm } from "@/components/forms/subject-form";
import { useAuth } from "@/context/auth-context";
import { CourseCombobox } from "@/components/course-combobox";

import { Subject, PaginatedSubjects } from "@/types";


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
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

    // Delete state
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [isForceDelete, setIsForceDelete] = useState(false);

    const selectionSummary = React.useMemo(() => {
        const selectedSubjects = subjects.filter(s => selectedIds.includes(s.id));
        const withStudents = selectedSubjects.filter(s => (s._count?.subjectReservations || 0) > 0 || (s._count?.grades || 0) > 0);
        const deletable = selectedSubjects.filter(s => (s._count?.subjectReservations || 0) === 0 && (s._count?.grades || 0) === 0);

        return {
            totalSelected: selectedIds.length,
            currentlyVisible: selectedSubjects.length,
            withStudents: withStudents.length,
            deletable: deletable.length,
            deletableIds: deletable.map(s => s.id)
        };
    }, [subjects, selectedIds]);

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
        setFormMode("create");
        setFormOpen(true);
    }

    function handleEdit(subject: Subject) {
        setSelectedSubject(subject);
        setFormMode("edit");
        setFormOpen(true);
    }

    function handleDeleteClick(subject: Subject) {
        setSubjectToDelete(subject);
        setDeleteOpen(true);
    }

    async function onSubmit(data: SubjectFormValues) {
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

    const areAllSelected = subjects.length > 0 && subjects.every(s => selectedIds.includes(s.id));
    const isAnySelected = subjects.length > 0 && subjects.some(s => selectedIds.includes(s.id));

    function toggleSelectAll() {
        if (areAllSelected) {
            // Deselect all on current page
            const currentIds = subjects.map(s => s.id);
            setSelectedIds(prev => prev.filter(id => !currentIds.includes(id)));
        } else {
            // Select all on current page
            const currentIds = subjects.map(s => s.id);
            setSelectedIds(prev => Array.from(new Set([...prev, ...currentIds])));
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
                            checked={areAllSelected ? true : isAnySelected ? "indeterminate" : false}
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
                    cell: ({ row }) => <Badge variant="secondary">{row.original.course?.code || "—"}</Badge>,
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
                                    <DropdownMenuTrigger asChild disabled={selectedIds.length > 0}>
                                        <Button variant="ghost" size="icon" className="size-8" disabled={selectedIds.length > 0}>
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
        [selectedIds, user, subjects]
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
            <SubjectForm
                open={formOpen}
                onOpenChange={setFormOpen}
                onSubmit={onSubmit}
                defaultValues={selectedSubject ? {
                    courseId: selectedSubject.courseId,
                    code: selectedSubject.code,
                    title: selectedSubject.title,
                    units: selectedSubject.units
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
                title="Delete Subject"
                description={
                    <span>
                        Are you sure you want to delete <span className="font-semibold text-zinc-900">{subjectToDelete?.title}</span>?
                    </span>
                }
                confirmText={isDeleting ? "Deleting..." : "Delete Subject"}
                variant="destructive"
                isLoading={isDeleting}
                disabled={!isForceDelete && ((subjectToDelete?._count?.subjectReservations ?? 0) > 0 || (subjectToDelete?._count?.grades ?? 0) > 0)}
                onConfirm={(e) => {
                    e.preventDefault();
                    handleDelete();
                }}
            >
                <div className="space-y-4 py-2">
                    {((subjectToDelete?._count?.subjectReservations ?? 0) > 0 || (subjectToDelete?._count?.grades ?? 0) > 0) && (
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
                title="Delete Multiple Subjects"
                description={
                    <span>
                        You have selected <span className="font-bold text-zinc-900">{selectionSummary.totalSelected}</span> subjects.
                    </span>
                }
                confirmText={isBulkDeleting ? "Deleting..." : `Delete ${isForceDelete ? selectionSummary.totalSelected : selectionSummary.deletable} Subjects`}
                variant="destructive"
                isLoading={isBulkDeleting}
                disabled={isBulkDeleting || (!isForceDelete && selectionSummary.deletable === 0)}
                onConfirm={(e) => {
                    e.preventDefault();
                    handleBulkDelete();
                }}
            >
                <div className="space-y-4 py-2">
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
                </div>
            </ConfirmDialog>
        </div>
    );
}
