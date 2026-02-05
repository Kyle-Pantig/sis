"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { gradeSchema, type GradeFormValues } from "@/lib/validations/grade";
import { gradesApi, subjectsApi, studentsApi, reservationsApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CourseCombobox } from "@/components/course-combobox";
import { GenericCombobox } from "@/components/generic-combobox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { IconLoader2 } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface GradeFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: any) => Promise<void>; // Accepts combined data
    defaultValues?: Partial<GradeFormValues>;
    mode?: "create" | "edit"; // Usually "create" since edit is often inline, but this supports dialog editing
    isSubmitting?: boolean;
}

interface Student {
    id: string;
    studentNo: string;
    firstName: string;
    lastName: string;
    courseId: string;
}

interface Subject {
    id: string;
    code: string;
    title: string;
    courseId: string;
}

interface Grade {
    id: string;
    studentId: string;
    subjectId: string;
    prelim: string | null;
    midterm: string | null;
    finals: string | null;
    remarks: string | null;
}

export function GradeForm({
    open,
    onOpenChange,
    onSubmit,
    defaultValues,
    mode = "create",
    isSubmitting: externalIsSubmitting,
}: GradeFormProps) {
    const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);
    const isSubmitting = externalIsSubmitting ?? internalIsSubmitting;

    const form = useForm<GradeFormValues>({
        resolver: zodResolver(gradeSchema) as any,
        defaultValues: {
            studentId: "",
            subjectId: "",
            courseId: "",
            prelim: "",
            midterm: "",
            finals: "",
            remarks: "",
            ...defaultValues,
        },
    });

    const formCourseId = form.watch("courseId");
    const formStudentId = form.watch("studentId");
    const formSubjectId = form.watch("subjectId");
    const formPrelim = form.watch("prelim");
    const formMidterm = form.watch("midterm");
    const formFinals = form.watch("finals");

    // Fetch dependent data
    const { data: existingGradesData, isLoading: loadingExistingGrades } = useQuery<Grade[]>({
        queryKey: ["student-grades", formStudentId],
        queryFn: () => gradesApi.getByStudent(formStudentId),
        enabled: open && !!formStudentId,
    });

    const { data: reservationsData, isLoading: loadingReservations } = useQuery<any[]>({
        queryKey: ["student-reservations", formStudentId],
        queryFn: () => reservationsApi.getByStudent(formStudentId),
        enabled: open && !!formStudentId,
    });

    const { data: subjectsData, isLoading: loadingSubjects } = useQuery<{ subjects: Subject[] }>({
        queryKey: ["subjects-list", formCourseId], // Filter by selected course
        queryFn: () => subjectsApi.getAll(1, 200, undefined, formCourseId || undefined),
        enabled: open && !!formCourseId, // Only fetch when course is selected? Or always? Page logic was loose.
    });

    const { data: studentsData, isLoading: loadingStudents } = useQuery<{ students: Student[] }>({
        queryKey: ["students-for-grade", formCourseId],
        queryFn: () => studentsApi.getAll(1, 500),
        enabled: open,
    });

    // Auto-populate form when selecting an existing grade
    useEffect(() => {
        if (!formStudentId) return;

        if (!formSubjectId) {
            form.setValue("prelim", "");
            form.setValue("midterm", "");
            form.setValue("finals", "");
            form.setValue("remarks", "");
            return;
        }

        if (!Array.isArray(existingGradesData)) return;

        const existingGrade = existingGradesData.find((g: Grade) => g.subjectId === formSubjectId);

        if (existingGrade) {
            // If it's a "Pending" grade, we treat it as new, so don't show "Pending" in remarks
            const isPending = existingGrade.remarks === "Pending";

            form.setValue("prelim", existingGrade.prelim ? Number(existingGrade.prelim) : "");
            form.setValue("midterm", existingGrade.midterm ? Number(existingGrade.midterm) : "");
            form.setValue("finals", existingGrade.finals ? Number(existingGrade.finals) : "");
            form.setValue("remarks", isPending ? "" : (existingGrade.remarks || ""));
        } else {
            // Only clear if we really switched to a new subject
            form.setValue("prelim", "");
            form.setValue("midterm", "");
            form.setValue("finals", "");
            form.setValue("remarks", "");
        }
    }, [formSubjectId, existingGradesData, formStudentId, form, open]); // Added open to dependency? No, keep it minimal.

    // Reset form on open
    useEffect(() => {
        if (open) {
            form.reset({
                studentId: defaultValues?.studentId || "",
                subjectId: defaultValues?.subjectId || "",
                courseId: defaultValues?.courseId || "",
                prelim: defaultValues?.prelim || "",
                midterm: defaultValues?.midterm || "",
                finals: defaultValues?.finals || "",
                remarks: defaultValues?.remarks || "",
            });
        }
    }, [open, defaultValues, form]);

    const subjects = subjectsData?.subjects || [];
    const students = studentsData?.students?.filter((s: Student) => !formCourseId || s.courseId === formCourseId) || [];

    const reservedSubjectIds = Array.isArray(reservationsData) ? reservationsData.map((r: any) => r.subjectId) : [];

    const selectedGrade = Array.isArray(existingGradesData)
        ? existingGradesData.find((g: Grade) => g.subjectId === formSubjectId)
        : null;

    const isEditingLogic = !!(selectedGrade && selectedGrade.remarks !== "Pending");

    const subjectOptions = useMemo(() => subjects
        .filter((s) => !formCourseId || s.courseId === formCourseId)
        .map((s) => {
            const existingGrade = Array.isArray(existingGradesData)
                ? existingGradesData.find((g: Grade) => g.subjectId === s.id)
                : null;

            const isFullyGraded = existingGrade && existingGrade.remarks !== "Pending";
            const isPending = existingGrade && existingGrade.remarks === "Pending";
            const isNotEnrolled = formStudentId && !reservedSubjectIds.includes(s.id);

            let disabled = false;
            let disabledReason = "";

            if (isFullyGraded) {
                // Allow selection for editing
                disabled = false;
                disabledReason = "Edit Grade"; // Indicates it has a grade
            } else if (isNotEnrolled) {
                disabled = true;
                disabledReason = "Not enrolled";
            } else if (isPending) {
                // It's pending, so it's available for "Add Grade"
            }

            return {
                value: s.id,
                label: `${s.code} - ${s.title}`,
                disabled,
                disabledReason,
            };
        }), [subjects, formCourseId, existingGradesData, formStudentId, reservedSubjectIds]);

    const studentOptions = useMemo(() => students.map(s => ({
        value: s.id,
        label: `${s.studentNo} - ${s.firstName} ${s.lastName}`
    })), [students]);

    async function handleFormSubmit(data: GradeFormValues) {
        setInternalIsSubmitting(true);
        try {
            await onSubmit(data); // onSubmit deals with upsert logic
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
                        {isEditingLogic ? "Update Grade" : "Add/Edit Grade"}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditingLogic
                            ? "Update the existing grade for this student."
                            : "Enter grades for a student. Select a course to filter students and subjects."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="courseId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Filter by Course</FormLabel>
                                    <FormControl>
                                        <CourseCombobox
                                            value={field.value}
                                            onValueChange={(val) => {
                                                field.onChange(val);
                                                // Clear student and subject when course changes?
                                                // Original logic didn't explicitly clear but filtering would invalidate selection visual
                                            }}
                                            placeholder="Select course (optional)"
                                            className="w-full"
                                            includeAll={false}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="studentId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Student *</FormLabel>
                                    <FormControl>
                                        <GenericCombobox
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            items={studentOptions}
                                            placeholder="Select student"
                                            className="w-full"
                                            isLoading={loadingStudents}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="subjectId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Subject *</FormLabel>
                                    <FormControl>
                                        <GenericCombobox
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            items={subjectOptions}
                                            placeholder="Select subject"
                                            className={!formCourseId && !formStudentId ? "opacity-50 pointer-events-none w-full" : "w-full"} // Logic tweak: Need student or course? Original was !formCourseId. But if I select student without course filter?
                                            isLoading={loadingSubjects || loadingReservations || loadingExistingGrades}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-3 gap-3">
                            <FormField
                                control={form.control}
                                name="prelim"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Prelim</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                placeholder="0-100"
                                                {...field}
                                                value={field.value ?? ""}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="midterm"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Midterm</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                placeholder="0-100"
                                                {...field}
                                                value={field.value ?? ""}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="finals"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Finals</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                placeholder="0-100"
                                                {...field}
                                                value={field.value ?? ""}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Remarks</Label>
                            <div className="h-10 flex items-center">
                                {(() => {
                                    const p = parseFloat((formPrelim as string) || "0");
                                    const m = parseFloat((formMidterm as string) || "0");
                                    const f = parseFloat((formFinals as string) || "0");
                                    if (!formPrelim || !formMidterm || !formFinals) {
                                        return (
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] uppercase font-bold px-2 py-0.5 text-zinc-400 border-zinc-200 bg-zinc-50"
                                            >
                                                Pending
                                            </Badge>
                                        );
                                    }
                                    const final = (p * 0.3) + (m * 0.3) + (f * 0.4);
                                    const status = final <= 3.0 ? "Passed" : "Failed";
                                    return (
                                        <Badge
                                            variant="secondary"
                                            className={cn(
                                                "text-[10px] uppercase font-bold px-2 py-0.5 border shadow-none",
                                                status === "Passed"
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    : "bg-red-50 text-red-700 border-red-200"
                                            )}
                                        >
                                            {status}
                                        </Badge>
                                    );
                                })()}
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <IconLoader2 className="size-4 mr-2 animate-spin" />
                                        {isEditingLogic ? "Updating..." : "Creating..."}
                                    </>
                                ) : (
                                    isEditingLogic ? "Update Grade" : "Save Grade"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
