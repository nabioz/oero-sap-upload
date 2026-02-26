export type ProcessResult = {
    success: boolean;
    message?: string;
    data?: unknown;
};

export type AuthUser = {
    email: string;
    name: string;
    picture: string;
    sub: string;
};

// --- Scan & batch processing types ---

export type InvoiceLineItem = {
    lineNo: number;
    materialCode: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    vatRate: number;
    lineTotal: number;
};

export type InvoiceSummary = {
    index: number;
    ref: string;
    customer: string;
    type: 'sales' | 'return' | 'service' | 'auto_return';
    itemCount: number;
    netAmount: number;
    date: string;
    items: InvoiceLineItem[];
};

export type TahsilatEntrySummary = {
    index: number;
    customer: string;
    amount: number;
    type: 'nakit' | 'cek' | 'kredi_karti';
    typeLabel: string;
    receiptNo: string;
    date: string;
    description: string;
    bankName?: string;
};

export type TahsilatPaymentGroup = {
    type: 'nakit' | 'cek' | 'kredi_karti';
    label: string;
    count: number;
    totalAmount: number;
    entries: TahsilatEntrySummary[];
};

export type ScanResult = {
    success: boolean;
    sessionId: string;
    documentType: 'fatura' | 'tahsilat';
    fileName: string;
    invoices?: InvoiceSummary[];
    tahsilatGroups?: TahsilatPaymentGroup[];
    totalTahsilatAmount?: number;
    error?: string;
};

export type ProcessInvoiceRequest = {
    sessionId: string;
    invoiceIndex: number;
};

export type ProcessTahsilatRequest = {
    sessionId: string;
    groupType?: 'nakit' | 'cek' | 'kredi_karti';
};

export type ProcessItemResult = {
    success: boolean;
    ref?: string;
    data?: unknown;
    error?: string;
};
