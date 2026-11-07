B1. Ringkasan

Nama: NAIK.IN. Tagline: Know Your Business. Prepare to Grow.

Definisi: PWA berbahasa Indonesia untuk UMKM pangan olahan. Aplikasi ini menjawab dua pertanyaan sebelum pemilik usaha berutang atau naik ke ritel:

Financial Readiness: “Kalau aku pinjam sekian, sanggup bayar saat usaha sepi?”
Product Readiness: “Label kemasanku sudah lengkap untuk daftar izin edar dan masuk ritel?”

Bukan: penentu kelayakan kredit, pemberi izin, atau pengganti penilaian bank atau BPOM. Seluruh output memuat disclaimer.

Konteks hackathon: FIRETECH 2026, sub-tema Ekonomi, demo 7 menit, dibangun 24 jam.

B2. Bukti masalah (boleh dipakai di UI dan pitch, semua sudah diverifikasi)
Kredit UMKM Sumbar Rp30,20 T, kontraksi 1,41% (triwulan II-2026). NPL UMKM Sumbar 4,64%, turun dari 4,68% tetapi masih mendekati ambang 5%. Sumber: BI Sumbar via ANTARA, 31 Okt 2026.
NPL UMKM nasional 4,54% (Juni 2026), naik dari 4,41%. Sumber: OJK via Kontan.
Bank melakukan selective lending. Sumber: BI via Kumparan, Mei 2026.
Survei BI (304 UMKM, 2023): 59,21% mencampur rekening, 58,22% tidak mencatat formal.
Merchant QRIS Sumbar >768 ribu. Sumber: BI LPP Agustus 2026.
82% perusahaan pangan olahan terdaftar BPOM adalah UMKM. Registrasi gratis untuk usaha mikro dan kecil. Sumber: BPOM, Juni 2026.
Barcode dibutuhkan untuk ritel modern menurut Mendag, Oktober 2026.

Di UI, setiap angka ditampilkan dengan sumber dan tanggal.

B3. Pengguna dan skenario
Pengguna utama: pemilik UMKM pangan olahan (keripik, rendang kemasan, sambal, dll.) yang akan mengajukan KUR atau naik ke ritel.
Pendamping: penyuluh atau mentor UMKM yang membantu membaca laporan.
Penerima laporan (opsional): bank, atas pilihan pengguna.
Skenario demo: (1) Bu Sari, keripik balado, keuangan campur aduk, kemasan plastik polos. (2) Uni Dewi, rendang kemasan, data rapi, kemasan lengkap.
B4. Lingkup MVP

Wajib: profil usaha; modul Keuangan (intake, konfirmasi, analisis, stress test, status); modul Label (scan, konfirmasi, skor, jalur izin, fixer); Laporan cetak; PWA; dua preset demo; Mode Demo offline.

Sebaiknya: parser CSV nyata, OCR nyata, pemeriksa klaim terlarang.

Jika sisa waktu: Hiring Affordability dan SOP, skenario guncangan X%/Y%, OCR PDF mutasi.

Di luar lingkup: login, integrasi bank, penilaian kredit resmi, pembayaran, WhatsApp API.

B5. Desain dan UX

Pola: PWA ala LinkedIn. Satu codebase, tata letak berubah menurut lebar layar.

Lebar	Navigasi
≥1024px	Sidebar kiri penuh (264px), konten maksimal 1120px di tengah
768–1023px	Icon rail kiri (72px)
<768px	Bottom navigation bar (5 tab), header atas ringkas, area aman iOS/Android

5 tujuan navigasi: Beranda · Keuangan · Label · Laporan · Pengaturan (preset, mode, bahasa data, tentang).

Header: logo kecil, penanda “Mode Demo/Mode Live”, dan pemilih preset. Di mobile, preset dibuka sebagai bottom sheet.

Token warna:

Token	Nilai	Pemakaian
bg	
#FBF9F4	Latar halaman (cream lembut)
surface	
#FFFFFF	Kartu, sidebar
navy	
#122056	Tombol utama, judul, item nav aktif, ikon
navy-hover	
#0C1740	Hover/pressed
tint	
#EEEFFD	Latar chip, hover, kartu informasi, baris tabel zebra
accent	
#5B65DC	Link, fokus ring, seri kedua grafik, ilustrasi
text	
#122056 / 
#2B3563 / 
#6B7399	Judul / isi / pelengkap
border	
#E7E5DD	Garis halus
ok	
#1E8E5A, bg 
#E8F5EE	Status Siap
warn	
#B7791F, bg 
#FBF1DC	Status Hati-hati
danger	
#C0392B, bg 
#FBE9E7	Status Belum siap

Tipografi: Plus Jakarta Sans (judul) dan Inter (isi). Skala 14/16/20/28/36.

Gaya: sudut 14–16px, bayangan sangat tipis, banyak ruang kosong, ikon Lucide, tap target ≥44px. Nada bahasa hangat dan jelas, tanpa jargon. Istilah teknis (NPL, KUR, HPP) selalu punya tooltip “Artinya apa?”.

Aksesibilitas: kontras AA, label form, fokus terlihat, tidak mengandalkan warna saja (status selalu disertai ikon dan teks).

B6. Modul Keuangan
B6.1 Input
Sumber	Wajib?	Cara baca
CSV/XLSX mutasi QRIS	Opsional	Parser kode + pemetaan kolom (tanpa AI)
PDF mutasi	Opsional	Gemini → JSON
Foto buku kas	Opsional	Gemini Vision → JSON
Foto nota belanja	Opsional	Gemini Vision → JSON
Wizard biaya tetap, cicilan lama, kebutuhan rumah tangga	Wajib	Form centang-isi

Minimal harus ada satu sumber pemasukan dan wizard biaya selesai. QRIS hanya mencakup pemasukan non-tunai, jadi sistem selalu menanyakan “apakah ada penjualan tunai?”.

B6.2 Kategori transaksi

Pemasukan usaha · HPP (bahan, bumbu, kemasan, gas produksi, upah borongan) · Opex tetap (sewa, gaji, listrik/air usaha, internet) · Opex variabel (ongkir, komisi marketplace, biaya admin QRIS, iklan, servis alat) · Kewajiban (cicilan lama) · Pribadi/rumah tangga · Bukan transaksi usaha (transfer pribadi masuk, top-up, refund).

Klasifikasi berlapis: kamus kata kunci → sisa dikirim ke Gemini dalam satu batch → pengguna mengonfirmasi dan boleh mengubah.

B6.3 Periode dan agregasi
Pilihan 30, 60, 90 hari. Disarankan 90 hari. Minimum 28 hari. Di bawah itu hanya ringkasan, tanpa stress test.
Agregasi per hari, per minggu (Senin–Minggu), dan per bulan.
Minggu yang dihitung untuk “minggu tersepi” hanya minggu penuh dengan ≥5 hari tercatat.
Normalisasi bulanan: total × 30 ÷ jumlah hari.
Konstanta: 4,333 minggu per bulan (52/12).
B6.4 Tingkat Keyakinan Data

Lima pemeriksaan, masing-masing satu poin:

Periode ≥90 hari.
Ada pemasukan tunai, atau pengguna menyatakan semua penjualan lewat QRIS.
Pengeluaran bahan berasal dari nota atau buku kas, bukan estimasi.
≥80% hari punya catatan.
Pengguna sudah mengonfirmasi hasil ekstraksi.

Hasil: Tinggi (5 poin), Sedang (3–4), Rendah (≤2 atau HPP estimasi). Angka tidak berubah, tetapi kalimat laporan berubah. Status hijau dengan keyakinan Rendah tampil sebagai “Hijau (data belum lengkap, hasil perkiraan)”.

B6.5 Pemeriksaan konsistensi (pengganti pembanding HPP)

Tidak ada standar eksternal. Tandai “perlu dicek” (bukan “salah”) jika: HPP > 100% omzet harian atau mingguan; rasio HPP satu minggu menyimpang >15 poin persentase dari median rasio HPP pengguna sendiri; pengeluaran total > pemasukan total; ada >20% hari tanpa catatan; transaksi tunggal >5× median.

B6.6 Rumus (semua deterministik, di /lib/engine)
Omzet        = Σ pemasukan usaha (QRIS + tunai) − refund
HPP          = Σ kategori HPP
Opex         = Σ opex tetap + opex variabel
Laba usaha   = Omzet − HPP − Opex

Laba_minggu  = Omzet_w − HPP_w − Opex_variabel_w − (Opex_tetap_bulanan ÷ 4,333)
Laba_stress  = (Laba_minggu terendah dari minggu penuh) × 4,333
Laba_shock   = Omzet×(1−X) − HPP×(1−X)×(1+Y) − Opex    (opsional, X dan Y dari slider)

r              = bunga_tahunan ÷ 12
Cicilan_baru   = P × r ÷ (1 − (1+r)^−n)       (jika r = 0: P ÷ n)
Beban_total    = Cicilan_lama + Cicilan_baru
Rasio_beban    = Beban_total ÷ Laba_stress
Sisa_kas       = Laba_stress − Kebutuhan_RT_min − Beban_total
Batas_aman     = max(0, min(0,30 × Laba_stress − Cicilan_lama,
                            Laba_stress − Kebutuhan_RT_min − Cicilan_lama))
Plafon_aman(n) = Batas_aman × (1 − (1+r)^−n) ÷ r

Status:

🟢 Siap: Rasio ≤ 30% dan Sisa_kas ≥ 0
🟡 Hati-hati: Rasio 30–40% dan Sisa_kas ≥ 0
🔴 Belum siap: Rasio > 40% atau Sisa_kas < 0 atau Laba_stress ≤ 0

Konstanta 30 dan 40 disimpan di satu berkas konfigurasi dan diberi label “ambang kehati-hatian NAIK.IN, bukan standar bank”.

B6.7 Aturan bunga otomatis
Plafon ≤ Rp10 juta → 3% (KUR Super Mikro).
Plafon > Rp10 juta → 6% (KUR Mikro, sektor produksi).
Dropdown “sektor” (produksi / perdagangan non-ekspor) dan “akad ke-” (1–4) bisa mengubah bunga menjadi 6/7/8/9% untuk perdagangan non-ekspor.
Bunga bisa diubah manual. Selalu tampil catatan “Konfirmasi bunga dan syarat ke bank”.
Tenor 12/24/36 bulan.
B6.8 Syarat umum (informasi, tidak masuk skor)

NIB atau SKU, e-KTP, NPWP untuk >Rp50 juta, usaha aktif ≥6 bulan (ada pengecualian Super Mikro). Pengguna mencentang apa yang sudah dimiliki.

B6.9 Penanganan kasus
Situasi	Perilaku
Hanya CSV QRIS	Tampil “baru pemasukan non-tunai”; wizard biaya wajib sebelum lanjut
Tidak ada nota	Pilih “Estimasi HPP” (rasio diisi pengguna); keyakinan turun
Foto buram atau silau	Pra-cek di browser, minta foto ulang
OCR salah baca	Layar konfirmasi bisa diedit; baris keyakinan <0,7 disorot
Periode <28 hari	Ringkasan saja, tanpa stress test
Laba minggu tersepi negatif	Status 🔴, plafon aman 0, saran perbaikan
Uang dapur tercampur	Dipisah ke Pribadi; rata-ratanya jadi saran Kebutuhan_RT_min (bisa diubah)
Ada cicilan lama	Mengurangi batas aman
Gemini gagal atau kuota habis	Banner “AI tidak tersedia”, form input manual muncul, aplikasi tetap jalan
B6.10 Output Laporan Kesiapan Keuangan

Ringkasan omzet, HPP, opex, laba; grafik mingguan; minggu tersepi; tabel status per tenor; plafon maksimal aman; Tingkat Keyakinan Data; daftar temuan konsistensi; penjelasan AI (hanya mengutip angka yang diberikan engine); syarat umum KUR; disclaimer.

B6.11 Vektor uji (wajib lolos unit test, toleransi ±Rp5)

Preset Bu Sari: Laba_stress = Rp2.850.000 per bulan, Kebutuhan_RT_min = Rp2.000.000, Cicilan_lama = 0.

Plafon	Bunga	Tenor	Cicilan
Rp6.000.000	3%	12	508.164
Rp6.000.000	3%	24	257.886
Rp6.000.000	3%	36	174.480
Rp6.000.000	6%	12	516.397
Rp6.000.000	6%	24	265.926
Rp6.000.000	6%	36	182.533
Rp20.000.000	6%	12	≈1.721.325
Batas aman = Rp850.000 (aturan kedua yang mengikat).
Plafon aman bunga 6%: 12 bln ≈ Rp9,88 juta; 24 bln ≈ Rp19,18 juta; 36 bln ≈ Rp27,94 juta (toleransi ±1%).
Plafon Rp6 juta, 3%, 12 bln → rasio 17,8% → 🟢. Plafon Rp20 juta, 6%, 12 bln → sisa kas ≈ −Rp871.325 → 🔴.

Asumsi PRD: Rp2.850.000 diperlakukan sebagai Laba_stress per bulan (bukan per minggu). Jika maksudmu per minggu, ubah satu parameter pembangkit data preset.

B7. Modul Label
B7.1 Tujuan dan mode

Dasar: Peraturan BPOM 31/2018 dan perubahannya 20/2021. Label harus sesuai dengan label yang disetujui saat registrasi. Alat ini mencegah revisi berulang saat registrasi atau kurasi toko. Ia memeriksa kelengkapan dan format, bukan kebenaran isi atau keabsahan hukum.

Mode Draf (sebelum daftar): item nomor izin edar dikeluarkan dari skor. Muncul catatan “sisakan ruang untuk nomor izin dan 2D barcode”.
Mode Kemasan Beredar: untuk kemasan yang sudah dijual, menjawab “apa yang kurang untuk naik.in.
B7.2 Alur

Pra-cek foto di browser (resolusi, blur, silau) → Gemini Vision ke JSON → pengguna mengonfirmasi → mesin aturan → skor, jalur izin, Label Fixer.

B7.3 Checklist dan skor (total 100, bobot bisa diubah)
#	Item	Bobot	Aturan
1	Nama produk + merek	12	Ada di bagian utama label
2	Daftar bahan	14	Didahului “Komposisi/Daftar bahan”, urut dari terbanyak
3	Berat bersih	12	Satuan metrik (mg, g, kg, mL, L)
4	Nama dan alamat produsen	12	Nama, kota, kode pos, “Indonesia”
5	Halal	8	Wajib untuk pangan/minuman; logo + keterangan
6	Tanggal dan kode produksi	10	Kode batch/tanggal atau petunjuk tempatnya
7	Kedaluwarsa	12	Didahului “Baik digunakan sebelum”
8	Nomor izin edar	15	“BPOM RI MD” + 15 digit atau “P-IRT” + 15 digit; dikeluarkan di Mode Draf
9	Asal usul bahan tertentu	5	Hanya jika ada bahan yang berpotensi dari babi; selain itu N/A

Status tiap item: Sesuai (penuh), Ada tapi kurang atau salah format atau salah lokasi (setengah), Tidak ada (0), N/A (dikeluarkan dari pembagi). Skor = poin ÷ bobot berlaku × 100.

Bagian utama label harus memuat: nama jenis, merek, berat bersih, nama dan alamat produsen, logo halal, kedaluwarsa, dan nomor izin. Jika ditemukan hanya di “bagian lain”, status “Ada tapi lokasi kurang tepat”.

Catatan tambahan (di luar skor):

Tabel Informasi Nilai Gizi (ING). Registrasi baru sejak 3 Agustus 2026 mengacu PerBPOM 10/2026. Tampilkan catatan “Format ING mengikuti PerBPOM 10/2026, cek ke BPOM”.
2D barcode BPOM (kotak “BPOM RI”).
Keterangan alergen jika berlaku.
Barcode GS1 (kebutuhan ritel modern).
B7.4 Format nomor izin
MD: “BPOM RI MD” diikuti 15 digit.
P-IRT: awalan “P-IRT” atau “PIRT” + 15 digit. Struktur internal digit tidak divalidasi. 12 digit → peringatan “format lama”. Jika hanya “SP” → peringatan “SP bukan izin edar”.
Tampilkan tautan cek manual ke cekbpom.pom.go.id.
B7.5 Pemeriksa klaim terlarang

Daftar kata kunci awal (dikurasi dari halaman BPOM, bisa diubah): superlatif (“terbaik”, “paling”, “nomor satu”, “terenak”); “menyehatkan”, “menyembuhkan”, “obat”, “meningkatkan kecerdasan”; “satu-satunya”, “hanya”, “cuma”; “tanpa BTP” atau “bebas BTP” (yang diperbolehkan hanya “tanpa pengawet”, “tanpa pewarna sintetik”, dst.); “alami”, “murni”, “100%”, “asli”, “segar” (perlu dasar); “premium”, “spesial”, “gold”, “ekstra” (perlu tanda * dan penjelasan); “modern”, “terbaru”. Setiap temuan: kutipan, alasan, saran kalimat pengganti. Selalu diberi catatan “periksa ke BPOM”.

B7.6 Pemandu jalur izin (heuristik)

Kuesioner: jenis produk (kering/keripik, olahan basah, beku, minuman, lain), apakah beku, tempat produksi (rumah tinggal atau terpisah), peralatan (manual/semi-otomatis atau otomatis), punya NIB atau belum.

Beku, atau minuman kemasan seperti UHT, atau pangan wajib SNI, atau fortifikasi, atau BTP, atau pangan gizi khusus → “Kemungkinan wajib MD”.
Kering/keripik/abon/kue kering/kembang gula/emping/sambal kering/minuman serbuk + rumah tinggal + peralatan manual atau semi-otomatis → “Kemungkinan SPP-IRT (Dinkes kab/kota via OSS)”.
Selain itu → “Tidak pasti, cek resmi”.
Selalu tampilkan: “SPP-IRT hanya untuk pangan risiko rendah. Tidak ingin ribet? Produk risiko rendah tetap boleh mendaftar MD.” Plus tautan Rumah Si-RiPO (Status Produk Pangan), ereg-rba.pom.go.id/front/jpprodusen, dan catatan registrasi gratis untuk usaha mikro dan kecil.
B7.7 Label Fixer

Gemini membuat draf teks label belakang dan deskripsi marketplace hanya dari data yang sudah dikonfirmasi pengguna. Dilarang mengarang nomor izin, sertifikat halal, komposisi, atau tanggal. Yang belum ada diisi placeholder berbentuk [ISI: ...]. Klaim terlarang diganti kalimat netral.

B8. Laporan

Satu halaman A4 yang dicetak lewat window.print() dengan CSS cetak. Isi: profil usaha, ringkasan keuangan, tabel tiga status per tenor, plafon aman, Tingkat Keyakinan Data, skor label dan temuan, jalur izin, langkah berikutnya, dan tanggal serta kode laporan. Penutup wajib: “Laporan ini bukan keputusan kredit atau persetujuan izin. Keputusan ada pada lembaga keuangan dan BPOM/Dinkes.”

B9. Spesifikasi AI (Gemini)
Model: dari env GEMINI_MODEL, nilai awal gemini-2.5-flash (cek di AI Studio saat build). SDK resmi Google GenAI untuk JavaScript.
Konfigurasi: temperature 0 (0,3 untuk teks salinan), responseMimeType application/json, responseSchema per tugas. Output divalidasi dengan zod. Gagal valid → coba ulang sekali → fallback.
Kunci: hanya dibaca server dari GEMINI_API_KEY. Tidak pernah dikirim ke browser.
Efisiensi: antrean maksimal 2 panggilan paralel, backoff eksponensial saat 429, cache hasil berdasarkan hash SHA-256 gambar atau teks.
Gambar: diperkecil ke sisi terpanjang ≤1600px, JPEG kualitas 0,8 sebelum dikirim.
Tugas	Input	Output (ringkas)
ocr_cashbook	gambar	rows[{tanggal, uraian, masuk, keluar, confidence, raw}]
ocr_nota	gambar	{supplier, tanggal, items[], total, confidence}
ocr_pdf_mutasi	pdf	rows[{tanggal, nominal, ref}]
classify	rows[{id, uraian, arah, nominal}]	[{id, kategori, confidence, alasan}]
label_scan	gambar	field per item: {value, found, lokasi: utama/lain/tidak_terlihat, confidence}, kualitas_gambar
insight	angka dari engine	{ringkasan, risiko[], saran[]}; dilarang menghitung angka baru
label_fix	data label terkonfirmasi	{label_belakang, deskripsi_marketplace, placeholder[]}
B10. Arsitektur
Lapisan	Pilihan
Framework	Next.js (App Router) + TypeScript
UI	Tailwind CSS, Lucide, Recharts, token desain di B5
State	Zustand (sesi) + penyimpanan lokal (IndexedDB/localStorage)
Backend	Route Handlers Next.js (server-only untuk Gemini)
Database	Supabase (Postgres + Storage), opsional. Tanpa Supabase, aplikasi memakai penyimpanan lokal
PWA	manifest.webmanifest + service worker manual (cache app shell dan data preset)
Rumus	/lib/engine (TypeScript murni, dipakai browser dan server)
Uji	Vitest untuk engine

Struktur folder: /app (halaman dan api), /components, /lib/engine, /lib/ai, /lib/data, /lib/config, /public (ikon, sw.js, manifest), /docs (PRD).

PWA:

name “NAIK.IN”, short_name “NAIK.IN.
display standalone; theme_color 
#122056; background_color 
#FBF9F4.
Ikon 192, 512, dan maskable.
Meta iOS (apple-touch-icon, status bar).
Tombol “Pasang aplikasi” (beforeinstallprompt) dan petunjuk manual iOS.
Install PWA butuh HTTPS atau localhost. Untuk demo di venue, deploy ke URL HTTPS (batas gratis hosting belum kuverifikasi, cek saat deploy).

Mode:

Mode Demo: preset dan cache AI, tanpa jaringan, tanpa Gemini, tanpa Supabase.
Mode Live: unggahan nyata. Jika Gemini atau Supabase gagal, otomatis turun ke Mode Demo atau input manual.
B11. Skema data (disederhanakan untuk 24 jam)
businesses: id, nama, kota, jenis_produk, usia_usaha_bln, legalitas (jsonb), dibuat
uploads: id, business_id, tipe (qris/cashbook/nota/label/pdf), path, hash, status
analyses: id, business_id, jenis (finance/label), input (jsonb), hasil (jsonb), keyakinan, dibuat
reports: id, business_id, kode_publik (unik), isi (jsonb), dibuat

Row Level Security aktif; akses lewat server dengan service role. Tanpa login: sesi anonim dan “kode laporan”. Gambar mentah dihapus setelah 24 jam.

B12. Endpoint

POST /api/finance/ocr · POST /api/finance/classify · POST /api/finance/insight · POST /api/label/scan · POST /api/label/fix · POST /api/report (simpan) · GET /api/report/[kode]. Penguraian CSV dan seluruh rumus berjalan di klien (/lib/engine) tanpa panggilan jaringan.

B13. Non-fungsional
Privasi: banner di tier gratis “data bisa dipakai Google untuk perbaikan produk, gunakan data contoh untuk demo”. Tidak ada pencatatan isi dokumen di log.
Keamanan: batasi tipe berkas (jpg/png/webp/pdf/csv/xlsx) dan ukuran (≤8 MB), batas laju per IP, sanitasi teks keluaran, tidak ada kunci di kode klien.
Kinerja: halaman interaktif <2,5 detik di jaringan 4G; slider tanpa panggilan jaringan.
Ketahanan: setiap panggilan AI punya batas waktu 25 detik dan fallback.
B14. Data preset (sintetis, 90 hari, dibangkitkan oleh kode dengan seed tetap)

Bu Sari (keripik balado): campuran QRIS dan tunai; omzet bulanan sekitar Rp20–22 juta, HPP sekitar 55% tetapi berfluktuasi; laba usaha normal ± Rp4,8–5,5 juta per bulan; minggu tersepi menghasilkan Laba_stress ≈ Rp2.850.000 per bulan; pengeluaran pribadi tercampur ≈ Rp2.350.000 per 30 hari; Kebutuhan_RT_min awal Rp2.000.000; cicilan lama 0. Kemasan: Sampel A, plastik polos dengan stiker tulisan tangan.

Uni Dewi (rendang kemasan): dominan QRIS, rapi; Laba_stress ≈ Rp9,5 juta per bulan; nol pengeluaran pribadi tercampur. Kemasan: Sampel B, standing pouch lengkap tetapi belum ada barcode GS1 dan keterangan ING masih perlu dicek, sehingga skornya tinggi tetapi tidak sempurna.

Label sampel digambar sebagai mockup HTML/SVG di dalam aplikasi (tanpa gambar eksternal), dan hasil ekstraksi AI-nya disimpan sebagai JSON cache.

B15. Kriteria penerimaan
Semua vektor uji B6.11 lolos.
Aplikasi berjalan penuh tanpa GEMINI_API_KEY dan tanpa Supabase (Mode Demo).
Tata letak berpindah mulus: sidebar ≥1024px, icon rail 768–1023px, bottom nav <768px.
Aplikasi bisa dipasang sebagai PWA dan Mode Demo berjalan offline.
Slider KUR berubah real-time tanpa panggilan jaringan.
Skor label berubah real-time saat item diubah di layar konfirmasi.
Laporan tercetak rapi di satu halaman A4.
Tidak ada klaim “layak KUR”, “terjamin”, “terverifikasi” di seluruh UI.
Angka berita di UI persis seperti di B2.