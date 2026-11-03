# Twolittle.bites OS — Supabase Rebuild Blueprint

**Blueprint v1.0 · 28 Oktober 2026 · Status: specification/starter, NOT deployed**

Paket ini disusun berdasarkan **Twolittle.bites OS v1.0.0 RC QA Hotfix 19**, bukan contoh ERP generik. Tujuannya: membangun ulang operasional bisnis dessert di frontend modern + Supabase dengan **feature parity**, data historis tetap valid, kontrol akses minimal seketat aplikasi lama, dan visual lama dipertahankan.

## Mulai di sini

1. `PRD.md` — kebutuhan produk, pengguna, modul, scope, acceptance criteria.
2. `DESIGN.md` — desain, token, navigasi, responsif, dan visual parity.
3. `ARCHITECTURE.md` — arsitektur frontend/Supabase, trust boundaries, transaksi.
4. `DATA_MODEL.md` — relasi, 33 tabel lama, source of truth, keputusan tipe.
5. `SECURITY.md` — matriks role, RLS, private file, public invoice.
6. `WORKFLOWS.md` — status, order-to-cash, inventory, production, finance.
7. `API_CONTRACT.md` — API baru dan cara memetakan 108 aksi lama.
8. `MIGRATION.md` — ekstraksi 33 Google Sheets, normalisasi, rekonsiliasi, cutover.
9. `QA_TEST_PLAN.md` — test cases, safety, UAT, go/no-go.
10. `IMPLEMENTATION_PLAN.md` — fase build yang disarankan.
11. `DECISIONS_AND_GAPS.md` — item yang masih membutuhkan keputusan/akses nyata.
12. `BUILD_PROMPT.md` — prompt implementasi bagi coding agent/developer.

## Aset teknis

| Berkas | Isi | Kesiapan |
|---|---|---|
| `supabase/migrations/202610280001_initial_schema.sql` | 33 tabel bisnis, org/membership, constraint, indeks, RLS read-only | **Starter untuk DB baru, review sebelum apply** |
| `supabase/migrations/202610280002_storage.sql` | Bucket private + policy baca terbatas | **Starter, perlu uji upload flow** |
| `supabase/seed.example.sql` | Contoh referensi tanpa PII nyata | **Demo only** |
| `reference/LEGACY_SHEET_SCHEMA.md` | Definisi kolom asli secara penuh | **Sumber Hotfix 19** |
| `reference/LEGACY_PERMISSION_MATRIX.md` | Matriks izin bisnis asli | **Sumber Hotfix 19** |
| `reference/LEGACY_DESIGN.md` | Desain awal dan token lengkap | **Sumber Hotfix 19** |
| `reference/LEGACY_API_ACTIONS.md` | Seluruh action `ApiGateway.gs` | **Diekstrak dari kode** |
| `reference/LEGACY_SCHEMA_MANIFEST.json` | Manifest mesin 33 tabel + jenis kolom | **Diekstrak dari skema** |
| `reference/Twolittle_Bites_Hotfix19_Source.zip` | Full source release lama sebagai referensi | **Snapshot kode** |

## Invarian utama

- 33 logical business tables tidak boleh diam-diam hilang; 5 role: `OWNER`, `ADMIN`, `PRODUCTION`, `MARKETING`, `FINANCE`.
- 12 page shell aktual: Executive, Orders (termasuk Pre-Order), Products/Recipes, Production, Inventory, Finance, Business, Customers, Purchasing, Marketing, Reports, Settings. **13 domain bisnis** dipertahankan; Pre-Order boleh tetap di Orders.
- ID bisnis lama seperti `ORD-YYYYMM-000001` harus dapat ditelusuri, walaupun sistem baru memakai UUID untuk user/org.
- `PAYMENTS` event ledger + `TRANSACTIONS` financial ledger; `INVENTORY_MOVEMENTS` adalah source of truth stok; snapshot order price dan production requirements tidak diretroaktifkan.
- Semua Rupiah sebagai integer; unit dasar g/ml/pcs; zona bisnis `Asia/Jakarta`.
- WhatsApp tetap **deep link manual**, bukan pesan otomatis; Finance adalah **managerial P&L**, bukan akuntansi buku besar/PSAK penuh.
- Bukti bayar adalah file private, JPG/PNG/WebP/PDF maksimum **8 MiB**, nama `YYYY-MM-DD_Nama_Customer_PAY-YYYYMM-XXXXXX.ext` dan bukan URL publik permanen.
- Orders dapat bulk-progress maksimal 100, tanpa bulk cancel, dengan validasi transisi di server.

## Stack rekomendasi

**Frontend:** React + TypeScript + Vite (atau Next.js bila benar-benar butuh server rendering), port komponen CSS/HTML lama. **Backend:** Supabase Auth, Postgres, Row Level Security, Storage privat, Edge Functions untuk orkestrasi dan transaksi bisnis; PostgreSQL RPC untuk penulisan atomik; jobs terjadwal untuk agregat dan backup check. **Quality:** Vitest, Playwright, pgTAP/SQL integration tests, CI migrations.

Ini adalah **keputusan arsitektur usulan**, bukan klaim bahwa repo atau proyek Supabase baru telah dibuat. Jangan menjalankan `supabase db push` pada project produksi yang sudah ada tanpa memeriksa migration history dan backup.

## Status & batasan

- Dokumen dan scaffold SQL dibuat dari **source code**, bukan dump isi Google Sheets produksi. Paket ini **tidak memuat customer nyata, order, payment, atau file Drive**.
- Belum terhubung, belum dijalankan, dan belum UAT di Supabase cloud. SQL starter masih perlu review integrasi, migrasi data, kolom metadata, dan pengujian izin sebelum release.
- Hindari menggunakan project Supabase yang sudah berisi skema lain tanpa konfirmasi terpisah; prioritaskan project DEV kosong atau isolasi yang telah direncanakan.

## Dokumen sumber

`BASELINE_SHEET_SCHEMA.md`, `BASELINE_DATA_MODEL.md`, `BASELINE_PERMISSION_MATRIX.md`, `BASELINE_DESIGN.md`, `OPERATOR_GUIDE.md`, `ApiGateway.gs`, `Constants.gs`, `OrderService.gs`, `PaymentService.gs`, `PaymentProofService.gs`, dan QA Hotfix 17–19 di source reference.
