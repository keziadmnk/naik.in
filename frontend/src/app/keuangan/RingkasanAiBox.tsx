import { useMemo, useState } from "react";
import { api } from "../../api";
import { PIcon } from "../../components/icons";
import { tanggal } from "../../lib/format";
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

  return (
    <section className="nk-card nk-ai" aria-labelledby="judul-ai">
      <div className="nk-card-head">
        <div>
          <span className="nk-eyebrow">
            <PIcon name="sparkle" size={13} /> {sumber === "ai" ? "Dijelaskan AI" : "Ringkasan templat"}
          </span>
          <h3 id="judul-ai">Ringkasan analisis kondisi keuangan (AI)</h3>
        </div>
      </div>
      <ul className="nk-ai-poin">
        {poin.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
      <div className="nk-ai-kaki">
        <span className="nk-stempel">
          <PIcon name="check" size={13} />
          Diperbarui {tanggal(tersimpan?.diperbaruiPada ?? hariIni)}, dari {data.angka.jumlahTransaksi} transaksi terkonfirmasi
        </span>
        <button className="nk-btn sekunder kecil" onClick={perbarui} disabled={proses}>
          <PIcon name="refresh" size={15} /> {proses ? "Memperbarui…" : "Perbarui analisis"}
        </button>
      </div>
      {catatan && <p className="nk-muted kecil">{catatan}</p>}
      <small className="nk-ai-catatan">AI menjelaskan angka yang dihitung sistem. Periode: 30 hari terakhir.</small>
    </section>
  );
}
