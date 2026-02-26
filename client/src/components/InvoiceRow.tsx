import { CheckCircle2, AlertCircle, Loader2, RotateCcw, ShoppingCart, Undo2, Wrench, Send, ChevronDown, ChevronUp, CornerDownLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import type { TrackedInvoice } from '../types';

const TYPE_CONFIG = {
    sales: { label: 'Sales', icon: ShoppingCart, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    return: { label: 'Return', icon: Undo2, color: 'bg-amber-50 text-amber-700 border-amber-200' },
    service: { label: 'Service', icon: Wrench, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    auto_return: { label: 'Auto Return', icon: CornerDownLeft, color: 'bg-orange-50 text-orange-700 border-orange-200' },
} as const;

type Props = {
    invoice: TrackedInvoice;
    expanded: boolean;
    onToggle: () => void;
    onSend?: () => void;
    onRetry?: () => void;
};

export function InvoiceRow({ invoice, expanded, onToggle, onSend, onRetry }: Props) {
    const typeConf = TYPE_CONFIG[invoice.type];
    const TypeIcon = typeConf.icon;

    return (
        <div>
            <motion.div
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors duration-200',
                    expanded && 'rounded-b-none border-b-0',
                    invoice.status === 'success' && 'bg-green-50/50 border-green-100',
                    invoice.status === 'error' && 'bg-red-50/50 border-red-100',
                    invoice.status === 'sending' && 'bg-blue-50/30 border-blue-100',
                    invoice.status === 'pending' && 'bg-white border-slate-100',
                )}
            >
                {/* Status icon */}
                <div className="flex-shrink-0">
                    {invoice.status === 'success' && <CheckCircle2 size={18} className="text-green-500" />}
                    {invoice.status === 'error' && <AlertCircle size={18} className="text-red-500" />}
                    {invoice.status === 'sending' && <Loader2 size={18} className="text-blue-500 animate-spin" />}
                    {invoice.status === 'pending' && <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-200" />}
                </div>

                {/* Ref */}
                <div className="w-28 flex-shrink-0">
                    <span className="text-sm font-mono font-medium text-slate-700 truncate block">{invoice.ref}</span>
                </div>

                {/* Type badge */}
                <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium flex-shrink-0', typeConf.color)}>
                    <TypeIcon size={12} />
                    {typeConf.label}
                </div>

                {/* Customer */}
                <div className="flex-1 min-w-0">
                    <span className="text-sm text-slate-600 truncate block">{invoice.customer}</span>
                </div>

                {/* Items */}
                <div className="text-xs text-slate-400 flex-shrink-0 w-16 text-right">
                    {invoice.itemCount} item{invoice.itemCount !== 1 ? 's' : ''}
                </div>

                {/* Amount */}
                <div className="text-sm font-medium text-slate-700 flex-shrink-0 w-28 text-right font-mono">
                    {invoice.netAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TRY
                </div>

                {/* Expand/collapse chevron */}
                <button
                    onClick={onToggle}
                    className="p-1 rounded-md hover:bg-slate-100 text-slate-400 transition-colors cursor-pointer flex-shrink-0"
                >
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {/* Send one */}
                {invoice.status === 'pending' && onSend && (
                    <button
                        onClick={onSend}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer flex-shrink-0"
                    >
                        <Send size={12} /> Send
                    </button>
                )}

                {/* Error / Retry */}
                {invoice.status === 'error' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-red-500 max-w-[120px] truncate" title={invoice.message}>
                            {invoice.message}
                        </span>
                        {onRetry && (
                            <button
                                onClick={onRetry}
                                className="p-1 rounded-md hover:bg-red-100 text-red-500 transition-colors cursor-pointer"
                                title="Retry"
                            >
                                <RotateCcw size={14} />
                            </button>
                        )}
                    </div>
                )}
            </motion.div>

            {/* Expandable line-item detail table */}
            <AnimatePresence>
                {expanded && invoice.items && invoice.items.length > 0 && (
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
                                        <th className="px-3 py-2 font-medium w-12">#</th>
                                        <th className="px-3 py-2 font-medium">Material</th>
                                        <th className="px-3 py-2 font-medium text-right">Qty</th>
                                        <th className="px-3 py-2 font-medium text-center">Unit</th>
                                        <th className="px-3 py-2 font-medium text-right">Unit Price</th>
                                        <th className="px-3 py-2 font-medium text-right">Line Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoice.items.map((item, i) => (
                                        <tr key={i} className="border-b border-slate-100/60 last:border-0">
                                            <td className="px-3 py-1.5 text-slate-400 font-mono">{item.lineNo}</td>
                                            <td className="px-3 py-1.5 text-slate-600 font-mono">{item.materialCode}</td>
                                            <td className="px-3 py-1.5 text-right font-mono text-slate-700">
                                                {item.quantity.toLocaleString('tr-TR')}
                                            </td>
                                            <td className="px-3 py-1.5 text-center text-slate-500">{item.unit}</td>
                                            <td className="px-3 py-1.5 text-right font-mono text-slate-700">
                                                {item.unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-3 py-1.5 text-right font-mono font-medium text-slate-800">
                                                {item.lineTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                            </td>
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
}
