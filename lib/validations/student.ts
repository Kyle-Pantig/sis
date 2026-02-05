import * as z from "zod";

export const studentSchema = z.object({
    studentNo: z.string().optional(),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    birthDate: z.string().min(1, "Birth date is required"),
    courseId: z.string().min(1, "Course is required"),
});

export type StudentFormValues = z.infer<typeof studentSchema>;
