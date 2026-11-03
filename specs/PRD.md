# PRD — Twolittle.bites OS (Supabase Edition)

**Product:** Twolittle.bites OS · **Baseline:** Apps Script v1.0.0 RC Hotfix 19 · **Date:** 2026-10-28  
**Type:** Web app internal, responsive · **Market:** operasional bisnis dessert/bakery Indonesia · **Primary language:** Indonesia

## 1. Masalah, visi, hasil

Bisnis membutuhkan satu sumber data yang tersambung dari inquiry/pemasaran sampai kas, stok, produksi, dan laba. Proses manual/Sheets rawan double entry, keterlambatan update, inkonsistensi status, kesalahan stok, dan izin akses yang lemah. Visi: **“Input once, reuse everywhere.”** Operator mencatat setiap transaksi sekali; dashboard, invoice, production, inventory, CRM, dan laporan ikut berubah secara konsisten.

### Sasaran

- Rekonstruksi seluruh fungsi Hotfix 19, bukan MVP yang menghapus modul lama.
- Menjaga jejak data, snapshot historis, audit actor/time/source.
- Mempercepat workflow order→invoice→payment→production→fulfillment.
- Mengisolasi akses finansial dan bukti pembayaran.
- Mendukung desktop/mobile tanpa mengubah visual identity secara sepihak.

### Metrik keberhasilan (target UAT, bukan hasil aktual)

1. 100% dari 33 sheet kanonis punya mapping dan hasil rekonsiliasi (jumlah row, business ID, nilai uang, saldo stok).
2. 13 domain bisnis lulus regression; 12 page utama visually equivalent pada desktop/tablet/mobile.
3. 0 pembayaran/stock movement/expense ganda akibat retry dan concurrency test.
4. 0 kebocoran role atau akses file privat dari pengguna tak berizin.
5. Semua invoice total/paid/remaining dan stok per bahan sesuai dengan ledger sumber pada cutover.
6. P95 baca daftar operasional < 2 detik pada dataset UAT yang disepakati; write umum < 3 detik (kecuali upload/PDF), diukur di staging.

## 2. Pengguna dan role

| Role | Tanggung jawab |
|---|---|
| OWNER | Semua domain, user/role, finansial penuh, konfigurasi sensitif, release/backups |
| ADMIN | Operasi pesanan, produk, purchase, invoice, pengaturan operasional; profit detail terbatas |
| PRODUCTION | Production plan, batch, resep/quantity, stok; tanpa profit atau bukti bayar |
| MARKETING | Campaign, content, attribution, CRM terbatas; tanpa margin/payment evidence |
| FINANCE | Invoice, pembayaran/refund, pengeluaran, kas, laporan/P&L; settings read-only |

UI role-aware hanyalah lapisan pengalaman; database/API menegakkan authorization.

## 3. Modul dan kebutuhan fungsional

| ID | Modul | Kebutuhan minimal untuk feature parity | Prioritas |
|---|---|---|---|
| FR-01 | App/Auth | Login, sesi, role, nav, loading/error, responsive shell, activity history | P0 |
| FR-02 | Executive | KPI revenue/completed/net cash sesuai Reports; pipeline, attention, growth, recent orders; profit hanya OWNER/FINANCE | P1 |
| FR-03 | Business | Business health, targets vs actual, channel mix, operating context, role-limited cards | P1 |
| FR-04 | Customers/CRM | CRUD/soft archive, nomor WA normalisasi, search, order history, segment/repeat/VIP/dormant, affinity/channel metrics | P0 |
| FR-05 | Products | SKU, kategori, harga, status, gambar, variant/size/harga override, edit, historical price protection | P0 |
| FR-06 | Recipes/BOM | Ingredient+packaging, recipe version, exact/full-batch scaling, unit conversion, waste allowance, COGS | P0 |
| FR-07 | Pre-Order | Campaign period, cutoff, production/fulfillment dates, capacity order/qty, owner override + alasan/audit | P0 |
| FR-08 | Orders | Create + snapshot line items, source channel, fulfillment, discount/tax/delivery, status graph, cancel guard, bulk progress ≤100 | P0 |
| FR-09 | Invoices | One active invoice/order, display number, public token, due date, PDF regenerasi dan WhatsApp link | P0 |
| FR-10 | Payments | DP/partial/full, success/refund events, balance derived, `reference_no` idempotent, conflict rejection, auto-confirm | P0 |
| FR-11 | Payment Proof | Upload JPG/PNG/WebP/PDF ≤8 MiB, type/signature validation, private Storage, standardized filename, staff-authorized view | P0 |
| FR-12 | Production | Plan dari eligible orders/preorder, recipe snapshot, requirements/shortage, batches, yield/waste, once-only stock usage posting, kitchen ticket | P0 |
| FR-13 | Inventory | Ingredient+packaging balances dari immutable movements, low stock, adjustments with reasons, non-negative guard, weighted average cost | P0 |
| FR-14 | Purchasing | Suppliers, PO, items, partial/full receiving, purchase receipt movement once-only, procurement cost | P0 |
| FR-15 | Finance | Invoices, payments/refunds, expenses, transactions, cashflow vs noncash COGS, managerial P&L, backfill COGS | P0 |
| FR-16 | Marketing | Campaigns, content per platform, expenses, order attribution, spend/revenue/orders, ROAS metrics | P1 |
| FR-17 | Reports | Daily/weekly/monthly reports, metric caches, target tracking, CSV export, role-masked columns | P1 |
| FR-18 | Settings | Business/logo, invoice, WhatsApp placeholders, payment/fulfillment/sales chips, printing, user roles, diagnostics, backup/release controls | P1 |
| FR-19 | Printing | Public invoice, Drive-era invoice PDF equivalent in Storage, 58/80mm thermal receipt, optional kitchen ticket, browser print only | P1 |
| FR-20 | Reliability | Monitoring, audit logs, retries, duplicate guards, reconciliation, immutable transaction/movement history, safe release/rollback | P0 |

## 4. Journey end to end

1. Admin membuat produk, recipe/yield/version, ingredients, supplier dan stok awal.
2. Marketing mencatat campaign/content; customer bisa dibuat inline saat order.
3. Operator membuat order/pre-order, item disimpan sebagai **harga saat order**.
4. Sistem membuat invoice + token tampilan publik terbatas; operator membuka WhatsApp melalui deep link, tidak auto-send.
5. Finance mencatat DP atau pelunasan beserta proof privat. Status invoice/order dihitung dari payment ledger; order dapat auto-confirm saat paid bila setting aktif.
6. Production membuat rencana, resep/version dan kebutuhan material di-snapshot; kekurangan stok memicu purchasing.
7. Purchase receipt masuk stok via inventory ledger; batch posting pemakaian material hanya sekali.
8. Order bergerak READY → DELIVERY/COMPLETED; transaksi COGS/noncash terkait diproses.
9. Dashboard, customer metrics, marketing attribution, laporan, dan P&L memantulkan data authoritative.

## 5. Aturan bisnis wajib

- Uang disimpan dalam **integer IDR (`bigint`)**; tidak menggunakan float JS untuk posting uang.
- Order status mengikuti graph resmi di `WORKFLOWS.md`; terminal COMPLETED/CANCELLED.
- `order_items.unit_price` / `line_total` adalah snapshot; edit harga katalog tidak mengubah histori.
- `payments.status=SUCCESS` menambah paid; `REFUND` mengurangi paid. `sum(refund) <= sum(success)` dan net paid tidak boleh melebihi nilai invoice tanpa aturan explicit.
- Payment retry harus idempotent dengan unique `(org_id, reference_no)` **untuk reference non-null**; mismatch amount/method/invoice/status/proof → conflict.
- Refund memeriksa sisa refundable di transaksi PostgreSQL yang mengunci invoice (concurrency-safe).
- Rebuild invoice balance dari ledger, bukan perubahan status manual.
- `inventory_movements` event authoritative; balance cache bisa di-rebuild. Posting ulang purchase receipt/production usage ditolak.
- `preorder_campaigns.current_booked` cache derived; server mengecek cutoff dan capacity secara atomik.
- Invoice publik token acak kuat, akses hanya field terbatas, rate-limited, revoke/rotate tersedia.
- File payment proof private: hanya role yang disetujui (`OWNER`, `FINANCE`) secara default; tidak pernah `public bucket`.
- Cancel order yang sudah dibayar memerlukan alur refund, bukan hanya mengubah status.

## 6. Non-functional requirements

- Supabase Auth; semua business table mengaktifkan RLS. Tidak ada service role key pada browser.
- Transaksi untuk payment/refund, stock, receive, capacity; retry-safe business keys.
- Audit sebelum/sesudah perubahan sensitif, actor dan request-id; jangan menyimpan file bukti di audit JSON.
- ISO 8601 UTC dalam DB (`timestamptz`); format lokal Asia/Jakarta pada UI. Date-only disimpan `date`.
- Pagination dan server-side filter; cached metrics/view agar dashboard tidak scan semua tabel.
- Secret template pihak ketiga hanya environment server; backup, retention, restore rehearsal.
- A11y: keyboard form/modal, focus, semantic labels, contrast, 44px touch targets.
- CSV Excel-safe escaping, output formula injection prevention, validasi input server.

## 7. Tidak termasuk (tanpa keputusan baru)

- Integrasi payment gateway otomatis; sistem hanya mencatat pembayaran terverifikasi/manual.
- Pengiriman WhatsApp otomatis/WhatsApp API.
- POS hardware/ESC-POS silent print; tetap browser print.
- Buku besar double-entry, pajak formal, payroll, multi-currency.
- Migrasi data pelanggan nyata tanpa persetujuan akses/source export.
- Mengubah produk menjadi content-management system lain; marketing yang ada tetap modul business operations.

## 8. Acceptance release

Semua FR P0 diuji dengan matrix role; reconciliation ledger dan jumlah row lulus; public invoice tidak mengungkap admin/customer lain; proof Storage private; concurrency idempotency/refund/stock/preorder lulus; rollback tervalidasi. Lihat `QA_TEST_PLAN.md`.
