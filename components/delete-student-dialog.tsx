"use client";

import { useState } from "react";
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
import { IconLoader2 } from "@tabler/icons-react";

interface DeleteStudentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => Promise<void>;
    studentName: string;
    isDeleting?: boolean;
}

export function DeleteStudentDialog({
    open,
    onOpenChange,
    onConfirm,
    studentName,
    isDeleting: externalIsDeleting,
}: DeleteStudentDialogProps) {
    const [internalIsDeleting, setInternalIsDeleting] = useState(false);
    const isDeleting = externalIsDeleting ?? internalIsDeleting;

    async function handleConfirm() {
        setInternalIsDeleting(true);
        try {
            await onConfirm();
            onOpenChange(false);
        } catch (err) {
            console.error(err);
        } finally {
            setInternalIsDeleting(false);
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Student Record</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                        <p>
                            Are you sure you want to delete the student record for{" "}
                            <span className="font-semibold text-zinc-900">{studentName}</span>?
                        </p>
                        <p className="text-red-600 font-medium">
                            This action cannot be undone. All associated data (reservations, grades) will also be deleted.
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleConfirm();
                        }}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                    >
                        {isDeleting ? (
                            <>
                                <IconLoader2 className="size-4 mr-2 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            "Delete Student"
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
