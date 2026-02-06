import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    IconLock,
    IconHistory,
    IconLoader2,
    IconArrowRight,
    IconTrash,
    IconX,
    IconInfoCircle
} from "@tabler/icons-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { auditApi } from "@/lib/api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useSearchParams, useRouter } from "next/navigation";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
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
import { IconSearch } from "@tabler/icons-react";
import { GenericCombobox } from "@/components/generic-combobox";
import { DatePicker } from "@/components/date-picker";
import { CalendarIcon, ListFilter } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

export function AuditLogsTab() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const filterAction = searchParams.get("action") || "";
    const filterEntity = searchParams.get("entity") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const [searchInput, setSearchInput] = useState(search);
    const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [deleteLogId, setDeleteLogId] = useState<string | null>(null);

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ["audit-logs", page, limit, search, filterAction, filterEntity, startDate, endDate],
        queryFn: () => auditApi.getLogs(page, limit, search || undefined, filterAction || undefined, filterEntity || undefined, undefined, startDate || undefined, endDate || undefined),
        enabled: user?.role === "admin",
        placeholderData: (previousData) => previousData,
    });

    const { data: filters } = useQuery({
        queryKey: ["audit-filters"],
        queryFn: auditApi.getFilters,
        enabled: user?.role === "admin",
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });

    const actionOptions = (filters?.actions || []).map((a: string) => ({
        value: a,
        label: a
    }));

    const entityOptions = (filters?.entities || []).map((e: string) => ({
        value: e,
        label: e
    }));

    // Let's prepend "All" options
    const fullActionOptions = [
        { value: "all", label: "All Actions" },
        ...actionOptions
    ];

    const fullEntityOptions = [
        { value: "all", label: "All Entities" },
        ...entityOptions
    ];

    const logs = data?.logs || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    const deleteMutation = useMutation({
        mutationFn: auditApi.delete,
        onSuccess: () => {
            toast.success("Audit log deleted");
            setDeleteLogId(null);
            queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
        },
        onError: () => {
            toast.error("Failed to delete log");
            setDeleteLogId(null);
        },
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: auditApi.bulkDelete,
        onSuccess: (data) => {
            toast.success(`Deleted ${data.count} audit logs`);
            setSelectedIds([]);
            setBulkDeleteOpen(false);
            queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
        },
        onError: () => {
            toast.error("Failed to delete logs");
            setBulkDeleteOpen(false);
        },
    });

    if (user?.role !== "admin") {
        return (
            <Card className="border-none shadow-sm bg-white overflow-hidden py-0">
                <CardHeader className="border-b bg-zinc-50/50 pb-8 pt-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-zinc-100">
                            <IconHistory className="size-6 text-zinc-900" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">System Audit Logs</CardTitle>
                            <CardDescription>View recent system activities and changes.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-12 text-center">
                    <div className="max-w-sm mx-auto space-y-4">
                        <div className="size-16 bg-red-50 rounded-full flex items-center justify-center mx-auto border border-dashed border-red-200">
                            <IconLock className="size-8 text-red-500" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-zinc-900">Access Restricted</h3>
                            <p className="text-zinc-500 text-sm leading-relaxed">
                                You do not have permission to view this section.<br /> Only administrators can view system audit logs.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const updatePage = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", newPage.toString());
        router.push(`?${params.toString()}`);
    };

    const updateLimit = (newLimit: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("limit", newLimit);
        params.set("page", "1");
        router.push(`?${params.toString()}`);
    };

    const handleSearch = () => {
        const params = new URLSearchParams(searchParams.toString());
        if (searchInput) {
            params.set("search", searchInput);
        } else {
            params.delete("search");
        }
        params.set("page", "1");
        router.push(`?${params.toString()}`);
    };

    const handleFilterAction = (val: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (val && val !== "all") {
            params.set("action", val);
        } else {
            params.delete("action");
        }
        params.set("page", "1");
        router.push(`?${params.toString()}`);
    };

    const handleFilterEntity = (val: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (val && val !== "all") {
            params.set("entity", val);
        } else {
            params.delete("entity");
        }
        params.set("page", "1");
        router.push(`?${params.toString()}`);
    };

    const handleStartDate = (val: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (val) {
            params.set("startDate", val);
        } else {
            params.delete("startDate");
        }
        params.set("page", "1");
        router.push(`?${params.toString()}`);
    };

    const handleEndDate = (val: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (val) {
            params.set("endDate", val);
        } else {
            params.delete("endDate");
        }
        params.set("page", "1");
        router.push(`?${params.toString()}`);
    };

    const clearFilters = () => {
        setSearchInput("");
        const params = new URLSearchParams(searchParams.toString());
        params.delete("search");
        params.delete("action");
        params.delete("entity");
        params.delete("startDate");
        params.delete("endDate");
        params.set("page", "1");
        router.push(`?${params.toString()}`);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === logs.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(logs.map((l: any) => l.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <div className="space-y-6 pb-20">
            <Card className="overflow-hidden py-0 gap-2">
                <CardHeader className="border-b bg-zinc-50/50 pb-8 pt-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white rounded-xl shadow-sm border border-zinc-100">
                                <IconHistory className="size-6 text-zinc-900" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">System Audit Logs</CardTitle>
                                <CardDescription>Total logs: <span className="font-bold text-zinc-900">{total}</span></CardDescription>
                            </div>
                        </div>
                        {selectedIds.length > 0 && (
                            <ConfirmDialog
                                open={bulkDeleteOpen}
                                onOpenChange={setBulkDeleteOpen}
                                title="Delete Audit Logs"
                                description={`This will permanently delete ${selectedIds.length} selected audit log entries. This action cannot be undone.`}
                                onConfirm={() => bulkDeleteMutation.mutate(selectedIds)}
                                isLoading={bulkDeleteMutation.isPending}
                                variant="destructive"
                                trigger={
                                    <Button variant="destructive" size="sm" className="gap-2 h-9">
                                        <IconTrash className="size-4" />
                                        Delete ({selectedIds.length})
                                    </Button>
                                }
                            />
                        )}
                    </div>
                </CardHeader>

                {/* Search and Filters - MATCH STUDENT PAGE UI */}
                <div className="px-6 py-6 flex flex-col lg:flex-row gap-2 sm:gap-4 items-start lg:items-center border-b bg-zinc-50/30">
                    {/* Search Group */}
                    <div className="flex w-full lg:max-w-md">
                        <div className="relative flex flex-1">
                            <Input
                                placeholder="Search logs..."
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
                                className="rounded-r-none border-r-0 focus-visible:ring-0 focus-visible:ring-offset-0 pr-8 h-10"
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
                                    <IconX className="size-4" />
                                </button>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleSearch}
                            className="rounded-l-none border-zinc-200 hover:bg-zinc-50 h-10"
                        >
                            <IconSearch className="size-4" />
                        </Button>
                    </div>

                    {/* Filter Group */}
                    {/* Filter Group */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto lg:flex-1 lg:justify-end items-start sm:items-center">
                        {(search || filterAction || filterEntity || startDate || endDate) && (
                            <Button
                                variant="ghost"
                                onClick={clearFilters}
                                className="text-zinc-500 hover:text-zinc-900 gap-2 px-3 h-10 w-full sm:w-auto order-last sm:order-first"
                            >
                                <IconX className="size-4" />
                                <span className="inline">Reset</span>
                            </Button>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full sm:w-auto">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "font-normal h-10 w-full justify-start text-left px-3",
                                            !startDate && !endDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                        {startDate || endDate ? (
                                            <span className="truncate">
                                                {startDate ? new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Start"} - {endDate ? new Date(endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "End"}
                                            </span>
                                        ) : (
                                            <span className="truncate">Date</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-4" align="end">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <h4 className="font-medium leading-none">Date Range</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Filter audit logs by date range.
                                            </p>
                                        </div>
                                        <div className="grid gap-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <span className="text-xs font-medium">From</span>
                                                    <DatePicker
                                                        placeholder="Start date"
                                                        value={startDate}
                                                        onChange={handleStartDate}
                                                        className="w-full"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-xs font-medium">To</span>
                                                    <DatePicker
                                                        placeholder="End date"
                                                        value={endDate}
                                                        onChange={handleEndDate}
                                                        className="w-full"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <GenericCombobox
                                value={filterAction}
                                onValueChange={handleFilterAction}
                                items={fullActionOptions}
                                placeholder="Action"
                                className="w-full h-10 bg-white"
                                leftIcon={<ListFilter className="size-4 text-zinc-400" />}
                            />
                            <GenericCombobox
                                value={filterEntity}
                                onValueChange={handleFilterEntity}
                                items={fullEntityOptions}
                                placeholder="Entity"
                                className="w-full h-10 bg-white"
                                leftIcon={<ListFilter className="size-4 text-zinc-400" />}
                            />
                        </div>
                    </div>
                </div>

                <CardContent className="p-0 relative min-h-[300px]">
                    {isFetching && !isLoading && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center transition-all duration-200">
                            <IconLoader2 className="size-8 animate-spin text-primary" />
                        </div>
                    )}
                    {isLoading ? (
                        <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
                            <IconLoader2 className="size-8 animate-spin text-zinc-400" />
                            <p>Loading logs...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="p-12 text-center text-zinc-500">No logs found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                                        <TableHead className="w-[50px] pl-6">
                                            <Checkbox
                                                checked={logs.length > 0 && selectedIds.length === logs.length}
                                                onCheckedChange={toggleSelectAll}
                                            />
                                        </TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Entity</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right pr-6">Details</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log: any) => {
                                        const action = log.action.toLowerCase();
                                        const isUpdate = action.includes("update") || action.includes("patch") || action.includes("upsert");
                                        const isDelete = action.includes("delete");
                                        const isCreate = action.includes("create") || action.includes("post") || action.includes("import");

                                        return (
                                            <TableRow key={log.id} className={cn(selectedIds.includes(log.id) && "bg-zinc-50")}>
                                                <TableCell className="pl-6">
                                                    <Checkbox
                                                        checked={selectedIds.includes(log.id)}
                                                        onCheckedChange={() => toggleSelect(log.id)}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium text-zinc-900">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "font-bold uppercase text-[10px] tracking-wider px-2 py-0.5 border-none",
                                                            isCreate ? "bg-emerald-50 text-emerald-700" :
                                                                isDelete ? "bg-rose-50 text-rose-700" :
                                                                    isUpdate ? "bg-blue-50 text-blue-700" :
                                                                        "bg-zinc-100 text-zinc-600"
                                                        )}
                                                    >
                                                        {log.action}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-zinc-600">{log.entity}</TableCell>
                                                <TableCell className="text-zinc-600">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-zinc-900">{log.user?.email || "Unknown"}</span>
                                                        <span className="text-xs text-zinc-400">{log.user?.role}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-zinc-500 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <AuditDetailsButton log={log} />
                                                        <ConfirmDialog
                                                            open={deleteLogId === log.id}
                                                            onOpenChange={(open) => !open && setDeleteLogId(null)}
                                                            title="Delete this log?"
                                                            description="This action will permanently delete this audit record. It cannot be undone."
                                                            onConfirm={() => deleteMutation.mutate(log.id)}
                                                            isLoading={deleteMutation.isPending}
                                                            variant="destructive"
                                                            trigger={
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="size-8 text-zinc-400 hover:text-red-600 hover:bg-red-50"
                                                                    onClick={() => setDeleteLogId(log.id)}
                                                                >
                                                                    <IconTrash className="size-4" />
                                                                </Button>
                                                            }
                                                        />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination Controls */}
            {totalPages > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
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
                                <SelectItem value="100">100</SelectItem>
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
            )}
        </div>
    );
}

function AuditDetailsButton({ log }: { log: any }) {
    if (!log.details) return <span className="text-zinc-400 text-sm">-</span>;
    let details: any = null;
    let parseError = false;
    try {
        details = JSON.parse(log.details);
    } catch (e) {
        details = log.details;
        parseError = true;
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 hover:text-blue-600 hover:bg-blue-50">
                    <IconInfoCircle className="size-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Log Details</DialogTitle>
                    <DialogDescription>
                        Transaction: <span className="font-mono text-xs bg-zinc-100 px-1.5 py-0.5 rounded">{log.id.slice(0, 8)}...</span>
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                    {parseError ? (
                        <pre className="text-xs font-mono text-zinc-700 bg-zinc-50 p-4 rounded-lg">{details}</pre>
                    ) : (
                        <LogDetailsRenderer details={details} />
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

function LogDetailsRenderer({ details }: { details: any }) {
    if (!details || typeof details !== "object") {
        return <pre className="text-xs font-mono bg-zinc-50 p-4 rounded-lg">{String(details)}</pre>;
    }

    // Check if it's an update style (keys have from/to)
    const isUpdate = Object.values(details).some(
        (val: any) => val && typeof val === "object" && ("from" in val || "to" in val)
    );

    if (isUpdate) {
        return (
            <div className="space-y-3">
                {Object.entries(details).map(([key, val]: [string, any]) => {
                    const from = val?.from ?? "-";
                    const to = val?.to ?? "-";
                    const hasChanged = String(from) !== String(to);

                    return (
                        <div
                            key={key}
                            className={cn(
                                "text-sm p-3 rounded-lg border",
                                hasChanged
                                    ? "bg-white border-zinc-200 shadow-sm"
                                    : "bg-zinc-50 border-zinc-100 opacity-60"
                            )}
                        >
                            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                                {key.replace(/([A-Z])/g, " $1").trim()}
                            </div>
                            <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
                                <span className={cn("font-mono text-xs break-all", hasChanged ? "text-zinc-500 line-through" : "text-zinc-400")}>
                                    {String(from)}
                                </span>
                                <IconArrowRight className="size-3 text-zinc-400 flex-shrink-0" />
                                <span className={cn("font-medium font-mono text-xs break-all", hasChanged ? "text-emerald-600" : "text-zinc-500")}>
                                    {String(to)}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    // Create/Upsert style (flat object)
    return (
        <div className="space-y-2">
            {Object.entries(details).map(([key, val]) => (
                <div
                    key={key}
                    className="flex flex-col gap-1 p-2 rounded-md hover:bg-zinc-50 border border-transparent hover:border-zinc-100 transition-colors"
                >
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <div className="text-sm font-semibold text-zinc-900 font-mono break-all leading-relaxed">
                        {val === null ? (
                            "-"
                        ) : Array.isArray(val) ? (
                            <div className={cn("mt-1", val.length > 0 && typeof val[0] !== 'object' ? "flex flex-wrap gap-1.5" : "flex flex-col gap-1.5")}>
                                {val.map((item: any, i: number) => {
                                    if (typeof item === 'string') {
                                        return (
                                            <div key={i} className="text-xs bg-zinc-100 px-2 py-1 rounded inline-block font-mono border border-zinc-200 text-zinc-600">
                                                {item}
                                            </div>
                                        );
                                    }
                                    if (typeof item === 'object' && item !== null) {
                                        return (
                                            <div key={i} className="text-xs bg-zinc-50 border border-zinc-200 p-2 rounded grid grid-cols-2 gap-x-4 gap-y-1">
                                                {Object.entries(item).map(([k, v]) => (
                                                    <div key={k} className="flex justify-between gap-2 overflow-hidden items-center">
                                                        <span className="text-zinc-500 capitalize truncate shrink-0 max-w-[50%]">{k}:</span>
                                                        <span className="font-medium text-zinc-900 truncate" title={v === null ? '-' : String(v)}>
                                                            {v === null ? '-' : String(v)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    }
                                    return <span key={i}>{String(item)}</span>
                                })}
                            </div>
                        ) : typeof val === "object" ? (
                            <pre className="mt-1 text-xs bg-zinc-100 p-2 rounded border border-zinc-200 overflow-x-auto">
                                {JSON.stringify(val, null, 2)}
                            </pre>
                        ) : (
                            String(val)
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
