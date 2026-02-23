// Maps FATURALAR (Invoice) XML to SAP CreateSalesOperation JSON format.
// Handles Sales Invoices (BYTTUR=0), Service Invoices (BYTTUR=5), and Returns (BYTTUR=8).

const SALES_ORG = "3610";
const DIST_CHANNEL = "10";
const ORG_DIVISION = "0";
const CURRENCY = "TRY";
const RETURN_ORDER_REASON = "102";
const RETURN_REJECTION_REASON = "102";

// BYTTUR=8 indicates a return (iade) document
const RETURN_BYTTUR = 8;

function calculateDiscount(detay: any): string {
    let total = 0;
    for (let i = 1; i <= 8; i++) {
        const val = parseFloat(detay[`DBLISKTUTAR${i}`] || "0");
        if (!isNaN(val)) total += val;
    }
    return total.toFixed(2);
}

function mapDetayToItem(detay: any, headerRef: string, isReturn: boolean): any {
    const itemNo = (parseInt(detay.LNGKALEMSIRA || "1", 10) * 10).toString();

    return {
        PurchaseOrderByCustomer: headerRef,
        ItemNo: itemNo,
        HigherLevelItemNumber: "",
        RejectionReason: isReturn ? RETURN_REJECTION_REASON : "",
        Material: detay.TXTURUNKOD || "",
        BomMaterial: "",
        RequestedQuantity: detay.DBLMIKTAR || "",
        RequestedQuantityUnit: detay.TXTURUNBIRIM || "",
        TransactionCurrency: CURRENCY,
        UnitPrice: detay.DBLBIRIMFIYAT || "",
        AmountBasedDiscount: calculateDiscount(detay),
        PartnerFunction: "",
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

    const items = detayList.map((d: any) => mapDetayToItem(d, headerRef, isReturn));

    return {
        Header: {
            HeaderType: {
                PurchaseOrderByCustomer: headerRef,
                SalesOrganization: SALES_ORG,
                DistributionChannel: DIST_CHANNEL,
                OrganizationDivision: ORG_DIVISION,
                SoldToParty: baslik.TXTMUSTERIKOD || "",
                ShipToParty: baslik.TXTMUSTERIKOD || "",
                TransactionCurrency: CURRENCY,
                OrderReason: isReturn ? RETURN_ORDER_REASON : "",
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
