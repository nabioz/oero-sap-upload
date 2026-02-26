import { Hono } from 'hono';
import { parseXML } from '../lib/xml-parser';
import { mapBaslikToSalesRequest } from '../lib/mappers/sales-mapper';
import { mapBaslikToReturnRequest } from '../lib/mappers/return-mapper';
import { mapTahsilatXmlToBulkRequest } from '../lib/mappers/tahsilat-mapper';
import { setSession } from '../lib/session-cache';
import type { ScanResult, InvoiceSummary, InvoiceLineItem, TahsilatEntrySummary, TahsilatPaymentGroup } from '../../../shared/types';
import type { InvoiceRequestPayload, BaslikXmlItem, DetayXmlItem, TahsilatXmlItem, ParsedFaturaXml, ParsedTahsilatXml } from '../types';

const scanXmlRoute = new Hono();

function generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

const BYTTIP_MAP: Record<number, { type: 'nakit' | 'cek' | 'kredi_karti'; label: string }> = {
    0: { type: 'nakit', label: 'Nakit' },
    2: { type: 'cek', label: 'Çek' },
    6: { type: 'kredi_karti', label: 'Kredi Kartı' },
};

function buildLineItems(detayList: DetayXmlItem[], absoluteQuantity = false): InvoiceLineItem[] {
    return detayList.map((d, li) => {
        const rawQty = parseFloat(String(d.DBLMIKTAR ?? '0'));
        const qty = absoluteQuantity ? Math.abs(rawQty) : rawQty;
        const price = parseFloat(String(d.DBLBIRIMFIYAT ?? '0'));
        return {
            lineNo: parseInt(String(d.LNGKALEMSIRA ?? String(li + 1)), 10),
            materialCode: String(d.TXTURUNKOD ?? ''),
            quantity: qty,
            unit: String(d.TXTURUNBIRIM ?? ''),
            unitPrice: price,
            vatRate: parseFloat(String(d.DBLKDVORANI ?? '0')),
            lineTotal: Math.round(qty * price * 100) / 100,
        };
    });
}

function normalizeDetay(baslik: BaslikXmlItem): DetayXmlItem[] {
    return Array.isArray(baslik.DETAY) ? baslik.DETAY : baslik.DETAY ? [baslik.DETAY] : [];
}

function scanFatura(parsedXml: ParsedFaturaXml, fileName: string): ScanResult {
    const sessionId = generateSessionId();

    const baslikList: BaslikXmlItem[] = Array.isArray(parsedXml.FATURALAR.BASLIK)
        ? parsedXml.FATURALAR.BASLIK
        : [parsedXml.FATURALAR.BASLIK];

    const invoices: InvoiceSummary[] = [];
    const mappedPayloads: InvoiceRequestPayload[] = [];

    for (const baslik of baslikList) {
        const byttur = parseInt(String(baslik.BYTTUR ?? '0'), 10);
        const detayList = normalizeDetay(baslik);
        const ref = String(baslik.LNGBELGEKOD ?? '');
        const customer = String(baslik.TXTMUSTERIKOD ?? '');
        const date = String(baslik.TRHFATURATARIHI ?? baslik.TRHBELGETARIHI ?? '');

        if (byttur === 8) {
            // Explicit return — full BASLIK goes to CBRE mapper
            const items = buildLineItems(detayList);
            const netAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);
            invoices.push({
                index: invoices.length,
                ref, customer, date,
                type: 'return',
                itemCount: detayList.length,
                netAmount: Math.round(netAmount * 100) / 100,
                items,
            });
            mappedPayloads.push(mapBaslikToReturnRequest(baslik));
        } else {
            // Sales or service — check for negative quantities
            const baseType: 'sales' | 'service' = byttur === 5 ? 'service' : 'sales';

            const positiveDetay = detayList.filter(d => parseFloat(String(d.DBLMIKTAR ?? '0')) >= 0);
            const negativeDetay = detayList.filter(d => parseFloat(String(d.DBLMIKTAR ?? '0')) < 0);

            // Emit sales entry for positive items
            if (positiveDetay.length > 0) {
                const items = buildLineItems(positiveDetay);
                const netAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);
                invoices.push({
                    index: invoices.length,
                    ref, customer, date,
                    type: baseType,
                    itemCount: positiveDetay.length,
                    netAmount: Math.round(netAmount * 100) / 100,
                    items,
                });
                mappedPayloads.push(mapBaslikToSalesRequest(baslik, positiveDetay));
            }

            // Emit auto_return entry for negative items
            if (negativeDetay.length > 0) {
                const items = buildLineItems(negativeDetay, true);
                const netAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);
                invoices.push({
                    index: invoices.length,
                    ref, customer, date,
                    type: 'auto_return',
                    itemCount: negativeDetay.length,
                    netAmount: Math.round(Math.abs(netAmount) * 100) / 100,
                    items,
                });
                mappedPayloads.push(mapBaslikToReturnRequest(baslik, negativeDetay));
            }
        }
    }

    setSession(sessionId, {
        parsedXml,
        mappedInvoices: mappedPayloads,
        mappedTahsilatBulk: null,
        tahsilatEntryTypes: [],
        documentType: 'fatura',
        fileName,
    });

    return {
        success: true,
        sessionId,
        documentType: 'fatura',
        fileName,
        invoices,
    };
}

function scanTahsilat(parsedXml: ParsedTahsilatXml, fileName: string): ScanResult {
    const mappedBulk = mapTahsilatXmlToBulkRequest(parsedXml);
    const sessionId = generateSessionId();

    const tahsilatList: TahsilatXmlItem[] = Array.isArray(parsedXml.TAHSILATLAR.TAHSILAT)
        ? parsedXml.TAHSILATLAR.TAHSILAT
        : [parsedXml.TAHSILATLAR.TAHSILAT];

    const entries: TahsilatEntrySummary[] = tahsilatList.map((t, i) => {
        const byttip = parseInt(String(t.BYTTIP ?? '0'), 10);
        const typeInfo = BYTTIP_MAP[byttip] || { type: 'nakit' as const, label: `Unknown (${byttip})` };

        return {
            index: i,
            customer: String(t.TXTMUSTERIKOD ?? ''),
            amount: parseFloat(String(t.DBLTUTAR ?? '0')),
            type: typeInfo.type,
            typeLabel: typeInfo.label,
            receiptNo: String(t.TXTMAKBUZNO ?? ''),
            date: String(t.TRHISLEMTARIHI ?? '').split(' ')[0],
            description: String(t.TXTACIKLAMA ?? ''),
            bankName: t.TXTBANKA ? String(t.TXTBANKA) : undefined,
        };
    });

    // Group by payment type
    const groupMap = new Map<string, TahsilatPaymentGroup>();
    for (const entry of entries) {
        const existing = groupMap.get(entry.type);
        if (existing) {
            existing.count++;
            existing.totalAmount += entry.amount;
            existing.entries.push(entry);
        } else {
            groupMap.set(entry.type, {
                type: entry.type,
                label: entry.typeLabel,
                count: 1,
                totalAmount: entry.amount,
                entries: [entry],
            });
        }
    }

    const tahsilatGroups = Array.from(groupMap.values()).map(g => ({
        ...g,
        totalAmount: Math.round(g.totalAmount * 100) / 100,
    }));

    const totalTahsilatAmount = Math.round(entries.reduce((s, e) => s + e.amount, 0) * 100) / 100;

    // Store per-entry type so process-tahsilat can filter by group
    const tahsilatEntryTypes = entries.map(e => e.type);

    setSession(sessionId, {
        parsedXml,
        mappedInvoices: [],
        mappedTahsilatBulk: mappedBulk,
        tahsilatEntryTypes,
        documentType: 'tahsilat',
        fileName,
    });

    return {
        success: true,
        sessionId,
        documentType: 'tahsilat',
        fileName,
        tahsilatGroups,
        totalTahsilatAmount,
    };
}

scanXmlRoute.post('/', async (c) => {
    try {
        const body = await c.req.parseBody();
        const file = body['file'];

        if (!file || !(file instanceof File)) {
            return c.json({ success: false, error: 'No file provided' } as ScanResult, 400);
        }

        const text = await file.text();
        const parsedXml = parseXML(text);

        if (parsedXml.FATURALAR) {
            const result = scanFatura(parsedXml as ParsedFaturaXml, file.name);
            return c.json(result);
        }

        if (parsedXml.TAHSILATLAR) {
            const result = scanTahsilat(parsedXml as ParsedTahsilatXml, file.name);
            return c.json(result);
        }

        return c.json({
            success: false,
            error: 'Invalid XML format: Expected TAHSILATLAR or FATURALAR root element',
        } as ScanResult, 400);

    } catch (error: unknown) {
        console.error('Scan Error:', error);
        return c.json({
            success: false,
            error: `Scan failed: ${error instanceof Error ? error.message : String(error)}`,
        } as ScanResult, 500);
    }
});

export { scanXmlRoute };
