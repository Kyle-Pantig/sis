import { z } from "zod";

export const gradeSchema = z.object({
    studentId: z.string().min(1, "Student is required"),
    subjectId: z.string().min(1, "Subject is required"),
    courseId: z.string().min(1, "Course is required"),
    prelim: z.coerce.number().min(0, "Min 0").max(100, "Max 100").optional().nullable().or(z.literal("")),
    midterm: z.coerce.number().min(0, "Min 0").max(100, "Max 100").optional().nullable().or(z.literal("")),
    finals: z.coerce.number().min(0, "Min 0").max(100, "Max 100").optional().nullable().or(z.literal("")),
    remarks: z.string().optional().nullable(),
});

export type GradeFormValues = z.infer<typeof gradeSchema>;
