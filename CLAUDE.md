# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vite + React (frontend) and Hono (backend) application for SAP integration. Users upload Turkish XML files through a drag-and-drop UI, which are parsed, mapped to SAP format, and posted to SAP via Cloud Platform Integration (CPI) REST API.

Supported document types:
- **Tahsilat (Collection/Receipt)** — `<TAHSILATLAR>` root → SAP FI Journal Entry endpoint
- **Fatura (Invoice)** — `<FATURALAR>` root → SAP CreateSalesOperation endpoint
  - Sales Invoices (`BYTTUR=0`), Service Invoices (`BYTTUR=5`) → `SalesOrderType: OR`
  - Returns (`BYTTUR=8`) → `CustomerReturnType: CBRE` with return-specific field names

## Commands

- `npm run dev` — Start both client (Vite, localhost:5173) and server (Hono, localhost:3001) concurrently
- `npm run dev:client` — Start Vite dev server only
- `npm run dev:server` — Start Hono dev server only (with file watching)
- `npm run build` — Build client for production
- `npm run lint` — Run ESLint
- `npm run verify-mapping` — Run mapping verification script locally (currently Tahsilat only — validates XML parsing and SAP JSON output without calling the API)

## Architecture

### Data Flow

```
FileUploader (client, drag-drop .xml) → UploadDashboard (client, state/queue management)
  → fetch POST /api/process-xml (client/src/lib/api.ts)
    → Hono route handler (server/src/routes/process-xml.ts)
      → parseXML() (server/src/lib/xml-parser.ts, uses fast-xml-parser)
      → Route by root element:
        TAHSILATLAR → mapTahsilatXmlToBulkRequest() → sendToSAP() (JournalEntry endpoint)
        FATURALAR   → mapFaturaXmlToSalesRequests() → sendToSAPEndpoint() (CreateSalesOperation endpoint)
```

In development, Vite's dev server proxies `/api/*` requests to the Hono server at port 3001.

### Key Modules

**Server (`server/src/`):**
- **`index.ts`** — Hono app entry point. Loads `.env` via dotenv, sets up CORS + logger middleware, mounts routes, serves on port 3001.
- **`routes/process-xml.ts`** — POST `/api/process-xml` route. Accepts multipart/form-data, parses XML, detects root element (TAHSILATLAR or FATURALAR), routes to appropriate mapper and SAP endpoint. Returns JSON `ProcessResult`.
- **`lib/sap-client.ts`** — SAP CPI HTTP client. Base64-encoded Basic Auth. `sendToSAP()` for JournalEntry endpoint, `sendToSAPEndpoint()` for any custom URL (used by sales flow).
- **`lib/xml-parser.ts`** — Thin wrapper around fast-xml-parser.
- **`lib/mappers/tahsilat-mapper.ts`** — Maps Tahsilat XML fields to SAP JournalEntryBulkCreateRequest JSON.
- **`lib/mappers/sales-mapper.ts`** — Maps Fatura (FATURALAR) XML to SAP CreateSalesOperation JSON. Each BASLIK (invoice header + DETAY line items) becomes a separate API request. Sales (OR) and Returns (CBRE) produce different JSON shapes with different field names (see SAP Mapping Details). Hardcoded SAP defaults: SalesOrganization `3610`, DistributionChannel `10`, OrganizationDivision `0`, ProductionPlant `3610`, StorageLocation `361A`, Currency `TRY`.

**Client (`client/src/`):**
- **`App.tsx`** — Root React component with gradient background.
- **`main.tsx`** — React entry point, mounts App to DOM.
- **`lib/api.ts`** — Fetch wrapper for `/api/process-xml`. Same function signature as the old Server Action for minimal component changes.
- **`lib/utils.ts`** — `cn()` helper (clsx + tailwind-merge).
- **`components/FileUploader.tsx`** — Drag-and-drop file input for .xml files with Framer Motion animations.
- **`components/UploadDashboard.tsx`** — Manages file queue state, processes files sequentially, displays per-file status (idle → parsing → sending → success/error).
- **`types.ts`** — Client types: `ProcessingStatus`, `UploadedFile`.

**Shared (`shared/`):**
- **`types.ts`** — `ProcessResult` type used by both client and server.

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

Required in `.env`:
- `SAP_API_URL` — SAP CPI JournalEntry endpoint URL (for Tahsilat)
- `SAP_SALES_API_URL` — SAP CPI CreateSalesOperation endpoint URL (for Fatura)
- `SAP_USER` / `SAP_PASSWORD` — SAP Basic Auth credentials (shared across endpoints)
- `SAP_COMPANY_CODE` — SAP company code (default: `1000`)
- `SAP_GL_ACCOUNT` — Cash GL account number (default: `1000101007`)
- `SAP_USER_ID` — SAP user ID for postings (default: `CB9980000015`)

## Tech Stack

- **Vite 6** with React 19, TypeScript (strict mode) — frontend SPA
- **Hono 4** on `@hono/node-server` — lightweight backend API server
- **fast-xml-parser** for XML parsing (server-side)
- **Tailwind CSS 4** with `@tailwindcss/vite` plugin, custom CSS variables and utility classes (`glass-panel`, `premium-gradient-text`, `premium-button` defined in `globals.css`)
- **Framer Motion** for animations, **Lucide React** for icons
- **clsx + tailwind-merge** via `cn()` helper in `client/src/lib/utils.ts`
- **dotenv** for server-side environment variable loading
- **concurrently** for running client + server dev servers together
- No database — stateless file processing

## Test Data

`examples/` contains sample XML files for each document type and expected SAP JSON request bodies:
- Tahsilat: `13.01.2026nakit (1).xml`, `13.01.2026kk.xml`, `13.01.2026cektah.xml` with matching `*_Req.json`
- Fatura: `Sat_Fat_*.xml` (sales), `Sat_Iade_Fat_*.xml` (returns), `Ver_Hiz_Fat*.xml` (service)
- `EFES_SD_Mapping (1).xlsx` and `Defteri kebir hesapları (25).xlsx` are reference mapping docs
