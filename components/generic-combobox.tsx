"use client";

import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox";
import * as React from "react";
import { IconLoader2, IconLock } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
    value: string;
    label: string;
    disabled?: boolean;
    disabledReason?: string;
}

interface GenericComboboxProps {
    value?: string;
    onValueChange: (value: string) => void;
    items: ComboboxOption[];
    placeholder?: string;
    className?: string;
    showClear?: boolean;
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
}

export function GenericCombobox({
    value,
    onValueChange,
    items,
    placeholder = "Select...",
    className,
    showClear = true,
    isLoading = false,
    leftIcon,
}: GenericComboboxProps) {
    const selectedOption = React.useMemo(() => {
        return items.find((o) => o.value === value && !o.disabled) || null;
    }, [items, value]);

    const handleValueChange = (newOption: ComboboxOption | null) => {
        // Don't allow selecting disabled items
        if (newOption?.disabled) return;
        onValueChange(newOption?.value ?? "");
    };

    return (
        <Combobox
            items={items}
            value={selectedOption}
            onValueChange={handleValueChange}
            itemToStringLabel={(option) => (option ? option.label : "")}
            filter={(item, query) => {
                const searchStr = item.label.toLowerCase();
                const searchInput = query.toLowerCase().trim();
                const searchParts = searchInput.split(/\s+/);

                return searchParts.every(part => searchStr.includes(part));
            }}
            autoHighlight={true}
        >
            <ComboboxInput
                placeholder={placeholder}
                className={className}
                showClear={showClear}
                leftIcon={leftIcon}
            />

            <ComboboxContent>
                {isLoading ? (
                    <div className="flex items-center justify-center p-4 text-sm text-zinc-500 gap-2">
                        <IconLoader2 className="size-4 animate-spin" />
                        <span>Loading...</span>
                    </div>
                ) : (
                    <>
                        <ComboboxEmpty>No items found</ComboboxEmpty>
                        <ComboboxList>
                            {(item) => (
                                <ComboboxItem
                                    key={item.value}
                                    value={item}
                                    className={cn(
                                        item.disabled && "opacity-50 cursor-not-allowed pointer-events-none"
                                    )}
                                >
                                    <div className="flex items-center justify-between w-full gap-2">
                                        <span className={cn(item.disabled && "text-zinc-400")}>
                                            {item.label}
                                        </span>
                                        {item.disabledReason && (
                                            <span className={cn(
                                                "text-[10px] flex items-center gap-1 shrink-0",
                                                item.disabled ? "text-zinc-400" : "text-blue-600 font-medium"
                                            )}>
                                                {item.disabled && <IconLock className="size-3" />}
                                                {item.disabledReason}
                                            </span>
                                        )}
                                    </div>
                                </ComboboxItem>
                            )}
                        </ComboboxList>
                    </>
                )}
            </ComboboxContent>
        </Combobox>
    );
}
