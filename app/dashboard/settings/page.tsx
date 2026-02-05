"use client";

import React, { useEffect, useState } from "react";
import { usePageTitle } from "../layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    IconLock,
    IconUsers,
    IconKey,
    IconChevronRight,
    IconShieldCheck,
    IconHistory,
    IconLoader2,
    IconCheck,
    IconExclamationCircle,
    IconEye,
    IconEyeOff,
    IconArrowRight
} from "@tabler/icons-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, auditApi } from "@/lib/api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconDotsVertical, IconTrash, IconBan, IconCircleCheck, IconPlus, IconX, IconInfoCircle } from "@tabler/icons-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListFilter, CalendarIcon } from "lucide-react";
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

type SettingsTab = "security" | "encoders" | "students" | "audit";

export default function SettingsPage() {
    const { setTitle } = usePageTitle();
    const searchParams = useSearchParams();
    const router = useRouter();
    const tabParam = searchParams.get("tab") as SettingsTab;

    const [activeTab, setActiveTab] = useState<SettingsTab>(tabParam || "security");

    useEffect(() => {
        setTitle("Settings");
    }, [setTitle]);

    useEffect(() => {
        if (tabParam && tabParam !== activeTab) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    const handleTabChange = (tab: SettingsTab) => {
        setActiveTab(tab);
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tab);
        router.replace(`/dashboard/settings?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 min-h-[calc(100vh-200px)]">
            {/* Sidebar Navigation */}
            <aside className="w-full lg:w-64 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide bg-zinc-50/50 lg:bg-transparent py-2 lg:py-0 border-b lg:border-none border-zinc-200 lg:mb-0 mb-2">
                <div className="hidden lg:block px-3 py-2 border-b border-zinc-100 mb-2">
                    <h2 className="text-xs font-semibold tracking-tight text-zinc-500 uppercase">
                        Account Settings
                    </h2>
                </div>

                <button
                    onClick={() => handleTabChange("security")}
                    className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap",
                        activeTab === "security"
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                    )}
                >
                    <IconLock className="size-4 shrink-0" />
                    <span className="flex-1 text-left">
                        Security <span className="hidden sm:inline">& Password</span>
                    </span>
                    {activeTab === "security" && <IconChevronRight className="hidden lg:block size-4 opacity-50" />}
                </button>

                <button
                    onClick={() => handleTabChange("encoders")}
                    className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap",
                        activeTab === "encoders"
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                    )}
                >
                    <IconUsers className="size-4 shrink-0" />
                    <span className="flex-1 text-left">
                        Encoders <span className="hidden sm:inline">Management</span>
                    </span>
                    {activeTab === "encoders" && <IconChevronRight className="hidden lg:block size-4 opacity-50" />}
                </button>

                <button
                    onClick={() => handleTabChange("students")}
                    className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap",
                        activeTab === "students"
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                    )}
                >
                    <IconKey className="size-4 shrink-0" />
                    <span className="flex-1 text-left">
                        Students <span className="hidden sm:inline">Credentials</span>
                    </span>
                    {activeTab === "students" && <IconChevronRight className="hidden lg:block size-4 opacity-50" />}
                </button>

                <button
                    onClick={() => handleTabChange("audit")}
                    className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap",
                        activeTab === "audit"
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                    )}
                >
                    <IconHistory className="size-4 shrink-0" />
                    <span className="flex-1 text-left">
                        Audit Logs
                    </span>
                    {activeTab === "audit" && <IconChevronRight className="hidden lg:block size-4 opacity-50" />}
                </button>
            </aside>

            {/* Content Area */}
            <div className="flex-1">
                {activeTab === "security" && <SecurityTab />}
                {activeTab === "encoders" && <EncodersTab />}
                {activeTab === "students" && <StudentsTab />}
                {activeTab === "audit" && <AuditLogsTab />}
            </div>
        </div>
    );
}

function SecurityTab() {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [passwords, setPasswords] = useState({
        current: "",
        new: "",
        confirm: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwords.new !== passwords.confirm) {
            toast.error("New passwords do not match");
            return;
        }

        if (passwords.new.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setIsLoading(true);
        try {
            const result = await authApi.changePassword({
                oldPassword: passwords.current,
                newPassword: passwords.new
            });

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Password updated successfully");
                setPasswords({ current: "", new: "", confirm: "" });
            }
        } catch (error) {
            toast.error("Failed to update password");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="border-none shadow-sm overflow-hidden py-0">
            <CardHeader className="border-b bg-zinc-50/50 pb-8 pt-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-zinc-100">
                        <IconShieldCheck className="size-6 text-zinc-900" />
                    </div>
                    <div>
                        <CardTitle className="text-xl">Security Settings</CardTitle>
                        <CardDescription>Manage your account password and security preferences.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="current" className="text-sm font-semibold text-zinc-700">Current Password</Label>
                            <Input
                                id="current"
                                type={showPassword ? "text" : "password"}
                                autoComplete="off"
                                value={passwords.current}
                                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                placeholder="••••••••"
                                className="bg-zinc-50 border-zinc-200 focus:bg-white transition-all h-11"
                                required
                            />
                        </div>
                        <div className="h-px bg-zinc-100 my-2" />
                        <div className="space-y-2">
                            <Label htmlFor="new" className="text-sm font-semibold text-zinc-700">New Password</Label>
                            <Input
                                id="new"
                                type={showPassword ? "text" : "password"}
                                autoComplete="off"
                                value={passwords.new}
                                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                placeholder="••••••••"
                                className="bg-zinc-50 border-zinc-200 focus:bg-white transition-all h-11"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm" className="text-sm font-semibold text-zinc-700">Confirm New Password</Label>
                            <Input
                                id="confirm"
                                type={showPassword ? "text" : "password"}
                                autoComplete="off"
                                value={passwords.confirm}
                                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                placeholder="••••••••"
                                className="bg-zinc-50 border-zinc-200 focus:bg-white transition-all h-11"
                                required
                            />
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox
                                id="show-password"
                                checked={showPassword}
                                onCheckedChange={(checked) => setShowPassword(!!checked)}
                            />
                            <Label
                                htmlFor="show-password"
                                className="text-sm font-medium leading-none cursor-pointer select-none text-zinc-600 hover:text-zinc-900 transition-colors flex items-center gap-2"
                            >
                                Show Password
                            </Label>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full sm:w-auto min-w-[160px] h-10 rounded-full transition-all active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <>
                                    <IconLoader2 className="size-4 mr-2 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Update Password"
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}



function EncodersTab() {
    const { user } = useAuth();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newEncoder, setNewEncoder] = useState({ email: "" });
    const [actionId, setActionId] = useState<string | null>(null);
    const [successId, setSuccessId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const { data: encoders = [], isLoading } = useQuery({
        queryKey: ["encoders"],
        queryFn: () => usersApi.getEncoders(),
        enabled: user?.role === "admin",
    });

    const createMutation = useMutation({
        mutationFn: usersApi.createEncoder,
        onSuccess: (data) => {
            if (data.error) {
                toast.error(data.error);
            } else {
                toast.success("Invitation sent successfully");
                setIsAddOpen(false);
                setNewEncoder({ email: "" });
                queryClient.invalidateQueries({ queryKey: ["encoders"] });
                queryClient.invalidateQueries({ queryKey: ["invitations"] });
                queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
            }
        },
        onError: () => toast.error("Failed to send invitation"),
    });

    const { data: invitations = [], isLoading: isInvitationsLoading } = useQuery({
        queryKey: ["invitations"],
        queryFn: () => usersApi.getInvitations(),
        enabled: user?.role === "admin",
    });

    const revokeMutation = useMutation({
        mutationFn: usersApi.deleteInvitation,
        onSuccess: (data) => {
            if (data.error) {
                toast.error(data.error);
            } else {
                toast.success("Invitation revoked");
                queryClient.invalidateQueries({ queryKey: ["invitations"] });
            }
        },
        onError: () => toast.error("Failed to revoke invitation"),
    });

    // ... (toggleStatusMutation and deleteMutation remain same) ...

    const toggleStatusMutation = useMutation({
        mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
            usersApi.toggleStatus(id, isActive),
        onMutate: ({ id }) => setActionId(id),
        onSuccess: (_data, { id }) => {
            setActionId(null);
            setSuccessId(id);
            toast.success("Status updated");
            queryClient.invalidateQueries({ queryKey: ["encoders"] });
            queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
            setTimeout(() => setSuccessId(null), 2000);
        },
        onError: () => {
            setActionId(null);
            toast.error("Failed to update status");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: usersApi.deleteEncoder,
        onMutate: (id) => setActionId(id),
        onSuccess: (data) => {
            setActionId(null);
            if (data.error) {
                toast.error(data.error);
            } else {
                toast.success("Encoder deleted");
                queryClient.invalidateQueries({ queryKey: ["encoders"] });
                queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
            }
        },
        onError: () => {
            setActionId(null);
            toast.error("Failed to delete encoder");
        }
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate(newEncoder);
    };


    if (user?.role !== "admin") {
        return (
            <Card className="border-none shadow-sm overflow-hidden py-0">
                <CardHeader className="border-b bg-zinc-50/50 pb-8 pt-8 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-zinc-100 text-zinc-900">
                            <IconUsers className="size-6" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">Encoder Management</CardTitle>
                            <CardDescription>Create and manage accounts for staff members who encode grades.</CardDescription>
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
                                You do not have permission to view this section. <br />
                                Only administrators can manage encoder accounts.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-zinc-100 text-zinc-900">
                        <IconUsers className="size-6" />
                    </div>
                    <div>
                        <CardTitle className="text-xl">Encoder Management</CardTitle>
                        <CardDescription>Create and manage accounts for staff members who encode grades.</CardDescription>
                    </div>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="sm:ml-auto bg-primary hover:bg-primary/90 text-primary-foreground h-10 shadow-md shadow-primary/20">
                            <IconUsers className="size-4 mr-2" />
                            Invite New Encoder
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Invite New Encoder</DialogTitle>
                            <DialogDescription>Send an email invitation to a new encoder.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Email Address</Label>
                                <Input
                                    type="email"
                                    required
                                    value={newEncoder.email}
                                    onChange={(e) => setNewEncoder({ ...newEncoder, email: e.target.value })}
                                    placeholder="encoder@example.com"
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={createMutation.isPending}>
                                    {createMutation.isPending ? "Sending..." : "Send Invitation"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="active" className="w-full">
                <TabsList>
                    <TabsTrigger value="active">Active Encoders</TabsTrigger>
                    <TabsTrigger value="pending" className="flex items-center gap-2">
                        Pending Invitations
                        {invitations.length > 0 && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                                {invitations.length}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-4">
                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
                                    <IconLoader2 className="size-8 animate-spin text-zinc-400" />
                                    <p>Loading encoders...</p>
                                </div>
                            ) : encoders.length === 0 ? (
                                <div className="p-12 text-center text-zinc-500">No encoders found.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                                                <TableHead className="pl-6">Email</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Created</TableHead>
                                                <TableHead className="text-right pr-6">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {encoders.map((encoder: any) => (
                                                <TableRow key={encoder.id}>
                                                    <TableCell className="pl-6 font-medium text-zinc-900">
                                                        {encoder.email}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="secondary"
                                                            className={cn(
                                                                encoder.isActive
                                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                    : "bg-red-50 text-red-700 border-red-200"
                                                            )}
                                                        >
                                                            {encoder.isActive ? "Active" : "Inactive"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-zinc-500">
                                                        {new Date(encoder.createdAt).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="size-8" disabled={actionId === encoder.id}>
                                                                    {actionId === encoder.id ? (
                                                                        <IconLoader2 className="size-4 animate-spin text-zinc-500" />
                                                                    ) : successId === encoder.id ? (
                                                                        <IconCheck className="size-4 text-emerald-600" />
                                                                    ) : (
                                                                        <IconDotsVertical className="size-4" />
                                                                    )}
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem
                                                                    onClick={() => toggleStatusMutation.mutate({ id: encoder.id, isActive: !encoder.isActive })}
                                                                    className="cursor-pointer"
                                                                >
                                                                    {encoder.isActive ? (
                                                                        <>
                                                                            <IconBan className="size-4 mr-2" />
                                                                            Deactivate Account
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <IconCircleCheck className="size-4 mr-2" />
                                                                            Activate Account
                                                                        </>
                                                                    )}
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <DropdownMenuItem
                                                                            onSelect={(e) => e.preventDefault()}
                                                                            className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                                                                        >
                                                                            <IconTrash className="size-4 mr-2" />
                                                                            Delete Account
                                                                        </DropdownMenuItem>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                This action cannot be undone. This will permanently delete the encoder account.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                            <AlertDialogAction
                                                                                onClick={() => deleteMutation.mutate(encoder.id)}
                                                                                className="bg-red-600 hover:bg-red-700"
                                                                            >
                                                                                Delete
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="pending" className="mt-4">
                    <Card className="border-none shadow-sm bg-white overflow-hidden">
                        <CardContent className="p-0">
                            {isInvitationsLoading ? (
                                <div className="text-center text-zinc-500 py-12">Loading invitations...</div>
                            ) : invitations.length === 0 ? (
                                <div className="text-center text-zinc-500 py-12">
                                    No pending invitations.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                                                <TableHead className="pl-6">Email</TableHead>
                                                <TableHead>Sent At</TableHead>
                                                <TableHead>Expires At</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right pr-6">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {invitations.map((invite: any) => {
                                                const isExpired = new Date() > new Date(invite.expiresAt);
                                                return (
                                                    <TableRow key={invite.id}>
                                                        <TableCell className="pl-6 font-medium text-zinc-900 truncate max-w-[200px]" title={invite.email}>
                                                            {invite.email}
                                                        </TableCell>
                                                        <TableCell className="text-zinc-500 whitespace-nowrap">
                                                            {new Date(invite.createdAt).toLocaleDateString()}
                                                        </TableCell>
                                                        <TableCell className="text-zinc-500 whitespace-nowrap">
                                                            {new Date(invite.expiresAt).toLocaleDateString()}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant="secondary"
                                                                className={cn(
                                                                    isExpired
                                                                        ? "bg-red-50 text-red-700 border-red-200"
                                                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                                                )}
                                                            >
                                                                {isExpired ? "Expired" : "Pending"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right pr-6">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="size-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                disabled={revokeMutation.isPending}
                                                                onClick={() => revokeMutation.mutate(invite.id)}
                                                                title="Revoke Invitation"
                                                            >
                                                                {revokeMutation.isPending ? (
                                                                    <IconLoader2 className="size-4 animate-spin" />
                                                                ) : (
                                                                    <IconTrash className="size-4" />
                                                                )}
                                                            </Button>
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
                </TabsContent>
            </Tabs>
        </div>
    );
}

function StudentsTab() {
    const { user } = useAuth();

    if (user?.role !== "admin") {
        return (
            <Card className="border-none shadow-sm bg-white overflow-hidden py-0">
                <CardHeader className="border-b bg-zinc-50/50 pb-8 pt-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-zinc-100">
                            <IconKey className="size-6 text-zinc-900" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">Student Credentials</CardTitle>
                            <CardDescription>Manage login access and password resets for students.</CardDescription>
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
                                You do not have permission to view this section.<br /> Only administrators can manage student credentials.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-sm bg-white overflow-hidden py-0">
            <CardHeader className="border-b bg-zinc-50/50 pb-8 pt-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-zinc-100">
                        <IconKey className="size-6 text-zinc-900" />
                    </div>
                    <div>
                        <CardTitle className="text-xl">Student Credentials</CardTitle>
                        <CardDescription>Manage login access and password resets for students.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-12 text-center">
                <div className="max-w-md mx-auto space-y-6 bg-zinc-50/50 p-8 rounded-2xl border border-zinc-100">
                    <div className="size-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto border border-zinc-100">
                        <IconLoader2 className="size-8 text-zinc-400" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-bold text-zinc-900">Feature Coming Soon</h3>
                        <p className="text-zinc-500 text-sm leading-relaxed">
                            The student portal is currently in development. You will be able to manage student credentials once the portal is launched.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 justify-center text-zinc-400 text-xs font-semibold tracking-wider uppercase">
                        <div className="h-px flex-1 bg-zinc-200" />
                        Phase 2 Development
                        <div className="h-px flex-1 bg-zinc-200" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function AuditLogsTab() {
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

    // Add "All" option manually if needed, or handle empty value as All
    // GenericCombobox handles selection, but we want an explicit "All" maybe?
    // Actually the GenericCombobox allows clearing, which is effectively "All". 
    // But for UI clarity properly labelled "All Actions" item is good, 
    // OR we just strictly use the clear capability.
    // The previous Select had "All Actions".

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
            queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
        },
        onError: () => toast.error("Failed to delete log"),
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: auditApi.bulkDelete,
        onSuccess: (data) => {
            toast.success(`Deleted ${data.count} audit logs`);
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
        },
        onError: () => toast.error("Failed to delete logs"),
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
            <Card className="border-none shadow-sm bg-white overflow-hidden py-0">
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
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="sm" className="gap-2 h-9">
                                        <IconTrash className="size-4" />
                                        Delete Selected ({selectedIds.length})
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete {selectedIds.length} selected audit log entries. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            className="bg-red-600 hover:bg-red-700"
                                            onClick={() => bulkDeleteMutation.mutate(selectedIds)}
                                        >
                                            Delete Forever
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                </CardHeader>

                {/* Search and Filters - MATCH STUDENT PAGE UI */}
                <div className="px-6 py-6 flex flex-col lg:flex-row gap-4 items-start lg:items-center border-b bg-zinc-50/30">
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
                    <div className="flex w-full lg:w-auto lg:flex-1 lg:justify-end gap-3 flex-wrap">
                        {(search || filterAction || filterEntity || startDate || endDate) && (
                            <Button
                                variant="ghost"
                                onClick={clearFilters}
                                className="text-zinc-500 hover:text-zinc-900 gap-2 px-3 h-10"
                            >
                                <IconX className="size-4" />
                                <span className="hidden sm:inline">Reset</span>
                            </Button>
                        )}

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "justify-start text-left font-normal w-[240px] h-10",
                                        !startDate && !endDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {startDate || endDate ? (
                                        <span className="truncate">
                                            {startDate ? new Date(startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Start"} - {endDate ? new Date(endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "End"}
                                        </span>
                                    ) : (
                                        <span>Filter by Date</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4" align="start">
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

                        {/* Action Filter */}
                        <div className="w-full sm:w-[200px]">
                            <GenericCombobox
                                value={filterAction}
                                onValueChange={handleFilterAction}
                                items={fullActionOptions}
                                placeholder="All Actions"
                                className="w-full h-10 bg-white"
                                leftIcon={<ListFilter className="size-4 text-zinc-400" />}
                            />
                        </div>

                        {/* Entity Filter */}
                        <div className="w-full sm:w-[200px]">
                            <GenericCombobox
                                value={filterEntity}
                                onValueChange={handleFilterEntity}
                                items={fullEntityOptions}
                                placeholder="All Entities"
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
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="size-8 text-zinc-400 hover:text-red-600 hover:bg-red-50">
                                                                    <IconTrash className="size-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Delete this log?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        This action will permanently delete this audit record. It cannot be undone.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        className="bg-red-600 hover:bg-red-700"
                                                                        onClick={() => deleteMutation.mutate(log.id)}
                                                                    >
                                                                        Delete
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
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
                <div className="mt-2">
                    {parseError ? (
                        <pre className="text-xs font-mono text-zinc-700 bg-zinc-50 p-4 rounded-lg">{details}</pre>
                    ) : (
                        <LogDetailsRenderer details={details} />
                    )}
                </div>
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
                    <span className="text-sm font-semibold text-zinc-900 font-mono break-all leading-relaxed">
                        {val === null ? "-" : String(val)}
                    </span>
                </div>
            ))}
        </div>
    );
}
