import { z } from "zod";

export const gradeSchema = z.object({
    studentId: z.string().min(1, "Student is required"),
    subjectId: z.string().min(1, "Subject is required"),
    courseId: z.string().min(1, "Course is required"),
    prelim: z.union([z.coerce.number().min(0).max(100), z.literal(""), z.null()]).optional(),
    midterm: z.union([z.coerce.number().min(0).max(100), z.literal(""), z.null()]).optional(),
    finals: z.union([z.coerce.number().min(0).max(100), z.literal(""), z.null()]).optional(),
    remarks: z.string().optional().nullable(),
});

export type GradeFormValues = z.infer<typeof gradeSchema>;
