import { useEffect, useRef, useState } from "react";
import { DemoStrip, PageHeader } from "../../components/figma";
import { PIcon, type PIconName } from "../../components/icons";
import { hitungSkor } from "../../lib/engine/label";
import { LABEL_STATUS } from "../../lib/engine/loan";
import { addDays, monthKey, rentang, rupiahRingkas, tanggal } from "../../lib/format";
import { useToko } from "../../state/store";
import { DokumenLaporan, type Bagian } from "./Laporan";

type Jenis = "lengkap" | "keuangan" | "kur" | "label";

const SEMUA: Record<Bagian, boolean> = { ringkasan: true, rekap: true, kategori: true, ketahanan: true, kur: true, label: true, catatan: true };
const PRESET: Record<Jenis, { judul: string; bagian: Record<Bagian, boolean> }> = {
  lengkap: { judul: "Laporan Kondisi Usaha", bagian: SEMUA },
  keuangan: { judul: "Laporan Kesehatan Keuangan", bagian: { ...SEMUA, kur: false, label: false } },
  kur: { judul: "Laporan Kesiapan KUR", bagian: { ...SEMUA, rekap: false, kategori: false, label: false, catatan: false } },
  label: { judul: "Laporan Kesiapan Label Produk", bagian: { ringkasan: false, rekap: false, kategori: false, ketahanan: false, kur: false, label: true, catatan: false } },
};

const NAMA_BAGIAN: Record<Bagian, string> = {
  ringkasan: "Ringkasan",
  rekap: "Rekap bulanan",
  kategori: "Uang keluar",
  ketahanan: "Ketahanan saat sepi",
  kur: "Simulasi KUR",
  label: "Label produk",
  catatan: "Catatan analisis",
};

function Pratinjau({ jenis, cetak, onTutup }: { jenis: Jenis; cetak: boolean; onTutup: () => void }) {
  const [bagian, setBagian] = useState(PRESET[jenis].bagian);
  const tutup = useRef(onTutup);
  tutup.current = onTutup;
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && tutup.current();
    document.addEventListener("keydown", esc);
    document.body.classList.add("fg-mencetak-laporan");
    // "Unduh PDF" dari tabel: buka pratinjau lalu langsung dialog cetak
    const t = cetak ? window.setTimeout(() => window.print(), 300) : 0;
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.classList.remove("fg-mencetak-laporan");
      window.clearTimeout(t);
    };
  }, [cetak]);
  return (
    <div className="modal-backdrop fg-pratinjau" onClick={onTutup}>
      <div className="report-modal" role="dialog" aria-modal="true" aria-label={PRESET[jenis].judul} onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            <span>Pratinjau PDF</span>
            <h3>{PRESET[jenis].judul}</h3>
          </div>
          <div>
            <button onClick={() => window.print()}>
              <PIcon name="download" size={16} />
              Unduh PDF
            </button>
            <button onClick={onTutup} aria-label="Tutup">
              <PIcon name="close" />
            </button>
          </div>
        </header>
        <div className="fg-bagian">
          <span>Sertakan:</span>
          {(Object.keys(NAMA_BAGIAN) as Bagian[]).map((b) => (
            <label key={b} className={bagian[b] ? "aktif" : ""}>
              <input type="checkbox" checked={bagian[b]} onChange={(e) => setBagian({ ...bagian, [b]: e.target.checked })} />
              {NAMA_BAGIAN[b]}
            </label>
          ))}
        </div>
        <div className="fg-pdf">
          <DokumenLaporan bagian={bagian} judul={PRESET[jenis].judul} />
        </div>
      </div>
    </div>
  );
}

type Baris = { id: string; nama: string; jenis: string; periode: string; dibuat: string; status: string; baik: boolean; buka: Jenis; hapus?: () => void };

export function Laporan() {
  const { transaksi, simulasi, produk, profil, hariIni, server, kirim } = useToko();
  const [pratinjau, setPratinjau] = useState<{ jenis: Jenis; cetak: boolean } | null>(null);
  const [filter, setFilter] = useState("");

  // Periode laporan: 6 bulan kalender penuh terakhir (sama dengan dokumen)
  const awalBulanIni = `${monthKey(hariIni)}-01`;
  let dari = awalBulanIni;
  for (let i = 0; i < 6; i += 1) dari = `${monthKey(addDays(dari, -1))}-01`;
  const periode = rentang(dari, addDays(awalBulanIni, -1));
  const adaData = transaksi.some((t) => t.tanggal >= dari && t.tanggal < awalBulanIni);

  const baris: Baris[] = [
    { id: "lengkap", nama: "Laporan Kondisi Usaha", jenis: "Lengkap", periode, dibuat: hariIni, status: adaData ? "Siap" : "Perlu data", baik: adaData, buka: "lengkap" },
    { id: "keuangan", nama: "Laporan Kesehatan Keuangan", jenis: "Keuangan", periode, dibuat: hariIni, status: adaData ? "Siap" : "Perlu data", baik: adaData, buka: "keuangan" },
    ...simulasi.map((s) => ({
      id: s.id,
      nama: `Simulasi KUR — ${rupiahRingkas(s.plafon)} · ${s.tenor} bln`,
      jenis: "KUR",
      periode: "26 minggu terakhir",
      dibuat: s.dibuat.slice(0, 10),
      status: `${LABEL_STATUS[s.status]}${s.diLaporan ? " · di laporan" : ""}`,
      baik: s.status === "hijau",
      buka: "kur" as Jenis,
      hapus: () => kirim({ type: "hapusSimulasi", id: s.id }),
    })),
    ...produk
      .filter((p) => p.diperiksaPada)
      .map((p) => {
        const h = hitungSkor(p.data, p.mode, profil.kota);
        return {
          id: p.id,
          nama: `Kesiapan Label — ${p.nama}`,
          jenis: "Produk",
          periode: tanggal(p.diperiksaPada!),
          dibuat: p.diperiksaPada!,
          status: `${Math.round(h.skor)}/100 · ${h.kategori}`,
          baik: h.kategori === "Lengkap",
          buka: "label" as Jenis,
        };
      }),
  ];
  const tampil = baris.filter((b) => !filter || b.jenis === filter);

  const kartu: [PIconName, string, string, Jenis][] = [
    ["wallet", "Laporan Kesehatan Keuangan", "Ringkasan arus kas, rekap bulanan, uang keluar, minggu tersepi, dan catatan analisis.", "keuangan"],
    ["calc", "Laporan Kesiapan KUR", "Simulasi cicilan yang dimasukkan, ketahanan kas saat sepi, dan status persiapan.", "kur"],
    ["tag", "Laporan Kesiapan Label", "Skor 9 keterangan wajib setiap produk dan keterangan yang perlu dilengkapi.", "label"],
  ];

  return (
    <div className="fg-halaman fg-laporan">
      <PageHeader title="Laporan" subtitle="Seluruh hasil analisis dan rekomendasi bisnismu tersusun dalam satu tempat.">
        <button className="portal-primary" onClick={() => setPratinjau({ jenis: "lengkap", cetak: false })}>
          <PIcon name="plus" size={16} />
          Buat Laporan
        </button>
      </PageHeader>
      <DemoStrip>
        {server ? "Laporan disusun otomatis dari data di database dan selalu memakai catatan terbaru." : "Laporan disusun dari data demo ilustratif di browser ini."} Cetak atau simpan sebagai PDF dari pratinjau.
      </DemoStrip>
      <div className="report-type-grid">
        {kartu.map(([ikon, judul, teks, jenis]) => (
          <article key={judul}>
            <i>
              <PIcon name={ikon} />
            </i>
            <h3>{judul}</h3>
            <p>{teks}</p>
            <button onClick={() => setPratinjau({ jenis, cetak: false })}>
              Lihat laporan terbaru <PIcon name="arrow" size={14} />
            </button>
          </article>
        ))}
      </div>
      <section className="report-library">
        <div className="library-head">
          <div>
            <h3>Library Laporan</h3>
            <p>Lihat, unduh, atau hapus laporan & hasil yang tersimpan.</p>
          </div>
          <div>
            <label className="fg-select-filter">
              <PIcon name="filter" size={15} />
              <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter jenis">
                <option value="">Semua Jenis</option>
                <option>Lengkap</option>
                <option>Keuangan</option>
                <option>KUR</option>
                <option>Produk</option>
              </select>
            </label>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nama Laporan</th>
                <th>Jenis</th>
                <th>Periode</th>
                <th>Tanggal Dibuat</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {tampil.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>
                      <PIcon name="file" size={16} />
                      {r.nama}
                    </b>
                  </td>
                  <td>{r.jenis}</td>
                  <td>{r.periode}</td>
                  <td>{tanggal(r.dibuat)}</td>
                  <td>
                    <span className={r.baik ? "status success" : "status warning"}>{r.status}</span>
                  </td>
                  <td>
                    <button onClick={() => setPratinjau({ jenis: r.buka, cetak: false })} title="Lihat" aria-label={`Lihat ${r.nama}`}>
                      <PIcon name="eye" size={16} />
                    </button>
                    <button onClick={() => setPratinjau({ jenis: r.buka, cetak: true })} title="Unduh PDF" aria-label={`Unduh ${r.nama}`}>
                      <PIcon name="download" size={16} />
                    </button>
                    {r.hapus && (
                      <button onClick={r.hapus} title="Hapus" aria-label={`Hapus ${r.nama}`}>
                        <PIcon name="trash" size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {pratinjau && <Pratinjau jenis={pratinjau.jenis} cetak={pratinjau.cetak} onTutup={() => setPratinjau(null)} />}
    </div>
  );
}
