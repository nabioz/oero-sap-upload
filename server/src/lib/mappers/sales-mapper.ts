// Maps FATURALAR (Invoice) XML to SAP CreateSalesOperation JSON format.
// Handles Sales Invoices (BYTTUR=0) and Service Invoices (BYTTUR=5).
// Returns (BYTTUR=8) are handled by return-mapper.ts.

import type { DetayXmlItem, BaslikXmlItem, ParsedFaturaXml, SalesItemPayload, SalesRequestPayload } from '../../types';

const SALES_ORG = "1000";
const DIST_CHANNEL = "10";
const ORG_DIVISION = "50";
const CURRENCY = "TRY";

function mapDetayToItem(detay: DetayXmlItem, headerRef: string): SalesItemPayload {
    const itemNo = (parseInt(String(detay.LNGKALEMSIRA ?? "1"), 10) * 10).toString();

    return {
        PurchaseOrderByCustomer: headerRef,
        ItemNo: itemNo,
        HigherLevelItemNumber: "",
        RejectionReason: "",
        // Material: String(detay.TXTURUNKOD ?? ""),
        Material: "sdtest1",
        BomMaterial: "",
        RequestedQuantity: String(detay.DBLMIKTAR ?? ""),
        RequestedQuantityUnit: "ADT", // PC (adet), CRT (crate)
        TransactionCurrency: CURRENCY,
        UnitPrice: String(detay.DBLBIRIMFIYAT ?? ""),
        AmountBasedDiscount: "",
        PartnerFunction: "",
    };
}

/**
 * Maps a single BASLIK to a sales OR request.
 * When detayOverride is provided, uses those items instead of baslik.DETAY
 * (used by scanFatura for negative-quantity splitting).
 */
export function mapBaslikToSalesRequest(
    baslik: BaslikXmlItem,
    detayOverride?: DetayXmlItem[],
): SalesRequestPayload {
    const headerRef = String(baslik.LNGBELGEKOD ?? "");

    const detayList: DetayXmlItem[] = detayOverride
        ?? (Array.isArray(baslik.DETAY) ? baslik.DETAY : baslik.DETAY ? [baslik.DETAY] : []);

    const items = detayList.map((d) => mapDetayToItem(d, headerRef));

    return {
        Header: {
            HeaderType: {
                PurchaseOrderByCustomer: headerRef,
                SalesOrganization: SALES_ORG,
                DistributionChannel: DIST_CHANNEL,
                OrganizationDivision: ORG_DIVISION,
                SalesOrderType: "OR",
                // SoldToParty: String(baslik.TXTMUSTERIKOD ?? ""),
                // ShipToParty: String(baslik.TXTMUSTERIKOD ?? ""),
                SoldToParty: "10000308",
                ShipToParty: "10000308",
                TransactionCurrency: CURRENCY,
                OrderReason: "",
                // CustomerPaymentTerms: String(baslik.BYTODEMETIP ?? ""),
                CustomerPaymentTerms: "Z045",
                _Item: {
                    ItemType: items,
                },
            },
        },
    };
}

/** Legacy: maps full parsed XML to sales requests (used by process-xml.ts). */
export function mapFaturaXmlToSalesRequests(parsedXml: ParsedFaturaXml): SalesRequestPayload[] {
    const baslikList: BaslikXmlItem[] = Array.isArray(parsedXml.FATURALAR.BASLIK)
        ? parsedXml.FATURALAR.BASLIK
        : [parsedXml.FATURALAR.BASLIK];

    return baslikList.map((b) => mapBaslikToSalesRequest(b));
}
