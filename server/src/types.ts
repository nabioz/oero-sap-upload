// --- Raw XML types (from fast-xml-parser) ---

export type TahsilatXmlItem = {
    BYTTIP?: string | number;
    TXTMUSTERIKOD?: string | number;
    DBLTUTAR?: string | number;
    TXTMAKBUZNO?: string | number;
    TRHISLEMTARIHI?: string | number;
    TXTACIKLAMA?: string | number;
    TXTBANKA?: string | number;
    TRHODEMETARIHI?: string | number;
};

export type DetayXmlItem = {
    LNGKALEMSIRA?: string | number;
    TXTURUNKOD?: string | number;
    DBLMIKTAR?: string | number;
    TXTURUNBIRIM?: string | number;
    DBLBIRIMFIYAT?: string | number;
    DBLKDVORANI?: string | number;
};

export type BaslikXmlItem = {
    BYTTUR?: string | number;
    LNGBELGEKOD?: string | number;
    TXTMUSTERIKOD?: string | number;
    TRHFATURATARIHI?: string | number;
    TRHBELGETARIHI?: string | number;
    BYTODEMETIP?: string | number;
    DETAY?: DetayXmlItem | DetayXmlItem[];
};

export type ParsedFaturaXml = {
    FATURALAR: {
        BASLIK: BaslikXmlItem | BaslikXmlItem[];
    };
};

export type ParsedTahsilatXml = {
    TAHSILATLAR: {
        TAHSILAT: TahsilatXmlItem | TahsilatXmlItem[];
    };
};

export type ParsedXmlResult = {
    FATURALAR?: ParsedFaturaXml['FATURALAR'];
    TAHSILATLAR?: ParsedTahsilatXml['TAHSILATLAR'];
};

// --- SAP Sales payload types ---

export type SalesItemPayload = {
    PurchaseOrderByCustomer: string;
    ItemNo: string;
    HigherLevelItemNumber: string;
    RejectionReason: string;
    Material: string;
    BomMaterial: string;
    RequestedQuantity: string;
    RequestedQuantityUnit: string;
    TransactionCurrency: string;
    UnitPrice: string;
    AmountBasedDiscount: string;
    PartnerFunction: string;
};

export type SalesRequestPayload = {
    Header: {
        HeaderType: {
            PurchaseOrderByCustomer: string;
            SalesOrganization: string;
            DistributionChannel: string;
            OrganizationDivision: string;
            SalesOrderType: string;
            SoldToParty: string;
            ShipToParty: string;
            TransactionCurrency: string;
            OrderReason: string;
            CustomerPaymentTerms: string;
            _Item: {
                ItemType: SalesItemPayload[];
            };
        };
    };
};

// --- SAP Journal Entry payload types ---

type CurrencyAmount = {
    currencyCode: string;
    value: string;
};

export type JournalEntryPayload = {
    JournalEntry: {
        OriginalReferenceDocumentType: string;
        OriginalReferenceDocument: string;
        OriginalReferenceDocumentLogicalSystem: string;
        BusinessTransactionType: string;
        AccountingDocumentType: string;
        DocumentHeaderText: string;
        CreatedByUser: string;
        CompanyCode: string;
        DocumentDate: string;
        PostingDate: string;
        TaxDeterminationDate: string;
        Item: {
            ReferenceDocumentItem: string;
            ItemGroup: string;
            CompanyCode: string;
            GLAccount: string;
            AmountInTransactionCurrency: CurrencyAmount;
            AmountInCompanyCodeCurrency: CurrencyAmount;
            DebitCreditCode: string;
            DocumentItemText: string;
            AssignmentReference: string;
            Tax: { TaxCode: string };
            AccountAssignment: {
                AccountAssignmentType: string;
                ProfitCenter: string;
                Segment: string;
                SalesOrder: string;
                SalesOrderItem: string;
            };
            ProfitabilitySupplement: {
                Customer: string;
                CustomerCountry: string;
            };
        };
        DebtorItem: {
            ReferenceDocumentItem: string;
            Debtor: string;
            AmountInTransactionCurrency: CurrencyAmount;
            AmountInCompanyCodeCurrency: CurrencyAmount;
            DebitCreditCode: string;
            DocumentItemText: string;
            PaymentMethod: string;
            Reference1IDByBusinessPartner: string;
            Reference2IDByBusinessPartner: string;
            Reference3IDByBusinessPartner: string;
            OneTimeCustomerDetails: {
                Name: string;
                CityName: string;
                Country: string;
            };
        };
    };
};

export type JournalEntryBulkRequestPayload = {
    JournalEntryBulkCreateRequest: {
        JournalEntryCreateRequest: JournalEntryPayload[];
    };
};

// --- SAP Return (CBRE) payload types ---

export type ReturnItemPayload = {
    CustomerReturnItem: string;
    Material: string;
    RequestedQuantity: string;
    RequestedQuantityUnit: string;
    ReturnReason: string;
    ProductionPlant: string;
};

export type ReturnRequestPayload = {
    Header: {
        HeaderType: {
            CustomerReturnType: string;
            // SDDocumentReason: string;
            SalesOrganization: string;
            DistributionChannel: string;
            OrganizationDivision: string;
            SoldToParty: string;
            TransactionCurrency: string;
            PurchaseOrderByCustomer: string;
            _Item: {
                ItemType: ReturnItemPayload[];
            };
        };
    };
};

export type InvoiceRequestPayload = SalesRequestPayload | ReturnRequestPayload;

// --- SAP client response ---

export type SapClientResult = {
    success: boolean;
    data?: unknown;
    error?: string;
    details?: unknown;
};
