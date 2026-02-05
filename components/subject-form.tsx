"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { subjectSchema, type SubjectFormValues } from "@/lib/validations/subject";
import { subjectsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CourseCombobox } from "@/components/course-combobox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { IconLoader2, IconExclamationCircle } from "@tabler/icons-react";
import { toast } from "sonner";

interface SubjectFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: SubjectFormValues) => Promise<void>;
    defaultValues?: Partial<SubjectFormValues>;
    mode: "create" | "edit";
    isSubmitting?: boolean;
    subjectId?: string; // For availability check exclusion
}

export function SubjectForm({
    open,
    onOpenChange,
    onSubmit,
    defaultValues,
    mode,
    isSubmitting: externalIsSubmitting,
    subjectId,
}: SubjectFormProps) {
    const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);
    const isSubmitting = externalIsSubmitting ?? internalIsSubmitting;

    // Validation state
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [codeExists, setCodeExists] = useState(false);
    const [titleExists, setTitleExists] = useState(false);

    const form = useForm<SubjectFormValues>({
        resolver: zodResolver(subjectSchema),
        defaultValues: {
            courseId: "",
            code: "",
            title: "",
            units: 3,
            ...defaultValues,
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                courseId: defaultValues?.courseId || "",
                code: defaultValues?.code || "",
                title: defaultValues?.title || "",
                units: defaultValues?.units || 3,
            });
            setCodeExists(false);
            setTitleExists(false);
        }
    }, [open, defaultValues, form]);

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
                const res = await subjectsApi.checkAvailability(cId, code, title, subjectId);
                setCodeExists(!!res.codeExists);
                setTitleExists(!!res.titleExists);
            } catch (err) { }
        } else {
            setCodeExists(false);
            setTitleExists(false);
        }
    };

    async function handleFormSubmit(data: SubjectFormValues) {
        setCheckingAvailability(true);
        try {
            const res = await subjectsApi.checkAvailability(
                data.courseId,
                data.code,
                data.title,
                subjectId
            );

            if (res.codeExists) {
                setCodeExists(true);
                toast.error("Subject code already exists for this course");
                setCheckingAvailability(false);
                return;
            }

            if (res.titleExists) {
                setTitleExists(true);
                toast.error("Subject title already exists for this course");
                setCheckingAvailability(false);
                return;
            }
        } catch (error) {
            // If check fails, we proceed? Or stop? 
            // Original code: "If check fails, we might want to continue or show error" but it continued in finally block?
            // Actually original code had the check inside try/catch, and mutation outside.
            // If check threw error, mutation would run.
            // But if res.codeExists was true, it returned early.
        } finally {
            setCheckingAvailability(false);
        }

        // Double check state before submitting
        if (codeExists || titleExists) return;

        setInternalIsSubmitting(true);
        try {
            await onSubmit(data);
            onOpenChange(false);
        } catch (err) {
            console.error(err);
        } finally {
            setInternalIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]" onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">
                        {mode === "create" ? "Add New Subject" : "Edit Subject"}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === "create"
                            ? "Fill in the details below to create a new subject."
                            : "Update the subject information below."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
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
                            control={form.control}
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
                            control={form.control}
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
                            control={form.control}
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
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting || checkingAvailability}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || checkingAvailability || codeExists || titleExists}
                                className="min-w-[100px]"
                            >
                                {isSubmitting ? (
                                    <>
                                        <IconLoader2 className="size-4 mr-2 animate-spin" />
                                        {mode === "create" ? "Creating..." : "Saving..."}
                                    </>
                                ) : (
                                    mode === "create" ? "Create Subject" : "Save Changes"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
