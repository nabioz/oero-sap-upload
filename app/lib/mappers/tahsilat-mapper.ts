// Maps TAHSILATLAR XML to SAP JournalEntryBulkCreateRequest JSON.
// Differentiates by BYTTIP: 0=Nakit (Cash), 2=Çek (Cheque), 6=Kredi Kartı (Credit Card).

// Type-specific config keyed by BYTTIP
const TYPE_CONFIG: Record<number, { docType: string; glAccount: string; label: string }> = {
    0: { docType: "NT", glAccount: "1000101007", label: "Nakit Tahsilat" },      // Efes Pls Tahsilat Kasası
    2: { docType: "CT", glAccount: "1010101001", label: "Çek Tahsilat" },        // Portföydeki Çekler TL
    6: { docType: "KT", glAccount: "",           label: "Kredi Kartı Tahsilat" }, // GL resolved per bank via TXTBANKA
};

const SUPPORTED_TYPES = Object.keys(TYPE_CONFIG).join(', ');

// Credit card GL accounts mapped by bank name (TXTBANKA field)
// Normalized to lowercase for matching
const KK_BANK_GL: Record<string, string> = {
    "teb":        "1080101001", // Teb Kartı Tahsil Hes
    "iş bank":    "1080101002", // T İş Bank K Kartı Tahsil Hes
    "is bank":    "1080101002",
    "t iş bank":  "1080101002",
    "t is bank":  "1080101002",
    "işbankası":   "1080101002",
    "yakındoğu":  "1080101004", // Y Doğu Bank K Kartı Hesabı
    "yakindogu":  "1080101004",
    "y doğu":     "1080101004",
    "y.doğu":     "1080101004",
    "novabank":   "1080101004", // Novabank → Y Doğu (same group)
    "garanti":    "1080101006", // Garanti Bankası K Kartı Hesabı
};

function resolveKkGlAccount(txtBanka: string): string {
    const bankName = (txtBanka || "").toLowerCase().trim();
    for (const [key, gl] of Object.entries(KK_BANK_GL)) {
        if (bankName.includes(key)) {
            return gl;
        }
    }
    throw new Error(`Unknown bank for credit card GL mapping: "${txtBanka}". Known banks: ${Object.keys(KK_BANK_GL).join(', ')}`);
}

function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    // Handle "DD-MM-YYYY HH:mm:ss" or "DD-MM-YYYY HH:mm:ss +03:00"
    const datePart = dateStr.split(' ')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
}

function mapTahsilatToJournalEntry(tahsilatItem: any) {
    const COMPANY_CODE = process.env.SAP_COMPANY_CODE || "1000";
    const USER_ID = process.env.SAP_USER_ID || "CB9980000015";
    const CURRENCY = "TRY";

    const byttip = parseInt(tahsilatItem.BYTTIP || "0", 10);
    const config = TYPE_CONFIG[byttip];
    if (!config) {
        throw new Error(`Unsupported BYTTIP: ${byttip}. Supported types: ${SUPPORTED_TYPES}`);
    }

    // For credit card (BYTTIP=6), resolve GL account from TXTBANKA
    const glAccount = byttip === 6
        ? resolveKkGlAccount(tahsilatItem.TXTBANKA)
        : config.glAccount;

    const amount = parseFloat(tahsilatItem.DBLTUTAR || "0").toFixed(2);
    const docDate = formatDate(tahsilatItem.TRHISLEMTARIHI);
    const postingDate = formatDate(tahsilatItem.TRHODEMETARIHI) || docDate;

    // TODO: TXTMUSTERIKOD needs a mapping table to SAP Debtor codes.
    // Currently hardcoded to '10000000' — example requests show '20000000'.
    const customerCode = '10000000';
    const description = tahsilatItem.TXTACIKLAMA || "";
    const receiptNo = tahsilatItem.TXTMAKBUZNO || "";

    return {
        JournalEntry: {
            OriginalReferenceDocumentType: "BKPFF",
            OriginalReferenceDocument: "",
            OriginalReferenceDocumentLogicalSystem: "",
            BusinessTransactionType: "",
            AccountingDocumentType: config.docType,
            DocumentHeaderText: `${config.label} ${receiptNo} ${description}`.trim(),
            CreatedByUser: USER_ID,
            CompanyCode: COMPANY_CODE,
            DocumentDate: docDate,
            PostingDate: postingDate,
            TaxDeterminationDate: "",
            Item: {
                ReferenceDocumentItem: "",
                ItemGroup: "",
                CompanyCode: COMPANY_CODE,
                GLAccount: glAccount,
                AmountInTransactionCurrency: {
                    currencyCode: CURRENCY,
                    value: amount,
                },
                AmountInCompanyCodeCurrency: {
                    currencyCode: CURRENCY,
                    value: amount,
                },
                DebitCreditCode: "",
                DocumentItemText: `${config.label} ${description}`.trim(),
                AssignmentReference: "",
                Tax: {
                    TaxCode: "",
                },
                AccountAssignment: {
                    AccountAssignmentType: "",
                    ProfitCenter: "",
                    Segment: "",
                    SalesOrder: "",
                    SalesOrderItem: "",
                },
                ProfitabilitySupplement: {
                    Customer: "",
                    CustomerCountry: "",
                },
            },
            DebtorItem: {
                ReferenceDocumentItem: "1",
                Debtor: customerCode,
                AmountInTransactionCurrency: {
                    currencyCode: CURRENCY,
                    value: `-${amount}`,
                },
                AmountInCompanyCodeCurrency: {
                    currencyCode: CURRENCY,
                    value: `-${amount}`,
                },
                DebitCreditCode: "H",
                DocumentItemText: `${config.label} ${receiptNo}`.trim(),
                PaymentMethod: "",
                Reference1IDByBusinessPartner: "",
                Reference2IDByBusinessPartner: "",
                Reference3IDByBusinessPartner: "",
                OneTimeCustomerDetails: {
                    Name: "",
                    CityName: "",
                    Country: "",
                },
            },
        },
    };
}

export function mapTahsilatXmlToBulkRequest(parsedXml: any) {
    const tahsilatList = Array.isArray(parsedXml.TAHSILATLAR.TAHSILAT)
        ? parsedXml.TAHSILATLAR.TAHSILAT
        : [parsedXml.TAHSILATLAR.TAHSILAT];

    const journalEntries = tahsilatList.map(mapTahsilatToJournalEntry);

    return {
        JournalEntryBulkCreateRequest: {
            JournalEntryCreateRequest: journalEntries,
        },
    };
}
