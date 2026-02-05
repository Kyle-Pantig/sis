import { StudentService } from "../services/student.service";

export class StudentController {
    static async getStudents({ query }: { query: { page?: string; limit?: string; search?: string; courseId?: string } }) {
        try {
            const page = parseInt(query.page || "1");
            const limit = parseInt(query.limit || "10");
            return await StudentService.getAllStudents(page, limit, query.search, query.courseId);
        } catch (error) {
            console.error(error);
            return { error: "Failed to fetch students" };
        }
    }

    static async getStudent(id: string) {
        try {
            const student = await StudentService.getStudentById(id);
            if (!student) return { error: "Student not found" };
            return student;
        } catch (error) {
            console.error(error);
            return { error: "Failed to fetch student" };
        }
    }

    static async getCount() {
        try {
            const count = await StudentService.getStudentsCount();
            return { count };
        } catch (error) {
            console.error(error);
            return { error: "Failed to fetch count" };
        }
    }

    static async createStudent(ctx: any) {
        const { body, set, jwt, cookie: { session } } = ctx;
        let user = ctx.user;
        if (!user && session?.value) {
            try { user = await jwt.verify(session.value); } catch (e) { }
        }

        try {
            const student = await StudentService.createStudent(body, user?.id);
            set.status = 201;
            return student;
        } catch (error: any) {
            console.error(error);
            if (error.code === 'P2002') {
                const target = error.meta?.target;
                if (target && (Array.isArray(target) ? target.join(',').includes('email') : String(target).includes('email'))) {
                    set.status = 400;
                    return { error: "Email address already exists" };
                }
                set.status = 400;
                return { error: "Student number already exists" };
            }
            set.status = 500;
            return { error: "Failed to create student" };
        }
    }

    static async updateStudent(ctx: any) {
        const { params, body, set, jwt, cookie: { session } } = ctx;
        let user = ctx.user;
        if (!user && session?.value) {
            try { user = await jwt.verify(session.value); } catch (e) { }
        }

        try {
            const student = await StudentService.updateStudent(params.id, body, user?.id);
            return student;
        } catch (error: any) {
            console.error(error);
            if (error.code === 'P2025') {
                set.status = 404;
                return { error: "Student not found" };
            }
            if (error.code === 'P2002') {
                const target = error.meta?.target;
                if (target && (Array.isArray(target) ? target.join(',').includes('email') : String(target).includes('email'))) {
                    set.status = 400;
                    return { error: "Email address already exists" };
                }
                set.status = 400;
                return { error: "Student number already exists" };
            }
            set.status = 500;
            return { error: "Failed to update student" };
        }
    }

    static async deleteStudent(ctx: any) {
        const { params, set, jwt, cookie: { session } } = ctx;
        let user = ctx.user;
        if (!user && session?.value) {
            try { user = await jwt.verify(session.value); } catch (e) { }
        }

        try {
            await StudentService.deleteStudent(params.id, user?.id);
            return { message: "Student deleted successfully" };
        } catch (error: any) {
            console.error(error);
            if (error.code === 'P2025') {
                set.status = 404;
                return { error: "Student not found" };
            }
            set.status = 500;
            return { error: "Failed to delete student" };
        }
    }

    static async deleteStudents(ctx: any) {
        const { body, set, jwt, cookie: { session } } = ctx;
        let user = ctx.user;
        if (!user && session?.value) {
            try { user = await jwt.verify(session.value); } catch (e) { }
        }

        try {
            const result = await StudentService.deleteStudents(body.ids, user?.id);
            return { count: result.count };
        } catch (error: any) {
            console.error(error);
            set.status = 500;
            return { error: "Failed to delete students" };
        }
    }

    static async importStudents(ctx: any) {
        const { body, set, jwt, cookie: { session } } = ctx;
        let user = ctx.user;
        if (!user && session?.value) {
            try { user = await jwt.verify(session.value); } catch (e) { }
        }

        try {
            if (!body.students || !Array.isArray(body.students) || body.students.length === 0) {
                set.status = 400;
                return { error: "No students data provided" };
            }

            const result = await StudentService.bulkCreateStudents(body.students, user?.id);
            return result;
        } catch (error: any) {
            console.error(error);
            set.status = 500;
            return { error: "Failed to import students" };
        }
    }
}
