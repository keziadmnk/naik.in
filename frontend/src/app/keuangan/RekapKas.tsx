import { Fragment, useMemo, useState } from "react";
import { PIcon } from "../../components/icons";
import { ARTI, Istilah, Kosong, Segmen } from "../../components/ui";
import { kategoriMap } from "../../data/categories";
import { rekapBulanan, rekapMingguan, totalRekap, transaksiPertama, type BarisRekap } from "../../lib/finance";
import { namaBulan, rentang, rupiah } from "../../lib/format";
import { useToko } from "../../state/store";

type Mode = "minggu" | "bulan";

const KOLOM: { kunci: keyof BarisRekap; label: string; arti?: string }[] = [
  { kunci: "uangMasuk", label: "Uang Masuk" },
  { kunci: "hpp", label: "HPP", arti: ARTI.hpp },
  { kunci: "operasional", label: "Biaya Operasional", arti: ARTI.operasional },
  { kunci: "pribadi", label: "Pengeluaran Pribadi" },
  { kunci: "uangKeluar", label: "Uang Keluar" },
  { kunci: "laba", label: "Laba Usaha", arti: ARTI.labaUsaha },
  { kunci: "selisih", label: "Selisih Kas", arti: ARTI.selisihKas },
];

function unduhCsv(nama: string, baris: (string | number)[][]) {
  const isi = baris.map((b) => b.map((v) => (typeof v === "string" && /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(";")).join("\n");
  const blob = new Blob([`﻿${isi}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nama;
  a.click();
  URL.revokeObjectURL(url);
}

export function RekapKas() {
  const { transaksi, kategori, hariIni, hariLibur, profil } = useToko();
  const [mode, setMode] = useState<Mode>("bulan");
  const [buka, setBuka] = useState<string | null>(null);
  const peta = kategoriMap(kategori);

  const baris = useMemo(() => {
    if (!transaksi.length) return [];
    const dari = transaksiPertama(transaksi);
    const isi = transaksi.filter((t) => t.tanggal <= hariIni);
    return mode === "minggu" ? rekapMingguan(isi, kategori, dari, hariIni, hariLibur) : rekapBulanan(isi, kategori, dari, hariIni);
  }, [transaksi, kategori, hariIni, hariLibur, mode]);

  if (!baris.length) return <Kosong ikon="report" judul="Belum ada rekap" teks="Rekap kas akan terisi setelah ada transaksi terkonfirmasi." />;

  const total = totalRekap(baris);
  // Sorot periode dengan laba terendah (hanya periode yang lengkap)
  const lengkap = baris.filter((b) => b.lengkap);
  const terendah = lengkap.reduce<BarisRekap | null>((a, b) => (!a || b.laba < a.laba ? b : a), null);
  const labelPeriode = (b: BarisRekap) => (mode === "minggu" ? rentang(b.dari, b.sampai) : namaBulan(b.kunci, true));

  const ekspor = () =>
    unduhCsv(`rekap-kas-${mode === "minggu" ? "mingguan" : "bulanan"}-${profil.namaUsaha.toLowerCase().replace(/\W+/g, "-")}.csv`, [
      ["Periode", ...KOLOM.map((k) => k.label), "Keterangan"],
      ...baris.map((b) => [labelPeriode(b), ...KOLOM.map((k) => b[k.kunci] as number), b.lengkap ? "" : "Belum lengkap"]),
      ["Total", ...KOLOM.map((k) => total[k.kunci as keyof typeof total] as number), ""],
    ]);

  return (
    <div className="nk-rekap">
      <div className="nk-toolbar">
        <Segmen label="Rekap per" pilihan={[{ id: "minggu", label: "Minggu" }, { id: "bulan", label: "Bulan" }]} nilai={mode} onPilih={setMode} />
        <button className="nk-btn sekunder" onClick={ekspor}>
          <PIcon name="download" size={16} /> Ekspor CSV
        </button>
      </div>
      <p className="nk-muted kecil">
        Klik baris untuk melihat rincian per kategori.{" "}
        {terendah && (
          <>
            <i className="nk-penanda-terendah" /> Laba terendah: <b>{labelPeriode(terendah)}</b>.
          </>
        )}
      </p>
      <div className="nk-tabel-wrap">
        <table className="nk-tabel nk-tabel-rekap">
          <thead>
            <tr>
              <th>Periode</th>
              {KOLOM.map((k) => (
                <th key={k.kunci} className="kanan">
                  {k.arti ? <Istilah arti={k.arti}>{k.label}</Istilah> : k.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {baris.map((b) => (
              <Fragment key={b.kunci}>
                <tr
                  className={`bisa-klik ${terendah?.kunci === b.kunci ? "terendah" : ""} ${buka === b.kunci ? "terbuka" : ""}`}
                  onClick={() => setBuka(buka === b.kunci ? null : b.kunci)}
                  aria-expanded={buka === b.kunci}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setBuka(buka === b.kunci ? null : b.kunci)}
                >
                  <td className="nowrap">
                    <PIcon name={buka === b.kunci ? "chevronDown" : "chevronRight"} size={14} /> {labelPeriode(b)}
                    {!b.lengkap && <span className="nk-badge abu">Belum lengkap</span>}
                  </td>
                  {KOLOM.map((k) => (
                    <td key={k.kunci} className={`kanan nowrap ${(b[k.kunci] as number) < 0 ? "negatif" : ""}`}>
                      {rupiah(b[k.kunci] as number)}
                    </td>
                  ))}
                </tr>
                {buka === b.kunci && (
                  <tr className="nk-rincian-row">
                    <td colSpan={KOLOM.length + 1}>
                      <div className="nk-rincian-kategori">
                        {Object.entries(b.perKategori)
                          .sort((x, y) => y[1] - x[1])
                          .map(([id, nominal]) => (
                            <span key={id}>
                              <small>{peta[id]?.arah === "masuk" ? "Masuk" : "Keluar"}</small>
                              {peta[id]?.nama ?? id}
                              <b>{rupiah(nominal)}</b>
                            </span>
                          ))}
                        <span>
                          <small>Catatan</small>
                          {b.hariTercatat} hari tercatat · {b.jumlahTransaksi} transaksi
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              {KOLOM.map((k) => (
                <td key={k.kunci} className="kanan nowrap">
                  {rupiah(total[k.kunci as keyof typeof total] as number)}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
