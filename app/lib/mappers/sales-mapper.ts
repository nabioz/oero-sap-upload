// Maps FATURALAR (Invoice) XML to SAP CreateSalesOperation JSON format.
// Handles Sales Invoices (BYTTUR=0), Service Invoices (BYTTUR=5), and Returns (BYTTUR=8).
// Sales uses OR order type; Returns use CBRE with return-specific field names.

const SALES_ORG = "3610";
const DIST_CHANNEL = "10";
const ORG_DIVISION = "0";
const CURRENCY = "TRY";
const PRODUCTION_PLANT = "3610";
const STORAGE_LOCATION = "361A";

// Sales (OR) constants
const SALES_ORDER_TYPE = "OR";
const SALES_ITEM_CATEGORY = "NORM";
const CONDITION_TYPE = "PMP0";

// Return (CBRE) constants
const RETURN_ORDER_TYPE = "CBRE";
const RETURN_REASON = "102";

// BYTTUR=8 indicates a return (iade) document
const RETURN_BYTTUR = 8;

function mapDetayToSalesItem(detay: any, headerRef: string): any {
    const itemNo = (parseInt(detay.LNGKALEMSIRA || "1", 10) * 10).toString();

    return {
        PurchaseOrderByCustomer: headerRef,
        SalesOrderItem: itemNo,
        SalesOrderItemCategory: SALES_ITEM_CATEGORY,
        SalesOrderItemText: "",
        Material: detay.TXTURUNKOD || "",
        BomMaterial: "",
        RequestedQuantity: detay.DBLMIKTAR || "",
        RequestedQuantityUnit: detay.TXTURUNBIRIM || "",
        ProductionPlant: PRODUCTION_PLANT,
        StorageLocation: STORAGE_LOCATION,
        ConditionType: CONDITION_TYPE,
        ConditionRateValue: detay.DBLBIRIMFIYAT || "",
        ConditionCurrency: CURRENCY,
        ConditionQuantity: "1",
        ConditionQuantityUnit: detay.TXTURUNBIRIM || "",
    };
}

function mapDetayToReturnItem(detay: any): any {
    const itemNo = (parseInt(detay.LNGKALEMSIRA || "1", 10) * 10).toString();

    return {
        CustomerReturnItem: itemNo,
        Material: detay.TXTURUNKOD || "",
        RequestedQuantity: detay.DBLMIKTAR || "",
        RequestedQuantityUnit: detay.TXTURUNBIRIM || "",
        TransactionCurrency: CURRENCY,
        ProductionPlant: PRODUCTION_PLANT,
        ReturnReason: RETURN_REASON,
    };
}

function mapBaslikToSalesRequest(baslik: any): any {
    const byttur = parseInt(baslik.BYTTUR || "0", 10);
    const isReturn = byttur === RETURN_BYTTUR;
    const headerRef = baslik.LNGBELGEKOD || "";

    const detayList = Array.isArray(baslik.DETAY)
        ? baslik.DETAY
        : baslik.DETAY
            ? [baslik.DETAY]
            : [];

    if (isReturn) {
        const items = detayList.map((d: any) => mapDetayToReturnItem(d));

        return {
            Header: {
                HeaderType: {
                    CustomerReturnType: RETURN_ORDER_TYPE,
                    PurchaseOrderByCustomer: headerRef,
                    SalesOrganization: SALES_ORG,
                    DistributionChannel: DIST_CHANNEL,
                    OrganizationDivision: ORG_DIVISION,
                    SoldToParty: baslik.TXTMUSTERIKOD || "",
                    SDDocumentReason: RETURN_REASON,
                    TransactionCurrency: CURRENCY,
                    CustomerPaymentTerms: baslik.BYTODEMETIP || "",
                    _Item: {
                        ItemType: items,
                    },
                },
            },
        };
    }

    const items = detayList.map((d: any) => mapDetayToSalesItem(d, headerRef));

    return {
        Header: {
            HeaderType: {
                SalesOrderType: SALES_ORDER_TYPE,
                PurchaseOrderByCustomer: headerRef,
                SalesOrganization: SALES_ORG,
                DistributionChannel: DIST_CHANNEL,
                OrganizationDivision: ORG_DIVISION,
                SoldToParty: baslik.TXTMUSTERIKOD || "",
                ShipToParty: baslik.TXTMUSTERIKOD || "",
                TransactionCurrency: CURRENCY,
                CustomerPaymentTerms: baslik.BYTODEMETIP || "",
                _Item: {
                    ItemType: items,
                },
            },
        },
    };
}

export function mapFaturaXmlToSalesRequests(parsedXml: any): any[] {
    const baslikList = Array.isArray(parsedXml.FATURALAR.BASLIK)
        ? parsedXml.FATURALAR.BASLIK
        : [parsedXml.FATURALAR.BASLIK];

    return baslikList.map(mapBaslikToSalesRequest);
}
