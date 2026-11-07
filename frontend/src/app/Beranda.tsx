import { useMemo, useState } from "react";
import { GrafikGabungan, Legenda, SparkLaba } from "../components/charts";
import { MiniTren } from "../components/figma";
import { PIcon, type PIconName } from "../components/icons";
import { ARTI, Istilah, Kosong } from "../components/ui";
import type { Transaksi } from "../data/types";
import { hitungSkor } from "../lib/engine/label";
import { LABEL_STATUS } from "../lib/engine/loan";
import { dalamRentang, kelengkapan, perubahan, rekapBulanan, rekapMingguan, ringkas, stressOut } from "../lib/finance";
import { addDays, daysBetween, monthKey, namaBulan, namaBulanSaja, persen, rentang, rupiah, rupiahRingkas, tanggal, tanggalPendek, toDate } from "../lib/format";
import { hitungAngka, poinTemplat } from "../lib/ringkasan";
import { goTo } from "../routes";
import { useToko } from "../state/store";
import { useCatat } from "./AppShell";

export function lamaUsaha(mulai: string, hariIni: string): string {
  if (!mulai) return "—";
  const a = toDate(mulai);
  const b = toDate(hariIni);
  const bulan = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth()) - (b.getUTCDate() < a.getUTCDate() ? 1 : 0);
  if (bulan < 1) return "Kurang dari 1 bulan";
  return `${bulan} bulan`;
}

// ---------------------------------------------------------------------------
// Pilihan periode: Hari ini · 7 hari terakhir · Pilih bulan · Pilih tanggal
// ---------------------------------------------------------------------------

type JenisPeriode = "hari" | "7h" | "bulan" | "tanggal";
type Periode = { jenis: JenisPeriode; bulan: string; dari: string; sampai: string };

const akhirBulan = (bulan: string) => addDays(`${monthKey(addDays(`${bulan}-01`, 32))}-01`, -1);

/** Rentang periode & periode pembanding (panjang sama, tepat sebelumnya). */
function hitungRentang(p: Periode, hariIni: string) {
  let dari: string;
  let sampai: string;
  if (p.jenis === "hari") dari = sampai = hariIni;
  else if (p.jenis === "7h") {
    sampai = hariIni;
    dari = addDays(hariIni, -6);
  } else if (p.jenis === "bulan") {
    dari = `${p.bulan}-01`;
    sampai = akhirBulan(p.bulan) > hariIni ? hariIni : akhirBulan(p.bulan);
  } else {
    dari = p.dari <= p.sampai ? p.dari : p.sampai;
    sampai = p.dari <= p.sampai ? p.sampai : p.dari;
  }
  if (p.jenis === "bulan") {
    const bulanLalu = monthKey(addDays(dari, -1));
    return { dari, sampai, sebelumDari: `${bulanLalu}-01`, sebelumSampai: akhirBulan(bulanLalu), pembanding: "bulan sebelumnya" };
  }
  const panjang = daysBetween(dari, sampai) + 1;
  return {
    dari,
    sampai,
    sebelumDari: addDays(dari, -panjang),
    sebelumSampai: addDays(dari, -1),
    pembanding: p.jenis === "hari" ? "kemarin" : p.jenis === "7h" ? "7 hari sebelumnya" : `${panjang} hari sebelumnya`,
  };
}

type Granularitas = "hari" | "minggu" | "bulan";

function Perubahan({ nilai, kebalikan = false }: { nilai: number | null; kebalikan?: boolean }) {
  if (nilai === null) return <b>—</b>;
  const naik = nilai >= 0;
  return (
    <b className={(kebalikan ? !naik : naik) ? "" : "turun"}>
      {naik ? "+" : "−"}
      {Math.abs(nilai * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%
    </b>
  );
}

function ToggleGran({ nilai, onPilih }: { nilai: Granularitas; onPilih: (g: Granularitas) => void }) {
  return (
    <div className="view-toggle">
      {(
        [
          ["hari", "Harian"],
          ["minggu", "Mingguan"],
          ["bulan", "Bulanan"],
        ] as const
      ).map(([id, label]) => (
        <button key={id} className={nilai === id ? "active" : ""} onClick={() => onPilih(id)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function Beranda() {
  const { profil, transaksi, kategori, hariIni, hariLibur, simulasi, produk, temuan, perluDicek, server } = useToko();
  const { minta } = useCatat();
  const [periode, setPeriode] = useState<Periode>({ jenis: "7h", bulan: monthKey(hariIni), dari: addDays(hariIni, -13), sampai: hariIni });
  const r = hitungRentang(periode, hariIni);
  const panjang = daysBetween(r.dari, r.sampai) + 1;
  const granAuto: Granularitas = panjang <= 31 ? "hari" : panjang <= 120 ? "minggu" : "bulan";
  const [granPilihan, setGranPilihan] = useState<Granularitas | null>(null);
  const gran = granPilihan ?? granAuto;
  const ubahPeriode = (p: Partial<Periode>) => {
    setPeriode((x) => ({ ...x, ...p }));
    setGranPilihan(null); // kembali ke tampilan grafik otomatis sesuai panjang periode
  };

  const isi = useMemo(() => dalamRentang(transaksi, r.dari, r.sampai), [transaksi, r.dari, r.sampai]);
  const sekarang = ringkas(isi, kategori);
  const sebelum = ringkas(dalamRentang(transaksi, r.sebelumDari, r.sebelumSampai), kategori);
  const k = kelengkapan(transaksi, kategori, hariIni, hariLibur);
  const s = stressOut(transaksi, kategori, hariIni, hariLibur);
  const insight = useMemo(() => poinTemplat(hitungAngka(transaksi, kategori, temuan, perluDicek, hariIni, hariLibur)), [transaksi, kategori, temuan, perluDicek, hariIni, hariLibur]);

  // Bulan yang bisa dipilih: sejak catatan pertama sampai bulan ini
  const pilihanBulan = useMemo(() => {
    const awal = transaksi.length ? monthKey(transaksi.reduce((a, t) => (t.tanggal < a ? t.tanggal : a), transaksi[0].tanggal)) : monthKey(hariIni);
    const daftar: string[] = [];
    for (let b = monthKey(hariIni); b >= awal; b = monthKey(addDays(`${b}-01`, -1))) daftar.push(b);
    return daftar;
  }, [transaksi, hariIni]);

  const titik = (g: Granularitas) => {
    if (g === "hari") {
      const perHari = new Map<string, Transaksi[]>();
      for (const t of isi) perHari.set(t.tanggal, [...(perHari.get(t.tanggal) ?? []), t]);
      const hasil = [];
      for (let d = r.dari; d <= r.sampai; d = addDays(d, 1)) {
        const x = ringkas(perHari.get(d) ?? [], kategori);
        hasil.push({ label: tanggalPendek(d), sub: tanggal(d), omzet: x.penjualan, laba: x.laba, hpp: x.hpp, masuk: x.uangMasuk, keluar: x.uangKeluar });
      }
      return hasil;
    }
    return (g === "minggu" ? rekapMingguan(isi, kategori, r.dari, r.sampai) : rekapBulanan(isi, kategori, r.dari, r.sampai)).map((b) => ({
      label: g === "minggu" ? tanggalPendek(b.dari) : namaBulanSaja(b.kunci),
      sub: g === "minggu" ? rentang(b.dari, b.sampai) : namaBulan(b.kunci, true),
      omzet: b.penjualan, laba: b.laba, hpp: b.hpp, masuk: b.uangMasuk, keluar: b.uangKeluar,
    }));
  };
  const seriTren = titik(panjang <= 31 ? "hari" : "minggu");

  const sim = simulasi[0];
  const labelTerakhir = [...produk].filter((p) => p.diperiksaPada).sort((a, b) => (b.diperiksaPada ?? "").localeCompare(a.diperiksaPada ?? ""))[0];
  const skorLabel = labelTerakhir ? hitungSkor(labelTerakhir.data, labelTerakhir.mode, profil.kota) : null;
  const namaSapaan = profil.namaPemilik.replace(/^(ibu|bapak|pak|bu)\s+/i, "").split(" ")[0] || "Pemilik Usaha";
  const kosong = transaksi.length === 0;
  const vs = `vs ${r.pembanding}`;

  const metrik: { label: string; ikon: PIconName; nilai: number; delta: number | null; kebalikan?: boolean; catatan: string; tren: number[]; turun?: boolean; peringatan?: boolean; arti?: string }[] = [
    { label: "Omzet", ikon: "wallet", nilai: sekarang.penjualan, delta: perubahan(sekarang.penjualan, sebelum.penjualan), catatan: vs, tren: seriTren.map((x) => x.omzet) },
    {
      label: "HPP", ikon: "tag", nilai: sekarang.hpp, delta: perubahan(sekarang.hpp, sebelum.hpp), kebalikan: true,
      catatan: sekarang.penjualan ? `${persen(sekarang.hpp / sekarang.penjualan)} dari omzet` : vs, tren: seriTren.map((x) => x.hpp), turun: true, arti: ARTI.hpp,
    },
    { label: "Laba", ikon: "sparkle", nilai: sekarang.laba, delta: perubahan(sekarang.laba, sebelum.laba), catatan: vs, tren: seriTren.map((x) => x.laba), arti: ARTI.labaUsaha },
    {
      label: "Laba Minggu Tersepi", ikon: "alert", nilai: s.terendah?.nilai ?? 0, delta: null, peringatan: true,
      catatan: s.cukupData && s.terendah ? rentang(s.terendah.dari, s.terendah.sampai) : `butuh 6 bulan data (${s.mingguValid}/${s.dibutuhkan})`,
      tren: s.seri.filter((x) => x.valid).map((x) => x.laba), turun: true, arti: ARTI.stressOut,
    },
  ];

  return (
    <div className="fg-halaman">
      <div className="dashboard-welcome">
        <div>
          <span>{server ? "Data usaha kamu" : "Data demo ilustratif"}</span>
          <h2>
            Halo, {namaSapaan}! <i>👋</i>
          </h2>
          <p>Pantau performa dan kesiapan bisnismu dalam satu tempat.</p>
        </div>
        <div className="business-meta">
          <b>{profil.namaUsaha || "Usaha kamu"}</b>
          <span>
            {profil.kota || "—"} · usaha berjalan {lamaUsaha(profil.mulaiUsaha, hariIni)}
          </span>
          <small>
            <Istilah arti={ARTI.kelengkapan}>Kelengkapan catatan {persen(k.rasio)}</Istilah> ({k.mingguLengkap}/{k.totalMinggu} minggu)
          </small>
        </div>
      </div>

      <div className="fg-status-chip">
        <button onClick={() => goTo("kur")}>
          <PIcon name="calc" size={14} /> Kesiapan KUR:{" "}
          <b className={sim ? `teks-${sim.status}` : ""}>{sim ? `${LABEL_STATUS[sim.status]} · ${rupiahRingkas(sim.plafon)}` : "Belum disimulasikan"}</b>
        </button>
        <button onClick={() => goTo("label")}>
          <PIcon name="tag" size={14} /> Skor Label:{" "}
          <b className={skorLabel ? `teks-${skorLabel.kategori === "Lengkap" ? "hijau" : skorLabel.kategori === "Hampir lengkap" ? "kuning" : "merah"}` : ""}>
            {skorLabel ? `${Math.round(skorLabel.skor)}/100 · ${skorLabel.kategori}` : "Belum diperiksa"}
          </b>
        </button>
      </div>

      <div className="period-row fg-periode">
        <div className="period-tabs">
          {(
            [
              ["hari", "Hari ini"],
              ["7h", "7 hari terakhir"],
              ["bulan", "Pilih bulan"],
              ["tanggal", "Pilih tanggal"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} className={periode.jenis === id ? "active" : ""} onClick={() => ubahPeriode({ jenis: id })}>
              {label}
            </button>
          ))}
        </div>
        <div className="fg-periode-isi">
          {periode.jenis === "bulan" && (
            <label className="fg-select-filter">
              <PIcon name="calendar" size={15} />
              <select value={periode.bulan} onChange={(e) => ubahPeriode({ bulan: e.target.value })} aria-label="Pilih bulan">
                {pilihanBulan.map((b) => (
                  <option key={b} value={b}>
                    {namaBulan(b, true)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {periode.jenis === "tanggal" && (
            <div className="fg-rentang-tanggal">
              <input type="date" value={periode.dari} max={hariIni} onChange={(e) => e.target.value && ubahPeriode({ dari: e.target.value })} aria-label="Dari tanggal" />
              <span>s.d.</span>
              <input type="date" value={periode.sampai} max={hariIni} onChange={(e) => e.target.value && ubahPeriode({ sampai: e.target.value })} aria-label="Sampai tanggal" />
            </div>
          )}
          <span className="icon-text-button">
            <PIcon name="calendar" size={16} /> {rentang(r.dari, r.sampai)}
          </span>
        </div>
      </div>

      {kosong ? (
        <section className="panel">
          <Kosong
            ikon="wallet"
            judul="Belum ada catatan keuangan"
            teks="Mulai catat uang masuk dan keluar usahamu. Ringkasan dan grafik akan muncul otomatis."
            aksi={
              <button className="portal-primary" onClick={() => minta({ mode: "manual" })}>
                <PIcon name="plus" size={16} /> Catat transaksi pertama
              </button>
            }
          />
        </section>
      ) : (
        <>
          <div className="metric-grid fg-empat">
            {metrik.map((m) => (
              <article className="metric-card" key={m.label}>
                <div className="metric-top">
                  <span>{m.arti ? <Istilah arti={m.arti}>{m.label}</Istilah> : m.label}</span>
                  <i>
                    <PIcon name={m.ikon} size={17} />
                  </i>
                </div>
                <strong className={m.nilai < 0 ? "negatif" : ""}>{rupiah(m.nilai)}</strong>
                <div className={m.peringatan ? "metric-change warning" : "metric-change"}>
                  {m.peringatan ? <b>Perlu perhatian</b> : <Perubahan nilai={m.delta} kebalikan={m.kebalikan} />}
                  <span>{m.catatan}</span>
                </div>
                <MiniTren nilai={m.tren} turun={m.turun} />
              </article>
            ))}
          </div>

          <div className="dashboard-main-grid">
            <article className="panel cashflow-panel">
              <div className="panel-title">
                <div>
                  <span>Arus kas usaha</span>
                  <h3>Grafik Arus Kas Bisnis</h3>
                </div>
                <ToggleGran nilai={gran} onPilih={setGranPilihan} />
              </div>
              <Legenda
                item={[
                  { label: "Pemasukan", warna: "#5B65DC", garis: true },
                  { label: "Pengeluaran", warna: "#122056", garis: true },
                ]}
              />
              <GrafikGabungan
                tinggi={300}
                data={titik(gran)}
                seri={[
                  { kunci: "masuk", label: "Pemasukan", warna: "#5B65DC", jenis: "garis", area: true },
                  { kunci: "keluar", label: "Pengeluaran", warna: "#122056", jenis: "garis" },
                ]}
              />
            </article>
            <article className="ai-insight-panel">
              <div className="ai-panel-head">
                <span>
                  <PIcon name="sparkle" size={18} />
                </span>
                <div>
                  <small>Analisis dari angka sistem</small>
                  <h3>NAIK.IN AI Insights</h3>
                </div>
              </div>
              <div className="insight-list">
                {insight.slice(0, 3).map((p, i) => (
                  <div key={p}>
                    <i className={i === 0 ? "positive" : "attention"}>
                      <PIcon name={i === 0 ? "check" : "alert"} size={13} />
                    </i>
                    <p>{p}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => goTo("keuangan", "analisis")}>
                Lihat Analisis Lengkap <PIcon name="arrow" size={15} />
              </button>
            </article>
          </div>

          <div className="three-panels fg-dua">
            <article className="panel">
              <div className="panel-title">
                <div>
                  <span>Kinerja usaha</span>
                  <h3>
                    Omzet, Laba & <Istilah arti={ARTI.hpp}>HPP</Istilah>
                  </h3>
                </div>
              </div>
              <Legenda
                item={[
                  { label: "Omzet", warna: "#C9CDF6" },
                  { label: "Laba", warna: "#122056", garis: true },
                  { label: "HPP", warna: "#5B65DC", garis: true },
                ]}
              />
              <GrafikGabungan
                tinggi={240}
                data={titik(gran)}
                seri={[
                  { kunci: "omzet", label: "Omzet", warna: "#C9CDF6", jenis: "batang" },
                  { kunci: "laba", label: "Laba", warna: "#122056", jenis: "garis" },
                  { kunci: "hpp", label: "HPP", warna: "#5B65DC", jenis: "garis", putus: true },
                ]}
              />
            </article>
            <article className="panel fg-stress">
              <h3>
                <Istilah arti={ARTI.stressOut}>Laba Minggu Tersepi</Istilah>
              </h3>
              {s.cukupData && s.terendah ? (
                <>
                  <strong>{rupiah(s.terendah.nilai)}</strong>
                  <small>{rentang(s.terendah.dari, s.terendah.sampai)}</small>
                  <SparkLaba seri={s.seri} kuartilBawah={s.kuartilBawah} idTerendah={s.terendah.dari} tinggi={70} />
                  <dl>
                    <dt>
                      <Istilah arti={ARTI.kuartilBawah}>Kuartil bawah</Istilah>
                    </dt>
                    <dd>{rupiah(s.kuartilBawah)}</dd>
                    <dt>Rata-rata mingguan</dt>
                    <dd>{rupiah(s.rataRata)}</dd>
                  </dl>
                </>
              ) : (
                <div className="fg-stress-progres">
                  <p>
                    <b>Butuh 6 bulan data</b> untuk menilai minggu tersepi.
                  </p>
                  <div className="nk-bar">
                    <i style={{ width: `${(s.mingguValid / s.dibutuhkan) * 100}%` }} />
                  </div>
                  <small>
                    {s.mingguValid} dari {s.dibutuhkan} minggu lengkap
                  </small>
                </div>
              )}
            </article>
          </div>
        </>
      )}

      <div className="quick-section">
        <div>
          <h3>Navigasi Cepat</h3>
          <p>Lanjutkan analisis bisnis melalui fitur utama.</p>
        </div>
        <div className="quick-grid fg-lima">
          {(
            [
              ["pen", "Catat transaksi", "Input manual lalu periksa", () => minta({ mode: "manual" })],
              ["camera", "Scan nota", "Foto nota atau buku kas", () => minta({ mode: "scan" })],
              ["calc", "Simulasi KUR", "Uji kemampuan cicilan", () => goTo("kur")],
              ["tag", "Cek label", "Periksa informasi kemasan", () => goTo("label")],
              ["report", "Buat laporan", "Rekap 6 bulan siap cetak", () => goTo("laporan")],
            ] as [PIconName, string, string, () => void][]
          ).map(([ikon, judul, teks, aksi]) => (
            <button key={judul} onClick={aksi}>
              <i>
                <PIcon name={ikon} />
              </i>
              <span>
                <b>{judul}</b>
                <small>{teks}</small>
              </span>
              <PIcon name="arrow" size={16} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
