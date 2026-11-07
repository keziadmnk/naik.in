import { useMemo, useState, type ReactNode } from "react";
import { Donat, GrafikGabungan, Legenda, SparkLaba, WARNA_DONAT } from "../components/charts";
import { PIcon, type PIconName } from "../components/icons";
import { ARTI, Cincin, Istilah, Kosong, Perubahan, Segmen } from "../components/ui";
import { persen, rentang, rupiah, rupiahRingkas, tanggalPendek, namaBulanSaja, namaBulan, toDate } from "../lib/format";
import {
  PERIODE, dalamRentang, keluarPerKategori, kelengkapan, perubahan, rekapBulanan, rekapMingguan,
  rentangPeriode, ringkas, stressOut, type PeriodeId,
} from "../lib/finance";
import { useToko } from "../state/store";
import { goTo } from "../routes";
import { LABEL_STATUS } from "../lib/engine/loan";
import { hitungSkor } from "../lib/engine/label";
import { useCatat } from "./AppShell";

export function lamaUsaha(mulai: string, hariIni: string): string {
  const a = toDate(mulai);
  const b = toDate(hariIni);
  const bulan = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth()) - (b.getUTCDate() < a.getUTCDate() ? 1 : 0);
  if (bulan < 1) return "Kurang dari 1 bulan";
  return `${bulan} bulan`;
}

type Granularitas = "minggu" | "bulan";

function KartuAkun() {
  const { profil, transaksi, kategori, hariIni, hariLibur, simulasi, produk } = useToko();
  const sim = simulasi[0];
  const labelTerakhir = [...produk].filter((p) => p.diperiksaPada).sort((a, b) => (b.diperiksaPada ?? "").localeCompare(a.diperiksaPada ?? ""))[0];
  const skorLabel = labelTerakhir ? hitungSkor(labelTerakhir.data, labelTerakhir.mode, profil.kota) : null;
  const k = kelengkapan(transaksi, kategori, hariIni, hariLibur);
  return (
    <section className="nk-card nk-kartu-akun">
      <div className="nk-kartu-akun-info">
        <span className="nk-eyebrow">Usaha kamu</span>
        <h2>{profil.namaUsaha}</h2>
        <p>
          <span>
            <PIcon name="home" size={14} /> {profil.kota}
          </span>
          <span>
            <PIcon name="calendar" size={14} /> Usaha berjalan {lamaUsaha(profil.mulaiUsaha, hariIni)}
          </span>
        </p>
        <div className="nk-chip-row">
          <button className="nk-chip" onClick={() => goTo("kur")}>
            <PIcon name="calc" size={14} />
            Kesiapan KUR:{" "}
            <b className={sim ? `teks-${sim.status}` : ""}>{sim ? `${LABEL_STATUS[sim.status]} · ${rupiahRingkas(sim.plafon)}` : "Belum disimulasikan"}</b>
          </button>
          <button className="nk-chip" onClick={() => goTo("label")}>
            <PIcon name="tag" size={14} />
            Skor Label:{" "}
            <b className={skorLabel ? `teks-${skorLabel.kategori === "Lengkap" ? "hijau" : skorLabel.kategori === "Hampir lengkap" ? "kuning" : "merah"}` : ""}>
              {skorLabel ? `${Math.round(skorLabel.skor)}/100 · ${skorLabel.kategori}` : "Belum diperiksa"}
            </b>
          </button>
        </div>
      </div>
      <div className="nk-kartu-akun-cincin">
        <Cincin rasio={k.rasio} ukuran={104} tebal={10}>
          <strong>{persen(k.rasio)}</strong>
        </Cincin>
        <div>
          <b>
            <Istilah arti={ARTI.kelengkapan}>Kelengkapan Catatan</Istilah>
          </b>
          <span>6 bulan terakhir</span>
          <small>
            {k.mingguLengkap} dari {k.totalMinggu} minggu lengkap
          </small>
        </div>
      </div>
    </section>
  );
}

function KartuAngka({
  judul, nilai, delta, kebalikan, arti, ikon, rincian,
}: {
  judul: string; nilai: number; delta: number | null; kebalikan?: boolean; arti?: string; ikon: PIconName; rincian?: ReactNode;
}) {
  return (
    <article className="nk-card nk-angka">
      <div className="nk-angka-head">
        <span>{arti ? <Istilah arti={arti}>{judul}</Istilah> : judul}</span>
        <i>
          <PIcon name={ikon} size={17} />
        </i>
      </div>
      <strong className={nilai < 0 ? "negatif" : ""}>{rupiah(nilai)}</strong>
      <Perubahan nilai={delta} kebalikan={kebalikan} />
      {rincian}
    </article>
  );
}

function KartuStressOut() {
  const { transaksi, kategori, hariIni, hariLibur } = useToko();
  const s = stressOut(transaksi, kategori, hariIni, hariLibur);
  return (
    <article className="nk-card nk-stress">
      <div className="nk-card-head">
        <div>
          <span className="nk-eyebrow">
            <Istilah arti={ARTI.stressOut}>Stress-out</Istilah>
          </span>
          <h3>Laba Minggu Tersepi</h3>
        </div>
      </div>
      {!s.cukupData ? (
        <div className="nk-stress-progres">
          <p>
            <b>Butuh 6 bulan data</b> untuk melihat minggu tersepi dengan adil.
          </p>
          <div className="nk-bar">
            <i style={{ width: `${(s.mingguValid / s.dibutuhkan) * 100}%` }} />
          </div>
          <small>
            {s.mingguValid} dari {s.dibutuhkan} minggu lengkap tercatat
          </small>
          <button className="nk-btn sekunder kecil" onClick={() => goTo("keuangan")}>
            Lengkapi catatan
          </button>
        </div>
      ) : (
        <>
          <div className="nk-stress-utama">
            <strong>{rupiah(s.terendah?.nilai ?? 0)}</strong>
            <span>laba minggu terendah · {s.terendah ? rentang(s.terendah.dari, s.terendah.sampai) : "-"}</span>
          </div>
          <SparkLaba seri={s.seri} kuartilBawah={s.kuartilBawah} idTerendah={s.terendah?.dari ?? null} />
          <div className="nk-stress-angka">
            <span>
              <i className="titik terendah" />
              Terendah
              <b>{rupiah(s.terendah?.nilai ?? 0)}</b>
            </span>
            <span>
              <i className="titik kuartil" />
              <Istilah arti={ARTI.kuartilBawah}>Kuartil bawah</Istilah>
              <b>{rupiah(s.kuartilBawah)}</b>
            </span>
            <span>
              <i className="titik rata" />
              Rata-rata
              <b>{rupiah(s.rataRata)}</b>
            </span>
          </div>
          <small className="nk-muted">
            Dari {s.mingguValid} minggu lengkap dalam 26 minggu terakhir. Garis putus-putus menandai minggu belum lengkap.
          </small>
        </>
      )}
    </article>
  );
}

export function Beranda() {
  const { transaksi, kategori, hariIni } = useToko();
  const { minta } = useCatat();
  const [periode, setPeriode] = useState<PeriodeId>("30h");
  const [granGabungan, setGranGabungan] = useState<Granularitas>("minggu");
  const [granKas, setGranKas] = useState<Granularitas>("minggu");

  const r = rentangPeriode(periode, hariIni);
  const isi = useMemo(() => dalamRentang(transaksi, r.dari, r.sampai), [transaksi, r.dari, r.sampai]);
  const sekarang = ringkas(isi, kategori);
  const sebelum = ringkas(dalamRentang(transaksi, r.sebelumDari, r.sebelumSampai), kategori);

  const titik = (g: Granularitas) =>
    (g === "minggu" ? rekapMingguan(isi, kategori, r.dari, r.sampai) : rekapBulanan(isi, kategori, r.dari, r.sampai)).map((b) => ({
      label: g === "minggu" ? tanggalPendek(b.dari) : namaBulanSaja(b.kunci),
      sub: g === "minggu" ? rentang(b.dari, b.sampai) : namaBulan(b.kunci, true),
      omzet: b.penjualan,
      laba: b.laba,
      hpp: b.hpp,
      masuk: b.uangMasuk,
      keluar: b.uangKeluar,
      selisih: b.selisih,
    }));

  const keluar = keluarPerKategori(isi, kategori);
  const totalKeluar = keluar.reduce((a, k) => a + k.nominal, 0);
  const donat: { nama: string; nominal: number; warna: string }[] = keluar.slice(0, 6).map((k, i) => ({ nama: k.nama, nominal: k.nominal, warna: WARNA_DONAT[i] }));
  if (keluar.length > 6) donat.push({ nama: "Lainnya", nominal: keluar.slice(6).reduce((a, k) => a + k.nominal, 0), warna: "#D6D8E8" });

  const kosong = transaksi.length === 0;
  const pilihanGran = [
    { id: "minggu" as const, label: "Mingguan" },
    { id: "bulan" as const, label: "Bulanan" },
  ];

  return (
    <div className="nk-halaman">
      <KartuAkun />

      <div className="nk-periode-row">
        <Segmen label="Periode" pilihan={PERIODE.map((p) => ({ id: p.id, label: p.label }))} nilai={periode} onPilih={setPeriode} />
        <span className="nk-periode-label">
          <PIcon name="calendar" size={15} />
          {rentang(r.dari, r.sampai)}
        </span>
      </div>

      {kosong ? (
        <section className="nk-card">
          <Kosong
            ikon="wallet"
            judul="Belum ada catatan keuangan"
            teks="Mulai catat uang masuk dan keluar usahamu. Ringkasan dan grafik akan muncul otomatis."
            aksi={
              <button className="nk-btn" onClick={() => minta({ mode: "manual" })}>
                <PIcon name="plus" size={16} /> Catat transaksi pertama
              </button>
            }
          />
        </section>
      ) : (
        <>
          <section className="nk-grid-4" aria-label="Ringkasan arus kas">
            <KartuAngka judul="Uang Masuk" ikon="download" nilai={sekarang.uangMasuk} delta={perubahan(sekarang.uangMasuk, sebelum.uangMasuk)} />
            <KartuAngka
              judul="Uang Keluar"
              ikon="upload"
              nilai={sekarang.uangKeluar}
              delta={perubahan(sekarang.uangKeluar, sebelum.uangKeluar)}
              kebalikan
              rincian={
                <div className="nk-rincian-keluar">
                  <div className="nk-bar ganda">
                    <i style={{ width: `${(1 - sekarang.pribadi / Math.max(1, sekarang.uangKeluar)) * 100}%` }} />
                  </div>
                  <span>
                    Usaha <b>{rupiahRingkas(sekarang.hpp + sekarang.operasional)}</b>
                  </span>
                  <span>
                    Pribadi <b>{rupiahRingkas(sekarang.pribadi)}</b>
                  </span>
                </div>
              }
            />
            <KartuAngka judul="Laba Usaha" ikon="sparkle" arti={ARTI.labaUsaha} nilai={sekarang.laba} delta={perubahan(sekarang.laba, sebelum.laba)} />
            <KartuAngka judul="Selisih Kas" ikon="wallet" arti={ARTI.selisihKas} nilai={sekarang.selisih} delta={perubahan(sekarang.selisih, sebelum.selisih)} />
          </section>

          <section className="nk-grid-2-1">
            <article className="nk-card">
              <div className="nk-card-head">
                <div>
                  <span className="nk-eyebrow">Kinerja usaha</span>
                  <h3>
                    Omzet, Laba & <Istilah arti={ARTI.hpp}>HPP</Istilah>
                  </h3>
                </div>
                <Segmen label="Tampilan grafik omzet" pilihan={pilihanGran} nilai={granGabungan} onPilih={setGranGabungan} />
              </div>
              <Legenda
                item={[
                  { label: "Omzet", warna: "#C9CDF6" },
                  { label: "Laba usaha", warna: "#122056", garis: true },
                  { label: "HPP", warna: "#5B65DC", garis: true },
                ]}
              />
              <GrafikGabungan
                data={titik(granGabungan)}
                seri={[
                  { kunci: "omzet", label: "Omzet", warna: "#C9CDF6", jenis: "batang" },
                  { kunci: "laba", label: "Laba usaha", warna: "#122056", jenis: "garis" },
                  { kunci: "hpp", label: "HPP", warna: "#5B65DC", jenis: "garis", putus: true },
                ]}
              />
            </article>
            <article className="nk-card nk-donat-card">
              <div className="nk-card-head">
                <div>
                  <span className="nk-eyebrow">Per kategori</span>
                  <h3>Uang keluar</h3>
                </div>
              </div>
              <div className="nk-donat-wrap">
                <div className="nk-donat">
                  <Donat data={donat} total={totalKeluar} />
                  <div>
                    <b>{rupiahRingkas(totalKeluar)}</b>
                    <span>total keluar</span>
                  </div>
                </div>
                <ul className="nk-donat-legenda">
                  {donat.map((d) => (
                    <li key={d.nama}>
                      <i style={{ background: d.warna }} />
                      <span>{d.nama}</span>
                      <b>{persen(d.nominal / Math.max(1, totalKeluar))}</b>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </section>

          <section className="nk-grid-2-1">
            <article className="nk-card">
              <div className="nk-card-head">
                <div>
                  <span className="nk-eyebrow">Arus kas bisnis</span>
                  <h3>Uang masuk vs keluar</h3>
                </div>
                <Segmen label="Tampilan grafik arus kas" pilihan={pilihanGran} nilai={granKas} onPilih={setGranKas} />
              </div>
              <Legenda
                item={[
                  { label: "Uang masuk", warna: "#5B65DC" },
                  { label: "Uang keluar", warna: "#BFC3F3" },
                  { label: <Istilah arti={ARTI.selisihKas}>Selisih kas</Istilah>, warna: "#122056", garis: true },
                ]}
              />
              <GrafikGabungan
                data={titik(granKas)}
                seri={[
                  { kunci: "masuk", label: "Uang masuk", warna: "#5B65DC", jenis: "batang" },
                  { kunci: "keluar", label: "Uang keluar", warna: "#BFC3F3", jenis: "batang" },
                  { kunci: "selisih", label: "Selisih kas", warna: "#122056", jenis: "garis" },
                ]}
              />
            </article>
            <KartuStressOut />
          </section>
        </>
      )}

      <section className="nk-cepat" aria-label="Navigasi cepat">
        <h3>Navigasi cepat</h3>
        <div>
          {(
            [
              ["pen", "Catat transaksi", () => minta({ mode: "manual" })],
              ["camera", "Scan nota", () => minta({ mode: "scan" })],
              ["calc", "Simulasi KUR", () => goTo("kur")],
              ["tag", "Cek label", () => goTo("label")],
              ["report", "Buat laporan", () => goTo("laporan")],
            ] as [PIconName, string, () => void][]
          ).map(([ikon, judul, aksi]) => (
            <button key={judul} onClick={aksi}>
              <i>
                <PIcon name={ikon} size={20} />
              </i>
              <span>{judul}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
