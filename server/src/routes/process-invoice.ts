import { Hono } from 'hono';
import { getSession } from '../lib/session-cache';
import { sendToSAPSalesEndpoint, getSalesEndpointUrl } from '../lib/sap-client';
import type { ProcessItemResult, ProcessInvoiceRequest } from '../../../shared/types';

const processInvoiceRoute = new Hono();

processInvoiceRoute.post('/', async (c) => {
    try {
        const { sessionId, invoiceIndex } = await c.req.json<ProcessInvoiceRequest>();

        if (!sessionId || invoiceIndex === undefined) {
            return c.json({ success: false, error: 'Missing sessionId or invoiceIndex' } satisfies ProcessItemResult, 400);
        }

        const session = getSession(sessionId);
        if (!session) {
            return c.json({ success: false, error: 'Session expired or not found' } satisfies ProcessItemResult, 404);
        }

        if (session.documentType !== 'fatura') {
            return c.json({ success: false, error: 'Session is not a fatura type' } satisfies ProcessItemResult, 400);
        }

        const payload = session.mappedInvoices[invoiceIndex];
        if (!payload) {
            return c.json({ success: false, error: `Invoice index ${invoiceIndex} not found` } satisfies ProcessItemResult, 404);
        }

        const ref = payload.Header?.HeaderType?.PurchaseOrderByCustomer || `#${invoiceIndex}`;
        const endpointUrl = getSalesEndpointUrl();
        const sapResult = await sendToSAPSalesEndpoint(payload, endpointUrl);

        if (!sapResult.success) {
            return c.json({
                success: false,
                ref,
                error: sapResult.error,
                data: sapResult.details,
            } satisfies ProcessItemResult, 422);
        }

        return c.json({
            success: true,
            ref,
            data: sapResult.data,
        } satisfies ProcessItemResult);

    } catch (error: unknown) {
        console.error('Process Invoice Error:', error);
        return c.json({
            success: false,
            error: `Processing failed: ${error instanceof Error ? error.message : String(error)}`,
        } satisfies ProcessItemResult, 500);
    }
});

export { processInvoiceRoute };
