import type { ParsedXmlResult, InvoiceRequestPayload, JournalEntryBulkRequestPayload } from '../types';

type CachedSession = {
    parsedXml: ParsedXmlResult;
    mappedInvoices: InvoiceRequestPayload[];
    mappedTahsilatBulk: JournalEntryBulkRequestPayload | null;
    tahsilatEntryTypes: string[];
    documentType: 'fatura' | 'tahsilat';
    fileName: string;
    createdAt: number;
};

const TTL_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const cache = new Map<string, CachedSession>();

export function setSession(id: string, data: Omit<CachedSession, 'createdAt'>): void {
    cache.set(id, { ...data, createdAt: Date.now() });
}

export function getSession(id: string): CachedSession | undefined {
    const session = cache.get(id);
    if (!session) return undefined;
    if (Date.now() - session.createdAt > TTL_MS) {
        cache.delete(id);
        return undefined;
    }
    return session;
}

export function deleteSession(id: string): void {
    cache.delete(id);
}

export function startCacheCleanup(): void {
    setInterval(() => {
        const now = Date.now();
        for (const [id, session] of cache) {
            if (now - session.createdAt > TTL_MS) {
                cache.delete(id);
            }
        }
    }, CLEANUP_INTERVAL_MS);
}
