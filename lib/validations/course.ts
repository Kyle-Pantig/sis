import * as z from "zod";

export const courseSchema = z.object({
    code: z
        .string()
        .min(2, "Course code must be at least 2 characters")
        .max(10, "Course code must be at most 10 characters")
        .regex(/^[A-Z0-9]+$/, "Course code must be uppercase letters and numbers only"),
    name: z
        .string()
        .min(5, "Course name must be at least 5 characters")
        .max(100, "Course name must be at most 100 characters"),
    description: z
        .string()
        .max(500, "Description must be at most 500 characters")
        .optional()
        .or(z.literal("")),
});

export type CourseFormValues = z.infer<typeof courseSchema>;
