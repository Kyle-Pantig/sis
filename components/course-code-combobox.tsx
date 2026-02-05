"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { IconPlus, IconChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

// Common Philippine course codes with full names
const COMMON_COURSES = [
    { code: "AB", name: "Bachelor of Arts" },
    { code: "ABComm", name: "Bachelor of Arts in Communication" },
    { code: "ABEcon", name: "Bachelor of Arts in Economics" },
    { code: "ABEnglish", name: "Bachelor of Arts in English" },
    { code: "ABPolSci", name: "Bachelor of Arts in Political Science" },
    { code: "ABPsych", name: "Bachelor of Arts in Psychology" },
    { code: "BSA", name: "Bachelor of Science in Accountancy" },
    { code: "BSAIS", name: "Bachelor of Science in Accounting Information System" },
    { code: "BSArch", name: "Bachelor of Science in Architecture" },
    { code: "BSBio", name: "Bachelor of Science in Biology" },
    { code: "BSBA", name: "Bachelor of Science in Business Administration" },
    { code: "BSCE", name: "Bachelor of Science in Civil Engineering" },
    { code: "BSChem", name: "Bachelor of Science in Chemistry" },
    { code: "BSCOE", name: "Bachelor of Science in Computer Engineering" },
    { code: "BSCPE", name: "Bachelor of Science in Computer Engineering" },
    { code: "BSCS", name: "Bachelor of Science in Computer Science" },
    { code: "BSCrim", name: "Bachelor of Science in Criminology" },
    { code: "BSECE", name: "Bachelor of Science in Electronics and Communications Engineering" },
    { code: "BSEE", name: "Bachelor of Science in Electrical Engineering" },
    { code: "BSED", name: "Bachelor of Secondary Education" },
    { code: "BEED", name: "Bachelor of Elementary Education" },
    { code: "BSFT", name: "Bachelor of Science in Food Technology" },
    { code: "BSHM", name: "Bachelor of Science in Hospitality Management" },
    { code: "BSHRM", name: "Bachelor of Science in Hotel and Restaurant Management" },
    { code: "BSIE", name: "Bachelor of Science in Industrial Engineering" },
    { code: "BSIS", name: "Bachelor of Science in Information Systems" },
    { code: "BSIT", name: "Bachelor of Science in Information Technology" },
    { code: "BSMA", name: "Bachelor of Science in Management Accounting" },
    { code: "BSMATH", name: "Bachelor of Science in Mathematics" },
    { code: "BSME", name: "Bachelor of Science in Mechanical Engineering" },
    { code: "BSMT", name: "Bachelor of Science in Medical Technology" },
    { code: "BSMidwifery", name: "Bachelor of Science in Midwifery" },
    { code: "BSN", name: "Bachelor of Science in Nursing" },
    { code: "BSNED", name: "Bachelor of Science in Nursing Education" },
    { code: "BSPharma", name: "Bachelor of Science in Pharmacy" },
    { code: "BSPhysics", name: "Bachelor of Science in Physics" },
    { code: "BSPT", name: "Bachelor of Science in Physical Therapy" },
    { code: "BSPsych", name: "Bachelor of Science in Psychology" },
    { code: "BSRT", name: "Bachelor of Science in Radiologic Technology" },
    { code: "BSSW", name: "Bachelor of Science in Social Work" },
    { code: "BSTourism", name: "Bachelor of Science in Tourism" },
    { code: "BSTM", name: "Bachelor of Science in Tourism Management" },
    { code: "MAED", name: "Master of Arts in Education" },
    { code: "MBA", name: "Master in Business Administration" },
    { code: "MPA", name: "Master in Public Administration" },
    { code: "DBA", name: "Doctor of Business Administration" },
    { code: "EdD", name: "Doctor of Education" },
    { code: "PhD", name: "Doctor of Philosophy" },
];

interface CourseCodeComboboxProps {
    value?: string;
    onValueChange: (code: string, name: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export function CourseCodeCombobox({
    value = "",
    onValueChange,
    placeholder = "Type or select course code...",
    className,
    disabled = false,
}: CourseCodeComboboxProps) {
    const [inputValue, setInputValue] = React.useState(value);
    const [isOpen, setIsOpen] = React.useState(false);
    const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Sync with external value
    React.useEffect(() => {
        setInputValue(value);
    }, [value]);

    // Filter suggestions based on input
    const suggestions = React.useMemo(() => {
        if (!inputValue.trim()) return COMMON_COURSES; // Show all when empty

        const search = inputValue.toLowerCase().trim();
        return COMMON_COURSES.filter(
            (c) => c.code.toLowerCase().includes(search) || c.name.toLowerCase().includes(search)
        ); // Show all matching results
    }, [inputValue]);

    // Check if current input is a known course
    const matchedCourse = React.useMemo(() => {
        return COMMON_COURSES.find(c => c.code.toUpperCase() === inputValue.toUpperCase().trim());
    }, [inputValue]);

    // Check if we should show "Add custom" option
    const showAddCustom = inputValue.trim() && !matchedCourse;

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value.toUpperCase();
        setInputValue(newValue);
        setIsOpen(true);
        setHighlightedIndex(-1);

        // Check if it matches a known course
        const matched = COMMON_COURSES.find(c => c.code.toUpperCase() === newValue.trim());
        if (matched) {
            onValueChange(matched.code, matched.name);
        } else {
            onValueChange(newValue, "");
        }
    };

    // Handle selecting a suggestion
    const handleSelect = (course: { code: string; name: string }) => {
        setInputValue(course.code);
        onValueChange(course.code, course.name);
        setIsOpen(false);
        inputRef.current?.blur();
    };

    // Handle selecting custom code
    const handleSelectCustom = () => {
        const code = inputValue.toUpperCase().trim();
        onValueChange(code, "");
        setIsOpen(false);
        inputRef.current?.blur();
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        const totalItems = suggestions.length + (showAddCustom ? 1 : 0);

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev + 1) % totalItems);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev - 1 + totalItems) % totalItems);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
                handleSelect(suggestions[highlightedIndex]);
            } else if (highlightedIndex === suggestions.length && showAddCustom) {
                handleSelectCustom();
            } else if (showAddCustom) {
                handleSelectCustom();
            }
        } else if (e.key === "Escape") {
            setIsOpen(false);
        }
    };

    // Close on outside click
    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} className="relative">
            <div className="relative">
                <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={cn("pr-8", className)}
                />
                <button
                    type="button"
                    onClick={() => {
                        setIsOpen(!isOpen);
                        inputRef.current?.focus();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    tabIndex={-1}
                >
                    <IconChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
                </button>
            </div>

            {isOpen && (suggestions.length > 0 || showAddCustom) && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-zinc-200 bg-white shadow-lg max-h-60 overflow-auto">
                    {/* Add Custom Option */}
                    {showAddCustom && (
                        <button
                            type="button"
                            onClick={handleSelectCustom}
                            className={cn(
                                "cursor-pointer w-full px-3 py-2 text-left flex items-center gap-2 text-primary hover:bg-primary/10 border-b border-zinc-100",
                                highlightedIndex === suggestions.length && "bg-primary/10"
                            )}
                        >
                            <IconPlus className="size-4" />
                            <span className="font-medium">Add "{inputValue}" as custom code</span>
                        </button>
                    )}

                    {/* Suggestions */}
                    {suggestions.map((course, index) => (
                        <button
                            key={course.code}
                            type="button"
                            onClick={() => handleSelect(course)}
                            className={cn(
                                "cursor-pointer w-full px-3 py-2 text-left hover:bg-zinc-50",
                                highlightedIndex === index && "bg-zinc-100"
                            )}
                        >
                            <div className="font-semibold text-sm text-zinc-900">{course.code}</div>
                            <div className="text-xs text-zinc-500">{course.name}</div>
                        </button>
                    ))}

                    {suggestions.length === 0 && !showAddCustom && (
                        <div className="px-3 py-4 text-center text-sm text-zinc-500">
                            Type a course code to search
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Export the common courses for use elsewhere
export { COMMON_COURSES };
