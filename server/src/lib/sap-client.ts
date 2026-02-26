import type { InvoiceRequestPayload, JournalEntryBulkRequestPayload, SapClientResult } from '../types';

const SAP_URL = process.env.SAP_API_URL || "https://oerotrading.it-cpi033-rt.cfapps.eu10-005.hana.ondemand.com/http/test/efes/s4/JournalEntry";
const SAP_SALES_URL = process.env.SAP_SALES_API_URL || "https://oerotrading.it-cpi033-rt.cfapps.eu10-005.hana.ondemand.com/http/test/efes/s4/CreateSalesOperation";
const SAP_USER = process.env.SAP_USER;
const SAP_PASSWORD = process.env.SAP_PASSWORD;

function getAuth(): string {
    if (!SAP_USER || !SAP_PASSWORD) {
        throw new Error("SAP credentials not configured (SAP_USER, SAP_PASSWORD)");
    }
    return Buffer.from(`${SAP_USER}:${SAP_PASSWORD}`).toString('base64');
}

export async function sendToSAPSalesEndpoint(payload: InvoiceRequestPayload, endpointUrl: string): Promise<SapClientResult> {
    const auth = getAuth();

    console.log(`Sending payload to SAP (${endpointUrl}):`, JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(endpointUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        let responseData: unknown;

        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = responseText;
        }

        console.log(JSON.stringify(responseData, null, 2));

        if (!response.ok) {
            console.error("SAP Error Response:", responseText);
            return {
                success: false,
                error: `SAP responded with ${response.status}: ${JSON.stringify(responseData)}`,
                details: responseData
            };
        }

        return {
            success: true,
            data: responseData
        };

    } catch (error: unknown) {
        console.error("Network Error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown network error"
        };
    }
}

export function getSalesEndpointUrl(): string {
    return SAP_SALES_URL;
}

export async function sendToSAPJournalEndpoint(payload: JournalEntryBulkRequestPayload): Promise<SapClientResult> {
    const auth = getAuth();

    console.log("Sending payload to SAP:", JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(SAP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        let responseData: unknown;

        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = responseText;
        }

        console.log(JSON.stringify(responseData, null, 2));

        if (!response.ok) {
            console.error("SAP Error Response:", responseText);
            return {
                success: false,
                error: `SAP responded with ${response.status}: ${JSON.stringify(responseData)}`,
                details: responseData
            };
        }

        return {
            success: true,
            data: responseData
        };

    } catch (error: unknown) {
        console.error("Network Error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown network error"
        };
    }
}
