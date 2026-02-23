import React, { useCallback, useState } from 'react';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface FileUploaderProps {
    onFilesSelected: (files: File[]) => void;
    disabled?: boolean;
}

export function FileUploader({ onFilesSelected, disabled }: FileUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
    }, [disabled]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFilesSelected(Array.from(e.dataTransfer.files));
        }
    }, [onFilesSelected, disabled]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(Array.from(e.target.files));
        }
    }, [onFilesSelected]);

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
                "relative group cursor-pointer transition-all duration-300 ease-in-out",
                "border-2 border-dashed rounded-xl p-10 text-center",
                isDragging
                    ? "border-blue-500 bg-blue-50/50 scale-[1.01] shadow-lg"
                    : "border-slate-200 hover:border-blue-400 hover:bg-slate-50",
                disabled && "opacity-50 cursor-not-allowed pointer-events-none"
            )}
        >
            <input
                type="file"
                multiple
                accept=".xml"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                onChange={handleFileInput}
                disabled={disabled}
            />

            <div className="flex flex-col items-center justify-center space-y-4">
                <div className={cn(
                    "p-4 rounded-full transition-colors duration-300",
                    isDragging ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500"
                )}>
                    <UploadCloud size={40} strokeWidth={1.5} />
                </div>

                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-slate-700 font-display">
                        {isDragging ? "Drop files here" : "Click or drag files to upload"}
                    </h3>
                    <p className="text-sm text-slate-500">
                        Supports XML files (Tahsilat, Fatura, Iade)
                    </p>
                </div>
            </div>
        </div>
    );
}
