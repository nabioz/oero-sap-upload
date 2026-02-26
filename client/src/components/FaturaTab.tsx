import { useState } from 'react';
import { ArrowRight, RotateCcw, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { InvoiceRow } from './InvoiceRow';
import type { TrackedInvoice } from '../types';

type Props = {
    invoices: TrackedInvoice[];
    isProcessing: boolean;
    onSendAll: () => void;
    onSendOne: (index: number) => void;
    onRetryFailed: () => void;
    onRetryOne: (index: number) => void;
};

export function FaturaTab({ invoices, isProcessing, onSendAll, onSendOne, onRetryFailed, onRetryOne }: Props) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    const total = invoices.length;
    const successCount = invoices.filter(i => i.status === 'success').length;
    const failedCount = invoices.filter(i => i.status === 'error').length;
    const sendingCount = invoices.filter(i => i.status === 'sending').length;
    const pendingCount = invoices.filter(i => i.status === 'pending').length;
    const allDone = pendingCount === 0 && sendingCount === 0;
    const hasFailures = failedCount > 0;
    const allSuccess = successCount === total && total > 0;

    const progressPercent = total > 0 ? Math.round((successCount / total) * 100) : 0;

    return (
        <div className="space-y-4">
            {/* Progress + actions bar */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Progress bar */}
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-xs">
                        <motion.div
                            className={allSuccess ? 'h-full bg-green-500 rounded-full' : 'h-full bg-blue-500 rounded-full'}
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                    <span className="text-sm text-slate-500 font-medium flex-shrink-0">
                        {successCount}/{total}
                        {allSuccess && <CheckCircle2 size={14} className="inline ml-1 text-green-500" />}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {hasFailures && allDone && (
                        <button
                            onClick={onRetryFailed}
                            disabled={isProcessing}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            <RotateCcw size={14} />
                            Retry Failed ({failedCount})
                        </button>
                    )}
                    {!allSuccess && (
                        <button
                            onClick={onSendAll}
                            disabled={isProcessing || (pendingCount === 0 && failedCount === 0)}
                            className="premium-button flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Sending... ({sendingCount} active)
                                </>
                            ) : (
                                <>
                                    Send to SAP <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Invoice list */}
            <div className="space-y-1.5">
                {invoices.map((inv) => (
                    <InvoiceRow
                        key={inv.index}
                        invoice={inv}
                        expanded={expandedIndex === inv.index}
                        onToggle={() => setExpandedIndex(expandedIndex === inv.index ? null : inv.index)}
                        onSend={inv.status === 'pending' ? () => onSendOne(inv.index) : undefined}
                        onRetry={inv.status === 'error' ? () => onRetryOne(inv.index) : undefined}
                    />
                ))}
            </div>
        </div>
    );
}
