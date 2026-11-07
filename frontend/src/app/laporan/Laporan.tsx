import { useMemo } from "react";
import { PIcon } from "../../components/icons";
import { kategoriMap } from "../../data/categories";
import { LABEL_STATUS } from "../../lib/engine/loan";
import { hitungSkor, susunSaran } from "../../lib/engine/label";
import { addDays, monthKey, namaBulan, persen, rentang, rupiah, rupiahRingkas, tanggal, tanggalPanjang } from "../../lib/format";
import { kelengkapan, keluarPerKategori, rekapBulanan, stressOut, totalRekap } from "../../lib/finance";
import { hitungAngka, poinTemplat } from "../../lib/ringkasan";
import { goTo } from "../../routes";
import { useToko } from "../../state/store";
import { lamaUsaha } from "../Beranda";

const BULAN_LAPORAN = 6;

export type Bagian = "ringkasan" | "rekap" | "kategori" | "ketahanan" | "kur" | "label" | "catatan";

/** Grafik batang statis (aman dicetak): omzet & laba per bulan. */
function GrafikBulanan({ data }: { data: { label: string; omzet: number; laba: number }[] }) {
  const w = 640;
  const h = 200;
  const bawah = 26;
  const atas = 20; // ruang untuk label angka di atas batang tertinggi
  const maks = Math.max(1, ...data.map((d) => d.omzet));
  const slot = w / Math.max(1, data.length);
  const bw = Math.min(30, slot * 0.28);
  const y = (v: number) => atas + (h - bawah - atas) * (1 - Math.max(0, v) / maks);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Omzet dan laba usaha per bulan" className="nk-lap-grafik">
      <line x1={0} x2={w} y1={h - bawah} y2={h - bawah} stroke="#d5d8e6" />
      {data.map((d, i) => {
        const x = slot * i + slot / 2;
        return (
          <g key={d.label}>
            <rect x={x - bw - 2} y={y(d.omzet)} width={bw} height={h - bawah - y(d.omzet)} rx={4} fill="#C9CDF6" />
            <rect x={x + 2} y={y(d.laba)} width={bw} height={h - bawah - y(d.laba)} rx={4} fill="#122056" />
            <text x={x - bw / 2 - 2} y={y(d.omzet) - 5} textAnchor="middle" fontSize="10" fill="#4b5578">
              {rupiahRingkas(d.omzet).replace("Rp", "")}
            </text>
            <text x={x + bw / 2 + 2} y={y(d.laba) - 5} textAnchor="middle" fontSize="10" fill="#122056" fontWeight="700">
              {rupiahRingkas(d.laba).replace("Rp", "")}
            </text>
            <text x={x} y={h - 8} textAnchor="middle" fontSize="11" fill="#4b5578">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function DokumenLaporan({ bagian, judul }: { bagian: Record<Bagian, boolean>; judul: string }) {
  const toko = useToko();
  const { profil, transaksi, kategori, perluDicek, temuan, hariIni, hariLibur, simulasi, produk } = toko;

  const lap = useMemo(() => {
    const terkonfirmasi = transaksi.filter((t) => !perluDicek.has(t.id));
    // 6 bulan kalender penuh terakhir (bulan berjalan tidak dihitung)
    const awalBulanIni = `${monthKey(hariIni)}-01`;
    const sampai = addDays(awalBulanIni, -1);
    let dari = awalBulanIni;
    for (let i = 0; i < BULAN_LAPORAN; i += 1) dari = `${monthKey(addDays(dari, -1))}-01`;
    const bulan = rekapBulanan(terkonfirmasi, kategori, dari, sampai);
    const adaData = bulan.filter((b) => b.jumlahTransaksi > 0);
    const total = totalRekap(bulan);
    const n = Math.max(1, adaData.length);
    const isiPeriode = terkonfirmasi.filter((t) => t.tanggal >= dari && t.tanggal <= sampai);
    return {
      dari, sampai, bulan, adaData, total, n,
      rataLaba: total.laba / n,
      rataOmzet: total.penjualan / n,
      rasioHpp: total.penjualan ? total.hpp / total.penjualan : 0,
      kategoriKeluar: keluarPerKategori(isiPeriode, kategori).slice(0, 6),
      kelengkapan: kelengkapan(transaksi, kategori, hariIni, hariLibur),
      stress: stressOut(terkonfirmasi, kategori, hariIni, hariLibur),
      catatan: poinTemplat(hitungAngka(transaksi, kategori, temuan, perluDicek, hariIni, hariLibur)),
      jumlahTerkonfirmasi: isiPeriode.length,
    };
  }, [transaksi, perluDicek, kategori, temuan, hariIni, hariLibur]);

  const kur = simulasi.find((s) => s.diLaporan) ?? null;
  const labelDiperiksa = produk.filter((p) => p.diperiksaPada).map((p) => ({ p, h: hitungSkor(p.data, p.mode, profil.kota) }));
  const temuanTerbuka = temuan.filter((t) => t.jenis !== "hari_belum_dicatat").length;
  const peta = kategoriMap(kategori);
  const nomor = `NK-${hariIni.replaceAll("-", "")}-${profil.namaUsaha.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase()}`;
  const kosong = lap.adaData.length === 0;


  return (
    <>
      <article className="nk-dokumen" aria-label="Laporan kondisi usaha">
        {/* Kop */}
        <header className="nk-dok-kop">
          <div>
            <div className="nk-dok-logo">
              NAIK<span>.IN</span>
            </div>
            <h1>{judul}</h1>
            <p>Rekap {BULAN_LAPORAN} bulan · {rentang(lap.dari, lap.sampai)}</p>
          </div>
          <dl>
            <dt>No. dokumen</dt>
            <dd>{nomor}</dd>
            <dt>Dibuat</dt>
            <dd>{tanggalPanjang(hariIni)}</dd>
          </dl>
        </header>

        <section className="nk-dok-profil">
          <div>
            <small>Nama usaha</small>
            <b>{profil.namaUsaha}</b>
          </div>
          <div>
            <small>Pemilik</small>
            <b>{profil.namaPemilik}</b>
          </div>
          <div>
            <small>Kota</small>
            <b>{profil.kota}</b>
          </div>
          <div>
            <small>Kategori</small>
            <b>{profil.kategoriUsaha}</b>
          </div>
          <div>
            <small>Lama usaha</small>
            <b>{lamaUsaha(profil.mulaiUsaha, hariIni)}</b>
          </div>
          <div>
            <small>Kelengkapan catatan</small>
            <b>
              {persen(lap.kelengkapan.rasio)} ({lap.kelengkapan.mingguLengkap}/{lap.kelengkapan.totalMinggu} minggu)
            </b>
          </div>
        </section>

        {kosong ? (
          <section className="nk-dok-bagian">
            <p>Belum ada transaksi terkonfirmasi pada periode ini. Catat transaksi di menu Keuangan agar laporan bisa dibuat.</p>
            <button className="nk-btn sekunder kecil nk-no-print" onClick={() => goTo("keuangan")}>
              Buka Keuangan
            </button>
          </section>
        ) : (
          <>
            {/* 1. Ringkasan */}
            {bagian.ringkasan && (
            <section className="nk-dok-bagian">
              <h2>Ringkasan {lap.adaData.length} bulan</h2>
              <div className="nk-dok-angka">
                <div>
                  <small>Total omzet</small>
                  <b>{rupiah(lap.total.penjualan)}</b>
                  <span>rata-rata {rupiah(lap.rataOmzet)}/bulan</span>
                </div>
                <div>
                  <small>Laba usaha</small>
                  <b>{rupiah(lap.total.laba)}</b>
                  <span>rata-rata {rupiah(lap.rataLaba)}/bulan</span>
                </div>
                <div>
                  <small>Rasio HPP</small>
                  <b>{persen(lap.rasioHpp)}</b>
                  <span>HPP {rupiah(lap.total.hpp)}</span>
                </div>
                <div>
                  <small>Selisih kas</small>
                  <b className={lap.total.selisih < 0 ? "negatif" : ""}>{rupiah(lap.total.selisih)}</b>
                  <span>termasuk pribadi {rupiah(lap.total.pribadi)}</span>
                </div>
              </div>
              <p className="nk-dok-catatan">
                Laba usaha = penjualan − HPP − biaya operasional (pengeluaran pribadi tidak dihitung). Dihitung dari {lap.jumlahTerkonfirmasi.toLocaleString("id-ID")} transaksi
                terkonfirmasi{temuanTerbuka > 0 ? `; ${temuanTerbuka} catatan yang masih perlu dicek tidak ikut dihitung` : ""}.
              </p>
            </section>
            )}

            {/* 2. Rekap bulanan */}
            {bagian.rekap && (
            <section className="nk-dok-bagian">
              <h2>Rekap kas bulanan</h2>
              <table className="nk-dok-tabel">
                <thead>
                  <tr>
                    <th>Bulan</th>
                    <th>Uang masuk</th>
                    <th>HPP</th>
                    <th>Operasional</th>
                    <th>Pribadi</th>
                    <th>Uang keluar</th>
                    <th>Laba usaha</th>
                    <th>Selisih kas</th>
                  </tr>
                </thead>
                <tbody>
                  {lap.bulan.map((b) => (
                    <tr key={b.kunci}>
                      <td>{namaBulan(b.kunci)}</td>
                      {b.jumlahTransaksi === 0 ? (
                        <td colSpan={7} className="kosong">
                          belum ada catatan
                        </td>
                      ) : (
                        <>
                          <td>{rupiah(b.uangMasuk)}</td>
                          <td>{rupiah(b.hpp)}</td>
                          <td>{rupiah(b.operasional)}</td>
                          <td>{rupiah(b.pribadi)}</td>
                          <td>{rupiah(b.uangKeluar)}</td>
                          <td className="tebal">{rupiah(b.laba)}</td>
                          <td className={b.selisih < 0 ? "negatif" : ""}>{rupiah(b.selisih)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td>{rupiah(lap.total.uangMasuk)}</td>
                    <td>{rupiah(lap.total.hpp)}</td>
                    <td>{rupiah(lap.total.operasional)}</td>
                    <td>{rupiah(lap.total.pribadi)}</td>
                    <td>{rupiah(lap.total.uangKeluar)}</td>
                    <td>{rupiah(lap.total.laba)}</td>
                    <td>{rupiah(lap.total.selisih)}</td>
                  </tr>
                </tfoot>
              </table>
              <div className="nk-dok-legenda">
                <span>
                  <i style={{ background: "#C9CDF6" }} /> Omzet
                </span>
                <span>
                  <i style={{ background: "#122056" }} /> Laba usaha
                </span>
              </div>
              <GrafikBulanan data={lap.adaData.map((b) => ({ label: namaBulan(b.kunci).split(" ")[0], omzet: b.penjualan, laba: b.laba }))} />
            </section>
            )}

            {bagian.kategori && (
              <section className="nk-dok-bagian">
                <h2>Rincian uang keluar terbesar</h2>
                <table className="nk-dok-tabel ringkas">
                  <tbody>
                    {lap.kategoriKeluar.map((k) => (
                      <tr key={k.id}>
                        <td>{k.nama}</td>
                        <td className="kelompok">{k.kelompok === "pribadi" ? "pribadi" : k.kelompok === "hpp" ? "HPP" : peta[k.id]?.kelompok === "operasional" ? "operasional" : ""}</td>
                        <td>{rupiah(k.nominal)}</td>
                        <td>{persen(k.nominal / Math.max(1, lap.total.uangKeluar))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {bagian.ketahanan && (
              <section className="nk-dok-bagian">
                <h2>Ketahanan saat sepi</h2>
                {lap.stress.cukupData && lap.stress.terendah ? (
                  <>
                    <div className="nk-dok-angka tiga">
                      <div>
                        <small>Laba minggu terendah</small>
                        <b>{rupiah(lap.stress.terendah.nilai)}</b>
                        <span>{rentang(lap.stress.terendah.dari, lap.stress.terendah.sampai)}</span>
                      </div>
                      <div>
                        <small>Kuartil bawah laba mingguan</small>
                        <b>{rupiah(lap.stress.kuartilBawah)}</b>
                        <span>1 dari 4 minggu di bawah angka ini</span>
                      </div>
                      <div>
                        <small>Rata-rata laba mingguan</small>
                        <b>{rupiah(lap.stress.rataRata)}</b>
                        <span>dari {lap.stress.mingguValid} minggu lengkap</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p>
                    Belum cukup data: {lap.stress.mingguValid} dari {lap.stress.dibutuhkan} minggu lengkap tercatat.
                  </p>
                )}
              </section>
            )}

            {bagian.kur && (
              <section className="nk-dok-bagian">
                <h2>Simulasi Kesiapan KUR</h2>
                {kur ? (
                  <>
                    <div className="nk-dok-angka">
                      <div>
                        <small>Rencana pinjaman</small>
                        <b>{rupiah(kur.plafon)}</b>
                        <span>
                          {kur.tenor} bulan · bunga {persen(kur.bungaTahunan)}/tahun
                        </span>
                      </div>
                      <div>
                        <small>Cicilan per bulan</small>
                        <b>{rupiah(kur.cicilan)}</b>
                        <span>uang dapur {rupiah(kur.kebutuhanRT)}/bulan</span>
                      </div>
                      <div>
                        <small>Status persiapan</small>
                        <b className={`teks-${kur.status}`}>{LABEL_STATUS[kur.status]}</b>
                        <span>ambang kehati-hatian NAIK-KELAS</span>
                      </div>
                      <div>
                        <small>Risiko macet indikatif</small>
                        <b>{persen(kur.npl, 1)}</b>
                        <span>simulasi pola 26 minggu</span>
                      </div>
                    </div>
                    <p className="nk-dok-catatan">
                      Disimpan {tanggal(kur.dibuat.slice(0, 10))}. Estimasi dari pola usaha; bunga dan syarat dapat berbeda per bank, konfirmasikan ke bank.
                    </p>
                  </>
                ) : (
                  <p>
                    Belum ada simulasi yang dimasukkan.{" "}
                    <button className="nk-link nk-no-print" onClick={() => goTo("kur")}>
                      Buka Simulasi KUR
                    </button>
                  </p>
                )}
              </section>
            )}

            {bagian.label && (
              <section className="nk-dok-bagian">
                <h2>Kelengkapan label produk</h2>
                {labelDiperiksa.length ? (
                  <table className="nk-dok-tabel ringkas">
                    <thead>
                      <tr>
                        <th>Produk</th>
                        <th>Skor</th>
                        <th>Status</th>
                        <th>Yang perlu dilengkapi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labelDiperiksa.map(({ p, h }) => (
                        <tr key={p.id}>
                          <td>{p.nama}</td>
                          <td className="tebal">{Math.round(h.skor)}/100</td>
                          <td>{h.kategori}</td>
                          <td>
                            {susunSaran(h)
                              .slice(0, 3)
                              .map((s) => h.items.find((i) => i.kunci === s.kunci)?.nama)
                              .join(", ") || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>
                    Belum ada label yang diperiksa.{" "}
                    <button className="nk-link nk-no-print" onClick={() => goTo("label")}>
                      Buka Label Produk
                    </button>
                  </p>
                )}
              </section>
            )}

            {bagian.catatan && (
              <section className="nk-dok-bagian">
                <h2>Catatan analisis (30 hari terakhir)</h2>
                <ul className="nk-dok-poin">
                  {lap.catatan.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
                <p className="nk-dok-catatan">Angka dihitung sistem dari catatan transaksi; kalimat disusun otomatis.</p>
              </section>
            )}
          </>
        )}

        <div className="nk-dok-kaki">
          <p>
            <b>Penting:</b> Ini alat bantu persiapan, bukan keputusan kredit atau persetujuan izin. Angka berasal dari catatan yang diisi pemilik usaha dan belum
            diaudit pihak lain.
          </p>
          <span>
            {nomor} · Dibuat dengan NAIK.IN · {tanggal(hariIni)}
          </span>
        </div>
      </article>
    </>
  );
}
