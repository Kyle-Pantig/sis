"use client";

import * as React from "react";
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
import { IconLoader2, IconAlertTriangle } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
    title: React.ReactNode;
    description?: React.ReactNode;
    children?: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "destructive";
    onConfirm: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
    isLoading?: boolean;
    disabled?: boolean;
    className?: string; // Content className
}

export function ConfirmDialog({
    open,
    onOpenChange,
    trigger,
    title,
    description,
    children,
    confirmText = "Continue",
    cancelText = "Cancel",
    variant = "default",
    onConfirm,
    isLoading = false,
    disabled = false,
    className,
}: ConfirmDialogProps) {
    const controlledContent = (
        <AlertDialogContent className={className}>
            <AlertDialogHeader>
                <div className="flex items-center gap-3">
                    {variant === "destructive" && (
                        <div className="flex-shrink-0 bg-red-50 p-2 rounded-full hidden sm:flex items-center justify-center">
                            <IconAlertTriangle className="size-5 text-red-600" />
                        </div>
                    )}
                    <div className="space-y-1 text-left w-full">
                        <AlertDialogTitle className={cn(
                            "text-lg",
                            variant === "destructive" && "text-red-900"
                        )}>
                            {title}
                        </AlertDialogTitle>
                        {description && (
                            <AlertDialogDescription className="text-zinc-600">
                                {description}
                            </AlertDialogDescription>
                        )}
                    </div>
                </div>
            </AlertDialogHeader>

            {children}

            <AlertDialogFooter>
                <AlertDialogCancel disabled={isLoading}>{cancelText}</AlertDialogCancel>
                <AlertDialogAction
                    onClick={(e) => {
                        e.preventDefault();
                        onConfirm(e);
                    }}
                    disabled={isLoading || disabled}
                    className={cn(
                        variant === "destructive" && "bg-red-600 hover:bg-red-700 focus-visible:ring-red-600"
                    )}
                >
                    {isLoading && <IconLoader2 className="size-4 mr-2 animate-spin" />}
                    {isLoading ? "Deleting..." : confirmText}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    );

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            {trigger && (
                <AlertDialogTrigger asChild>
                    {trigger}
                </AlertDialogTrigger>
            )}
            {controlledContent}
        </AlertDialog>
    );
}
