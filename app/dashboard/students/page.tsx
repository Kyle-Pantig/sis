"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { studentsApi } from "@/lib/api";
import { usePageTitle } from "../layout";
import { StudentForm } from "@/components/student-form";
import { DeleteStudentDialog } from "@/components/delete-student-dialog";
import { CourseCombobox } from "@/components/course-combobox";
import { type StudentFormValues } from "@/lib/validations/student";
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { IconPlus, IconDotsVertical, IconPencil, IconTrash, IconEye, IconLoader2, IconSearch, IconCheck, IconX, IconUpload } from "@tabler/icons-react";
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
import { ListFilter, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from "@tanstack/react-table";
import { IconChevronUp, IconChevronDown, IconSelector } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { GenericDataTable } from "@/components/generic-data-table";
import { CSVImportDialog } from "@/components/csv-import-dialog";

interface Student {
    id: string;
    studentNo: string;
    firstName: string;
    lastName: string;
    email: string;
    birthDate: string;
    courseId: string | null;
    course: {
        id: string;
        code: string;
        name: string;
    } | null;
}

interface PaginatedStudents {
    students: Student[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

import { useAuth } from "@/context/auth-context";

export default function StudentsPage() {
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
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState({ email: "" });
    const [sorting, setSorting] = useState<SortingState>([]);

    // Queries
    const { data, isLoading: loading, isFetching } = useQuery<PaginatedStudents>({
        queryKey: ["students", page, limit, search, filterCourse],
        queryFn: () => studentsApi.getAll(page, limit, search || undefined, filterCourse || undefined),
        placeholderData: (previousData) => previousData,
    });

    const students = data?.students || [];
    const totalPages = data?.totalPages || 1;
    const total = data?.total || 0;

    // Mutations
    const mutation = useMutation({
        mutationFn: async ({ mode, data, id }: { mode: "create" | "edit", data: StudentFormValues, id?: string }) => {
            if (mode === "create") {
                const result = await studentsApi.create(data);
                if (result.error) throw new Error(result.error);
                return result;
            } else {
                const result = await studentsApi.update(id!, data);
                if (result.error) throw new Error(result.error);
                return result;
            }
        },
        onSuccess: (data, variables) => {
            toast.success(`Student ${variables.mode === "create" ? "created" : "updated"} successfully`);
            queryClient.invalidateQueries({ queryKey: ["students"] });
            // Also invalidate dashboard stats (for new students or course changes)
            queryClient.invalidateQueries({ queryKey: ["summary-stats"] });
            queryClient.invalidateQueries({ queryKey: ["course-stats"] });
            queryClient.invalidateQueries({ queryKey: ["recent-students"] });
            setFormOpen(false);
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to save student");
        }
    });

    const inlineUpdateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const result = await studentsApi.update(id, data);
            if (result.error) throw new Error(result.error);
            return result;
        },
        onSuccess: () => {
            toast.success("Student updated");
            queryClient.invalidateQueries({ queryKey: ["students"] });
            setEditingId(null);
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to update");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => studentsApi.delete(id),
        onSuccess: () => {
            toast.success("Student deleted successfully");
            queryClient.invalidateQueries({ queryKey: ["students"] });
            // Also invalidate dashboard stats
            queryClient.invalidateQueries({ queryKey: ["summary-stats"] });
            queryClient.invalidateQueries({ queryKey: ["course-stats"] });
            queryClient.invalidateQueries({ queryKey: ["recent-students"] });
            setDeleteOpen(false);
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to delete student");
        }
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: (ids: string[]) => studentsApi.bulkDelete(ids),
        onSuccess: (result: any) => {
            toast.success(`Deleted ${result.count} students`);
            queryClient.invalidateQueries({ queryKey: ["students"] });
            // Also invalidate dashboard stats
            queryClient.invalidateQueries({ queryKey: ["summary-stats"] });
            queryClient.invalidateQueries({ queryKey: ["course-stats"] });
            queryClient.invalidateQueries({ queryKey: ["recent-students"] });
            setSelectedIds([]);
            setBulkDeleteOpen(false);
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to delete students");
        }
    });

    // Form dialog state
    const [formOpen, setFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<"create" | "edit">("create");
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    // Delete dialog state
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

    useEffect(() => {
        setTitle("Student Management");
    }, [setTitle]);

    useEffect(() => {
        const create = searchParams.get("create");
        if (create === "true" && !formOpen) {
            handleCreate();
            const nextParams = new URLSearchParams(searchParams.toString());
            nextParams.delete("create");
            router.replace(`/dashboard/students?${nextParams.toString()}`, { scroll: false });
        }
    }, [searchParams, formOpen, router]);

    function handleCreate() {
        setSelectedStudent(null);
        setFormMode("create");
        setFormOpen(true);
    }

    function handleEdit(student: Student) {
        setSelectedStudent(student);
        setFormMode("edit");
        setFormOpen(true);
    }

    function handleDeleteClick(student: Student) {
        setStudentToDelete(student);
        setDeleteOpen(true);
    }

    async function handleFormSubmit(data: StudentFormValues) {
        await mutation.mutateAsync({
            mode: formMode,
            data,
            id: selectedStudent?.id
        });
    }

    async function handleDelete() {
        if (!studentToDelete) return;
        await deleteMutation.mutateAsync(studentToDelete.id);
    }

    async function handleBulkDelete() {
        await bulkDeleteMutation.mutateAsync(selectedIds);
    }

    function startInlineEdit(student: Student) {
        setEditingId(student.id);
        setEditValues({ email: student.email || "" });
    }

    function cancelInlineEdit() {
        setEditingId(null);
    }

    async function saveInlineEdit(studentId: string) {
        await inlineUpdateMutation.mutateAsync({
            id: studentId,
            data: { email: editValues.email || null },
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
        } else {
            params.delete("courseId");
        }
        params.set("page", "1");
        router.push(`?${params.toString()}`);
    }

    function clearFilters() {
        setSearchInput("");
        router.push("/dashboard/students");
    }

    function toggleSelectAll() {
        if (selectedIds.length === students.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(students.map((s) => s.id));
        }
    }

    function toggleSelect(id: string) {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter((i) => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    }

    const isSubmitting = mutation.isPending;
    const isInlineUpdating = inlineUpdateMutation.isPending;
    const isDeleting = deleteMutation.isPending;
    const isBulkDeleting = bulkDeleteMutation.isPending;

    const columns = React.useMemo<ColumnDef<Student>[]>(
        () => [
            {
                id: "select",
                header: ({ table }) => (
                    <Checkbox
                        checked={students.length > 0 && selectedIds.length === students.length}
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
                accessorKey: "studentNo",
                header: "Student No.",
                cell: ({ row }) => <span className="font-bold text-sm text-zinc-900">{row.original.studentNo}</span>,
            },
            {
                id: "fullName",
                header: "Full Name",
                accessorFn: (row) => `${row.firstName} ${row.lastName}`,
                cell: ({ row }) => <span className="text-sm font-medium text-zinc-600">{row.original.firstName} {row.original.lastName}</span>,
            },
            {
                accessorKey: "course.code",
                header: "Course",
                cell: ({ row }) => (
                    row.original.course ? (
                        <Badge variant="outline" className="bg-zinc-100 text-[10px] font-bold text-zinc-600 border-none px-2 py-0.5">
                            {row.original.course.code}
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="bg-amber-50 text-[10px] font-bold text-amber-600 border-amber-200 px-2 py-0.5">
                            Unenrolled
                        </Badge>
                    )
                ),
            },
            {
                accessorKey: "email",
                header: "Email Address",
                cell: ({ row }) => {
                    const student = row.original;
                    return (
                        <div className="text-sm text-zinc-500 font-medium">
                            {editingId === student.id ? (
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={editValues.email}
                                        onChange={(e) => setEditValues({ email: e.target.value })}
                                        className="h-8 w-48"
                                        placeholder="email@example.com"
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="size-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                        onClick={() => saveInlineEdit(student.id)}
                                        disabled={isInlineUpdating}
                                    >
                                        {isInlineUpdating ? <IconLoader2 className="size-4 animate-spin" /> : <IconCheck className="size-4" />}
                                    </Button>
                                    <Button size="icon" variant="ghost" className="size-7 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={cancelInlineEdit}>
                                        <IconX className="size-4" />
                                    </Button>
                                </div>
                            ) : (
                                <span
                                    className="cursor-pointer hover:text-blue-600 transition-colors"
                                    onClick={() => startInlineEdit(student)}
                                    title="Click to edit"
                                >
                                    {student.email || "—"}
                                </span>
                            )}
                        </div>
                    );
                },
            },
            {
                id: "actions",
                header: () => <div className="text-right">Actions</div>,
                cell: ({ row }) => {
                    const student = row.original;
                    return (
                        <div className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="size-8">
                                        <IconDotsVertical className="size-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem
                                        onClick={() => router.push(`/dashboard/students/${student.id}`)}
                                        className="cursor-pointer"
                                    >
                                        <IconEye className="size-4 mr-2" />
                                        View Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEdit(student)} className="cursor-pointer">
                                        <IconPencil className="size-4 mr-2" />
                                        Edit Student
                                    </DropdownMenuItem>
                                    {user?.role === "admin" && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => handleDeleteClick(student)}
                                                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                                                disabled={false}
                                            >
                                                <IconTrash className="size-4 mr-2" />
                                                Delete Student
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
        ],
        [editingId, editValues, isInlineUpdating, selectedIds, user]
    );

    if (loading) {
        return (
            <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                </CardHeader>

                {/* Search and Filters Skeleton */}
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
                        <div className="flex px-6 py-4 border-b border-zinc-100 gap-4">
                            <Skeleton className="h-4 w-[15%]" />
                            <Skeleton className="h-4 w-[25%]" />
                            <Skeleton className="h-4 w-[15%]" />
                            <Skeleton className="h-4 w-[30%]" />
                            <Skeleton className="h-4 w-[15%]" />
                        </div>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex px-6 py-4 gap-4 items-center border-b border-zinc-50 last:border-0">
                                <Skeleton className="h-5 w-5" />
                                <Skeleton className="h-5 w-[15%]" />
                                <Skeleton className="h-5 w-[20%]" />
                                <Skeleton className="h-5 w-[10%]" />
                                <Skeleton className="h-5 w-[25%]" />
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
                        <CardTitle className="text-xl">Student Masterlist</CardTitle>
                        <CardDescription>
                            Total students: <span className="font-bold text-zinc-900">{total}</span>
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
                            <CSVImportDialog
                                onImport={async (data) => {
                                    const result = await studentsApi.importCsv(data);
                                    if (result.error) throw new Error(result.error);
                                    return result;
                                }}
                                templateColumns={[
                                    { key: "studentNo", label: "Student No (Optional)", required: false },
                                    { key: "firstName", label: "First Name", required: true },
                                    { key: "lastName", label: "Last Name", required: true },
                                    { key: "email", label: "Email" },
                                    { key: "birthDate", label: "Birth Date (YYYY-MM-DD)", required: true },
                                    { key: "course", label: "Course (Code or Name)", required: true },
                                ]}
                                templateFilename="students_import_template.csv"
                                title="Import Students"
                                description="Upload a CSV file to bulk import students. Download the template to see the correct format."
                                onSuccess={() => {
                                    queryClient.invalidateQueries({ queryKey: ["students"] });
                                    // Also invalidate dashboard stats
                                    queryClient.invalidateQueries({ queryKey: ["summary-stats"] });
                                    queryClient.invalidateQueries({ queryKey: ["course-stats"] });
                                    queryClient.invalidateQueries({ queryKey: ["recent-students"] });
                                }}
                                trigger={
                                    <Button variant="outline" className="gap-2">
                                        <IconUpload className="size-4" />
                                        Import CSV
                                    </Button>
                                }
                            />
                        )}
                        <Button onClick={handleCreate} className="gap-2">
                            <IconPlus className="size-4" />
                            Add Student
                        </Button>
                    </div>
                </CardHeader>

                {/* Search and Filters */}
                <div className="px-6 pb-6 flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                    {/* Search Group */}
                    <div className="flex w-full lg:max-w-md">
                        <div className="relative flex flex-1">
                            <Input
                                placeholder="Search name, ID, or email..."
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
                            <div className="flex items-center justify-center">
                                <IconLoader2 className="size-8 animate-spin text-emerald-600" />
                            </div>
                        </div>
                    )}
                    <div className="border-t">
                        <GenericDataTable
                            columns={columns}
                            data={students}
                            sorting={sorting}
                            onSortingChange={setSorting}
                            noResultsText="No student records found."
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
            <StudentForm
                open={formOpen}
                onOpenChange={setFormOpen}
                onSubmit={handleFormSubmit}
                defaultValues={selectedStudent ? {
                    studentNo: selectedStudent.studentNo,
                    firstName: selectedStudent.firstName,
                    lastName: selectedStudent.lastName,
                    email: selectedStudent.email || "",
                    birthDate: selectedStudent.birthDate,
                    courseId: selectedStudent.courseId || "",
                } : undefined}
                mode={formMode}
                isSubmitting={isSubmitting}
            />

            {/* Delete Dialog */}
            <DeleteStudentDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                onConfirm={handleDelete}
                studentName={studentToDelete ? `${studentToDelete.firstName} ${studentToDelete.lastName}` : ""}
                isDeleting={isDeleting}
            />

            {/* Bulk Delete Dialog */}
            <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Multiple Students</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                            <div className="text-muted-foreground text-sm">
                                Are you sure you want to delete{" "}
                                <span className="font-semibold text-zinc-900">{selectedIds.length} students</span>?
                            </div>
                            <div className="text-red-600 font-medium text-sm">This action cannot be undone.</div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleBulkDelete();
                            }}
                            disabled={isBulkDeleting}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {isBulkDeleting ? (
                                <>
                                    <IconLoader2 className="size-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                `Delete ${selectedIds.length} Students`
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
