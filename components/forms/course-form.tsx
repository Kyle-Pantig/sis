"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { courseSchema, type CourseFormValues } from "@/lib/validations/course";
import { coursesApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CourseCodeCombobox, COMMON_COURSES } from "@/components/course-code-combobox";
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

interface CourseFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: CourseFormValues) => Promise<void>;
    defaultValues?: Partial<CourseFormValues>;
    mode: "create" | "edit";
    isSubmitting?: boolean;
}

export function CourseForm({
    open,
    onOpenChange,
    onSubmit,
    defaultValues,
    mode,
    isSubmitting: externalIsSubmitting,
}: CourseFormProps) {
    const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);
    const isSubmitting = externalIsSubmitting ?? internalIsSubmitting;

    // Validation state
    const [checkingCode, setCheckingCode] = useState(false);
    const [codeExists, setCodeExists] = useState(false);

    const form = useForm<CourseFormValues>({
        resolver: zodResolver(courseSchema) as any,
        defaultValues: {
            code: "",
            name: "",
            description: "",
            ...defaultValues,
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                code: defaultValues?.code || "",
                name: defaultValues?.name || "",
                description: defaultValues?.description || "",
            });
            setCodeExists(false);
        }
    }, [open, defaultValues, form]);

    async function handleFormSubmit(data: CourseFormValues) {
        if (mode === "create") {
            setCheckingCode(true);
            try {
                const check = await coursesApi.checkCode(data.code);
                if (check.exists) {
                    setCodeExists(true);
                    setCheckingCode(false);
                    return;
                }
            } catch (err) {
                // Ignore check errors and proceed
            } finally {
                setCheckingCode(false);
            }
        }

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
                        {mode === "create" ? "Add New Course" : "Edit Course"}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === "create"
                            ? "Fill in the details below to create a new course."
                            : "Update the course information below."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
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
                                                if (mode === "create" && code.trim().length >= 2) {
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
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting || checkingCode}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting || checkingCode || codeExists} className="min-w-[100px]">
                                {isSubmitting ? (
                                    <>
                                        <IconLoader2 className="size-4 mr-2 animate-spin" />
                                        {mode === "create" ? "Creating..." : "Saving..."}
                                    </>
                                ) : (
                                    mode === "create" ? "Create Course" : "Save Changes"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
