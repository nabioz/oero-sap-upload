import { useState } from 'react';
import { ArrowRight, Loader2, CheckCircle2, AlertCircle, RotateCcw, ChevronDown, ChevronUp, Banknote, CreditCard, FileCheck, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import type { TahsilatPaymentGroup } from '../../../shared/types';
import type { TahsilatGroupStatusEntry } from '../types';

const TYPE_ICONS = {
    nakit: Banknote,
    cek: FileCheck,
    kredi_karti: CreditCard,
} as const;

const TYPE_COLORS = {
    nakit: 'from-green-500 to-emerald-600',
    cek: 'from-blue-500 to-indigo-600',
    kredi_karti: 'from-purple-500 to-violet-600',
} as const;

type Props = {
    groups: TahsilatPaymentGroup[];
    groupStatuses: Record<string, TahsilatGroupStatusEntry>;
    totalAmount: number;
    isProcessing: boolean;
    onSendAll: () => void;
    onSendGroup: (groupType: string) => void;
    onRetryGroup: (groupType: string) => void;
};

export function TahsilatTab({ groups, groupStatuses, totalAmount, isProcessing, onSendAll, onSendGroup, onRetryGroup }: Props) {
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
    const totalEntries = groups.reduce((s, g) => s + g.count, 0);

    const allSuccess = groups.length > 0 && groups.every(g => groupStatuses[g.type]?.status === 'success');
    const anyPending = groups.some(g => {
        const s = groupStatuses[g.type]?.status;
        return !s || s === 'pending' || s === 'error';
    });
    const anySending = groups.some(g => groupStatuses[g.type]?.status === 'sending');

    return (
        <div className="space-y-5">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {groups.map((group) => {
                    const Icon = TYPE_ICONS[group.type];
                    const gradient = TYPE_COLORS[group.type];
                    const isExpanded = expandedGroup === group.type;
                    const gs = groupStatuses[group.type] || { status: 'pending' };

                    return (
                        <div key={group.type} className="space-y-0">
                            <div
                                className={cn(
                                    'rounded-xl p-4 border bg-white shadow-sm transition-all duration-200',
                                    isExpanded && 'rounded-b-none border-b-0',
                                    gs.status === 'success' && 'border-green-200 bg-green-50/30',
                                    gs.status === 'error' && 'border-red-200 bg-red-50/30',
                                    gs.status === 'sending' && 'border-blue-200 bg-blue-50/30',
                                    gs.status === 'pending' && 'border-slate-100',
                                )}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className={cn('p-2 rounded-lg bg-gradient-to-br text-white', gradient)}>
                                        <Icon size={18} />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        {/* Per-group status icon */}
                                        {gs.status === 'success' && <CheckCircle2 size={16} className="text-green-500" />}
                                        {gs.status === 'sending' && <Loader2 size={16} className="text-blue-500 animate-spin" />}
                                        {gs.status === 'error' && <AlertCircle size={16} className="text-red-500" />}

                                        <button
                                            onClick={() => setExpandedGroup(isExpanded ? null : group.type)}
                                            className="p-1 rounded-md hover:bg-slate-100 text-slate-400 transition-colors cursor-pointer"
                                        >
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="text-lg font-semibold text-slate-800">{group.label}</div>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-2xl font-bold font-mono text-slate-900">
                                        {group.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-sm text-slate-400">TRY</span>
                                </div>
                                <div className="text-xs text-slate-400 mt-1">{group.count} entry{group.count !== 1 ? 's' : ''}</div>

                                {/* Per-group actions */}
                                <div className="mt-3 flex items-center gap-2">
                                    {gs.status === 'pending' && (
                                        <button
                                            onClick={() => onSendGroup(group.type)}
                                            disabled={isProcessing}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-50 cursor-pointer"
                                        >
                                            <Send size={12} /> Send
                                        </button>
                                    )}
                                    {gs.status === 'error' && (
                                        <>
                                            <span className="text-xs text-red-500 truncate max-w-[120px]" title={gs.error}>
                                                {gs.error}
                                            </span>
                                            <button
                                                onClick={() => onRetryGroup(group.type)}
                                                disabled={isProcessing}
                                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50 cursor-pointer"
                                            >
                                                <RotateCcw size={12} /> Retry
                                            </button>
                                        </>
                                    )}
                                    {gs.status === 'success' && (
                                        <span className="text-xs text-green-600 font-medium">Sent</span>
                                    )}
                                </div>
                            </div>

                            {/* Expandable detail table */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden border border-t-0 border-slate-100 rounded-b-xl bg-slate-50"
                                    >
                                        <div className="max-h-60 overflow-y-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="text-left text-slate-400 border-b border-slate-100">
                                                        <th className="px-3 py-2 font-medium">Customer</th>
                                                        <th className="px-3 py-2 font-medium text-right">Amount</th>
                                                        <th className="px-3 py-2 font-medium">Receipt</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {group.entries.map((entry, i) => (
                                                        <tr key={i} className="border-b border-slate-100/60 last:border-0">
                                                            <td className="px-3 py-1.5 text-slate-600">{entry.customer}</td>
                                                            <td className="px-3 py-1.5 text-right font-mono text-slate-700">
                                                                {entry.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                            </td>
                                                            <td className="px-3 py-1.5 text-slate-500">{entry.receiptNo}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>

            {/* Total + send all */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div>
                    <span className="text-sm text-slate-500">Total: </span>
                    <span className="text-lg font-bold font-mono text-slate-800">
                        {totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TRY
                    </span>
                    <span className="text-sm text-slate-400 ml-2">({totalEntries} entries)</span>
                </div>

                <div className="flex items-center gap-2">
                    {allSuccess && (
                        <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
                            <CheckCircle2 size={16} /> All sent to SAP
                        </span>
                    )}
                    {!allSuccess && anyPending && (
                        <button
                            onClick={onSendAll}
                            disabled={isProcessing}
                            className="premium-button flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {anySending ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" /> Sending...
                                </>
                            ) : (
                                <>
                                    Send All to SAP <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
