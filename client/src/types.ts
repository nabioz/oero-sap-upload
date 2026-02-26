import type { InvoiceSummary, TahsilatPaymentGroup, ScanResult } from '../../shared/types';

// Legacy types (kept for reference)
export type ProcessingStatus = 'idle' | 'parsing' | 'sending' | 'success' | 'error';

export interface UploadedFile {
    id: string;
    file: File;
    status: ProcessingStatus;
    message?: string;
    result?: unknown;
}

// --- New batch dashboard types ---

export type InvoiceStatus = 'pending' | 'sending' | 'success' | 'error';

export type TrackedInvoice = InvoiceSummary & {
    status: InvoiceStatus;
    message?: string;
    sapResponse?: unknown;
};

export type TahsilatUploadStatus = 'pending' | 'sending' | 'success' | 'error';

export type TahsilatGroupStatusEntry = {
    status: TahsilatUploadStatus;
    error?: string;
    response?: unknown;
};

export type ScannedFile = {
    id: string;
    file: File;
    sessionId: string;
    documentType: 'fatura' | 'tahsilat';
    invoices?: TrackedInvoice[];
    tahsilatGroups?: TahsilatPaymentGroup[];
    totalTahsilatAmount?: number;
    tahsilatGroupStatuses?: Record<string, TahsilatGroupStatusEntry>;
};

export type DashboardPhase = 'upload' | 'scanning' | 'review' | 'processing' | 'complete';
