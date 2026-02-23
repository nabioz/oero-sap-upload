# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js 16 (App Router) application for SAP integration. Users upload Turkish XML files through a drag-and-drop UI, which are parsed, mapped to SAP format, and posted to SAP via Cloud Platform Integration (CPI) REST API.

Supported document types:
- **Tahsilat (Collection/Receipt)** — `<TAHSILATLAR>` root → SAP FI Journal Entry endpoint
- **Fatura (Invoice)** — `<FATURALAR>` root → SAP CreateSalesOperation endpoint
  - Sales Invoices (`BYTTUR=0`), Service Invoices (`BYTTUR=5`) → `SalesOrderType: OR`
  - Returns (`BYTTUR=8`) → `CustomerReturnType: CBRE` with return-specific field names

## Commands

- `npm run dev` — Start development server (localhost:3000)
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run lint` — Run ESLint
- `npx tsx scripts/verify-mapping.ts` — Run mapping verification script locally (currently Tahsilat only — validates XML parsing and SAP JSON output without calling the API)

## Architecture

### Data Flow

```
FileUploader (client, drag-drop .xml) → UploadDashboard (client, state/queue management)
  → processXmlFile() (Server Action in app/actions/process-xml.ts)
    → parseXML() (app/lib/xml-parser.ts, uses fast-xml-parser)
    → Route by root element:
      TAHSILATLAR → mapTahsilatXmlToBulkRequest() → sendToSAP() (JournalEntry endpoint)
      FATURALAR   → mapFaturaXmlToSalesRequests() → sendToSAPEndpoint() (CreateSalesOperation endpoint)
```

### Key Modules

- **`app/actions/process-xml.ts`** — Server Action orchestrator. Receives FormData, parses XML, detects root element (TAHSILATLAR or FATURALAR), routes to appropriate mapper and SAP endpoint.
- **`app/lib/mappers/tahsilat-mapper.ts`** — Maps Tahsilat XML fields to SAP JournalEntryBulkCreateRequest JSON.
- **`app/lib/mappers/sales-mapper.ts`** — Maps Fatura (FATURALAR) XML to SAP CreateSalesOperation JSON. Each BASLIK (invoice header + DETAY line items) becomes a separate API request. Sales (OR) and Returns (CBRE) produce different JSON shapes with different field names (see SAP Mapping Details). Hardcoded SAP defaults: SalesOrganization `3610`, DistributionChannel `10`, OrganizationDivision `0`, ProductionPlant `3610`, StorageLocation `361A`, Currency `TRY`.
- **`app/lib/sap-client.ts`** — SAP CPI HTTP client. Base64-encoded Basic Auth. `sendToSAP()` for JournalEntry endpoint, `sendToSAPEndpoint()` for any custom URL (used by sales flow).
- **`app/lib/xml-parser.ts`** — Thin wrapper around fast-xml-parser.
- **`app/components/FileUploader.tsx`** — Client component. Drag-and-drop file input for .xml files with Framer Motion animations.
- **`app/components/UploadDashboard.tsx`** — Client component. Manages file queue state, processes files sequentially, displays per-file status (idle → parsing → sending → success/error).
- **`app/types.ts`** — Shared types: `ProcessingStatus`, `UploadedFile`.

### SAP Mapping Details

#### Tahsilat → JournalEntry
Each Tahsilat XML entry maps to a Journal Entry with two line items:
1. **Item** (debit) — GL account posting (account varies by type)
2. **DebtorItem** (credit) — Customer account posting

**BYTTIP differentiates payment type** — each gets a different document type and GL account:
- `0` (Nakit/Cash) → DocType `NT`, GL `1000101007`
- `2` (Çek/Cheque) → DocType `CT`, GL `1010101001`
- `6` (Kredi Kartı/Credit Card) → DocType `KT`, GL resolved per bank name (`TXTBANKA` field, fuzzy-matched against `KK_BANK_GL` lookup in tahsilat-mapper.ts)

Hardcoded SAP defaults (configurable via env): CompanyCode `1000`, Currency `TRY`.

**Note:** Customer code (TXTMUSTERIKOD) is currently hardcoded to `10000000` — a proper mapping table is pending.

#### Fatura → CreateSalesOperation
Each BASLIK in the FATURALAR XML maps to one CreateSalesOperation request (sent sequentially). Sales and returns produce **different JSON shapes** per EFES_SD_Mapping spec:

**Sales (BYTTUR=0,5) — OR order type:**
- **Header**: `SalesOrderType: OR`, SoldToParty/ShipToParty from TXTMUSTERIKOD, reference from LNGBELGEKOD
- **Items**: `SalesOrderItem`, `SalesOrderItemCategory: NORM`, Material from TXTURUNKOD, quantity from DBLMIKTAR, condition-based pricing (`ConditionType: PMP0`, `ConditionRateValue` from DBLBIRIMFIYAT), `ProductionPlant: 3610`, `StorageLocation: 361A`

**Returns (BYTTUR=8) — CBRE order type:**
- **Header**: `CustomerReturnType: CBRE`, `SDDocumentReason: 102`, SoldToParty from TXTMUSTERIKOD
- **Items**: `CustomerReturnItem`, Material, quantity, `ReturnReason: 102`, `ProductionPlant: 3610`

Shared hardcoded values: SalesOrganization `3610`, DistributionChannel `10`, OrganizationDivision `0`, Currency `TRY`

## Environment Variables

Required in `.env.local`:
- `SAP_API_URL` — SAP CPI JournalEntry endpoint URL (for Tahsilat)
- `SAP_SALES_API_URL` — SAP CPI CreateSalesOperation endpoint URL (for Fatura)
- `SAP_USER` / `SAP_PASSWORD` — SAP Basic Auth credentials (shared across endpoints)
- `SAP_COMPANY_CODE` — SAP company code (default: `1000`)
- `SAP_GL_ACCOUNT` — Cash GL account number (default: `1000101007`)
- `SAP_USER_ID` — SAP user ID for postings (default: `CB9980000015`)

## Tech Stack

- **Next.js 16.1.3** with App Router, React 19, TypeScript (strict mode)
- **fast-xml-parser** for XML parsing
- **Tailwind CSS 4** with custom CSS variables and utility classes (`glass-panel`, `premium-gradient-text`, `premium-button` defined in `globals.css`)
- **Framer Motion** for animations, **Lucide React** for icons
- **clsx + tailwind-merge** via `cn()` helper in `app/lib/utils.ts`
- No database — stateless file processing
- No API routes — all backend logic via Server Actions

## Test Data

`examples/` contains sample XML files for each document type and expected SAP JSON request bodies:
- Tahsilat: `13.01.2026nakit (1).xml`, `13.01.2026kk.xml`, `13.01.2026cektah.xml` with matching `*_Req.json`
- Fatura: `Sat_Fat_*.xml` (sales), `Sat_Iade_Fat_*.xml` (returns), `Ver_Hiz_Fat*.xml` (service)
- `EFES_SD_Mapping (1).xlsx` and `Defteri kebir hesapları (25).xlsx` are reference mapping docs
