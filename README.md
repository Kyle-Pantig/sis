# Mini School Information System (SIS)

A modern, full-stack School Information System built with a focus on administrative efficiency and data integrity.

## ✨ Features

- **Authentication**: Secure JWT-based auth with Role-Based Access Control (Admin vs Encoder).
- **Student Management**: Full CRUD operations for student records.
- **Academic Setup**: Manage Courses and Subjects with complex relational constraints.
- **Digital Grading Sheet**: Real-time grade encoding with weighted auto-computations (30/30/40).
- **Subject Registration**: Course-specific subject enrollment system.
- **Audit Logs**: Real-time tracking of all administrative modifications.
- **Modern UI**: Built with Next.js, Radix UI, and Tailwind CSS featuring detailed Bento-grid dashboards and responsive tables.

---

## 🚀 Getting Started

### 1. Prerequisite
- [Node.js](https://nodejs.org/) (v18+)
- [Bun](https://bun.sh/) (Recommended for Backend)
- [PostgreSQL](https://www.postgresql.org/) database

### 2. Environment Setup

Create a `.env` file in the **backend/app** directory and a `.env.local` in the **root** directory.

**Backend (.env)**:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/sis_db?schema=public"
JWT_SECRET="your_secure_random_string"
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
RESEND_API_KEY="re_..."
RESEND_EMAIL="your-verified-email@example.com"
```

**Frontend (root .env.local)**:
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### 3. Installation & Database Setup

```bash
# Install root/frontend dependencies
pnpm install

# Setup backend
cd backend/app
pnpm install

# Run database migrations
pnpm dlx prisma migrate dev --name init

# Seed the database (Creates 50 students, courses, subjects, and admin)
pnpm dlx prisma db seed
```

### 4. Running the Application

**Start Backend (from backend/app)**:
```bash
pnpm start # or pnpm dev
```

**Start Frontend (from root)**:
```bash
pnpm dev
```

---

## 🔑 Admin Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@sis.com` | `admin1234` |
| **Encoder** | `encoder@sis.com` | `encoder123` |

---

## 📜 Key Assumptions & Validation Rules

- **Grade Computation**: Final grades are automatically calculated using: `(Prelim * 0.3) + (Midterm * 0.3) + (Finals * 0.4)`.
- **Course Strictness**: Students can ONLY reserve subjects that belong to their currently enrolled course.
- **Grade Uniqueness**: The system prevents duplicate grade entries for the same Student-Subject-Course combination using a DB composite key.
- **Data Integrity**: Deleting a course will fail if students are currently enrolled, unless "Force Delete" is used.
- **Audit Logging**: Every single grade change (Create/Update/Delete) is logged with a timestamp and the user ID of the encoder.

---

## 🛠 Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS, TanStack Query, Framer Motion, Recharts.
- **Backend**: Elysia JS (Bun-native), Prisma ORM.
- **Database**: PostgreSQL.
- **Validation**: Zod (Frontend & Backend).

---

## 📡 API Endpoints

All endpoints are prefixed with `/api`.

### 🔐 Authentication
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/login` | Login and receive session cookie |
| `GET` | `/auth/me` | Get current authenticated user session |
| `POST` | `/auth/logout` | Clear session and logout |
| `GET` | `/auth/verify-invite/:token` | Validate encoder invitation token |
| `POST` | `/auth/complete-invite` | Set password and finish encoder setup |
| `POST` | `/auth/change-password` | Update current user password |

### 👨‍🎓 Students
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/students` | List students (paginated, searchable) |
| `GET` | `/students/count` | Get total student count |
| `GET` | `/students/:id` | Get detailed student profile |
| `POST` | `/students` | Register a new student |
| `PATCH` | `/students/:id` | Update student information |
| `DELETE` | `/students/:id` | Remove student record |
| `POST` | `/students/import` | Bulk import students via JSON/CSV |
| `DELETE` | `/students/bulk` | Remove multiple student records |

### 📚 Courses
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/courses` | List all available courses (paginated) |
| `GET` | `/courses/check-code` | Check if course code already exists |
| `GET` | `/courses/:id` | Get specific course details |
| `POST` | `/courses` | Create a new academic program |
| `PATCH` | `/courses/:id` | Update course name/code |
| `DELETE` | `/courses/:id` | Delete course (contains dependency checks) |
| `DELETE` | `/courses/bulk` | Bulk delete multiple courses |

### 📖 Subjects
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/subjects` | List all subjects across courses (paginated) |
| `GET` | `/subjects/check-availability` | Check if subject code/title exists in course |
| `GET` | `/subjects/course/:courseId` | Filter subjects by program |
| `GET` | `/subjects/:id` | Get specific subject details |
| `POST` | `/subjects` | Add a subject to a course |
| `PATCH` | `/subjects/:id` | Update subject code/title/units |
| `DELETE` | `/subjects/:id` | Remove a subject |
| `DELETE` | `/subjects/bulk` | Bulk delete multiple subjects |

### ✍️ Grading Sheet
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/grades` | List all grade records with filters |
| `GET` | `/grades/student/:studentId` | Get academic transcript for a student |
| `GET` | `/grades/subject/:subjectId` | Get all grades for a specific subject |
| `GET` | `/grades/:id` | Get specific grade record |
| `POST` | `/grades` | Create a new grade entry |
| `PUT` | `/grades/upsert` | Create or update grade (Admin/Encoder) |
| `PATCH` | `/grades/:id` | Update specific scores (prelim/midterm/final) |
| `PATCH` | `/grades/bulk` | Bulk update multiple grade records |
| `DELETE` | `/grades/:id` | Remove a grade record |

### 📝 Reservations
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/reservations/student/:studentId` | List student's enrolled subjects |
| `GET` | `/reservations/available/:studentId` | Get available subjects for enrollment |
| `POST` | `/reservations` | Enroll student in a subject |
| `POST` | `/reservations/bulk` | Bulk enroll student in multiple subjects |
| `PATCH` | `/reservations/:id/cancel` | Cancel a reservation |
| `DELETE` | `/reservations/:id` | Remove subject enrollment |
| `DELETE` | `/reservations/bulk` | Bulk remove multiple enrollments |

### 📊 Dashboard & Stats
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/stats` | Get dashboard summary metrics |
| `GET` | `/stats/courses` | Get enrollment distribution data |

### 🔍 Audit Logs
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/audit` | Access global system activity logs (paginated) |
| `GET` | `/audit/filters` | Get available filter options (actions, entities) |
| `DELETE` | `/audit/:id` | Delete a single audit log entry |
| `DELETE` | `/audit/bulk` | Bulk delete multiple audit log entries |

### 👥 User Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/users/encoders` | List all encoder accounts |
| `POST` | `/users/encoders` | Invite a new encoder/staff member |
| `GET` | `/users/invitations` | List pending encoder invitations |
| `DELETE` | `/users/invitations/:id` | Revoke a pending invitation |
| `POST` | `/users/invitations/:id/resend` | Resend invitation email |
| `PATCH` | `/users/:id/status` | Toggle user active/inactive status |
| `DELETE` | `/users/:id` | Delete an encoder account |
