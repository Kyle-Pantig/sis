import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconRefresh, IconTrash, IconLoader2, IconUsers, IconLock, IconCheck, IconDotsVertical, IconBan, IconCircleCheck } from "@tabler/icons-react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { usersApi } from "@/lib/api";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function EncodersTab() {
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

    const resendMutation = useMutation({
        mutationFn: usersApi.resendInvitation,
        onSuccess: (data) => {
            if (data.error) {
                toast.error(data.error);
            } else {
                toast.success("Invitation resent");
                queryClient.invalidateQueries({ queryKey: ["invitations"] });
            }
        },
        onError: () => toast.error("Failed to resend invitation"),
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
                    <Card className="overflow-hidden">
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
                                                                <ConfirmDialog
                                                                    title="Delete Account"
                                                                    description="This action cannot be undone. This will permanently delete the encoder account."
                                                                    onConfirm={() => deleteMutation.mutate(encoder.id)}
                                                                    isLoading={deleteMutation.isPending}
                                                                    variant="destructive"
                                                                    trigger={
                                                                        <DropdownMenuItem
                                                                            onSelect={(e) => e.preventDefault()}
                                                                            className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                                                                        >
                                                                            <IconTrash className="size-4 mr-2" />
                                                                            Delete Account
                                                                        </DropdownMenuItem>
                                                                    }
                                                                />
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
                    <Card className="overflow-hidden">
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
                                                            <div className="flex items-center justify-end gap-1">
                                                                {isExpired && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="size-8 text-primary hover:text-primary hover:bg-primary/10"
                                                                        disabled={resendMutation.isPending}
                                                                        onClick={() => resendMutation.mutate(invite.id)}
                                                                        title="Resend Invitation"
                                                                    >
                                                                        {resendMutation.isPending ? (
                                                                            <IconLoader2 className="size-4 animate-spin" />
                                                                        ) : (
                                                                            <IconRefresh className="size-4" />
                                                                        )}
                                                                    </Button>
                                                                )}
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
                </TabsContent>
            </Tabs>
        </div>
    );
}