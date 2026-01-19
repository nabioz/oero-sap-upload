// import { format } from 'date-fns'; // We might need date-fns or just manual parsing

// Helper to format date from DD-MM-YYYY HH:mm:ss to YYYY-MM-DD
function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    // primitive parse assuming DD-MM-YYYY
    const parts = dateStr.split(' ')[0].split('-');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
}

export function mapTahsilatToJournalEntry(tahsilatItem: any) {
    // Configurable values (should ideally come from env or config)
    const COMPANY_CODE = process.env.SAP_COMPANY_CODE || "1000";
    const GL_ACCOUNT = process.env.SAP_GL_ACCOUNT || "1000101007"; // As per example
    const USER_ID = process.env.SAP_USER_ID || "CB9980000015"; // As per example
    const CURRENCY = "TRY";

    const amount = parseFloat(tahsilatItem.DBLTUTAR || "0").toFixed(2);
    const docDate = formatDate(tahsilatItem.TRHISLEMTARIHI);
    const postingDate = formatDate(tahsilatItem.TRHODEMETARIHI); // Or TRHISLEMTARIHI? Using TRHISLEMTARIHI based on context usually.

    // Note: The example shows simple mapping. 
    // We need to map TXTMUSTERIKOD (Customer Code) to Debtor
    // The XML has TXTMUSTERIKOD "08412", example JSON has Debtor "20000000"
    // Assuming strict mapping isn't possible without a lookup table, we will use the TXTMUSTERIKOD directly or a placeholder.
    // For now, I will use TXTMUSTERIKOD as the Debtor, but this might fail if SAP expects a different ID.
    // IMPORTANT: The prompt example had XML TXTMUSTERIKOD "08412" but JSON Debtor "20000000".
    // This implies a mapping might be needed. Alternatively, the user might want us to use TXTMUSTERIKOD directly.
    // I will use `tahsilatItem.TXTMUSTERIKOD` and add a comment.

    const customerCode = tahsilatItem.TXTMUSTERIKOD;
    const description = tahsilatItem.TXTACIKLAMA;
    const receiptNo = tahsilatItem.TXTMAKBUZNO;

    return {
        "JournalEntry": {
            "OriginalReferenceDocumentType": "BKPFF",
            "OriginalReferenceDocument": receiptNo || "", // Using Makbuz No as reference?
            "AccountingDocumentType": "NT", // Nakit Tahsilat
            "DocumentHeaderText": `Tahsilat ${receiptNo}`,
            "CreatedByUser": USER_ID,
            "CompanyCode": COMPANY_CODE,
            "DocumentDate": docDate,
            "PostingDate": postingDate || docDate,
            "Item": {
                // G/L Account Item (Cash Account?)
                "CompanyCode": COMPANY_CODE,
                "GLAccount": GL_ACCOUNT,
                "AmountInTransactionCurrency": {
                    "currencyCode": CURRENCY,
                    "value": amount
                },
                "AmountInCompanyCodeCurrency": {
                    "currencyCode": CURRENCY,
                    "value": amount
                },
                "DocumentItemText": `Tahsilat: ${description}`,
            },
            "DebtorItem": {
                // Customer Item
                "Debtor": customerCode,
                "ReferenceDocumentItem": "1",
                "AmountInTransactionCurrency": {
                    "currencyCode": CURRENCY,
                    "value": `-${amount}` // Credit the customer (reduce debt) -> Negative value? 
                    // In the example: G/L is +50000, Debtor is -50000 (Credit).
                    // Debit Cash (Asset increases), Credit Customer (Receivable decreases).
                },
                "AmountInCompanyCodeCurrency": {
                    "currencyCode": CURRENCY,
                    "value": `-${amount}`
                },
                "DebitCreditCode": "H", // H = Credit? The example has "H".
                "DocumentItemText": `Tahsilat Ref: ${receiptNo}`
            }
        }
    };
}

export function mapTahsilatXmlToBulkRequest(parsedXml: any) {
    const tahsilatList = Array.isArray(parsedXml.TAHSILATLAR.TAHSILAT)
        ? parsedXml.TAHSILATLAR.TAHSILAT
        : [parsedXml.TAHSILATLAR.TAHSILAT];

    const journalEntries = tahsilatList.map(mapTahsilatToJournalEntry);

    return {
        "JournalEntryBulkCreateRequest": {
            "JournalEntryCreateRequest": journalEntries
        }
    };
}
