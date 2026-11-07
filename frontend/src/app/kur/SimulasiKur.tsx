import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../../api";
import { BatangSkenario, GaugeRisiko, GrafikKipas, WARNA_STATUS } from "../../components/chartsKur";
import { PIcon } from "../../components/icons";
import { ARTI, ArtinyaApa, Cincin, Istilah, Saklar, Segmen } from "../../components/ui";
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
    <div className="nk-halaman">
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

  return (
    <div className="nk-halaman nk-kur">
      <p className="nk-kur-dasar">
        <PIcon name="check" size={14} /> Dihitung dari {data.mingguValid} dari {MINGGU_JENDELA} minggu lengkap ({rentang(data.jendela.dari, data.jendela.sampai)}).
        Semua angka dihitung sistem; AI hanya menjelaskan.
      </p>

      <div className="nk-kur-atas">
        {/* ------------------------------ Kontrol ------------------------------ */}
        <section className="nk-card nk-kur-kontrol" aria-labelledby="judul-rencana">
          <div className="nk-card-head">
            <div>
              <span className="nk-eyebrow">Rencana pinjaman KUR</span>
              <h3 id="judul-rencana" className="nk-kur-plafon">{rupiah(plafon)}</h3>
            </div>
            <button className="nk-btn hantu kecil" onClick={kembalikan} disabled={diRekomendasi}>
              <PIcon name="refresh" size={14} /> Kembalikan ke rekomendasi
            </button>
          </div>
          <SliderPlafon nilai={plafon} onUbah={setPlafon} zona={zona} plafonRekomendasi={rek.plafon} />

          <div className="nk-kur-baris">
            <span className="nk-kur-label">Tenor</span>
            <Segmen label="Tenor" pilihan={TENOR_PILIHAN.map((t) => ({ id: String(t), label: `${t} bulan` }))} nilai={String(tenor)} onPilih={(v) => setTenor(Number(v) as Tenor)} />
          </div>

          <div className="nk-kur-bunga">
            <div>
              <span className="nk-chip statis">
                <PIcon name="tag" size={13} /> {p.bunga.jenis} · <b>{persen(p.bunga.tahunan)} per tahun</b>
              </span>
              <small>Bunga otomatis: plafon s.d. Rp10 juta 3% (KUR Super Mikro), di atasnya 6% (KUR Mikro, sektor produksi).</small>
            </div>
            <Saklar label="Mode konservatif: 6% untuk semua plafon" nyala={kur.konservatif} onUbah={(v) => kirim({ type: "kur", kur: { konservatif: v } })} />
            <p className="nk-catatan-bank">
              <PIcon name="info" size={14} /> Konfirmasi bunga dan syarat ke bank.
            </p>
          </div>

          <div className="nk-kur-input">
            <InputRupiah label="Cicilan lama" nilai={kur.cicilanLama} onUbah={(v) => kirim({ type: "kur", kur: { cicilanLama: v } })} petunjuk="Cicilan lain yang sedang berjalan (motor, koperasi, dll.)" />
            <InputRupiah
              label={<Istilah arti="Kebutuhan rumah tangga minimal per bulan yang tidak boleh terpotong cicilan.">Kebutuhan rumah tangga minimal</Istilah>}
              nilai={kebutuhanRT}
              onUbah={(v) => kirim({ type: "kur", kur: { kebutuhanRT: v } })}
              petunjuk={
                <>
                  Uang dapur keluarga. Rata-rata pengeluaran pribadi kamu {rupiah(Math.round(data.pribadiRataBulanan / 1000) * 1000)}/bulan.{" "}
                  <button type="button" className="nk-link" onClick={() => kirim({ type: "kur", kur: { kebutuhanRT: Math.round(data.pribadiRataBulanan / 1000) * 1000 } })}>
                    Pakai angka ini
                  </button>
                </>
              }
            />
          </div>

          <div className="nk-rek-box">
            <b>
              <PIcon name="sparkle" size={14} /> Rekomendasi AI: {rupiah(rek.plafon)} · {rek.tenor} bulan
            </b>
            <p>{teksPenjelasan ?? `Plafon dan tenor saat ini berbeda dari rekomendasi. Tekan “Kembalikan ke rekomendasi” atau “Minta penjelasan AI” untuk penjelasan simulasi ini.`}</p>
            {penjelasan && <small>{penjelasan.sumber === "ai" ? "Ditulis AI dari angka sistem" : "Penjelasan templat"}</small>}
          </div>
        </section>

        {/* ------------------------------ Hasil ------------------------------ */}
        <div className="nk-kur-hasil">
          <section className={`nk-status-banner ${p.status}`} role="status" aria-live="polite">
            <span className="nk-status-titik" />
            <div>
              <b>{LABEL_STATUS[p.status]}</b>
              <p>{kalimatStatus(p).replace(/^[^:]+:\s*/, "")}</p>
              <small>
                Cicilan {Number.isFinite(p.rasioRata) ? persen(p.rasioRata, 1) : "—"} dari laba rata-rata · batas {persen(AMBANG_HIJAU)} / {persen(AMBANG_KUNING)} ({LABEL_AMBANG})
              </small>
            </div>
          </section>

          <div className="nk-kur-kartu">
            <article className="nk-card nk-angka">
              <div className="nk-angka-head">
                <span>Cicilan KUR per bulan</span>
              </div>
              <strong>{rupiah(p.cicilanBaru)}</strong>
              <small className="nk-muted kecil">
                {p.tenor} bulan · bunga {persen(p.bunga.tahunan)}
                {kur.cicilanLama > 0 && <> · total beban {rupiah(p.beban)}</>}
              </small>
            </article>
            <article className="nk-card nk-angka">
              <div className="nk-angka-head">
                <span>
                  <Istilah arti={ARTI_KUR.batasAman}>Batas aman cicilan</Istilah>
                </span>
              </div>
              <strong>{rupiah(batas.aman)}</strong>
              <small className="nk-muted kecil">Batas hati-hati {rupiah(batas.hatiHati)}</small>
              <small className="nk-muted kecil">
                <Istilah arti={ARTI_KUR.plafonAman}>Plafon aman</Istilah> {tenor} bln (6%): <b>{rupiahRingkas(plafonAman(batas.aman, 0.06, tenor))}</b>
              </small>
            </article>
            <article className="nk-card nk-angka nk-npl">
              <div className="nk-angka-head">
                <span>
                  <Istilah arti={ARTI_KUR.npl}>Risiko Kredit Macet (NPL)</Istilah>
                </span>
              </div>
              <GaugeRisiko nilai={risiko.npl} />
              <p className="nk-npl-bawah">
                Peluang bulan sulit bayar <b>{persen(risiko.peluangBulanSulit, 1)}</b>
              </p>
              <small className="nk-muted kecil">{LABEL_NPL}</small>
            </article>
          </div>
        </div>
      </div>

      {/* ------------------------------ Dua lapis + cadangan ------------------------------ */}
      <div className={p.status === "kuning" && p.cadangan ? "nk-grid-2-1" : ""}>
        <section className="nk-card nk-dua-lapis" aria-labelledby="judul-lapis">
          <div className="nk-card-head">
            <div>
              <span className="nk-eyebrow">Metode</span>
              <h3 id="judul-lapis">Penilaian Arus Kas Dua Lapis</h3>
            </div>
          </div>
          <div className="nk-lapis-grid">
            <div className={`nk-lapis ${p.lolosLapis1 ? "lolos" : "gagal"}`}>
              <header>
                <span>
                  Lapis 1 · <Istilah arti={ARTI_KUR.lapis1}>Kapasitas Dasar</Istilah>
                </span>
                <em>{p.lolosLapis1 ? "✓ Lolos" : "✗ Tidak lolos"}</em>
              </header>
              <dl>
                <dt>Laba rata-rata / bulan</dt>
                <dd>{rupiah(kap.labaRata)}</dd>
                <dt>Uang dapur keluarga</dt>
                <dd>− {rupiah(kap.kebutuhanRT)}</dd>
                <dt>Cicilan (total)</dt>
                <dd>− {rupiah(p.beban)}</dd>
                <dt className="hasil">Sisa kas</dt>
                <dd className={`hasil ${p.sisaRata < 0 ? "negatif" : ""}`}>{rupiah(p.sisaRata)}</dd>
                <dt>Rasio cicilan</dt>
                <dd>{Number.isFinite(p.rasioRata) ? persen(p.rasioRata, 1) : "—"} (maks. {persen(AMBANG_HIJAU)})</dd>
              </dl>
            </div>
            <div className={`nk-lapis ${p.lolosLapis2 ? "lolos" : "gagal"}`}>
              <header>
                <span>
                  Lapis 2 · <Istilah arti={ARTI_KUR.lapis2}>Uji Tekan Saat Sepi</Istilah>
                </span>
                <em>{p.lolosLapis2 ? "✓ Lolos" : "✗ Tidak lolos"}</em>
              </header>
              <dl>
                <dt>
                  Laba bulan sepi <ArtinyaApa arti={ARTI.kuartilBawah} />
                </dt>
                <dd>{rupiah(kap.labaStress)}</dd>
                <dt>Uang dapur keluarga</dt>
                <dd>− {rupiah(kap.kebutuhanRT)}</dd>
                <dt>Cicilan (total)</dt>
                <dd>− {rupiah(p.beban)}</dd>
                <dt className="hasil">Sisa kas</dt>
                <dd className={`hasil ${p.sisaStress < 0 ? "negatif" : ""}`}>{rupiah(p.sisaStress)}</dd>
                <dt>Skenario terburuk (info)</dt>
                <dd className={p.sisaTerburuk < 0 ? "negatif" : ""}>{rupiah(p.sisaTerburuk)}</dd>
              </dl>
            </div>
          </div>
        </section>

        {p.status === "kuning" && p.cadangan && (
          <section className="nk-card nk-cadangan" aria-labelledby="judul-cadangan">
            <span className="nk-eyebrow">Untuk status Hati-hati</span>
            <h3 id="judul-cadangan">Tabungan Cadangan Cicilan</h3>
            <div className="nk-cadangan-angka">
              <div>
                <small>Target cadangan</small>
                <strong>{rupiah(p.cadangan.target)}</strong>
                <span>
                  {BULAN_CADANGAN} × kekurangan bulan sepi {rupiah(p.cadangan.kekuranganBulanSepi)}
                </span>
              </div>
              <div>
                <small>Setoran per bulan ramai</small>
                <strong>{rupiah(p.cadangan.setoranBulanan)}</strong>
                <span>selama {BULAN_MENABUNG_CADANGAN} bulan</span>
              </div>
            </div>
            <p>Sisihkan saat bulan ramai agar saat bulan sepi cicilan tetap terbayar tanpa memotong uang dapur.</p>
          </section>
        )}
      </div>

      {/* ------------------------------ Ketahanan kas ------------------------------ */}
      <div className="nk-grid-2">
        <section className="nk-card">
          <div className="nk-card-head">
            <div>
              <span className="nk-eyebrow">Ketahanan kas</span>
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
        <section className="nk-card">
          <div className="nk-card-head">
            <div>
              <span className="nk-eyebrow">12 bulan ke depan</span>
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
          <small className="nk-muted kecil">Saldo kumulatif setelah uang dapur dan cicilan, dari {jalur.jumlah.toLocaleString("id-ID")} simulasi pola 26 minggu.</small>
        </section>
      </div>

      {/* ------------------------------ Tindakan + syarat ------------------------------ */}
      <div className="nk-grid-2-1">
        <section className="nk-card" aria-labelledby="judul-tindakan">
          <div className="nk-card-head">
            <div>
              <span className="nk-eyebrow">Langkah berikutnya</span>
              <h3 id="judul-tindakan">Rekomendasi tindakan</h3>
            </div>
          </div>
          <ol className="nk-tindakan">
            {tindakan.map((t, i) => (
              <li key={t.jenis} className={`prioritas-${t.prioritas}`}>
                <span>{i + 1}</span>
                <div>
                  <b>{t.judul}</b>
                  <p>{t.teks}</p>
                  {t.jenis === "turunkan_plafon" && (
                    <button className="nk-link" onClick={() => setPlafon(Number(t.angka.plafon))}>
                      Coba {rupiahRingkas(Number(t.angka.plafon))}
                    </button>
                  )}
                  {t.jenis === "perpanjang_tenor" && (
                    <button className="nk-link" onClick={() => setTenor(Number(t.angka.tenor) as Tenor)}>
                      Coba {t.angka.tenor} bulan
                    </button>
                  )}
                  {t.jenis === "lengkapi_minggu" && (
                    <button className="nk-link" onClick={() => goTo("keuangan", "perlu-dicek")}>
                      Buka Perlu Dicek
                    </button>
                  )}
                  {t.jenis === "pisahkan_rekening" && (
                    <button className="nk-link" onClick={() => goTo("keuangan", "perlu-dicek")}>
                      Periksa pengeluaran pribadi
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section className="nk-card" aria-labelledby="judul-syarat">
          <span className="nk-eyebrow">Informasi, tidak masuk skor</span>
          <h3 id="judul-syarat">Syarat umum KUR</h3>
          <ul className="nk-syarat">
            {[
              { id: "nib", teks: "NIB atau Surat Keterangan Usaha (SKU)" },
              { id: "ktp", teks: "e-KTP" },
              { id: "npwp", teks: "NPWP", catatan: plafon > PLAFON_WAJIB_NPWP ? "Wajib untuk plafon di atas Rp50 juta" : "Hanya wajib untuk plafon di atas Rp50 juta" },
              {
                id: "usia",
                teks: `Usaha aktif minimal ${USIA_USAHA_MIN_BULAN} bulan`,
                catatan: `Usahamu sudah ${usiaBulan} bulan. Ada pengecualian untuk KUR Super Mikro.`,
              },
            ].map((s) => (
              <li key={s.id}>
                <label>
                  <input type="checkbox" checked={!!syarat[s.id]} onChange={(e) => setSyarat({ ...syarat, [s.id]: e.target.checked })} />
                  <span>
                    {s.teks}
                    {s.catatan && <small>{s.catatan}</small>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <small className="nk-muted kecil">Syarat lengkap dapat berbeda per bank penyalur.</small>
        </section>
      </div>

      {/* ------------------------------ Edukasi ------------------------------ */}
      <details className="nk-card nk-edukasi" open>
        <summary>
          <PIcon name="info" size={16} /> Mengapa 6 bulan dan dua lapis?
        </summary>
        <p>
          Jika hanya memakai rata-rata 6 bulan, bulan ramai seperti musim Lebaran atau tahun ajaran baru bisa menutupi kenyataan bahwa di bulan sepi laba turun di
          bawah kebutuhan keluarga, sehingga cicilan mudah macet. Karena itu NAIK-KELAS AI memakai dua lapis. <b>Lapis 1</b> melihat kapasitas dasar usaha dari
          rata-rata laba bulanan 6 bulan. <b>Lapis 2</b> menguji apakah saat omzet turun (kuartil bawah laba mingguan) kas masih sanggup membayar cicilan tanpa
          memotong uang dapur. Jika rata-rata aman tetapi saat sepi minus, statusnya <b>Kuning (Hati-hati)</b> dengan saran tabungan cadangan, bukan penolakan.
        </p>
      </details>

      {/* ------------------------------ Aksi ------------------------------ */}
      <div className="nk-kur-aksi">
        <button className="nk-btn sekunder" onClick={() => simpan(false)}>
          <PIcon name="download" size={16} /> Simpan simulasi
        </button>
        <button className="nk-btn sekunder" onClick={() => simpan(true)}>
          <PIcon name="report" size={16} /> Masukkan ke Laporan
        </button>
        <button className="nk-btn" onClick={mintaAi} disabled={prosesAi}>
          <PIcon name="sparkle" size={16} /> {prosesAi ? "Meminta penjelasan…" : "Minta penjelasan AI"}
        </button>
      </div>

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
