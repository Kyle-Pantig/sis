import { z } from "zod";

export const subjectSchema = z.object({
    courseId: z.string().min(1, "Course is required"),
    code: z.string().min(1, "Code is required").max(20, "Code is too long"),
    title: z.string().min(1, "Title is required").max(100, "Title is too long"),
    units: z.coerce.number().min(1, "At least 1 unit").max(10, "Max 10 units"),
});

export type SubjectFormValues = z.infer<typeof subjectSchema>;
