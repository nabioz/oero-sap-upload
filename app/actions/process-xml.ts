'use server';

import { parseXML } from '../lib/xml-parser';
import { mapTahsilatXmlToBulkRequest } from '../lib/mappers/tahsilat-mapper';
import { sendToSAP } from '../lib/sap-client';

export type ProcessResult = {
    success: boolean;
    message?: string;
    data?: any;
};

export async function processXmlFile(formData: FormData): Promise<ProcessResult> {
    try {
        const file = formData.get('file') as File;
        if (!file) {
            return { success: false, message: "No file provided" };
        }

        const text = await file.text();

        // 1. Parse XML
        const parsedXml = parseXML(text);

        if (!parsedXml || !parsedXml.TAHSILATLAR) {
            // Simple check to validate if it is TAHSILAT format
            return { success: false, message: "Invalid XML format: Missing TAHSILATLAR root" };
        }

        // 2. Map to JSON
        const sapPayload = mapTahsilatXmlToBulkRequest(parsedXml);

        // 3. Send to SAP
        const sapResult = await sendToSAP(sapPayload);

        if (!sapResult.success) {
            return { success: false, message: sapResult.error, data: sapResult.details };
        }

        return { success: true, message: "Successfully sent to SAP", data: sapResult.data };

    } catch (error: any) {
        console.error("Processing Error:", error);
        return { success: false, message: `Processing failed: ${error.message}` };
    }
}
