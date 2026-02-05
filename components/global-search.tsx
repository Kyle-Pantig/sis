"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
    IconLayoutDashboard,
    IconUsers,
    IconFolder,
    IconListDetails,
    IconChartBar,
    IconSettings,
    IconLoader2,
    IconDatabase,
    IconKey,
    IconLock,
} from "@tabler/icons-react"
import { Command as CommandPrimitive } from "cmdk"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { studentsApi } from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"
import { SearchIcon } from "lucide-react"

export function GlobalSearch() {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const [students, setStudents] = React.useState<any[]>([])
    const [isLoading, setIsLoading] = React.useState(false)
    const router = useRouter()
    const { user } = useAuth()
    const inputRef = React.useRef<HTMLInputElement>(null)

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        const openSearch = () => setOpen(true)

        document.addEventListener("keydown", down)
        window.addEventListener("open-global-search", openSearch)
        return () => {
            document.removeEventListener("keydown", down)
            window.removeEventListener("open-global-search", openSearch)
        }
    }, [])

    // Focus input when dialog opens
    React.useEffect(() => {
        if (open) {
            setQuery("")
            setStudents([])
            setTimeout(() => {
                inputRef.current?.focus()
            }, 0)
        }
    }, [open])

    React.useEffect(() => {
        if (!query.trim()) {
            setStudents([])
            return
        }

        const timer = setTimeout(async () => {
            setIsLoading(true)
            try {
                const data = await studentsApi.getAll(1, 10, query)
                setStudents(data.students || [])
            } catch (error) {
                console.error("Search error:", error)
            } finally {
                setIsLoading(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [query])

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false)
        command()
    }, [])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogHeader className="sr-only">
                <DialogTitle>Global Search</DialogTitle>
                <DialogDescription>Search for students, pages, and system settings</DialogDescription>
            </DialogHeader>
            <DialogContent
                className="overflow-hidden p-0 shadow-2xl sm:max-w-[520px] rounded-xl top-[20%] translate-y-0"
                showCloseButton={false}
            >
                <CommandPrimitive
                    className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-white"
                    shouldFilter={false}
                >
                    {/* Search Input */}
                    <div className="flex items-center border-b border-zinc-200 px-4">
                        <SearchIcon className="mr-3 h-4 w-4 shrink-0 text-zinc-400" />
                        <CommandPrimitive.Input
                            ref={inputRef}
                            value={query}
                            onValueChange={setQuery}
                            placeholder="Search students, pages, or settings..."
                            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-zinc-200 bg-zinc-100 px-1.5 font-mono text-[10px] font-medium text-zinc-500">
                            ESC
                        </kbd>
                    </div>

                    {/* Results List */}
                    <CommandPrimitive.List className="max-h-[400px] overflow-y-auto overflow-x-hidden p-2">
                        <CommandPrimitive.Empty className="py-8 text-center text-sm text-zinc-500">
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <IconLoader2 className="size-4 animate-spin" />
                                    <span>Searching...</span>
                                </div>
                            ) : query ? (
                                "No results found."
                            ) : (
                                "Type to search students or select a page below."
                            )}
                        </CommandPrimitive.Empty>

                        {/* Student Results */}
                        {students.length > 0 && (
                            <CommandPrimitive.Group heading="Students" className="px-1 py-2">
                                <p className="px-2 pb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                    Students
                                </p>
                                {students.map((student) => (
                                    <CommandPrimitive.Item
                                        key={student.id}
                                        value={`student-${student.id}`}
                                        onSelect={() => runCommand(() => router.push(`/dashboard/students/${student.id}`))}
                                        className="relative flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors data-[selected=true]:bg-zinc-100 hover:bg-zinc-50"
                                    >
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                            <IconUsers className="size-4" />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-medium text-zinc-900">{student.lastName}, {student.firstName}</span>
                                            <span className="text-xs text-zinc-500 font-mono">{student.studentNo}</span>
                                        </div>
                                    </CommandPrimitive.Item>
                                ))}
                            </CommandPrimitive.Group>
                        )}

                        {/* Pages Group */}
                        <CommandPrimitive.Group className="px-1 py-2">
                            <p className="px-2 pb-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                Pages
                            </p>
                            <CommandPrimitive.Item
                                value="dashboard"
                                onSelect={() => runCommand(() => router.push("/dashboard"))}
                                className="relative flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors data-[selected=true]:bg-zinc-100 hover:bg-zinc-50"
                            >
                                <IconLayoutDashboard className="size-4 text-zinc-500" />
                                <span>Dashboard</span>
                            </CommandPrimitive.Item>
                            <CommandPrimitive.Item
                                value="students"
                                onSelect={() => runCommand(() => router.push("/dashboard/students"))}
                                className="relative flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors data-[selected=true]:bg-zinc-100 hover:bg-zinc-50"
                            >
                                <IconUsers className="size-4 text-zinc-500" />
                                <span>Students List</span>
                            </CommandPrimitive.Item>
                            <CommandPrimitive.Item
                                value="courses"
                                onSelect={() => runCommand(() => router.push("/dashboard/courses"))}
                                className="relative flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors data-[selected=true]:bg-zinc-100 hover:bg-zinc-50"
                            >
                                <IconFolder className="size-4 text-zinc-500" />
                                <span>Courses Catalog</span>
                            </CommandPrimitive.Item>
                            <CommandPrimitive.Item
                                value="subjects"
                                onSelect={() => runCommand(() => router.push("/dashboard/subjects"))}
                                className="relative flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors data-[selected=true]:bg-zinc-100 hover:bg-zinc-50"
                            >
                                <IconListDetails className="size-4 text-zinc-500" />
                                <span>Subjects Inventory</span>
                            </CommandPrimitive.Item>
                            <CommandPrimitive.Item
                                value="grades"
                                onSelect={() => runCommand(() => router.push("/dashboard/grades"))}
                                className="relative flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors data-[selected=true]:bg-zinc-100 hover:bg-zinc-50"
                            >
                                <IconChartBar className="size-4 text-zinc-500" />
                                <span>Grading System</span>
                            </CommandPrimitive.Item>
                        </CommandPrimitive.Group>

                        {/* System Group */}
                        <CommandPrimitive.Group className="px-1 py-2 border-t border-zinc-100">
                            <p className="px-2 pb-2 pt-1 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                System
                            </p>
                            <CommandPrimitive.Item
                                value="settings"
                                onSelect={() => runCommand(() => router.push("/dashboard/settings"))}
                                className="relative flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors data-[selected=true]:bg-zinc-100 hover:bg-zinc-50"
                            >
                                <IconSettings className="size-4 text-zinc-500" />
                                <span>Application Settings</span>
                            </CommandPrimitive.Item>
                            <CommandPrimitive.Item
                                value="password"
                                onSelect={() => runCommand(() => router.push("/dashboard/settings?tab=security"))}
                                className="relative flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors data-[selected=true]:bg-zinc-100 hover:bg-zinc-50"
                            >
                                <IconLock className="size-4 text-zinc-500" />
                                <span>Change Password</span>
                            </CommandPrimitive.Item>
                            {user?.role === "admin" && (
                                <>
                                    <CommandPrimitive.Item
                                        value="encoders"
                                        onSelect={() => runCommand(() => router.push("/dashboard/settings?tab=encoders"))}
                                        className="relative flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors data-[selected=true]:bg-zinc-100 hover:bg-zinc-50"
                                    >
                                        <IconUsers className="size-4 text-zinc-500" />
                                        <span>Encoder Management</span>
                                    </CommandPrimitive.Item>
                                    <CommandPrimitive.Item
                                        value="credentials"
                                        onSelect={() => runCommand(() => router.push("/dashboard/settings?tab=students"))}
                                        className="relative flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors data-[selected=true]:bg-zinc-100 hover:bg-zinc-50"
                                    >
                                        <IconKey className="size-4 text-zinc-500" />
                                        <span>Student Credentials</span>
                                    </CommandPrimitive.Item>
                                    <CommandPrimitive.Item
                                        value="audit"
                                        onSelect={() => runCommand(() => router.push("/dashboard/settings?tab=audit"))}
                                        className="relative flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors data-[selected=true]:bg-zinc-100 hover:bg-zinc-50"
                                    >
                                        <IconDatabase className="size-4 text-zinc-500" />
                                        <span>System Audit Logs</span>
                                    </CommandPrimitive.Item>
                                </>
                            )}
                        </CommandPrimitive.Group>
                    </CommandPrimitive.List>
                </CommandPrimitive>
            </DialogContent>
        </Dialog>
    )
}
