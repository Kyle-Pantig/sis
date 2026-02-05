"use client";

import * as React from "react";
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from "@tanstack/react-table";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { IconChevronUp, IconChevronDown, IconSelector } from "@tabler/icons-react";

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    onRowClick?: (row: TData) => void;
    className?: string;
    sorting?: SortingState;
    onSortingChange?: React.Dispatch<React.SetStateAction<SortingState>>;
    noResultsText?: string;
}

export function GenericDataTable<TData, TValue>({
    columns,
    data,
    onRowClick,
    className,
    sorting: externalSorting,
    onSortingChange: externalOnSortingChange,
    noResultsText = "No results.",
}: DataTableProps<TData, TValue>) {
    const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);

    const sorting = externalSorting ?? internalSorting;
    const onSortingChange = externalOnSortingChange ?? setInternalSorting;

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        onSortingChange,
        getSortedRowModel: getSortedRowModel(),
        state: {
            sorting,
        },
    });

    return (
        <div className={cn("rounded-md border bg-white", className)}>
            <Table>
                <TableHeader className="bg-zinc-50/50">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                return (
                                    <TableHead
                                        key={header.id}
                                        className={cn(
                                            "px-4 py-4 font-bold text-xs uppercase tracking-widest text-zinc-500",
                                            header.column.getCanSort() && "cursor-pointer select-none hover:bg-zinc-100/50 transition-colors"
                                        )}
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        <div className={cn("flex items-center gap-2", (header.column.columnDef.meta as any)?.headerClassName)}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                            {header.column.getCanSort() && (
                                                <div className="flex flex-col">
                                                    {header.column.getIsSorted() === "asc" ? (
                                                        <IconChevronUp className="size-3 text-emerald-600" />
                                                    ) : header.column.getIsSorted() === "desc" ? (
                                                        <IconChevronDown className="size-3 text-emerald-600" />
                                                    ) : (
                                                        <IconSelector className="size-3 text-zinc-400" />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </TableHead>
                                );
                            })}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                data-state={row.getIsSelected() && "selected"}
                                className={cn(
                                    "hover:bg-zinc-50/80 transition-colors",
                                    onRowClick && "cursor-pointer"
                                )}
                                onClick={() => onRowClick?.(row.original)}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell
                                        key={cell.id}
                                        className={cn(
                                            "px-4 py-3",
                                            (cell.column.columnDef.meta as any)?.cellClassName
                                        )}
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center text-zinc-500 font-medium">
                                {noResultsText}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
