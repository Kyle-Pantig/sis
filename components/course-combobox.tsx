"use client";

import { useQuery } from "@tanstack/react-query";
import { coursesApi } from "@/lib/api";
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
    ComboboxChip,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxValue,
    ComboboxClear,
    useComboboxAnchor,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

interface Course {
    id: string;
    code: string;
    name: string;
}

interface CourseOption {
    value: string;
    label: string;
    code: string;
}

type SingleSelectProps = {
    multiple?: false;
    value: string;
    onValueChange: (value: string) => void;
};

type MultiSelectProps = {
    multiple: true;
    value: string[];
    onValueChange: (value: string[]) => void;
};

type CourseComboboxProps = (SingleSelectProps | MultiSelectProps) & {
    placeholder?: string;
    includeAll?: boolean;
    className?: string;
    modal?: boolean;
    showClear?: boolean;
    leftIcon?: React.ReactNode;
};

export function CourseCombobox({
    value,
    onValueChange,
    placeholder = "Select course...",
    includeAll = false,
    className,
    modal = false,
    multiple = false,
    showClear = false,
    leftIcon,
}: CourseComboboxProps) {
    const anchor = useComboboxAnchor();
    const { data: coursesData } = useQuery<{ courses: Course[] }>({
        queryKey: ["courses-list"],
        queryFn: () => coursesApi.getAll(1, 100),
    });

    const courses = coursesData?.courses || [];

    const options: CourseOption[] = React.useMemo(() => {
        const items = courses.map((c) => ({
            value: c.id,
            label: `${c.code} - ${c.name}`,
            code: c.code,
        }));

        if (includeAll) {
            return [{ value: "all", label: "All Courses", code: "All" }, ...items];
        }
        return items;
    }, [courses, includeAll]);

    const selectedOption = React.useMemo(() => {
        if (multiple) {
            const valArray = value as string[];
            return options.filter((o) => valArray.includes(o.value));
        }
        return options.find((o) => o.value === value) || null;
    }, [options, value, multiple]);

    const handleValueChange = (newOption: CourseOption | CourseOption[] | null) => {
        if (multiple) {
            const newOptions = (newOption as CourseOption[]) || [];
            (onValueChange as (val: string[]) => void)(newOptions.map((o) => o.value));
        } else {
            const newValue = (newOption as CourseOption | null)?.value ?? (includeAll ? "all" : "");
            (onValueChange as (val: string) => void)(newValue);
        }
    };

    return (
        <Combobox
            items={options}
            value={selectedOption}
            onValueChange={handleValueChange}
            multiple={multiple}
            itemToStringLabel={(option) => (option as CourseOption)?.label ?? ""}
            filter={(item: CourseOption, query: string) => {
                const searchStr = item.label.toLowerCase();
                const searchInput = query.toLowerCase();
                return searchStr.includes(searchInput);
            }}
            autoHighlight={true}
        >
            {multiple ? (
                <ComboboxChips ref={anchor} className={cn("pl-3", className)}>
                    {leftIcon && (
                        <div className="text-muted-foreground mr-1.5 flex items-center shrink-0">
                            {leftIcon}
                        </div>
                    )}
                    <ComboboxValue>
                        {(values: CourseOption[]) => (
                            <React.Fragment>
                                {values.map((item) => (
                                    <ComboboxChip key={item.value}>
                                        {item.code}
                                    </ComboboxChip>
                                ))}
                                <ComboboxChipsInput placeholder={values.length === 0 ? placeholder : undefined} />
                                {showClear && values.length > 0 && <ComboboxClear />}
                            </React.Fragment>
                        )}
                    </ComboboxValue>
                    <div className="flex items-center shrink-0 ml-auto pr-2">
                        <ChevronDownIcon className="size-4 text-zinc-400" />
                    </div>
                </ComboboxChips>
            ) : (
                <ComboboxInput
                    placeholder={placeholder}
                    className={className}
                    showClear={showClear}
                    leftIcon={leftIcon}
                    showTrigger={true}
                />
            )}

            <ComboboxContent anchor={multiple ? anchor : undefined}>
                <ComboboxEmpty>No courses found</ComboboxEmpty>
                <ComboboxList>
                    {(item) => {
                        const option = item as CourseOption;
                        return (
                            <ComboboxItem key={option.value} value={option}>
                                {option.label}
                            </ComboboxItem>
                        );
                    }}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}
