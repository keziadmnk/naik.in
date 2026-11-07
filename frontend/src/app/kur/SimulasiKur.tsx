import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../../api";
import { BatangSkenario, GaugeRisiko, GrafikKipas, WARNA_STATUS } from "../../components/chartsKur";
import { PIcon } from "../../components/icons";
import { DemoStrip, PageHeader } from "../../components/figma";
import { ARTI, Cincin, Istilah, Saklar } from "../../components/ui";
import { GrafikGabungan } from "../../components/charts";
import {
  AMBANG_HIJAU, AMBANG_KUNING, BULAN_CADANGAN, BULAN_MENABUNG_CADANGAN, LABEL_AMBANG, MIN_HARI_MINGGU_VALID,
  MIN_MINGGU_VALID_KUR, MINGGU_JENDELA, PLAFON_LANGKAH, PLAFON_MAKS, PLAFON_MIN, PLAFON_WAJIB_NPWP, TENOR_PILIHAN,
  SEED_SIMULASI, TENOR_REKOMENDASI, USIA_USAHA_MIN_BULAN, type Tenor,
} from "../../lib/config/thresholds";
import {
  LABEL_STATUS, batasCicilan, buatJalur, kalimatStatus, nilai, penjelasanRekomendasi, plafonAman, proyeksiKipas,
  rekomendasi, risikoNpl, siapkanData, susunTindakan, zonaSlider, type DataPinjaman, type Kapasitas, type Status,
} from "../../lib/engine/loan";
import { rekapBulanan } from "../../lib/finance";
import { namaBulan, persen, rentang, rupiah, rupiahRingkas, toDate } from "../../lib/format";
import { goTo } from "../../routes";
import { idBaru, useToko } from "../../state/store";

const CATATAN_HALAMAN = "Ini alat bantu persiapan, bukan keputusan kredit. Bunga dan syarat dapat berbeda per bank; konfirmasikan ke bank.";
const LABEL_NPL = "Estimasi simulasi dari pola 26 minggu usaha Anda; bukan prediksi bank dan mengabaikan musim serta kejadian luar biasa.";

const ARTI_KUR = {
  npl: "NPL (Non-Performing Loan) atau kredit macet: cicilan yang tidak terbayar beberapa bulan berturut-turut. Di sini dihitung sebagai peluang muncul 3 bulan sulit bayar berturut-turut.",
  batasAman: "Cicilan per bulan terbesar yang masih Hijau: tidak lebih dari 30% laba rata-rata, dan saat bulan sepi pun uang dapur tetap aman.",
  lapis1: "Lapis 1 melihat kapasitas dasar: rata-rata laba mingguan 6 bulan × 4 minggu.",
  lapis2: "Lapis 2 menguji saat sepi: kuartil bawah laba mingguan × 4. Seperempat minggu labanya di bawah angka ini.",
  plafonAman: "Pinjaman terbesar yang cicilannya masih sama dengan batas aman pada tenor dan bunga ini.",
};

// ===========================================================================
// Layar terkunci
// ===========================================================================

function KurTerkunci({ data }: { data: DataPinjaman }) {
  const { kirim } = useToko();
  const belum = data.minggu.filter((m) => !m.valid);
  const perBulan = new Map<string, typeof belum>();
  for (const m of belum) perBulan.set(m.dari.slice(0, 7), [...(perBulan.get(m.dari.slice(0, 7)) ?? []), m]);
  return (
    <div className="fg-halaman">
      <PageHeader title="Simulasi Kesiapan KUR" subtitle="Uji kemampuan membayar cicilan berdasarkan kondisi keuangan dan ketahanan kas usahamu.">
        <span className="disclaimer">
          <PIcon name="alert" size={14} />
          Bukan keputusan persetujuan kredit bank
        </span>
      </PageHeader>
      <section className="nk-card nk-kunci">
        <Cincin rasio={data.bulanTerdata / 6} ukuran={132} tebal={12}>
          <div className="nk-kunci-cincin">
            <strong>{data.bulanTerdata}/6</strong>
            <span>bulan</span>
          </div>
        </Cincin>
        <div className="nk-kunci-isi">
          <span className="nk-badge abu">
            <PIcon name="lock" size={12} /> Simulasi terkunci
          </span>
          <h2>Data baru {data.bulanTerdata} dari 6 bulan</h2>
          <p>
            Simulasi Kesiapan KUR butuh catatan <b>{MINGGU_JENDELA} minggu penuh</b> terakhir ({rentang(data.jendela.dari, data.jendela.sampai)}), dengan minimal{" "}
            <b>{MIN_MINGGU_VALID_KUR} minggu</b> yang tercatat setidaknya {MIN_HARI_MINGGU_VALID} hari. Saat ini baru <b>{data.mingguValid} minggu</b> yang lengkap.
          </p>
          <p className="nk-muted kecil">Tidak ada mode perkiraan: angka pinjaman hanya dihitung dari catatan nyata agar tidak menyesatkan.</p>
          <div className="nk-kunci-aksi">
            <button className="nk-btn" onClick={() => goTo("keuangan")}>
              <PIcon name="pen" size={16} /> Lengkapi kas
            </button>
            <button className="nk-btn sekunder" onClick={() => kirim({ type: "demo", demo: { akunKosong: false, dataTigaBulan: false } })}>
              <PIcon name="sparkle" size={16} /> Lihat contoh dengan data demo
            </button>
          </div>
        </div>
      </section>
      <section className="nk-card">
        <h3>Minggu yang belum lengkap</h3>
        <p className="nk-muted kecil">Minggu dihitung lengkap bila minimal {MIN_HARI_MINGGU_VALID} dari 7 hari tercatat (hari libur dihitung tercatat).</p>
        <div className="nk-kunci-bulan">
          {[...perBulan.entries()].map(([bulan, daftar]) => (
            <div key={bulan}>
              <b>{namaBulan(bulan, true)}</b>
              {daftar.map((m) => (
                <span key={m.dari}>
                  {rentang(m.dari, m.sampai)} · {m.hariTercatat === 0 ? "belum ada catatan" : `${m.hariTercatat} hari tercatat`}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ===========================================================================
// Slider plafon dengan zona warna
// ===========================================================================

function SliderPlafon({
  nilai: plafon, onUbah, zona, plafonRekomendasi,
}: { nilai: number; onUbah: (v: number) => void; zona: { plafon: number; status: Status }[]; plafonRekomendasi: number }) {
  const rentangTotal = PLAFON_MAKS - PLAFON_MIN;
  const pct = (v: number) => (v - PLAFON_MIN) / rentangTotal;
  // Gradien zona: satu segmen per perubahan status
  const stops: string[] = [];
  zona.forEach((z, i) => {
    const awal = i === 0 ? 0 : (pct(z.plafon) - PLAFON_LANGKAH / 2 / rentangTotal) * 100;
    const akhir = i === zona.length - 1 ? 100 : (pct(z.plafon) + PLAFON_LANGKAH / 2 / rentangTotal) * 100;
    stops.push(`${WARNA_STATUS[z.status]} ${Math.max(0, awal)}%`, `${WARNA_STATUS[z.status]} ${Math.min(100, akhir)}%`);
  });
  const posisi = (v: number) => `calc(${pct(v)} * (100% - 26px) + 13px)`;
  return (
    <div className="nk-slider">
      <div className="nk-slider-pin" style={{ left: posisi(plafonRekomendasi) }}>
        <span>
          <PIcon name="sparkle" size={11} /> Rekomendasi AI
        </span>
        <i />
      </div>
      <div className="nk-slider-track" style={{ background: `linear-gradient(to right, ${stops.join(", ")})` }} />
      <input
        type="range"
        min={PLAFON_MIN}
        max={PLAFON_MAKS}
        step={PLAFON_LANGKAH}
        value={plafon}
        onChange={(e) => onUbah(Number(e.target.value))}
        aria-label="Rencana pinjaman KUR"
        aria-valuetext={rupiah(plafon)}
      />
      <div className="nk-slider-skala">
        <span>Rp5 jt</span>
        <span>Rp20 jt</span>
        <span>Rp35 jt</span>
        <span>Rp50 jt</span>
      </div>
      <div className="nk-slider-legenda">
        {(["hijau", "kuning", "merah"] as Status[]).map((s) => (
          <span key={s}>
            <i style={{ background: WARNA_STATUS[s] }} />
            {LABEL_STATUS[s]}
          </span>
        ))}
      </div>
    </div>
  );
}

function InputRupiah({ label, nilai, onUbah, petunjuk }: { label: ReactNode; nilai: number; onUbah: (v: number) => void; petunjuk?: ReactNode }) {
  return (
    <label className="nk-field">
      <span>{label}</span>
      <div className="nk-input-rp">
        <i>Rp</i>
        <input inputMode="numeric" value={nilai ? nilai.toLocaleString("id-ID") : "0"} onChange={(e) => onUbah(Number(e.target.value.replace(/\D/g, "")) || 0)} />
        <small>/bulan</small>
      </div>
      {petunjuk && <small>{petunjuk}</small>}
    </label>
  );
}

// ===========================================================================
// Halaman utama
// ===========================================================================

function KurTerbuka({ data }: { data: DataPinjaman }) {
  const toko = useToko();
  const { kur, biayaRutin, temuan, transaksi, kategori, hariIni, profil, perluDicek, demo, kirim } = toko;

  const kebutuhanAwal = (() => {
    const pengaturan = biayaRutin.filter((b) => b.jenis === "rumah_tangga").reduce((a, b) => a + b.nominalBulanan, 0);
    return pengaturan > 0 ? pengaturan : Math.round(data.pribadiRataBulanan / 1000) * 1000;
  })();
  const kebutuhanRT = kur.kebutuhanRT ?? kebutuhanAwal;
  const kap: Kapasitas = useMemo(
    () => ({ labaRata: data.labaRata, labaStress: data.labaStress, labaTerburuk: data.labaTerburuk, kebutuhanRT, cicilanLama: kur.cicilanLama }),
    [data, kebutuhanRT, kur.cicilanLama],
  );

  const rek = useMemo(() => rekomendasi(kap, kur.konservatif), [kap, kur.konservatif]);
  const [plafon, setPlafon] = useState(rek.plafon);
  const [tenor, setTenor] = useState<Tenor>(TENOR_REKOMENDASI);
  const [penjelasan, setPenjelasan] = useState<{ teks: string; sumber: "ai" | "templat" } | null>(null);
  const [prosesAi, setProsesAi] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [syarat, setSyarat] = useState<Record<string, boolean>>({});
  const [modeSepi, setModeSepi] = useState<"kuartil" | "terburuk">("kuartil");

  // Saat kapasitas berubah (input uang dapur / cicilan lama), penjelasan lama tidak berlaku lagi
  useEffect(() => setPenjelasan(null), [rek.plafon, kap]);

  const p = useMemo(() => nilai(kap, plafon, tenor, kur.konservatif), [kap, plafon, tenor, kur.konservatif]);
  const batas = batasCicilan(kap);
  const zona = useMemo(() => zonaSlider(kap, tenor, kur.konservatif), [kap, tenor, kur.konservatif]);
  const jalur = useMemo(() => buatJalur(data.blok), [data.blok]);
  const risiko = useMemo(() => risikoNpl(jalur, kebutuhanRT, p.beban, tenor), [jalur, kebutuhanRT, p.beban, tenor]);
  const kipas = useMemo(() => proyeksiKipas(jalur, kebutuhanRT, p.beban), [jalur, kebutuhanRT, p.beban]);
  const diRekomendasi = plafon === rek.plafon && tenor === rek.tenor;

  const tindakan = useMemo(() => {
    const pribadi = temuan.filter((t) => t.jenis === "kemungkinan_pribadi");
    const totalPribadi = pribadi.reduce((a, t) => a + (transaksi.find((x) => x.id === t.transaksiIds[0])?.nominal ?? 0), 0);
    const terkonfirmasi = transaksi.filter((t) => !perluDicek.has(t.id));
    const labaBulanan = terkonfirmasi.length
      ? rekapBulanan(terkonfirmasi, kategori, data.jendela.dari, hariIni).filter((b) => b.lengkap).map((b) => ({ bulan: b.kunci, laba: b.laba }))
      : [];
    return susunTindakan({
      kapasitas: kap,
      penilaian: p,
      konservatif: kur.konservatif,
      kelengkapan: { rasio: data.mingguValid / MINGGU_JENDELA, mingguBelumValid: data.minggu.filter((m) => !m.valid) },
      pribadiTercampur: { jumlah: pribadi.length, total: totalPribadi },
      labaBulanan,
    });
  }, [temuan, transaksi, perluDicek, kategori, data, hariIni, kap, p, kur.konservatif]);

  const usiaBulan = (() => {
    const a = toDate(profil.mulaiUsaha);
    const b = toDate(hariIni);
    return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
  })();

  const kembalikan = () => {
    setPlafon(rek.plafon);
    setTenor(rek.tenor);
  };

  const mintaAi = async () => {
    setProsesAi(true);
    const templat = diRekomendasi ? penjelasanRekomendasi(rek, kap) : kalimatStatus(p);
    if (demo.modeOffline) {
      setPenjelasan({ teks: templat, sumber: "templat" });
      setProsesAi(false);
      return;
    }
    const angka = {
      plafon: p.plafon,
      tenorBulan: p.tenor,
      bungaPersenPerTahun: p.bunga.tahunan * 100,
      cicilanPerBulan: Math.round(p.cicilanBaru),
      batasAmanCicilan: Math.round(batas.aman),
      labaRataBulanan: Math.round(kap.labaRata),
      labaBulanSepi: Math.round(kap.labaStress),
      uangDapurKeluarga: kap.kebutuhanRT,
      sisaKasRataRata: Math.round(p.sisaRata),
      sisaKasBulanSepi: Math.round(p.sisaStress),
      rasioCicilanPersen: Math.round(p.rasioRata * 1000) / 10,
      peluangBulanSulitPersen: Math.round(risiko.peluangBulanSulit * 1000) / 10,
      risikoMacetPersen: Math.round(risiko.npl * 1000) / 10,
    };
    const res = await api.insight(
      angka,
      `Status simulasi: ${LABEL_STATUS[p.status]}. Tulis 2-3 kalimat Bahasa Indonesia sederhana yang menjelaskan alasan status dan rencana pinjaman ini. Hanya kutip angka yang diberikan, jangan menghitung atau menambah angka. Jangan menyebut layak, disetujui, terjamin, atau terverifikasi.`,
    );
    if (res.ok && res.data) setPenjelasan({ teks: [res.data.ringkasan, ...res.data.saran.slice(0, 1)].join(" "), sumber: "ai" });
    else {
      setPenjelasan({ teks: templat, sumber: "templat" });
      setPesan(`AI tidak tersedia (${res.alasan ?? "tidak ada respons"}); menampilkan penjelasan templat.`);
      window.setTimeout(() => setPesan(null), 3500);
    }
    setProsesAi(false);
  };

  const simpan = (keLaporan: boolean) => {
    const id = idBaru();
    kirim({
      type: "simpanSimulasi",
      simulasi: {
        id, dibuat: new Date().toISOString(), plafon: p.plafon, tenor: p.tenor, bungaTahunan: p.bunga.tahunan, cicilan: p.cicilanBaru,
        status: p.status, npl: risiko.npl, kebutuhanRT, cicilanLama: kur.cicilanLama, diLaporan: keLaporan,
      },
      // Rincian untuk tabel loan_simulations (angka input & hasil engine, agar dapat diaudit)
      detail: {
        jendelaDari: data.jendela.dari, jendelaSampai: data.jendela.sampai, mingguValid: data.mingguValid,
        labaRata: kap.labaRata, labaStress: kap.labaStress, labaTerburuk: kap.labaTerburuk, kebutuhanRT, cicilanLama: kur.cicilanLama,
        plafon: p.plafon, tenor: p.tenor, bungaTahunan: p.bunga.tahunan, jenisKur: p.bunga.jenis, konservatif: kur.konservatif,
        cicilan: p.cicilanBaru, batasAman: batas.aman, batasHatiHati: batas.hatiHati,
        rasioRata: Number.isFinite(p.rasioRata) ? Math.round(p.rasioRata * 10000) / 10000 : null,
        sisaRata: p.sisaRata, sisaStress: p.sisaStress, status: p.status,
        targetCadangan: p.cadangan?.target ?? null, setoranCadangan: p.cadangan?.setoranBulanan ?? null,
        peluangBulanSulit: risiko.peluangBulanSulit, npl: risiko.npl, seed: SEED_SIMULASI, jumlahSimulasi: jalur.jumlah,
        penjelasan: penjelasan?.teks ?? (diRekomendasi ? penjelasanRekomendasi(rek, kap) : null),
        penjelasanSumber: penjelasan?.sumber ?? (diRekomendasi ? "templat" : null),
        tindakan: tindakan.map((t) => ({ jenis: t.jenis, prioritas: t.prioritas, judul: t.judul, angka: t.angka, teks: t.teks })),
      },
    });
    setPesan(keLaporan ? "Simulasi dimasukkan ke Laporan." : "Simulasi disimpan.");
    window.setTimeout(() => setPesan(null), 2600);
  };

  const teksPenjelasan = penjelasan?.teks ?? (diRekomendasi ? penjelasanRekomendasi(rek, kap) : null);

  // --- data tampilan (dari engine & store, tanpa perhitungan baru) ---
  const bulanJendela = rekapBulanan(transaksi.filter((t) => !perluDicek.has(t.id)), kategori, data.jendela.dari, data.jendela.sampai);
  const statusBulan = bulanJendela.map((b) => {
    const m = data.minggu.filter((w) => w.sampai.slice(0, 7) === b.kunci);
    const kurang = m.filter((w) => !w.valid).length;
    return { kunci: b.kunci, lengkap: m.length > 0 && kurang === 0, kurang };
  });
  const semuaLengkap = statusBulan.every((b) => b.lengkap);
  const kelasStatus = p.status === "hijau" ? "safe" : p.status === "kuning" ? "caution" : "danger";
  const maksMinggu = Math.max(1, ...data.minggu.map((m) => m.laba));
  const ambangSepi = modeSepi === "kuartil" ? kap.labaStress / 4 : (data.mingguTerburuk?.laba ?? 0);
  const labaSepi = modeSepi === "kuartil" ? kap.labaStress : kap.labaTerburuk;
  const sisaSepi = modeSepi === "kuartil" ? p.sisaStress : p.sisaTerburuk;
  const cadanganVisual = [
    ["Kas normal", Math.max(0, kap.labaRata - kap.kebutuhanRT)],
    ["Kas saat sepi", Math.max(0, kap.labaStress - kap.kebutuhanRT)],
    ["Cicilan bulanan", p.beban],
    ["Cadangan disarankan", p.cadangan?.target ?? 0],
  ] as const;
  const maksCadangan = Math.max(1, ...cadanganVisual.map((x) => x[1]));

  return (
    <div className="fg-halaman fg-kur">
      <PageHeader title={<Istilah arti={ARTI.kur}>Simulasi Kesiapan KUR</Istilah>} subtitle="Uji kemampuan membayar cicilan berdasarkan kondisi keuangan dan ketahanan kas usahamu.">
        <span className="disclaimer">
          <PIcon name="alert" size={14} />
          Bukan keputusan persetujuan kredit bank
        </span>
      </PageHeader>
      <DemoStrip>
        Semua angka dihitung sistem dari <b>{data.mingguValid} dari {MINGGU_JENDELA} minggu lengkap</b> ({rentang(data.jendela.dari, data.jendela.sampai)}). AI hanya menjelaskan.
      </DemoStrip>

      <section className="validation-card">
        <div>
          <span>Validasi data 6 bulan</span>
          <h3>{semuaLengkap ? "Data Keuangan Lengkap" : "Data Keuangan Hampir Lengkap"}</h3>
          <p>
            {data.mingguValid} dari {MINGGU_JENDELA} minggu tercatat minimal {MIN_HARI_MINGGU_VALID} hari (syarat minimal {MIN_MINGGU_VALID_KUR} minggu).
            {!semuaLengkap && " Lengkapi minggu yang kosong agar hasil makin akurat."}
          </p>
        </div>
        <div className="timeline">
          {statusBulan.map((b) => (
            <span className={b.lengkap ? "" : "missing"} key={b.kunci}>
              <i>{b.lengkap ? "✓" : "!"}</i>
              <b>{namaBulan(b.kunci).split(" ")[0]}</b>
              <small>{b.lengkap ? "Lengkap" : `${b.kurang} minggu kurang`}</small>
            </span>
          ))}
        </div>
        <button onClick={() => goTo("keuangan")}>
          Lengkapi Data Keuangan <PIcon name="arrow" size={15} />
        </button>
      </section>

      <section className="ai-loan-recommendation">
        <div className="recommendation-icon">
          <PIcon name="sparkle" size={23} />
        </div>
        <div>
          <span>Rekomendasi Awal NAIK.IN AI</span>
          <h3>{rek.adaHijau ? "Rencana pinjaman yang sesuai kemampuan kas" : "Belum ada plafon di zona Siap"}</h3>
          <p>{teksPenjelasan ?? penjelasanRekomendasi(rek, kap)}</p>
          <div className="recommendation-values">
            <div>
              <small>Batas cicilan aman – hati-hati</small>
              <b>
                {rupiah(batas.aman)} – {rupiah(batas.hatiHati)}
              </b>
            </div>
            <div>
              <small>Nominal disarankan</small>
              <b>{rupiah(rek.plafon)}</b>
            </div>
            <div>
              <small>Tenor</small>
              <b>{rek.tenor} Bulan</b>
            </div>
          </div>
          {penjelasan && <small className="fg-sumber">{penjelasan.sumber === "ai" ? "Ditulis AI dari angka sistem" : "Penjelasan templat"}</small>}
        </div>
        <button onClick={kembalikan} disabled={diRekomendasi}>
          {diRekomendasi ? "Rekomendasi AI dipakai" : "Gunakan Rekomendasi AI"}
        </button>
      </section>

      <section className="simulator-card">
        <div className="simulator-head">
          <div>
            <span>Simulator interaktif</span>
            <h3>Atur Rencana Pinjamanmu</h3>
          </div>
          <div className="rate-badge">
            <small>{p.bunga.jenis}</small>
            <b>{persen(p.bunga.tahunan)} Efektif / Tahun</b>
            <i title="Bunga otomatis: plafon s.d. Rp10 juta 3% (KUR Super Mikro), di atasnya 6% (KUR Mikro, sektor produksi).">?</i>
          </div>
        </div>
        <div className="simulator-grid">
          <div className="loan-controls">
            <div className="select-label">
              <span>Kategori KUR</span>
              <div className="fg-kur-jenis">
                <span className="nk-chip statis">
                  <PIcon name="tag" size={13} /> {p.bunga.jenis} · <b>{persen(p.bunga.tahunan)}</b>
                </span>
                <Saklar label="Mode konservatif: 6% untuk semua plafon" nyala={kur.konservatif} onUbah={(v) => kirim({ type: "kur", kur: { konservatif: v } })} />
              </div>
              <small>Bunga ditentukan otomatis dari plafon. Konfirmasi bunga dan syarat ke bank.</small>
            </div>
            <div className="range-block">
              <div>
                <span>Jumlah Pinjaman</span>
                <strong>{rupiah(plafon)}</strong>
              </div>
              <SliderPlafon nilai={plafon} onUbah={setPlafon} zona={zona} plafonRekomendasi={rek.plafon} />
            </div>
            <div className="tenor-control">
              <span>Tenor Pinjaman</span>
              <div>
                {TENOR_PILIHAN.map((x) => (
                  <button className={tenor === x ? "active" : ""} onClick={() => setTenor(x)} key={x}>
                    {x} Bulan
                  </button>
                ))}
              </div>
            </div>
            <div className="nk-kur-input">
              <InputRupiah label="Cicilan lama" nilai={kur.cicilanLama} onUbah={(v) => kirim({ type: "kur", kur: { cicilanLama: v } })} petunjuk="Cicilan lain yang sedang berjalan" />
              <InputRupiah
                label={<Istilah arti="Kebutuhan rumah tangga minimal per bulan yang tidak boleh terpotong cicilan.">Uang dapur keluarga</Istilah>}
                nilai={kebutuhanRT}
                onUbah={(v) => kirim({ type: "kur", kur: { kebutuhanRT: v } })}
                petunjuk={
                  <>
                    Rata-rata pengeluaran pribadi {rupiah(Math.round(data.pribadiRataBulanan / 1000) * 1000)}.{" "}
                    <button type="button" className="nk-link" onClick={() => kirim({ type: "kur", kur: { kebutuhanRT: Math.round(data.pribadiRataBulanan / 1000) * 1000 } })}>
                      Pakai
                    </button>
                  </>
                }
              />
            </div>
          </div>
          <div className="simulation-outputs">
            <article>
              <i>
                <PIcon name="calc" size={18} />
              </i>
              <span>Estimasi Cicilan per Bulan</span>
              <strong>{rupiah(p.cicilanBaru)}</strong>
              <small>
                {p.tenor} bulan · bunga {persen(p.bunga.tahunan)}
                {kur.cicilanLama > 0 && ` · total ${rupiah(p.beban)}`}
              </small>
            </article>
            <article>
              <i>
                <PIcon name="wallet" size={18} />
              </i>
              <span>
                <Istilah arti={ARTI_KUR.batasAman}>Batas Cicilan Aman</Istilah>
              </span>
              <strong>{rupiah(batas.aman)}</strong>
              <small>
                hati-hati {rupiah(batas.hatiHati)} · plafon aman {tenor} bln ≈ {rupiahRingkas(plafonAman(batas.aman, 0.06, tenor))}
              </small>
            </article>
            <article>
              <i>
                <PIcon name="report" size={18} />
              </i>
              <span>Sisa Kas Setelah Cicilan</span>
              <strong className={p.sisaRata < 0 ? "negatif" : ""}>{rupiah(p.sisaRata)}</strong>
              <small>rata-rata, setelah uang dapur</small>
            </article>
            <article className={kelasStatus}>
              <i>
                <PIcon name={p.status === "hijau" ? "check" : "alert"} size={18} />
              </i>
              <span>Status Kesiapan</span>
              <strong>{LABEL_STATUS[p.status]}</strong>
              <small>
                cicilan {Number.isFinite(p.rasioRata) ? persen(p.rasioRata, 1) : "—"} dari laba · {LABEL_AMBANG}
              </small>
            </article>
          </div>
        </div>
      </section>

      <div className="section-title">
        <span>Analisis ketahanan pembayaran</span>
        <h2>Penilaian Arus Kas Dua Lapis</h2>
        <p>Menilai kemampuan cicilan bukan hanya saat usaha ramai, tetapi juga ketika pendapatan menurun.</p>
      </div>
      <div className="dual-layer">
        <article className="layer-card">
          <header>
            <i>01</i>
            <div>
              <span>Lapis 1 · {p.lolosLapis1 ? "✓ Lolos" : "✗ Tidak lolos"}</span>
              <h3>
                <Istilah arti={ARTI_KUR.lapis1}>Kapasitas Dasar 6 Bulan</Istilah>
              </h3>
            </div>
          </header>
          <GrafikGabungan
            tinggi={190}
            data={bulanJendela.map((b) => ({ label: namaBulan(b.kunci).split(" ")[0], sub: namaBulan(b.kunci, true), omzet: b.penjualan, laba: b.laba }))}
            seri={[
              { kunci: "omzet", label: "Omzet", warna: "#C9CDF6", jenis: "batang" },
              { kunci: "laba", label: "Laba usaha", warna: "#5B65DC", jenis: "garis" },
            ]}
          />
          <div className="layer-stats">
            <div>
              <span>Laba rata-rata / bulan</span>
              <b>{rupiah(kap.labaRata)}</b>
            </div>
            <div>
              <span>Uang dapur keluarga</span>
              <b>{rupiah(kap.kebutuhanRT)}</b>
            </div>
            <div>
              <span>Cicilan (total)</span>
              <b>{rupiah(p.beban)}</b>
            </div>
            <div>
              <span>Setelah cicilan</span>
              <b className={p.sisaRata < 0 ? "negatif" : ""}>{rupiah(p.sisaRata)}</b>
            </div>
          </div>
          <p>Laba rata-rata = rata-rata laba mingguan × 4. Lolos bila cicilan ≤ {persen(AMBANG_HIJAU)} laba dan sisa kas tidak minus.</p>
        </article>
        <article className="layer-card downside">
          <header>
            <i>02</i>
            <div>
              <span>Lapis 2 · {p.lolosLapis2 ? "✓ Lolos" : "✗ Tidak lolos"}</span>
              <h3>
                <Istilah arti={ARTI_KUR.lapis2}>Uji Tekan Saat Minggu Sepi</Istilah>
              </h3>
            </div>
          </header>
          <div className="downside-toggle">
            <button className={modeSepi === "kuartil" ? "active" : ""} onClick={() => setModeSepi("kuartil")}>
              Kuartil Bawah
            </button>
            <button className={modeSepi === "terburuk" ? "active" : ""} onClick={() => setModeSepi("terburuk")}>
              Minggu Tersepi
            </button>
          </div>
          <div className="weekly-bars">
            {data.minggu.map((m) => (
              <i
                key={m.dari}
                className={!m.valid ? "fg-kosong" : m.laba <= ambangSepi ? "low" : ""}
                style={{ height: `${m.valid ? Math.max(4, (Math.max(0, m.laba) / maksMinggu) * 100) : 100}%` }}
                title={`${rentang(m.dari, m.sampai)}: ${m.valid ? rupiah(m.laba) : "belum lengkap"}`}
              />
            ))}
          </div>
          <div className="layer-stats">
            <div>
              <span>{modeSepi === "kuartil" ? "Laba minggu sepi (Q1)" : "Laba minggu terendah"}</span>
              <b>{rupiah(labaSepi / 4)}</b>
            </div>
            <div>
              <span>Skenario × 4</span>
              <b>{rupiah(labaSepi)}</b>
            </div>
            <div>
              <span>Uang dapur + cicilan</span>
              <b>{rupiah(kap.kebutuhanRT + p.beban)}</b>
            </div>
            <div>
              <span>Setelah cicilan</span>
              <b className={sisaSepi < 0 ? "negatif" : ""}>{rupiah(sisaSepi)}</b>
            </div>
          </div>
          <p>
            {modeSepi === "kuartil"
              ? "Status memakai kuartil bawah. Batang oranye = minggu di bawah kuartil bawah; abu = minggu belum lengkap."
              : "Minggu tersepi hanya informasi skenario terburuk, tidak menentukan status."}
          </p>
        </article>
      </div>

      <div className="nk-grid-2">
        <section className="panel">
          <div className="panel-title">
            <div>
              <span>Ketahanan kas</span>
              <h3>Sisa kas setelah cicilan dan uang dapur</h3>
            </div>
          </div>
          <BatangSkenario
            data={[
              { label: "Rata-rata", sub: "6 bulan", nilai: p.sisaRata },
              { label: "Sepi", sub: "kuartil bawah", nilai: p.sisaStress },
              { label: "Terburuk", sub: "minggu tersepi", nilai: p.sisaTerburuk },
            ]}
          />
        </section>
        <section className="panel">
          <div className="panel-title">
            <div>
              <span>12 bulan ke depan</span>
              <h3>Proyeksi saldo kas bebas</h3>
            </div>
          </div>
          <div className="nk-legenda">
            <span>
              <i className="garis" style={{ background: "#122056" }} /> Median
            </span>
            <span>
              <i style={{ background: "rgba(91,101,220,.25)" }} /> Rentang 10–90%
            </span>
            <span>
              <i className="garis" style={{ background: "#d0503f" }} /> Nol
            </span>
          </div>
          <GrafikKipas data={kipas} />
          <small className="nk-muted kecil">Dari {jalur.jumlah.toLocaleString("id-ID")} simulasi pola 26 minggu usahamu.</small>
        </section>
      </div>

      <section className={`readiness-status ${kelasStatus}`} role="status" aria-live="polite">
        <div className="status-mark">
          <PIcon name={p.status === "hijau" ? "check" : "alert"} size={27} />
        </div>
        <div>
          <span>Hasil Simulasi Kesiapan Pembayaran</span>
          <h2>{LABEL_STATUS[p.status]}</h2>
          <p>{kalimatStatus(p).replace(/^[^:]+:\s*/, "")}</p>
          <small>
            Ambang {persen(AMBANG_HIJAU)} / {persen(AMBANG_KUNING)}: {LABEL_AMBANG}.
          </small>
        </div>
        <div className="risk-indicator fg-npl">
          <span>
            <Istilah arti={ARTI_KUR.npl}>Risiko Kredit Macet (NPL)</Istilah>
          </span>
          <GaugeRisiko nilai={risiko.npl} />
          <small>
            Peluang bulan sulit bayar <b>{persen(risiko.peluangBulanSulit, 1)}</b>
          </small>
          <em>{LABEL_NPL}</em>
        </div>
      </section>

      <section className="reserve-section">
        <div className="reserve-chart">
          <div className="panel-title">
            <div>
              <span>Perencanaan buffer</span>
              <h3>{p.status === "kuning" && p.cadangan ? "Tabungan Cadangan Cicilan" : "Ketahanan Kas & Cadangan Cicilan"}</h3>
            </div>
          </div>
          <div className="reserve-visual">
            {cadanganVisual.map(([label, nilai], i) => (
              <div key={label}>
                <span>{label}</span>
                <b>{rupiah(nilai)}</b>
                <i style={{ height: `${Math.min(100, (nilai / maksCadangan) * 100)}%` }} className={`bar-${i}`} />
              </div>
            ))}
          </div>
          {p.status === "kuning" && p.cadangan ? (
            <p>
              Target cadangan <b>{rupiah(p.cadangan.target)}</b> ({BULAN_CADANGAN} × kekurangan bulan sepi {rupiah(p.cadangan.kekuranganBulanSepi)}), disetor{" "}
              <b>{rupiah(p.cadangan.setoranBulanan)}</b> per bulan ramai selama {BULAN_MENABUNG_CADANGAN} bulan. Sisihkan saat bulan ramai agar saat bulan sepi cicilan tetap
              terbayar tanpa memotong uang dapur.
            </p>
          ) : (
            <p>{p.status === "hijau" ? "Status Siap: kas saat sepi masih menutup uang dapur dan cicilan, cadangan khusus tidak diperlukan." : "Status Belum siap: turunkan plafon atau perpanjang tenor sebelum memikirkan cadangan."}</p>
          )}
        </div>
        <div className="reserve-ai">
          <span>
            <PIcon name="sparkle" size={17} />
            Rekomendasi Tindakan
          </span>
          <h3>{p.status === "hijau" ? "Rencana ini masih dalam batas aman" : p.status === "kuning" ? "Perkuat cadangan sebelum mengambil cicilan" : "Sesuaikan rencana pinjaman"}</h3>
          <ul>
            {tindakan.map((t) => (
              <li key={t.jenis}>
                <b>{t.judul}.</b> {t.teks}{" "}
                {t.jenis === "turunkan_plafon" && (
                  <button className="fg-link-terang" onClick={() => setPlafon(Number(t.angka.plafon))}>
                    Coba {rupiahRingkas(Number(t.angka.plafon))}
                  </button>
                )}
                {t.jenis === "perpanjang_tenor" && (
                  <button className="fg-link-terang" onClick={() => setTenor(Number(t.angka.tenor) as Tenor)}>
                    Coba {t.angka.tenor} bulan
                  </button>
                )}
              </li>
            ))}
          </ul>
          <button onClick={kembalikan} disabled={diRekomendasi}>
            Gunakan Nominal yang Direkomendasikan
          </button>
          <div className="fg-reserve-aksi">
            <button className="save-simulation" onClick={() => simpan(false)}>
              <PIcon name="download" size={14} />
              Simpan Simulasi
            </button>
            <button className="save-simulation" onClick={() => simpan(true)}>
              <PIcon name="report" size={14} />
              Masukkan ke Laporan
            </button>
            <button className="save-simulation" onClick={mintaAi} disabled={prosesAi}>
              <PIcon name="sparkle" size={14} />
              {prosesAi ? "Meminta…" : "Minta Penjelasan AI"}
            </button>
          </div>
        </div>
      </section>

      <p className="nk-pernyataan">
        <PIcon name="info" size={15} />
        {CATATAN_HALAMAN}
      </p>

      {pesan && (
        <div className="nk-toast" role="status">
          <PIcon name="check" size={16} /> {pesan}
        </div>
      )}
    </div>
  );
}

export function SimulasiKur() {
  const { transaksi, perluDicek, kategori, hariIni, hariLibur } = useToko();
  // Hanya transaksi terkonfirmasi (tidak sedang "Perlu dicek")
  const data = useMemo(
    () => siapkanData(transaksi.filter((t) => !perluDicek.has(t.id)), kategori, hariIni, hariLibur),
    [transaksi, perluDicek, kategori, hariIni, hariLibur],
  );
  return data.terbuka ? <KurTerbuka data={data} /> : <KurTerkunci data={data} />;
}
