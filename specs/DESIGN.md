# DESIGN — Twolittle.bites OS UI/UX Specification

**Prinsip:** *visual parity first*. Pertahankan komposisi layar Hotfix 19 termasuk cards, tables, modal, quick actions, status chips, dan mobile layout; jangan melakukan redesign saat migrasi backend. Dokumen `reference/LEGACY_DESIGN.md` dan `reference/Twolittle_Bites_Hotfix19_Source.zip` adalah referensi visual final; bila ada ketidaksesuaian antara prose design lama dan CSS aktual, **CSS aktual Hotfix 19 adalah acuan implementasi**.

## 1. Design tokens

```css
:root {
  --twb-primary: #DE5D3D;
  --twb-primary-dark: #9E3B26;
  --twb-cream: #F6F6D2;
  --twb-pink: #FDD3D7;
  --twb-bg: #FFF8F6;
  --twb-surface: #FFFFFF;
  --twb-surface-warm: #FFF0EE;
  --twb-ink: #3E0500;
  --twb-ink-soft: #58413C;
  --twb-outline: #DFBFB8;
  --twb-healthy: #2E7D32;
  --twb-attention: #E65100;
  --twb-critical: #C62828;
  --twb-radius-sm: 8px;
  --twb-radius-md: 16px;
  --twb-radius-lg: 24px;
  --twb-radius-xl: 32px;
  --twb-max: 1440px;
  --twb-header-h: 60px;
}
```

**Typeface:** Poppins untuk angka/ID/KPI/action/headline struktural; Gaegu untuk label editorial, sentuhan artisanal dan teks pendukung sesuai komponen asli. Sumber style lama mengandung dua sistem tipografi deskriptif; untuk parity prioritaskan `StylesTokens.html` dan CSS screen sebenarnya.

## 2. Layout

| Breakpoint | Layout | Perilaku |
|---|---|---|
| Desktop `>=1200px` | max 1440px, navigasi desktop, 12-col content | Header 60px, KPI grid, table penuh, action di sisi kanan |
| Tablet `768–1199px` | grid 2 kolom/8-col adaptif | Scroll table, cards reflow, nav tidak overflow |
| Mobile `<768px` | single-column/4-col | Drawer nav, modal full-width, tabel horizontal-scroll, sticky action bila relevan |

Grid: gutter 20px desktop, 16px mobile; spacing 4/8/16/24/40px; card padding 24px desktop dan 16px mobile. Hero/feature cards rounded 24–32px, tabel/inputs 8px, hover subtle terracotta/pink.

## 3. Navigasi yang harus dipertahankan

| Halaman (`Page*.html`) | Area utama |
|---|---|
| Executive | KPI, target, attention, pipeline, growth chart, recent orders |
| Orders | Order list, filters, selection bulk, pre-order campaign, invoice/receipt shortcuts |
| Products | Product/variant catalog, image thumbnails, recipes/BOM/scaling |
| Production | Production plan, ingredient requirements, batch & kitchen ticket |
| Inventory | Stock balance, low stock, movement history, adjustments |
| Finance | Invoice, payments/proof, expenses, cash, analytics/P&L |
| Business | Health KPI, channel and operating context, targets |
| Customers | Search, profile, segment, history, CRM analytics |
| Purchasing | Suppliers, PO, receive items/status |
| Marketing | Campaigns, content, attributed orders and spend |
| Reports | Daily/weekly/monthly metrics, target vs actual, export |
| Settings | Business/commerce/invoice/WhatsApp/printing, user, diagnostic, release |

13-domain regression dihitung terpisah dari 12 page containers; Pre-Orders berada pada journey Orders.

## 4. Reusable components

- `AppShell`, `Header`, `Nav`, `MobileDrawer`, `RouteHost`, `Toast`, `ConfirmDialog`, `QuickActions`.
- `PageHero`, `MetricCard`, `TrendCard`, `StatusBadge`, `FilterBar`, `SearchField`, `DataTable` (sort, paginate, empty/loading/error), `RowActions`.
- `OrderForm`, `CustomerPicker`, `ProductVariantPicker`, `MoneyInput`, `WhatsAppPreview`, `InvoicePreview`, `FileUpload`.
- `RecipeScaler`, `MaterialRequirementTable`, `BatchTicket`, `StockMovementForm`, `PurchaseReceiveForm`, `PaymentTimeline`.
- `PrintReceipt58/80`, `KitchenTicket`, `PublicInvoice`, `PublicReceipt`.

## 5. Component behavior & microcopy

- Setiap mutasi punya loading/disabled state, success toast, validation per-field, dan readable server error.
- Delete/cancel/refund memerlukan konfirmasi tindakan, ringkasan amount/target dan alasan bila perlu.
- Payment proof: pilih file → preview nama/ukuran/jenis → validasi JPG/PNG/WebP/PDF ≤8 MiB → progress upload → link *Lihat bukti* hanya role berizin. Tampilkan tidak-punya-akses secara eksplisit, tidak mengubah file jadi publik.
- Idempotent payment retry: toast **“Pembayaran sudah tercatat”** vs **“Pembayaran berhasil dicatat”**.
- Financial totals `Rp 1.250.000` dan decimal quantity sesuai kebutuhan, no rounding currency sembarangan.
- Public invoice tidak menampilkan sidebar, role, internal notes, payment proof, atau admin routes.
- Event WhatsApp membuka `wa.me` dengan nomor ter-normalisasi dan template ter-preview; tidak mengirim tanpa klik.

## 6. Interaction & state

- Cache per-module tetap saat pindah route (mirip Hotfix 19). Refresh eksplisit dan stale-while-revalidate untuk data baca.
- Filter/search di atas cards/table seperti Hotfix 12.
- Modal New Order mempertahankan draft saat pengguna berpindah tab sementara; belum disubmit tidak masuk DB.
- Bulk order progress pilih visible rows, max 100, validasi seluruh target sebelum komit, tampilkan hasil per baris.
- Role gating navigasi dan tombol disinkronkan dengan kemampuan backend.

## 7. Visual QA yang wajib

Ambil baseline screenshot dari Hotfix 19 (bila environment dapat dijalankan) pada viewport desktop `1440×900`, tablet `1024×768`, dan mobile `390×844`: 12 halaman, state kosong/terisi, modal New Order/Payment/Refund, public invoice, print. Toleransi perubahan hanya untuk konten dinamis, font rendering, dan perbaikan aksesibilitas yang disetujui. Jangan mengganti palette, font, label, atau hierarki cards secara otomatis.
