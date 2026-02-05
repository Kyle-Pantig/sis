"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { studentSchema, type StudentFormValues } from "@/lib/validations/student";
import { coursesApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CourseCombobox } from "@/components/course-combobox";
import { DatePicker } from "@/components/date-picker";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { IconLoader2 } from "@tabler/icons-react";



interface StudentFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: StudentFormValues) => Promise<void>;
    defaultValues?: Partial<StudentFormValues>;
    mode: "create" | "edit";
    isSubmitting?: boolean;
}

export function StudentForm({
    open,
    onOpenChange,
    onSubmit,
    defaultValues,
    mode,
    isSubmitting: externalIsSubmitting,
}: StudentFormProps) {
    const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);
    const isSubmitting = externalIsSubmitting ?? internalIsSubmitting;

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<StudentFormValues>({
        resolver: zodResolver(studentSchema),
        defaultValues: {
            studentNo: "",
            firstName: "",
            lastName: "",
            email: "",
            birthDate: "",
            courseId: "",
            ...defaultValues,
        },
    });

    const selectedCourseId = watch("courseId");
    const birthDate = watch("birthDate");


    useEffect(() => {
        if (open && defaultValues) {
            reset({
                studentNo: defaultValues.studentNo || "",
                firstName: defaultValues.firstName || "",
                lastName: defaultValues.lastName || "",
                email: defaultValues.email || "",
                birthDate: defaultValues.birthDate ?
                    (typeof defaultValues.birthDate === 'string'
                        ? defaultValues.birthDate.split('T')[0]
                        : new Date(defaultValues.birthDate).toISOString().split('T')[0])
                    : "",
                courseId: defaultValues.courseId || "",
            });
        } else if (open && !defaultValues) {
            reset({
                studentNo: "",
                firstName: "",
                lastName: "",
                email: "",
                birthDate: "",
                courseId: "",
            });
        }
    }, [open, defaultValues, reset]);

    async function handleFormSubmit(data: StudentFormValues) {
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
                        {mode === "create" ? "Add New Student" : "Edit Student"}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === "create"
                            ? "Fill in the details below to create a new student record."
                            : "Update the student information below."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                    <div className="space-y-4">
                        {mode === "edit" ? (
                            <div className="space-y-2">
                                <Label htmlFor="studentNo">Student Number</Label>
                                <Input
                                    id="studentNo"
                                    {...register("studentNo")}
                                    readOnly
                                    className="bg-zinc-50 border-zinc-200 text-zinc-500 font-mono cursor-not-allowed"
                                />
                                <p className="text-[10px] text-zinc-400">Student number cannot be modified.</p>
                            </div>
                        ) : (
                            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Student Number</p>
                                    <p className="text-[11px] text-emerald-600">Generated automatically upon creation</p>
                                </div>
                                <div className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">
                                    Auto-Gen
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <DatePicker
                                    id="birthDate"
                                    label="Birth Date *"
                                    value={birthDate}
                                    onChange={(value) => setValue("birthDate", value, { shouldValidate: true })}
                                    error={errors.birthDate?.message}
                                    className="gap-2"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="student@example.com"
                                    {...register("email")}
                                    className={errors.email ? "border-red-500" : ""}
                                />
                                {errors.email && (
                                    <p className="text-xs text-red-500">{errors.email.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name *</Label>
                                <Input
                                    id="firstName"
                                    placeholder="John"
                                    {...register("firstName")}
                                    className={errors.firstName ? "border-red-500" : ""}
                                />
                                {errors.firstName && (
                                    <p className="text-xs text-red-500">{errors.firstName.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name *</Label>
                                <Input
                                    id="lastName"
                                    placeholder="Doe"
                                    {...register("lastName")}
                                    className={errors.lastName ? "border-red-500" : ""}
                                />
                                {errors.lastName && (
                                    <p className="text-xs text-red-500">{errors.lastName.message}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="courseId">Course *</Label>
                        <CourseCombobox
                            value={selectedCourseId}
                            onValueChange={(value) => setValue("courseId", value)}
                            placeholder="Select a course"
                            className="w-full"
                        />
                        {errors.courseId && (
                            <p className="text-xs text-red-500">{errors.courseId.message}</p>
                        )}
                    </div>

                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="min-w-[100px]">
                            {isSubmitting ? (
                                <>
                                    <IconLoader2 className="size-4 mr-2 animate-spin" />
                                    {mode === "create" ? "Creating..." : "Saving..."}
                                </>
                            ) : (
                                mode === "create" ? "Create Student" : "Save Changes"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
