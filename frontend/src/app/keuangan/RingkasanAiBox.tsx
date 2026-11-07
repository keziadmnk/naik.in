import { useMemo, useState } from "react";
import { api } from "../../api";
import { PIcon } from "../../components/icons";
import { GaugeFigma } from "../../components/figma";
import { dalamRentang, kelengkapan, rentangPeriode, ringkas } from "../../lib/finance";
import { tanggal } from "../../lib/format";
import { goTo } from "../../routes";
import { hitungAngka, poinTemplat } from "../../lib/ringkasan";
import { useToko } from "../../state/store";

export function RingkasanAiBox() {
  const { transaksi, kategori, temuan, perluDicek, hariIni, hariLibur, ringkasanAi, demo, kirim } = useToko();
  const [proses, setProses] = useState(false);
  const [catatan, setCatatan] = useState<string | null>(null);
  const data = useMemo(
    () => hitungAngka(transaksi, kategori, temuan, perluDicek, hariIni, hariLibur),
    [transaksi, kategori, temuan, perluDicek, hariIni, hariLibur],
  );

  // Ringkasan tersimpan dipakai bila jumlah transaksinya masih sama; jika data berubah, tampilkan templat terbaru.
  const tersimpan = ringkasanAi && ringkasanAi.jumlahTransaksi === data.angka.jumlahTransaksi ? ringkasanAi : null;
  const poin = tersimpan?.poin ?? poinTemplat(data);
  const sumber = tersimpan?.sumber ?? "templat";

  const perbarui = async () => {
    setProses(true);
    setCatatan(null);
    const templat = poinTemplat(data);
    let hasil = { poin: templat, sumber: "templat" as "ai" | "templat" };
    if (demo.modeOffline) setCatatan("Mode offline: menampilkan ringkasan templat.");
    else {
      const res = await api.insight(
        { ...data.angka, rasioHppPersen: Math.round(data.angka.rasioHpp * 100) },
        "Ringkas kondisi keuangan UMKM keripik dalam 4-5 poin singkat berbahasa Indonesia sederhana. Jangan menyebut layak kredit, terjamin, atau terverifikasi.",
      );
      if (res.ok && res.data) {
        const poinAi = [res.data.ringkasan, ...res.data.risiko, ...res.data.saran].filter(Boolean).slice(0, 5);
        if (poinAi.length) hasil = { poin: poinAi, sumber: "ai" };
      } else setCatatan(`AI tidak tersedia (${res.alasan ?? "tidak ada respons"}). Menampilkan ringkasan templat.`);
    }
    kirim({
      type: "ringkasanAi",
      ringkasan: { ...hasil, diperbaruiPada: hariIni, jumlahTransaksi: data.angka.jumlahTransaksi },
      meta: { dari: data.rentang.dari, sampai: data.rentang.sampai, angka: { ...data.angka } },
    });
    setProses(false);
  };

  // Indikator persentase dari 6 bulan catatan terkonfirmasi (bukan skor karangan)
  const r6 = rentangPeriode("6b", hariIni);
  const enam = ringkas(dalamRentang(transaksi.filter((t) => !perluDicek.has(t.id)), r6.dari, r6.sampai), kategori);
  const k = kelengkapan(transaksi, kategori, hariIni, hariLibur);
  const bagi = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);
  const gauge = [
    { nilai: bagi(enam.laba, enam.penjualan), label: "Margin Laba Usaha", sub: "laba ÷ penjualan" },
    { nilai: bagi(enam.hpp, enam.penjualan), label: "Rasio HPP", sub: "bahan & kemasan ÷ penjualan" },
    { nilai: bagi(enam.operasional, enam.penjualan), label: "Biaya Operasional", sub: "operasional ÷ penjualan" },
    { nilai: bagi(enam.pribadi, enam.uangKeluar), label: "Porsi Pengeluaran Pribadi", sub: "pribadi ÷ uang keluar" },
    { nilai: k.rasio * 100, label: "Kelengkapan Catatan", sub: `${k.mingguLengkap} dari ${k.totalMinggu} minggu` },
  ];

  return (
    <div className="analysis-content">
      <div className="analysis-gauges">
        {gauge.map((g) => (
          <GaugeFigma key={g.label} nilai={g.nilai} label={g.label} sub={g.sub} />
        ))}
      </div>
      <article className="ai-summary-card">
        <div className="ai-summary-icon">
          <PIcon name="sparkle" size={24} />
        </div>
        <div>
          <span>{sumber === "ai" ? "NAIK.IN AI Financial Summary" : "Ringkasan templat · AI belum dipakai"}</span>
          <h2>Ringkasan analisis kondisi keuangan (AI)</h2>
          <ul className="fg-ai-poin">
            {poin.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
          <div className="recommendations">
            <span>
              <PIcon name="check" size={13} />
              Diperbarui {tanggal(tersimpan?.diperbaruiPada ?? hariIni)}, dari {data.angka.jumlahTransaksi} transaksi terkonfirmasi
            </span>
          </div>
          <div className="fg-ai-aksi">
            <button onClick={perbarui} disabled={proses}>
              <PIcon name="refresh" size={15} /> {proses ? "Memperbarui…" : "Perbarui analisis"}
            </button>
            <button onClick={() => goTo("kur")}>
              Lanjut ke Simulasi KUR <PIcon name="arrow" size={15} />
            </button>
          </div>
          {catatan && <small className="fg-ai-catatan">{catatan}</small>}
          <small className="fg-ai-catatan">AI menjelaskan angka yang dihitung sistem. Periode ringkasan: 30 hari terakhir; indikator di atas: 6 bulan.</small>
        </div>
      </article>
    </div>
  );
}
