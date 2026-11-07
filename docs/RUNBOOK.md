# Runbook Demo NAIK.IN

## Skrip 7 menit

1. **Masalah (1 menit)** — Jelaskan bahwa pemilik usaha perlu memahami ruang kas saat penjualan sepi dan kelengkapan label sebelum berkembang. Tunjukkan angka B2 di Beranda; NAIK.IN bukan penentu keputusan bank atau BPOM.
2. **Bu Sari: keuangan (2 menit)** — Pilih preset Bu Sari, buka Keuangan, pilih **Gunakan data preset**, lanjutkan sampai **Konfirmasi data**, lalu buka Stress Test. Atur plafon Rp20 juta, bunga otomatis 6%, tenor 12 bulan. Tunjukkan status Merah dan bahwa angka dihitung engine lokal.
3. **Kemasan (2 menit)** — Buka Label, pilih **Sampel A** dan tunjukkan skor rendah serta klaim yang perlu dicek. Pilih **Sampel B**, tunjukkan skor tinggi namun belum sempurna karena ING/barcode GS1 perlu dicek.
4. **Laporan (1 menit)** — Buka Laporan, tunjukkan bagian yang terisi dan “Belum diisi” bila modul belum dikonfirmasi. Tekan **Cetak/Simpan PDF** atau **Simpan dan bagikan**.
5. **Tanya jawab (1 menit)** — Gunakan jawaban ringkas di bawah, lalu kembali ke Mode Demo bila koneksi tidak stabil.

## Pertanyaan juri dan jawaban

- **Apakah aplikasi menyatakan pengguna layak mendapat pinjaman?** Tidak. Aplikasi hanya menguji ruang kas dengan ambang kehati-hatian NAIK-KELAS; keputusan tetap pada lembaga keuangan.
- **Apakah skor label berarti produk sudah disetujui BPOM?** Tidak. Skor memeriksa kelengkapan dan format, bukan kebenaran isi atau persetujuan BPOM.
- **Seberapa akurat OCR?** OCR hanya membaca yang terlihat, mengembalikan nilai tidak terbaca sebagai null/confidence rendah, dan selalu meminta konfirmasi pengguna.
- **Bagaimana jika Gemini gagal atau kunci kosong?** Banner **AI belum aktif** muncul; aplikasi memakai cache preset atau tabel input manual.
- **Bagaimana privasi data?** Mode Demo memakai data sintetis lokal. Mode Live menampilkan pemberitahuan bahwa data bisa dipakai Google untuk perbaikan produk; pengguna sebaiknya memakai data contoh untuk demo.
- **Apakah perlu Supabase?** Tidak. LocalAdapter menjadi fallback. Supabase hanya opsional untuk penyimpanan server.
- **Dari mana angka konteks berasal?** Sumber dan tanggal ditampilkan pada setiap kartu Beranda, mengikuti B2.

## Prosedur darurat

1. **Gemini gagal/timeout/429:** jangan menunggu; gunakan cache Sampel A/B, input manual transaksi, dan penjelasan templat engine.
2. **Supabase gagal:** aplikasi otomatis memakai LocalAdapter. Jangan mengubah kunci saat demo; lanjutkan dengan Mode Demo.
3. **Internet gagal:** pastikan aplikasi sudah dibuka sekali sebelum demo, lalu pilih Mode Demo. Service worker menyimpan app shell dan preset. Jika halaman belum tersimpan, buka `offline.html` dan reload setelah koneksi kembali.
4. **Kembali ke kondisi stabil:** muat ulang halaman, cek indikator koneksi, lalu buka Pengaturan > Diagnostik tanpa pernah menampilkan nilai kunci.
