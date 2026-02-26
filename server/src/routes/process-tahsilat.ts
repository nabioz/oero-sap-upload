import { Hono } from 'hono';
import { getSession } from '../lib/session-cache';
import { sendToSAPJournalEndpoint } from '../lib/sap-client';
import type { ProcessItemResult, ProcessTahsilatRequest } from '../../../shared/types';
import type { JournalEntryBulkRequestPayload } from '../types';

const processTahsilatRoute = new Hono();

processTahsilatRoute.post('/', async (c) => {
    try {
        const { sessionId, groupType } = await c.req.json<ProcessTahsilatRequest>();

        if (!sessionId) {
            return c.json({ success: false, error: 'Missing sessionId' } satisfies ProcessItemResult, 400);
        }

        const session = getSession(sessionId);
        if (!session) {
            return c.json({ success: false, error: 'Session expired or not found' } satisfies ProcessItemResult, 404);
        }

        if (session.documentType !== 'tahsilat') {
            return c.json({ success: false, error: 'Session is not a tahsilat type' } satisfies ProcessItemResult, 400);
        }

        if (!session.mappedTahsilatBulk) {
            return c.json({ success: false, error: 'No tahsilat data in session' } satisfies ProcessItemResult, 400);
        }

        let payload: JournalEntryBulkRequestPayload = session.mappedTahsilatBulk;

        // If groupType is specified, filter entries to only that payment type
        if (groupType && session.tahsilatEntryTypes.length > 0) {
            const allEntries = session.mappedTahsilatBulk.JournalEntryBulkCreateRequest.JournalEntryCreateRequest;
            const filtered = allEntries.filter((_, i) => session.tahsilatEntryTypes[i] === groupType);

            if (filtered.length === 0) {
                return c.json({ success: false, error: `No entries found for group type: ${groupType}` } satisfies ProcessItemResult, 400);
            }

            payload = {
                JournalEntryBulkCreateRequest: {
                    JournalEntryCreateRequest: filtered,
                },
            };
        }

        const sapResult = await sendToSAPJournalEndpoint(payload);

        if (!sapResult.success) {
            return c.json({
                success: false,
                error: sapResult.error,
                data: sapResult.details,
            } satisfies ProcessItemResult, 422);
        }

        return c.json({
            success: true,
            data: sapResult.data,
        } satisfies ProcessItemResult);

    } catch (error: unknown) {
        console.error('Process Tahsilat Error:', error);
        return c.json({
            success: false,
            error: `Processing failed: ${error instanceof Error ? error.message : String(error)}`,
        } satisfies ProcessItemResult, 500);
    }
});

export { processTahsilatRoute };
