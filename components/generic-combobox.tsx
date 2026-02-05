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
import { IconLoader2 } from "@tabler/icons-react";

export interface ComboboxOption {
    value: string;
    label: string;
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
        return items.find((o) => o.value === value) || null;
    }, [items, value]);

    const handleValueChange = (newOption: ComboboxOption | null) => {
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
                const searchInput = query.toLowerCase();
                return searchStr.includes(searchInput);
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
                                <ComboboxItem key={item.value} value={item}>
                                    {item.label}
                                </ComboboxItem>
                            )}
                        </ComboboxList>
                    </>
                )}
            </ComboboxContent>
        </Combobox>
    );
}
