'use server';

import { parseXML } from '../lib/xml-parser';
import { mapTahsilatXmlToBulkRequest } from '../lib/mappers/tahsilat-mapper';
import { mapFaturaXmlToSalesRequests } from '../lib/mappers/sales-mapper';
import { sendToSAP, sendToSAPEndpoint, getSalesEndpointUrl } from '../lib/sap-client';

export type ProcessResult = {
    success: boolean;
    message?: string;
    data?: any;
};

async function processTahsilat(parsedXml: any): Promise<ProcessResult> {
    const sapPayload = mapTahsilatXmlToBulkRequest(parsedXml);
    const sapResult = await sendToSAP(sapPayload);

    if (!sapResult.success) {
        return { success: false, message: sapResult.error, data: sapResult.details };
    }
    return { success: true, message: "Successfully sent to SAP (Tahsilat)", data: sapResult.data };
}

async function processFatura(parsedXml: any): Promise<ProcessResult> {
    const salesRequests = mapFaturaXmlToSalesRequests(parsedXml);
    const endpointUrl = getSalesEndpointUrl();

    const results: { ref: string; success: boolean; error?: string; data?: any }[] = [];

    for (const request of salesRequests) {
        const ref = request.Header.HeaderType.PurchaseOrderByCustomer;
        const sapResult = await sendToSAPEndpoint(request, endpointUrl);
        results.push({
            ref,
            success: sapResult.success,
            error: sapResult.error,
            data: sapResult.success ? sapResult.data : sapResult.details,
        });
    }

    const failed = results.filter(r => !r.success);
    const total = results.length;
    const successCount = total - failed.length;

    if (failed.length > 0) {
        const failedRefs = failed.map(f => f.ref).join(', ');
        return {
            success: false,
            message: `${successCount}/${total} invoices sent. Failed: ${failedRefs} - ${failed[0].error}`,
            data: results,
        };
    }

    return {
        success: true,
        message: `All ${total} invoice(s) sent to SAP successfully`,
        data: results,
    };
}

export async function processXmlFile(formData: FormData): Promise<ProcessResult> {
    try {
        const file = formData.get('file') as File;
        if (!file) {
            return { success: false, message: "No file provided" };
        }

        const text = await file.text();
        const parsedXml = parseXML(text);

        if (parsedXml?.TAHSILATLAR) {
            return await processTahsilat(parsedXml);
        }

        if (parsedXml?.FATURALAR) {
            return await processFatura(parsedXml);
        }

        return {
            success: false,
            message: "Invalid XML format: Expected TAHSILATLAR or FATURALAR root element",
        };

    } catch (error: any) {
        console.error("Processing Error:", error);
        return { success: false, message: `Processing failed: ${error.message}` };
    }
}
