import { useMemo, useState, type ReactNode } from "react";
import { WARNA_STATUS } from "../../components/chartsKur";
import { PIcon } from "../../components/icons";
import { PageHeader } from "../../components/figma";
import { ARTI, Cincin, Istilah, Saklar } from "../../components/ui";
import {
  LABEL_AMBANG, MIN_HARI_MINGGU_VALID,
  MIN_MINGGU_VALID_KUR, MINGGU_JENDELA, PLAFON_LANGKAH, PLAFON_MAKS, PLAFON_MIN, TENOR_PILIHAN,
  SEED_SIMULASI, TENOR_REKOMENDASI, type Tenor,
} from "../../lib/config/thresholds";
import {
  LABEL_STATUS, batasCicilan, buatJalur, nilai, penjelasanRekomendasi, plafonAman,
  risikoNpl, susunTindakan, zonaSlider, type DataPinjaman, type Status,
} from "../../lib/engine/loan";
import { rekapBulanan } from "../../lib/finance";
import { namaBulan, persen, rentang, rupiah, rupiahRingkas } from "../../lib/format";
import { goTo } from "../../routes";
import { idBaru, useToko } from "../../state/store";
import { KesimpulanKur } from "./KesimpulanKur";
import { useDataPinjaman, useKapasitasKur } from "./rekomendasiKur";


const ARTI_KUR = {
  npl: "NPL (Non-Performing Loan) atau kredit macet: cicilan yang tidak terbayar beberapa bulan berturut-turut. Di sini dihitung sebagai peluang muncul 3 bulan sulit bayar berturut-turut.",
  batasAman: "Cicilan per bulan terbesar yang masih Hijau: tidak lebih dari 30% laba rata-rata, dan saat bulan sepi pun laba masih cukup untuk membayarnya.",
  lapis1: "Lapis 1 melihat kapasitas dasar: rata-rata laba mingguan 6 bulan × 4 minggu.",
  lapis2: "Lapis 2 menguji saat sepi: kuartil bawah laba mingguan × 4. Seperempat minggu labanya di bawah angka ini.",
  plafonAman: "Pinjaman terbesar yang cicilannya masih sama dengan batas aman pada tenor dan bunga ini.",
};


function KurTerkunci({ data }: { data: DataPinjaman }) {
  const { kirim } = useToko();
  const belum = data.minggu.filter((m) => !m.valid);
  const perBulan = new Map<string, typeof belum>();
  for (const m of belum) perBulan.set(m.dari.slice(0, 7), [...(perBulan.get(m.dari.slice(0, 7)) ?? []), m]);
  const adaCatatan = data.minggu.some((m) => m.hariTercatat > 0);
  return (
    <div className="fg-halaman">
      <PageHeader title="Simulasi Kesiapan KUR" subtitle="Uji kemampuan membayar cicilan berdasarkan kondisi keuangan dan ketahanan kas usahamu." />
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
      {adaCatatan && (
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
      )}
    </div>
  );
}


function SliderPlafon({
  nilai: plafon, onUbah, zona, plafonRekomendasi,
}: { nilai: number; onUbah: (v: number) => void; zona: { plafon: number; status: Status }[]; plafonRekomendasi: number }) {
  const rentangTotal = PLAFON_MAKS - PLAFON_MIN;
  const pct = (v: number) => (v - PLAFON_MIN) / rentangTotal;
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


function KurTerbuka({ data }: { data: DataPinjaman }) {
  const toko = useToko();
  const { kur, temuan, transaksi, kategori, hariIni, perluDicek, kirim } = toko;

  const { kebutuhanRT, kap, rek } = useKapasitasKur(data);
  const [plafon, setPlafon] = useState(rek.plafon);
  const [tenor, setTenor] = useState<Tenor>(TENOR_REKOMENDASI);
  const [pesan, setPesan] = useState<string | null>(null);

  const p = useMemo(() => nilai(kap, plafon, tenor, kur.konservatif), [kap, plafon, tenor, kur.konservatif]);
  const batas = batasCicilan(kap);
  const zona = useMemo(() => zonaSlider(kap, tenor, kur.konservatif), [kap, tenor, kur.konservatif]);
  const jalur = useMemo(() => buatJalur(data.blok), [data.blok]);
  const risiko = useMemo(() => risikoNpl(jalur, kebutuhanRT, p.beban, tenor), [jalur, kebutuhanRT, p.beban, tenor]);
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

  const simpan = (keLaporan: boolean) => {

    const id = idBaru();
    kirim({
      type: "simpanSimulasi",
      simulasi: {
        id, dibuat: new Date().toISOString(), plafon: p.plafon, tenor: p.tenor, bungaTahunan: p.bunga.tahunan, cicilan: p.cicilanBaru,
        status: p.status, npl: risiko.npl, kebutuhanRT, cicilanLama: kur.cicilanLama, diLaporan: keLaporan,
      },
      detail: {
        jendelaDari: data.jendela.dari, jendelaSampai: data.jendela.sampai, mingguValid: data.mingguValid,
        labaRata: kap.labaRata, labaStress: kap.labaStress, labaTerburuk: kap.labaTerburuk, kebutuhanRT, cicilanLama: kur.cicilanLama,
        plafon: p.plafon, tenor: p.tenor, bungaTahunan: p.bunga.tahunan, jenisKur: p.bunga.jenis, konservatif: kur.konservatif,
        cicilan: p.cicilanBaru, batasAman: batas.aman, batasHatiHati: batas.hatiHati,
        rasioRata: Number.isFinite(p.rasioRata) ? Math.round(p.rasioRata * 10000) / 10000 : null,
        sisaRata: p.sisaRata, sisaStress: p.sisaStress, status: p.status,
        targetCadangan: p.cadangan?.target ?? null, setoranCadangan: p.cadangan?.setoranBulanan ?? null,
        peluangBulanSulit: risiko.peluangBulanSulit, npl: risiko.npl, seed: SEED_SIMULASI, jumlahSimulasi: jalur.jumlah,
        penjelasan: diRekomendasi ? penjelasanRekomendasi(rek, kap) : null,
        penjelasanSumber: diRekomendasi ? "templat" : null,
        tindakan: tindakan.map((t) => ({ jenis: t.jenis, prioritas: t.prioritas, judul: t.judul, angka: t.angka, teks: t.teks })),
      },
    });
    setPesan(keLaporan ? "Simulasi dimasukkan ke Laporan." : "Simulasi disimpan.");
    window.setTimeout(() => setPesan(null), 2600);
  };


  const bulanJendela = rekapBulanan(transaksi.filter((t) => !perluDicek.has(t.id)), kategori, data.jendela.dari, data.jendela.sampai);
  const statusBulan = bulanJendela.map((b) => {
    const m = data.minggu.filter((w) => w.sampai.slice(0, 7) === b.kunci);
    const kurang = m.filter((w) => !w.valid).length;
    return { kunci: b.kunci, lengkap: m.length > 0 && kurang === 0, kurang };
  });
  const semuaLengkap = statusBulan.every((b) => b.lengkap);
  const kelasStatus = p.status === "hijau" ? "safe" : p.status === "kuning" ? "caution" : "danger";

  return (
    <div className="fg-halaman fg-kur">
      <PageHeader title={<Istilah arti={ARTI.kur}>Simulasi Kesiapan KUR</Istilah>} subtitle="Uji kemampuan membayar cicilan berdasarkan kondisi keuangan dan ketahanan kas usahamu." />

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

      <section className="simulator-card">
        <div className="simulator-head">
          <div>
            <span>Simulator interaktif</span>
            <h3>Atur Rencana Pinjamanmu</h3>
          </div>
          <button className="portal-primary fg-simpan-sim" onClick={() => simpan(false)}>
            <PIcon name="download" size={15} />
            Simpan Simulasi
          </button>
        </div>
        <div className="simulator-grid fg-sim-penuh">
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
                <small>laba rata-rata dikurangi cicilan</small>
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
            </div>
          </div>
        </div>
      </section>

      <KesimpulanKur p={p} kap={kap} zona={zona} tindakan={tindakan} batasAman={batas.aman} konservatif={kur.konservatif} />

      {pesan && (
        <div className="nk-toast" role="status">
          <PIcon name="check" size={16} /> {pesan}
        </div>
      )}
    </div>
  );
}

export function SimulasiKur() {
  const data = useDataPinjaman();
  return data.terbuka ? <KurTerbuka data={data} /> : <KurTerkunci data={data} />;
}
