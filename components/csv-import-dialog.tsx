"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { IconUpload, IconDownload, IconLoader2, IconCheck, IconX, IconFileSpreadsheet } from "@tabler/icons-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CSVImportDialogProps {
    onImport: (data: any[]) => Promise<{ success: number; failed: number; errors?: { row: number; studentNo: string; error: string }[] }>;
    templateColumns: { key: string; label: string; required?: boolean }[];
    templateFilename?: string;
    trigger?: React.ReactNode;
    title?: string;
    description?: string;
    onSuccess?: () => void;
}

export function CSVImportDialog({
    onImport,
    templateColumns,
    templateFilename = "import_template.csv",
    trigger,
    title = "Import from CSV",
    description = "Upload a CSV file to import data. Download the template for the correct format.",
    onSuccess,
}: CSVImportDialogProps) {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ success: number; failed: number; errors?: any[] } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const downloadTemplate = () => {
        const headers = templateColumns.map(col => col.label).join(",");
        const exampleRow = templateColumns.map(col => {
            if (col.key === "studentNo") return ""; // Leave blank - it's auto-generated
            if (col.key === "firstName") return "Juan";
            if (col.key === "lastName") return "Dela Cruz";
            if (col.key === "email") return "juan@email.com";
            if (col.key === "birthDate") return "2000-01-15";
            if (col.key === "course") return "BSCPE";
            return "";
        }).join(",");

        const csvContent = `${headers}\n${exampleRow}`;
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = templateFilename;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const parseCSV = (text: string): any[] => {
        const lines = text.split("\n").filter(line => line.trim());
        if (lines.length < 2) return [];

        const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
        const data: any[] = [];

        // Helper function to find header index with flexible matching
        const findHeaderIndex = (col: { key: string; label: string }) => {
            const key = col.key.toLowerCase();
            const label = col.label.toLowerCase();

            // Define common variations for each column
            const variations: Record<string, string[]> = {
                studentno: ["student no", "studentno", "student number", "student_no", "student_number", "id", "student id"],
                firstname: ["first name", "firstname", "first_name", "given name", "fname"],
                lastname: ["last name", "lastname", "last_name", "surname", "family name", "lname"],
                email: ["email", "e-mail", "email address", "e-mail address"],
                birthdate: ["birth date", "birthdate", "birth_date", "birthday", "date of birth", "dob"],
                course: ["course", "course code", "program", "course name", "department"],
            };

            // Check exact matches first
            let idx = headers.findIndex(h => h === label || h === key);
            if (idx !== -1) return idx;

            // Check variations
            const keyVariations = variations[key] || [];
            for (const variation of keyVariations) {
                idx = headers.findIndex(h => h === variation || h.includes(variation) || variation.includes(h));
                if (idx !== -1) return idx;
            }

            // Check if header contains or is contained by the key/label
            idx = headers.findIndex(h => h.includes(key) || key.includes(h) || h.includes(label.split(" ")[0]));

            return idx;
        };

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(",").map(v => v.trim());
            const row: any = {};

            templateColumns.forEach((col) => {
                const headerIdx = findHeaderIndex(col);
                if (headerIdx !== -1 && values[headerIdx] !== undefined) {
                    row[col.key] = values[headerIdx] || null;
                }
            });

            // Only add row if it has required fields
            const hasRequiredFields = templateColumns
                .filter(col => col.required)
                .every(col => row[col.key]);

            if (hasRequiredFields || Object.keys(row).length > 0) {
                data.push(row);
            }
        }

        return data;
    };

    const processFile = (selectedFile: File) => {
        if (!selectedFile.name.endsWith(".csv")) {
            toast.error("Please upload a CSV file");
            return;
        }

        setFile(selectedFile);
        setImportResult(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const data = parseCSV(text);
            setParsedData(data);

            if (data.length === 0) {
                toast.error("No valid data found in CSV file");
            } else {
                toast.success(`Found ${data.length} records to import`);
            }
        };
        reader.readAsText(selectedFile);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) processFile(selectedFile);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) processFile(droppedFile);
    };

    const handleImport = async () => {
        if (parsedData.length === 0) {
            toast.error("No data to import");
            return;
        }

        setIsImporting(true);
        try {
            const result = await onImport(parsedData);
            setImportResult(result);

            if (result.success > 0 && result.failed === 0) {
                toast.success(`Successfully imported ${result.success} records`);
            } else if (result.success > 0 && result.failed > 0) {
                toast.info(`Imported ${result.success} records, ${result.failed} skipped`);
            } else if (result.failed > 0) {
                toast.info(`${result.failed} records were skipped`);
            }

            // Refresh the table whenever any records are imported
            if (result.success > 0 && onSuccess) {
                onSuccess();
            }

            // Only auto-close dialog when all records succeed
            if (result.failed === 0 && result.success > 0) {
                setTimeout(() => {
                    setOpen(false);
                    resetState();
                }, 1500);
            }
        } catch (error: any) {
            console.error("Import error:", error);
            setImportResult({
                success: 0,
                failed: parsedData.length,
                errors: [{ row: 0, studentNo: "", error: error.message || "An unexpected error occurred during import" }]
            });
        } finally {
            setIsImporting(false);
        }
    };

    const resetState = () => {
        setFile(null);
        setParsedData([]);
        setImportResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetState(); }}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="gap-2">
                        <IconUpload className="size-4" />
                        Import CSV
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <IconFileSpreadsheet className="size-5" />
                        {title}
                    </DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Download Template */}
                    <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg border border-zinc-100">
                        <div>
                            <p className="text-sm font-medium text-zinc-900">Download Template</p>
                            <p className="text-xs text-zinc-500">Get the correct CSV format</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                            <IconDownload className="size-4" />
                            Template
                        </Button>
                    </div>

                    {/* File Upload */}
                    <div className="space-y-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="hidden"
                            id="csv-upload"
                        />
                        <label
                            htmlFor="csv-upload"
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200",
                                isDragging
                                    ? "border-primary bg-primary/5 scale-[1.01] shadow-md"
                                    : file
                                        ? "border-emerald-300 bg-emerald-50/50"
                                        : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
                            )}
                        >
                            {file ? (
                                <div className="text-center animate-in fade-in zoom-in duration-300">
                                    <div className="size-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                                        <IconCheck className="size-6 text-emerald-600" />
                                    </div>
                                    <p className="text-sm font-semibold text-zinc-900">{file.name}</p>
                                    <p className="text-xs text-emerald-600 font-medium mt-1">{parsedData.length} records ready to import</p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className={cn(
                                        "size-12 rounded-full flex items-center justify-center mx-auto mb-3 transition-colors",
                                        isDragging ? "bg-primary/10 text-primary" : "bg-zinc-100 text-zinc-400"
                                    )}>
                                        <IconUpload className="size-6" />
                                    </div>
                                    <p className="text-sm font-medium text-zinc-900">
                                        {isDragging ? "Drop your file here" : "Click to upload or drag and drop"}
                                    </p>
                                    <p className="text-xs text-zinc-500 mt-1">Supports CSV files only</p>
                                </div>
                            )}
                        </label>
                    </div>

                    {/* Import Result Summary */}
                    {importResult && (
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between px-1">
                                <h4 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Import Summary</h4>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
                                        <div className="size-1.5 rounded-full bg-emerald-500" />
                                        {importResult.success} Success
                                    </div>
                                    {importResult.failed > 0 && (
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
                                            <div className="size-1.5 rounded-full bg-zinc-300" />
                                            {importResult.failed} Skipped
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-xl border border-zinc-100 bg-white overflow-hidden">
                                <div className="max-h-[180px] overflow-y-auto divide-y divide-zinc-50 custom-scrollbar">
                                    {/* Success Items (Subtle) */}
                                    {importResult.success > 0 && (
                                        <div className="px-4 py-2.5 bg-zinc-50/30 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="size-5 rounded-full bg-emerald-50 flex items-center justify-center">
                                                    <IconCheck className="size-3 text-emerald-600" />
                                                </div>
                                                <span className="text-xs font-medium text-zinc-600">{importResult.success} records processed successfully</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Skipped Items (Minimal Error Display) */}
                                    {importResult.errors && importResult.errors.map((err, idx) => (
                                        <div key={idx} className="px-4 py-3 flex items-start gap-3 hover:bg-zinc-50/50 transition-colors">
                                            <div className="size-5 rounded-full bg-zinc-100 flex items-center justify-center shrink-0 mt-0.5">
                                                <IconX className="size-3 text-zinc-500" />
                                            </div>
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Row {err.row}</span>
                                                    <span className="text-[10px] font-mono font-bold text-zinc-900 px-1.5 py-0.5 bg-zinc-100 rounded uppercase">
                                                        {err.studentNo || "GENERATED"}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                                                    {err.error.replace("Student number already exists", "Record already exists in the system")}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => { setOpen(false); resetState(); }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={parsedData.length === 0 || isImporting}
                        className="gap-2"
                    >
                        {isImporting ? (
                            <>
                                <IconLoader2 className="size-4 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <IconUpload className="size-4" />
                                Import {parsedData.length > 0 ? `(${parsedData.length})` : ""}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
