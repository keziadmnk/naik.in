import { useState, type ReactNode } from "react";
import { PIcon, type PIconName } from "../components/icons";
import { Saklar } from "../components/ui";
import type { BiayaRutin, Kelompok } from "../data/types";
import { NAMA_KELOMPOK } from "../data/categories";
import { rupiah } from "../lib/format";
import { idBaru, useToko } from "../state/store";
import { FormProfilUsaha } from "./Akun";

type Bagian = "profil" | "biaya" | "kategori" | "pengingat" | "data" | "bantuan" | "tentang" | "demo";

const BAGIAN: { id: Bagian; label: string; ikon: PIconName }[] = [
  { id: "profil", label: "Profil usaha", ikon: "home" },
  { id: "biaya", label: "Biaya rutin & rumah tangga", ikon: "wallet" },
  { id: "kategori", label: "Kategori", ikon: "tag" },
  { id: "pengingat", label: "Pengingat", ikon: "bell" },
  { id: "data", label: "Data & privasi", ikon: "lock" },
  { id: "bantuan", label: "Bantuan", ikon: "info" },
  { id: "tentang", label: "Tentang & sumber", ikon: "file" },
  { id: "demo", label: "Pengaturan demo", ikon: "bolt" },
];

function Kartu({ judul, teks, children }: { judul: string; teks?: string; children: ReactNode }) {
  return (
    <section className="nk-card nk-set-kartu">
      <h3>{judul}</h3>
      {teks && <p className="nk-muted">{teks}</p>}
      {children}
    </section>
  );
}

function BiayaRutinForm() {
  const { biayaRutin, kirim } = useToko();
  const [daftar, setDaftar] = useState<BiayaRutin[]>(biayaRutin);
  const ubah = (id: string, p: Partial<BiayaRutin>) => setDaftar(daftar.map((b) => (b.id === id ? { ...b, ...p } : b)));
  const total = (j: BiayaRutin["jenis"]) => daftar.filter((b) => b.jenis === j).reduce((a, b) => a + b.nominalBulanan, 0);
  return (
    <Kartu judul="Biaya rutin & kebutuhan rumah tangga" teks="Dipakai nanti di Simulasi Kesiapan KUR untuk menguji apakah kas cukup setelah kebutuhan rutin.">
      {(["usaha", "rumah_tangga"] as const).map((jenis) => (
        <div key={jenis} className="nk-biaya-grup">
          <h4>
            {jenis === "usaha" ? "Biaya rutin usaha" : "Kebutuhan rumah tangga"} <span>{rupiah(total(jenis))}/bulan</span>
          </h4>
          {daftar
            .filter((b) => b.jenis === jenis)
            .map((b) => (
              <div key={b.id} className="nk-biaya-baris">
                <input value={b.nama} onChange={(e) => ubah(b.id, { nama: e.target.value })} aria-label="Nama biaya" />
                <input inputMode="numeric" className="kanan" value={b.nominalBulanan.toLocaleString("id-ID")} onChange={(e) => ubah(b.id, { nominalBulanan: Number(e.target.value.replace(/\D/g, "")) || 0 })} aria-label="Nominal per bulan" />
                <button className="nk-icon-btn kecil" onClick={() => setDaftar(daftar.filter((x) => x.id !== b.id))} aria-label="Hapus biaya">
                  <PIcon name="trash" size={15} />
                </button>
              </div>
            ))}
          <button className="nk-btn hantu kecil" onClick={() => setDaftar([...daftar, { id: idBaru(), nama: "", jenis, nominalBulanan: 0 }])}>
            <PIcon name="plus" size={14} /> Tambah
          </button>
        </div>
      ))}
      <button className="nk-btn" onClick={() => kirim({ type: "biayaRutin", biayaRutin: daftar.filter((b) => b.nama.trim()) })}>
        Simpan biaya rutin
      </button>
    </Kartu>
  );
}

function KategoriForm() {
  const { kategori, kategoriTambahan, kirim } = useToko();
  const [nama, setNama] = useState("");
  const [kelompok, setKelompok] = useState<Kelompok>("operasional");
  const tambahan = new Set(kategoriTambahan.map((k) => k.id));
  return (
    <Kartu judul="Kategori" teks="Kategori menentukan apakah transaksi dihitung sebagai penjualan, HPP, biaya operasional, atau pribadi.">
      <div className="nk-kategori-list">
        {(Object.keys(NAMA_KELOMPOK) as Kelompok[]).map((k) => (
          <div key={k}>
            <h4>{NAMA_KELOMPOK[k]}</h4>
            {kategori
              .filter((x) => x.kelompok === k)
              .map((x) => (
                <span key={x.id} className="nk-chip statis">
                  {x.nama}
                  {tambahan.has(x.id) && (
                    <button onClick={() => kirim({ type: "hapusKategori", id: x.id })} aria-label={`Hapus kategori ${x.nama}`}>
                      ×
                    </button>
                  )}
                </span>
              ))}
          </div>
        ))}
      </div>
      <form
        className="nk-form-baris"
        onSubmit={(e) => {
          e.preventDefault();
          if (!nama.trim()) return;
          const arah = kelompok === "penjualan" || kelompok === "pemasukan_lain" ? "masuk" : "keluar";
          kirim({ type: "tambahKategori", kategori: { id: `k-${idBaru()}`, nama: nama.trim(), arah, kelompok } });
          setNama("");
        }}
      >
        <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama kategori baru" aria-label="Nama kategori baru" />
        <select value={kelompok} onChange={(e) => setKelompok(e.target.value as Kelompok)} aria-label="Kelompok">
          {(Object.keys(NAMA_KELOMPOK) as Kelompok[]).map((k) => (
            <option key={k} value={k}>
              {NAMA_KELOMPOK[k]}
            </option>
          ))}
        </select>
        <button className="nk-btn" type="submit">
          Tambah
        </button>
      </form>
    </Kartu>
  );
}

export function Pengaturan() {
  const { pengingat, demo, kirim, transaksi, server, muatUlang } = useToko();
  const [bagian, setBagian] = useState<Bagian>("profil");
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false);

  return (
    <div className="nk-halaman nk-pengaturan">
      <nav className="nk-set-nav" aria-label="Bagian pengaturan">
        {BAGIAN.map((b) => (
          <button key={b.id} className={bagian === b.id ? "aktif" : ""} onClick={() => setBagian(b.id)}>
            <PIcon name={b.ikon} size={17} />
            {b.label}
          </button>
        ))}
      </nav>
      <div className="nk-set-isi">
        {bagian === "profil" && (
          <Kartu judul="Profil usaha">
            <FormProfilUsaha />
          </Kartu>
        )}
        {bagian === "biaya" && <BiayaRutinForm />}
        {bagian === "kategori" && <KategoriForm />}
        {bagian === "pengingat" && (
          <Kartu judul="Pengingat" teks="Pengingat membantu catatan tetap lengkap setiap minggu.">
            <Saklar label="Pengingat catat harian" keterangan="Muncul di ikon lonceng pada jam yang dipilih" nyala={pengingat.harian} onUbah={(v) => kirim({ type: "pengingat", pengingat: { harian: v } })} />
            {pengingat.harian && (
              <label className="nk-field">
                <span>Jam pengingat</span>
                <input type="time" value={pengingat.jam} onChange={(e) => kirim({ type: "pengingat", pengingat: { jam: e.target.value } })} />
              </label>
            )}
            <Saklar label="Ringkasan mingguan" keterangan="Setiap Senin: rekap minggu lalu & catatan yang perlu dicek" nyala={pengingat.mingguan} onUbah={(v) => kirim({ type: "pengingat", pengingat: { mingguan: v } })} />
          </Kartu>
        )}
        {bagian === "data" && (
          <Kartu judul="Data & privasi">
            <ul className="nk-list-poin">
              <li>Hasil AI atau impor tidak pernah masuk riwayat tanpa konfirmasimu.</li>
              <li>Foto nota hanya dikirim ke server untuk dibaca otomatis; hasilnya tetap harus kamu periksa.</li>
              <li>Aplikasi tidak mengirim catatanmu ke bank atau pihak lain.</li>
            </ul>
            <div className="nk-set-aksi">
              <button
                className="nk-btn sekunder"
                onClick={() => {
                  const isi = JSON.stringify(transaksi, null, 2);
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(new Blob([isi], { type: "application/json" }));
                  a.download = "naikin-transaksi.json";
                  a.click();
                }}
              >
                <PIcon name="download" size={16} /> Unduh semua data
              </button>
              {konfirmasiHapus ? (
                <span className="nk-konfirmasi-baris">
                  Hapus semua catatan? Tindakan ini tidak bisa dibatalkan.
                  <button className="nk-btn sekunder kecil" onClick={() => setKonfirmasiHapus(false)}>
                    Batal
                  </button>
                  <button
                    className="nk-btn bahaya kecil"
                    onClick={() => {
                      kirim({ type: "hapusSemuaData" });
                      setKonfirmasiHapus(false);
                    }}
                  >
                    Hapus semua
                  </button>
                </span>
              ) : (
                <button className="nk-btn hantu bahaya-teks" onClick={() => setKonfirmasiHapus(true)}>
                  <PIcon name="trash" size={16} /> Hapus semua catatan
                </button>
              )}
            </div>
          </Kartu>
        )}
        {bagian === "bantuan" && (
          <Kartu judul="Bantuan">
            <details className="nk-faq" open>
              <summary>Bagaimana cara mencatat transaksi?</summary>
              <p>Buka Keuangan, lalu pilih Scan foto, Unggah file, atau Input manual. Periksa hasilnya, lalu tekan “Konfirmasi dan simpan”.</p>
            </details>
            <details className="nk-faq">
              <summary>Apa beda laba usaha dan selisih kas?</summary>
              <p>Laba usaha hanya menghitung penjualan dikurangi HPP dan biaya operasional. Selisih kas menghitung semua uang masuk dan keluar, termasuk pengeluaran pribadi.</p>
            </details>
            <details className="nk-faq">
              <summary>Kenapa ada minggu “belum lengkap”?</summary>
              <p>Minggu dianggap lengkap bila minimal 5 dari 7 hari punya catatan. Jika toko memang tutup, tandai harinya sebagai libur di tab Perlu Dicek.</p>
            </details>
            <details className="nk-faq">
              <summary>Format file apa yang bisa diunggah?</summary>
              <p>CSV dan XLSX dengan kolom Tanggal, Uraian, Masuk, Keluar. Foto (JPG/PNG) dan PDF dibaca dengan AI bila tersedia.</p>
            </details>
          </Kartu>
        )}
        {bagian === "tentang" && (
          <Kartu judul="Tentang & sumber">
            <p>NAIK.IN membantu UMKM pangan olahan merapikan catatan keuangan dan menyiapkan diri sebelum berkembang.</p>
            <ul className="nk-list-poin">
              <li>Ketentuan label pangan olahan mengacu pada Peraturan BPOM tentang Label Pangan Olahan.</li>
              <li>Informasi KUR mengacu pada ketentuan program Kredit Usaha Rakyat dari pemerintah.</li>
              <li>Angka di aplikasi dihitung dari catatanmu; AI hanya membantu menjelaskan.</li>
            </ul>
            <p className="nk-pernyataan">
              <PIcon name="info" size={15} /> Ini alat bantu persiapan, bukan keputusan kredit atau persetujuan izin.
            </p>
            <small className="nk-muted">Versi prototipe 2.0 · November 2026</small>
          </Kartu>
        )}
        {bagian === "demo" && (
          <Kartu judul="Pengaturan demo" teks="Coba berbagai kondisi akun. Perubahanmu pada data tetap tersimpan.">
            <Saklar label="Akun baru kosong" keterangan="Tampilkan akun tanpa catatan sama sekali" nyala={demo.akunKosong} onUbah={(v) => kirim({ type: "demo", demo: { akunKosong: v } })} />
            <Saklar label="Data baru 3 dari 6 bulan" keterangan="Hanya catatan sejak 3 Agustus 2026" nyala={demo.dataTigaBulan} onUbah={(v) => kirim({ type: "demo", demo: { dataTigaBulan: v } })} />
            <Saklar label="Mode offline" keterangan="AI & pembacaan otomatis dinonaktifkan" nyala={demo.modeOffline} onUbah={(v) => kirim({ type: "demo", demo: { modeOffline: v } })} />
            {server ? (
              <button className="nk-btn hantu kecil" onClick={() => void muatUlang()}>
                <PIcon name="refresh" size={14} /> Muat ulang data dari server
              </button>
            ) : (
              <button className="nk-btn hantu kecil" onClick={() => kirim({ type: "reset" })}>
                <PIcon name="refresh" size={14} /> Kembalikan data contoh awal
              </button>
            )}
          </Kartu>
        )}
      </div>
    </div>
  );
}
