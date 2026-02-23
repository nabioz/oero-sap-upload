import React, { useState } from 'react';
import { FileUploader } from './FileUploader';
import { UploadedFile } from '../types';
import { FileText, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { processXmlFile } from '../lib/api';

export function UploadDashboard({ token }: { token: string }) {
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFilesSelected = (newFiles: File[]) => {
        const newUploadedFiles: UploadedFile[] = newFiles.map(file => ({
            id: Math.random().toString(36).substring(7),
            file,
            status: 'idle'
        }));
        setFiles(prev => [...prev, ...newUploadedFiles]);
    };

    const handleProcess = async () => {
        setIsProcessing(true);

        // Process files one by one for better UX feedback
        for (const fileItem of files) {
            if (fileItem.status === 'success') continue;

            // Update to parsing
            setFiles(prev => prev.map(f =>
                f.id === fileItem.id ? { ...f, status: 'parsing' } : f
            ));

            const formData = new FormData();
            formData.append('file', fileItem.file);

            // Update to sending
            setFiles(prev => prev.map(f =>
                f.id === fileItem.id ? { ...f, status: 'sending' } : f
            ));

            try {
                const result = await processXmlFile(formData, token);

                setFiles(prev => prev.map(f =>
                    f.id === fileItem.id ? {
                        ...f,
                        status: result.success ? 'success' : 'error',
                        message: result.message,
                        result: result.data
                    } : f
                ));
            } catch (e: any) {
                if (e.message === 'AUTH_EXPIRED') {
                    window.location.reload();
                    return;
                }
                setFiles(prev => prev.map(f =>
                    f.id === fileItem.id ? {
                        ...f,
                        status: 'error',
                        message: e.message || "Unexpected client error"
                    } : f
                ));
            }
        }
        setIsProcessing(false);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 p-6">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold tracking-tight premium-gradient-text">
                    SAP Integration Hub
                </h1>
                <p className="text-lg text-slate-600">
                    Upload and process transaction documents securely
                </p>
            </div>

            <div className="glass-panel p-6">
                <FileUploader onFilesSelected={handleFilesSelected} disabled={isProcessing} />
            </div>

            <AnimatePresence>
                {files.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-slate-800">Queue ({files.length})</h2>
                            <button
                                onClick={handleProcess}
                                disabled={isProcessing}
                                className="premium-button flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" /> Processing...
                                    </>
                                ) : (
                                    <>
                                        Process All <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="grid gap-3">
                            {files.map((file) => (
                                <motion.div
                                    key={file.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="group relative bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "p-2.5 rounded-lg transition-colors",
                                            file.status === 'success' ? "bg-green-50 text-green-600" :
                                                file.status === 'error' ? "bg-red-50 text-red-600" :
                                                    "bg-indigo-50 text-indigo-600"
                                        )}>
                                            {file.status === 'success' ? <CheckCircle2 size={24} /> :
                                                file.status === 'error' ? <AlertCircle size={24} /> :
                                                    <FileText size={24} />}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-medium text-slate-800 truncate">{file.file.name}</h4>
                                                <span className="text-xs font-mono text-slate-400">{(file.file.size / 1024).toFixed(1)} KB</span>
                                            </div>
                                            <p className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
                                                <StatusIndicator status={file.status} />
                                                <span className="capitalize">{file.status}</span>
                                            </p>
                                        </div>

                                        {file.status === 'error' && (
                                            <div className="text-red-500 text-sm max-w-[40%] text-right truncate" title={file.message}>
                                                {file.message}
                                            </div>
                                        )}

                                        {file.status === 'success' && (
                                            <div className="text-green-600 text-sm font-medium">
                                                Done
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function StatusIndicator({ status }: { status: UploadedFile['status'] }) {
    switch (status) {
        case 'success':
            return <CheckCircle2 size={16} className="text-green-500" />;
        case 'error':
            return <AlertCircle size={16} className="text-red-500" />;
        case 'sending':
        case 'parsing':
            return <Loader2 size={16} className="text-blue-500 animate-spin" />;
        default:
            return <div className="w-4 h-4 rounded-full bg-slate-200" />;
    }
}
