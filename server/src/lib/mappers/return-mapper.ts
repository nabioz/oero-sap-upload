// Maps FATURALAR returns to SAP CBRE (Customer Return) format.
// Used for both explicit returns (BYTTUR=8) and auto-extracted negative-quantity items.

import type { DetayXmlItem, BaslikXmlItem, ReturnItemPayload, ReturnRequestPayload } from '../../types';

const SALES_ORG = "1000";
const DIST_CHANNEL = "10";
const ORG_DIVISION = "50";
const CURRENCY = "TRY";
const RETURN_REASON = "102";
const PRODUCTION_PLANT = "1000";

function mapDetayToReturnItem(detay: DetayXmlItem, itemNumber: number): ReturnItemPayload {
    return {
        CustomerReturnItem: String(itemNumber * 10),
        // Material: String(detay.TXTURUNKOD ?? ""),
        Material: "sdtest1",
        RequestedQuantity: String(Math.abs(parseFloat(String(detay.DBLMIKTAR ?? "0")))),
        RequestedQuantityUnit: "ADT",
        ReturnReason: RETURN_REASON,
        ProductionPlant: PRODUCTION_PLANT,
    };
}

export function mapBaslikToReturnRequest(
    baslik: BaslikXmlItem,
    detayOverride?: DetayXmlItem[],
): ReturnRequestPayload {
    const headerRef = String(baslik.LNGBELGEKOD ?? "");

    const detayList: DetayXmlItem[] = detayOverride
        ?? (Array.isArray(baslik.DETAY) ? baslik.DETAY : baslik.DETAY ? [baslik.DETAY] : []);

    const items = detayList.map((d, i) => mapDetayToReturnItem(d, i + 1));

    return {
        Header: {
            HeaderType: {
                CustomerReturnType: "CBRE",
                // SDDocumentReason: RETURN_REASON,
                SalesOrganization: SALES_ORG,
                DistributionChannel: DIST_CHANNEL,
                OrganizationDivision: ORG_DIVISION,
                // SoldToParty: String(baslik.TXTMUSTERIKOD ?? ""),
                SoldToParty: "10000308",
                TransactionCurrency: CURRENCY,
                PurchaseOrderByCustomer: headerRef,
                _Item: {
                    ItemType: items,
                },
            },
        },
    };
}
