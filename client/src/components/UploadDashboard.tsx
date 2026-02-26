import { useState, useCallback } from 'react';
import { FileUploader } from './FileUploader';
import { TabBar, type Tab } from './TabBar';
import { FaturaTab } from './FaturaTab';
import { TahsilatTab } from './TahsilatTab';
import { Loader2, FileText, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { scanXmlFile, processInvoice, processTahsilat } from '../lib/api';
import { runWithConcurrency } from '../lib/concurrency';
import type { ProcessTahsilatRequest } from '../../../shared/types';
import type { ScannedFile, TrackedInvoice, DashboardPhase, TahsilatGroupStatusEntry } from '../types';

const CONCURRENCY = 5;

export function UploadDashboard({ token }: { token: string }) {
    const [phase, setPhase] = useState<DashboardPhase>('upload');
    const [scannedFiles, setScannedFiles] = useState<ScannedFile[]>([]);
    const [activeTab, setActiveTab] = useState<string>('');
    const [isFaturaProcessing, setIsFaturaProcessing] = useState(false);
    const [isTahsilatProcessing, setIsTahsilatProcessing] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);

    const isProcessing = isFaturaProcessing || isTahsilatProcessing;

    // Derived
    const allFaturaFiles = scannedFiles.filter(f => f.documentType === 'fatura');
    const allTahsilatFiles = scannedFiles.filter(f => f.documentType === 'tahsilat');
    const allInvoices = allFaturaFiles.flatMap(f => f.invoices || []);
    const allTahsilatGroups = allTahsilatFiles.flatMap(f => f.tahsilatGroups || []);
    const totalTahsilatAmount = allTahsilatFiles.reduce((s, f) => s + (f.totalTahsilatAmount || 0), 0);

    // Merge tahsilat groups by type for display
    const mergedTahsilatGroups = (() => {
        const map = new Map<string, typeof allTahsilatGroups[0]>();
        for (const g of allTahsilatGroups) {
            const existing = map.get(g.type);
            if (existing) {
                existing.count += g.count;
                existing.totalAmount = Math.round((existing.totalAmount + g.totalAmount) * 100) / 100;
                existing.entries = [...existing.entries, ...g.entries];
            } else {
                map.set(g.type, { ...g, entries: [...g.entries] });
            }
        }
        return Array.from(map.values());
    })();

    // Merge per-group statuses across files (worst status wins)
    const mergedGroupStatuses: Record<string, TahsilatGroupStatusEntry> = (() => {
        const result: Record<string, TahsilatGroupStatusEntry> = {};
        for (const file of allTahsilatFiles) {
            if (!file.tahsilatGroupStatuses) continue;
            for (const [type, entry] of Object.entries(file.tahsilatGroupStatuses)) {
                const existing = result[type];
                if (!existing) {
                    result[type] = { ...entry };
                } else {
                    // If any file has error for this group, show error; if any sending, show sending
                    if (entry.status === 'error') {
                        result[type] = { ...entry };
                    } else if (entry.status === 'sending' && existing.status !== 'error') {
                        result[type] = { ...entry };
                    } else if (entry.status === 'pending' && existing.status === 'success') {
                        // If one file succeeded but another is pending, show pending
                        result[type] = { ...entry };
                    }
                }
            }
        }
        return result;
    })();

    const tabs: Tab[] = [];
    if (allFaturaFiles.length > 0) tabs.push({ id: 'fatura', label: 'Fatura', count: allInvoices.length });
    if (allTahsilatFiles.length > 0) tabs.push({ id: 'tahsilat', label: 'Tahsilat', count: allTahsilatGroups.reduce((s, g) => s + g.count, 0) });

    // --- Handlers ---

    const handleFilesSelected = useCallback(async (newFiles: File[]) => {
        setScanError(null);
        setPhase('scanning');

        const results: ScannedFile[] = [];

        for (const file of newFiles) {
            const formData = new FormData();
            formData.append('file', file);

            try {
                const scanResult = await scanXmlFile(formData, token);

                if (!scanResult.success) {
                    setScanError(`${file.name}: ${scanResult.error}`);
                    setPhase(scannedFiles.length > 0 || results.length > 0 ? 'review' : 'upload');
                    continue;
                }

                const scanned: ScannedFile = {
                    id: scanResult.sessionId,
                    file,
                    sessionId: scanResult.sessionId,
                    documentType: scanResult.documentType,
                };

                if (scanResult.documentType === 'fatura' && scanResult.invoices) {
                    scanned.invoices = scanResult.invoices.map(inv => ({
                        ...inv,
                        status: 'pending' as const,
                    }));
                }

                if (scanResult.documentType === 'tahsilat' && scanResult.tahsilatGroups) {
                    scanned.tahsilatGroups = scanResult.tahsilatGroups;
                    scanned.totalTahsilatAmount = scanResult.totalTahsilatAmount;
                    // Initialize per-group statuses
                    const groupStatuses: Record<string, TahsilatGroupStatusEntry> = {};
                    for (const g of scanResult.tahsilatGroups) {
                        groupStatuses[g.type] = { status: 'pending' };
                    }
                    scanned.tahsilatGroupStatuses = groupStatuses;
                }

                results.push(scanned);
            } catch (e: unknown) {
                if (e instanceof Error && e.message === 'AUTH_EXPIRED') {
                    window.location.reload();
                    return;
                }
                setScanError(`${file.name}: ${e instanceof Error ? e.message : String(e)}`);
            }
        }

        if (results.length > 0) {
            setScannedFiles(prev => {
                const merged = [...prev, ...results];
                if (!activeTab) {
                    const hasFatura = merged.some(f => f.documentType === 'fatura');
                    setActiveTab(hasFatura ? 'fatura' : 'tahsilat');
                }
                return merged;
            });
            setPhase('review');
        } else if (scannedFiles.length > 0) {
            setPhase('review');
        } else {
            setPhase('upload');
        }
    }, [token, activeTab, scannedFiles.length]);

    // --- Fatura handlers ---

    const updateInvoiceStatus = useCallback((fileId: string, invoiceIndex: number, status: TrackedInvoice['status'], message?: string, sapResponse?: unknown) => {
        setScannedFiles(prev => prev.map(f => {
            if (f.id !== fileId) return f;
            return {
                ...f,
                invoices: f.invoices?.map(inv =>
                    inv.index === invoiceIndex ? { ...inv, status, message, sapResponse } : inv
                ),
            };
        }));
    }, []);

    const sendOneInvoice = useCallback(async (fileId: string, sessionId: string, invoiceIndex: number) => {
        updateInvoiceStatus(fileId, invoiceIndex, 'sending');
        try {
            const result = await processInvoice({ sessionId, invoiceIndex }, token);
            if (result.success) {
                updateInvoiceStatus(fileId, invoiceIndex, 'success', undefined, result.data);
            } else {
                updateInvoiceStatus(fileId, invoiceIndex, 'error', result.error);
            }
            return result;
        } catch (e: unknown) {
            if (e instanceof Error && e.message === 'AUTH_EXPIRED') {
                window.location.reload();
                throw e;
            }
            const message = e instanceof Error ? e.message : String(e);
            updateInvoiceStatus(fileId, invoiceIndex, 'error', message);
            return { success: false, error: message };
        }
    }, [token, updateInvoiceStatus]);

    const handleSendOneFatura = useCallback(async (invoiceIndex: number) => {
        const file = allFaturaFiles.find(f => f.invoices?.some(inv => inv.index === invoiceIndex));
        if (!file) return;
        await sendOneInvoice(file.id, file.sessionId, invoiceIndex);
    }, [allFaturaFiles, sendOneInvoice]);

    const handleSendAllFatura = useCallback(async () => {
        setIsFaturaProcessing(true);
        setPhase('processing');

        for (const file of allFaturaFiles) {
            const pendingInvoices = (file.invoices || []).filter(inv => inv.status === 'pending' || inv.status === 'error');
            if (pendingInvoices.length === 0) continue;

            const tasks = pendingInvoices.map(inv => () => sendOneInvoice(file.id, file.sessionId, inv.index));
            await runWithConcurrency(tasks, { concurrency: CONCURRENCY });
        }

        setIsFaturaProcessing(false);
        setPhase('review');
    }, [allFaturaFiles, sendOneInvoice]);

    const handleRetryFailedFatura = useCallback(async () => {
        setScannedFiles(prev => prev.map(f => {
            if (f.documentType !== 'fatura') return f;
            return {
                ...f,
                invoices: f.invoices?.map(inv =>
                    inv.status === 'error' ? { ...inv, status: 'pending' as const, message: undefined } : inv
                ),
            };
        }));
        setTimeout(() => handleSendAllFatura(), 0);
    }, [handleSendAllFatura]);

    const handleRetryOneFatura = useCallback(async (invoiceIndex: number) => {
        await handleSendOneFatura(invoiceIndex);
    }, [handleSendOneFatura]);

    // --- Tahsilat handlers ---

    const updateTahsilatGroupStatus = useCallback((groupType: string, entry: TahsilatGroupStatusEntry) => {
        setScannedFiles(prev => prev.map(f => {
            if (f.documentType !== 'tahsilat' || !f.tahsilatGroupStatuses) return f;
            if (!(groupType in f.tahsilatGroupStatuses)) return f;
            return {
                ...f,
                tahsilatGroupStatuses: {
                    ...f.tahsilatGroupStatuses,
                    [groupType]: entry,
                },
            };
        }));
    }, []);

    const handleSendTahsilatGroup = useCallback(async (groupType: string) => {
        setIsTahsilatProcessing(true);
        updateTahsilatGroupStatus(groupType, { status: 'sending' });

        for (const file of allTahsilatFiles) {
            if (!file.tahsilatGroupStatuses?.[groupType]) continue;
            if (file.tahsilatGroupStatuses[groupType].status === 'success') continue;

            try {
                const result = await processTahsilat({ sessionId: file.sessionId, groupType: groupType as ProcessTahsilatRequest['groupType'] }, token);
                // Update this specific file's group status
                setScannedFiles(prev => prev.map(f => {
                    if (f.id !== file.id || !f.tahsilatGroupStatuses) return f;
                    return {
                        ...f,
                        tahsilatGroupStatuses: {
                            ...f.tahsilatGroupStatuses,
                            [groupType]: {
                                status: result.success ? 'success' as const : 'error' as const,
                                error: result.error,
                                response: result.data,
                            },
                        },
                    };
                }));
            } catch (e: unknown) {
                if (e instanceof Error && e.message === 'AUTH_EXPIRED') {
                    window.location.reload();
                    return;
                }
                const errMsg = e instanceof Error ? e.message : String(e);
                setScannedFiles(prev => prev.map(f => {
                    if (f.id !== file.id || !f.tahsilatGroupStatuses) return f;
                    return {
                        ...f,
                        tahsilatGroupStatuses: {
                            ...f.tahsilatGroupStatuses,
                            [groupType]: { status: 'error' as const, error: errMsg },
                        },
                    };
                }));
            }
        }

        setIsTahsilatProcessing(false);
    }, [allTahsilatFiles, token, updateTahsilatGroupStatus]);

    const handleSendAllTahsilat = useCallback(async () => {
        setIsTahsilatProcessing(true);

        // Get all unique group types that aren't already success
        const groupTypes = mergedTahsilatGroups
            .map(g => g.type)
            .filter(t => mergedGroupStatuses[t]?.status !== 'success');

        for (const groupType of groupTypes) {
            updateTahsilatGroupStatus(groupType, { status: 'sending' });

            for (const file of allTahsilatFiles) {
                if (!file.tahsilatGroupStatuses?.[groupType]) continue;
                if (file.tahsilatGroupStatuses[groupType].status === 'success') continue;

                try {
                    const result = await processTahsilat({ sessionId: file.sessionId, groupType: groupType as ProcessTahsilatRequest['groupType'] }, token);
                    setScannedFiles(prev => prev.map(f => {
                        if (f.id !== file.id || !f.tahsilatGroupStatuses) return f;
                        return {
                            ...f,
                            tahsilatGroupStatuses: {
                                ...f.tahsilatGroupStatuses,
                                [groupType]: {
                                    status: result.success ? 'success' as const : 'error' as const,
                                    error: result.error,
                                    response: result.data,
                                },
                            },
                        };
                    }));
                } catch (e: unknown) {
                    if (e instanceof Error && e.message === 'AUTH_EXPIRED') {
                        window.location.reload();
                        return;
                    }
                    const errMsg = e instanceof Error ? e.message : String(e);
                    setScannedFiles(prev => prev.map(f => {
                        if (f.id !== file.id || !f.tahsilatGroupStatuses) return f;
                        return {
                            ...f,
                            tahsilatGroupStatuses: {
                                ...f.tahsilatGroupStatuses,
                                [groupType]: { status: 'error' as const, error: errMsg },
                            },
                        };
                    }));
                }
            }
        }

        setIsTahsilatProcessing(false);
    }, [allTahsilatFiles, mergedTahsilatGroups, mergedGroupStatuses, token, updateTahsilatGroupStatus]);

    const handleRetryTahsilatGroup = useCallback(async (groupType: string) => {
        updateTahsilatGroupStatus(groupType, { status: 'pending' });
        setTimeout(() => handleSendTahsilatGroup(groupType), 0);
    }, [handleSendTahsilatGroup, updateTahsilatGroupStatus]);

    const handleReset = useCallback(() => {
        setScannedFiles([]);
        setPhase('upload');
        setActiveTab('');
        setScanError(null);
    }, []);

    return (
        <div className="max-w-5xl mx-auto space-y-8 p-6">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold tracking-tight premium-gradient-text">
                    SAP Integration Hub
                </h1>
                <p className="text-lg text-slate-600">
                    Upload and process transaction documents securely
                </p>
            </div>

            {/* File uploader */}
            <div className="glass-panel p-6">
                <FileUploader onFilesSelected={handleFilesSelected} disabled={phase === 'scanning' || isProcessing} />
            </div>

            {/* Scanning indicator */}
            <AnimatePresence>
                {phase === 'scanning' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center justify-center gap-3 py-6 text-slate-600"
                    >
                        <Loader2 size={20} className="animate-spin text-blue-500" />
                        <span className="text-sm font-medium">Scanning files...</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Scan error */}
            {scanError && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700"
                >
                    {scanError}
                </motion.div>
            )}

            {/* Review panel */}
            <AnimatePresence>
                {scannedFiles.length > 0 && phase !== 'scanning' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-4"
                    >
                        {/* Header with tabs + reset */}
                        <div className="flex items-center justify-between gap-4">
                            <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

                            <div className="flex items-center gap-2">
                                {scannedFiles.map(f => (
                                    <span
                                        key={f.id}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-xs text-slate-500"
                                    >
                                        <FileText size={12} />
                                        <span className="max-w-[100px] truncate">{f.file.name}</span>
                                    </span>
                                ))}
                                <button
                                    onClick={handleReset}
                                    disabled={isProcessing}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50 cursor-pointer"
                                    title="Clear all"
                                >
                                    <RotateCcw size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Active tab content */}
                        <div className="glass-panel p-6">
                            {activeTab === 'fatura' && allFaturaFiles.length > 0 && (
                                <FaturaTab
                                    invoices={allInvoices}
                                    isProcessing={isFaturaProcessing}
                                    onSendAll={handleSendAllFatura}
                                    onSendOne={handleSendOneFatura}
                                    onRetryFailed={handleRetryFailedFatura}
                                    onRetryOne={handleRetryOneFatura}
                                />
                            )}
                            {activeTab === 'tahsilat' && allTahsilatFiles.length > 0 && (
                                <TahsilatTab
                                    groups={mergedTahsilatGroups}
                                    groupStatuses={mergedGroupStatuses}
                                    totalAmount={totalTahsilatAmount}
                                    isProcessing={isTahsilatProcessing}
                                    onSendAll={handleSendAllTahsilat}
                                    onSendGroup={handleSendTahsilatGroup}
                                    onRetryGroup={handleRetryTahsilatGroup}
                                />
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
