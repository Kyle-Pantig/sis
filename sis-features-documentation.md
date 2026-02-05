Mini School Information System (SIS)
Goal
Build a mini School Information System with authentication and a simple backend dashboard to manage students, courses, subjects, enrollments/reservations, and grading.
This exam evaluates your ability to design a relational schema, implement CRUD + auth, build a usable admin dashboard, and connect data correctly.
Tech Stack (Required)
Database: PostgreSQL
Frontend: Next.js (React)
Backend: Elysia JS (bun)
Auth: required (session or JWT is fine)
Core Features (Required)
1) [x] Authentication
   - [x] Users must be able to login/logout
   - [x] Protect dashboard routes (only authenticated users can access)
   - [x] Minimum: one seeded admin user OR a registration flow
2) [x] Student Registration / Enrollment
   - [x] Seed the system with 50 dummy students
   - [x] Support creating/editing students (CRUD) — Full CRUD implemented with Zod validation
   - [x] Students can be enrolled into a course (directly on student record via courseId)
3) [x] Student Profile
   - [x] View a student profile page showing:
   - [x] Basic student info
   - [x] Course enrolled in
   - [x] Reserved subjects
   - [x] Grades (from grading sheet)
4) [x] Course Listing
   - [x] CRUD for courses (Create, Read, Update, Delete)
   - [x] Course management page at /dashboard/courses
5) [x] Subject Reservation
   - [x] Subjects belong to a course
   - [x] Students can "reserve" subjects (many-to-many)
   - [x] Validation: Prevents reserving subjects outside student's course


6) [x] Digital Grading Sheet
Must allow entering/updating grades per student per subject
Grading sheet record must be connected to:
student
subject
course
Must prevent duplicates (e.g., one grade record per student + subject (+ course)) — Implemented via DB composite unique constraint and `upsert` logic.
[x] Backend Dashboard Pages (Required)
Create a dashboard UI with these pages:
[x] Students
[x] CRUD (Create, Read, Update, Delete)
[x] View student profile
[x] Courses
[x] CRUD — Implemented at `/dashboard/courses` with pagination and search.
[x] Subjects
[x] CRUD — Implemented at `/dashboard/subjects` with pagination and course filtering.
[x] Reservations UI — Integrated into Student Profile.
[x] Reserve/unreserve subjects — Implemented with real-time toggle and course-specific subject filtering.
[x] Grading Sheet
[x] Enter/edit grades — Implemented with both modal and inline editing.
[x] Filter by course / subject — Integrated with searchable comboboxes.
Data Table Requirements (Required)
All listing tables (Students/Courses/Subjects/Grades) behave like modern data tables:
- [x] Search (Global search per table)
- [x] Filtering (Multi-category filters with icons)
- [x] Inline editing (Scores in Grading Sheet)
- [x] Quick actions (View, Edit, Delete)
- [x] Bulk actions (Bulk delete implemented)


You may use any datatable library or custom implementation.
Relational Database Schema (Required)
ER Diagram (Mermaid)
erDiagram
 USERS {
   uuid id PK
   text email "unique"
   text password_hash
   text role
   timestamptz created_at
   timestamptz updated_at
 }

 COURSES {
   uuid id PK
   text code "unique"
   text name
   text description
   timestamptz created_at
   timestamptz updated_at
 }

 STUDENTS {
   uuid id PK
   text student_no "unique"
   text first_name
   text last_name
   text email "unique (optional)"
   date birth_date
   uuid course_id FK
   timestamptz created_at
   timestamptz updated_at
 }

 SUBJECTS {
   uuid id PK
   uuid course_id FK
   text code
   text title
   int units
   timestamptz created_at
   timestamptz updated_at
 }

 SUBJECT_RESERVATIONS {
   uuid id PK
   uuid student_id FK
   uuid subject_id FK
   timestamptz reserved_at
   text status "reserved|cancelled"
 }

 GRADES {
   uuid id PK
   uuid student_id FK
   uuid subject_id FK
   uuid course_id FK
   numeric prelim
   numeric midterm
   numeric finals
   numeric final_grade
   text remarks
   uuid encoded_by_user_id FK
   timestamptz created_at
   timestamptz updated_at
 }

 COURSES ||--o{ STUDENTS : "has"
 COURSES ||--o{ SUBJECTS : "has"
 STUDENTS ||--o{ SUBJECT_RESERVATIONS : "reserves"
 SUBJECTS ||--o{ SUBJECT_RESERVATIONS : "is_reserved"
 STUDENTS ||--o{ GRADES : "has"
 SUBJECTS ||--o{ GRADES : "graded_for"
 COURSES ||--o{ GRADES : "course_context"
 USERS ||--o{ GRADES : "encoded_by"
Required Constraints
students.student_no unique
courses.code unique
subjects should be unique by (course_id, code) OR (course_id, title)
subject_reservations unique by (student_id, subject_id)
grades unique by (student_id, subject_id, course_id)
students.course_id must exist in courses.id
subjects.course_id must exist in courses.id
grades.course_id should match the student’s course (enforce in code or DB constraint + validation)



Minimum Pages / Routes (Suggested)
You can implement REST or GraphQL. Minimum expected endpoints:
Auth
POST /auth/login
POST /auth/logout
GET /auth/me
Students
GET /students (search/filter/pagination)
POST /students
GET /students/:id
PATCH /students/:id
DELETE /students/:id
Courses
GET /courses, POST /courses, PATCH /courses/:id, DELETE /courses/:id
Subjects
GET /subjects, POST /subjects, PATCH /subjects/:id, DELETE /subjects/:id
Reservations
POST /students/:id/reservations (reserve subject)
DELETE /students/:id/reservations/:reservationId (or subjectId)
Grades
GET /grades?courseId=&subjectId=&studentId=
POST /grades (upsert allowed)
PATCH /grades/:id


Seed Data (Required)
1 admin user (document credentials)
3–5 courses
8–15 subjects distributed across courses
50 students (assigned to courses)
Optional: seed some reservations + grade records
Deliverables (Required)
Public Git repo (or zip)
README.md including:
Setup instructions
Env vars
Seed instructions
Admin credentials
Key assumptions / validation rules
Migration files + seed scripts
Basic screenshots or short screen recording (optional but helpful)


Bonus (Optional)
- ✅ Role-based access (admin vs encoder)
- ✅ Audit logs (who edited grades)
- ✅ Import students via CSV (with template download)
- Deploy link (Vercel + Railway/Fly.io/etc.)

