import { Fragment, useMemo, useState } from "react";
import { PIcon } from "../../components/icons";
import type { Arah, Metode, Transaksi } from "../../data/types";
import { METODE } from "../../data/types";
import { rupiah } from "../../lib/format";
import { barisKosong, tebakKategori, validasiDraf, type BarisDraf } from "../../lib/importer";
import { idBaru, useToko } from "../../state/store";

export type SumberDraf = { jenis: "manual" | "unggah_file" | "scan_foto"; label: string; pratinjau?: string; catatan?: string };

/**
 * Layar "Periksa dulu": hasil scan / impor / input manual bisa diedit di sini.
 * Tidak ada yang masuk riwayat sebelum tombol "Konfirmasi dan simpan" ditekan.
 */
export function PeriksaDulu({
  sumber,
  drafAwal,
  onBatal,
  onSimpan,
}: {
  sumber: SumberDraf;
  drafAwal: BarisDraf[];
  onBatal: () => void;
  onSimpan: (jumlah: number) => void;
}) {
  const { kategori, transaksi, hariIni, kirim } = useToko();
  const [draf, setDraf] = useState<BarisDraf[]>(drafAwal.length ? drafAwal : [barisKosong(hariIni)]);
  const [konfirmasiBatal, setKonfirmasiBatal] = useState(false);
  // Baris yang belum diisi sama sekali tidak ditandai merah dan tidak ikut disimpan.
  const belumDiisi = (d: BarisDraf) => !d.uraian.trim() && !d.nominal;
  const validasi = useMemo(
    () => validasiDraf(draf.map((d) => (belumDiisi(d) ? { ...d, disertakan: false } : d)), transaksi, hariIni),
    [draf, transaksi, hariIni],
  );

  const ubah = (key: string, perubahan: Partial<BarisDraf>) =>
    setDraf((d) =>
      d.map((b) => {
        if (b.key !== key) return b;
        const baru = { ...b, ...perubahan };
        // Ganti arah → pastikan kategori sesuai arah
        if (perubahan.arah && kategori.find((k) => k.id === baru.kategoriId)?.arah !== perubahan.arah)
          baru.kategoriId = tebakKategori(baru.uraian, perubahan.arah, kategori);
        if (perubahan.tanggal !== undefined) baru.tanggalAsli = perubahan.tanggal;
        return baru;
      }),
    );

  const disertakan = draf.filter((d) => d.disertakan && !belumDiisi(d));
  const galatDisertakan = disertakan.filter((d) => (validasi.masalah[d.key] ?? []).some((m) => m.tingkat === "galat")).length;
  const totalMasuk = disertakan.filter((d) => d.arah === "masuk").reduce((a, d) => a + d.nominal, 0);
  const totalKeluar = disertakan.filter((d) => d.arah === "keluar").reduce((a, d) => a + d.nominal, 0);
  const bisaSimpan = disertakan.length > 0 && galatDisertakan === 0;

  const simpan = () => {
    const sekarang = new Date().toISOString();
    const baru: Transaksi[] = disertakan.map((d) => ({
      id: idBaru(),
      tanggal: d.tanggal,
      uraian: d.uraian.trim(),
      arah: d.arah,
      kategoriId: d.kategoriId,
      metode: d.metode,
      nominal: d.nominal,
      sumber: sumber.jenis,
      dikonfirmasiAt: sekarang,
    }));
    kirim({ type: "simpanTransaksi", transaksi: baru, namaFile: sumber.jenis === "unggah_file" ? sumber.label.split(" · ").slice(1).join(" · ") || undefined : undefined });
    onSimpan(baru.length);
  };

  const batal = () => (draf.some((d) => d.uraian || d.nominal) ? setKonfirmasiBatal(true) : onBatal());

  return (
    <div className="nk-overlay nk-periksa-overlay">
      <section className="nk-periksa" role="dialog" aria-modal="true" aria-label="Periksa dulu sebelum disimpan">
        <header className="nk-periksa-head">
          <div>
            <span className="nk-eyebrow">
              Langkah terakhir · {sumber.label}
            </span>
            <h2>Periksa dulu sebelum disimpan</h2>
            <p>
              Ubah yang kurang tepat. Data baru <b>belum masuk riwayat</b> dan belum dihitung sampai kamu menekan
              “Konfirmasi dan simpan”.
            </p>
          </div>
          <button className="nk-icon-btn" onClick={batal} aria-label="Tutup">
            <PIcon name="close" size={18} />
          </button>
        </header>

        <div className="nk-periksa-ringkas">
          <span>
            <b>{disertakan.length}</b> baris disertakan
          </span>
          {validasi.rentangFile && (
            <span>
              Rentang tanggal: <b>{validasi.rentangFile.label}</b>
            </span>
          )}
          <span className={galatDisertakan ? "galat" : "ok"}>
            <PIcon name={galatDisertakan ? "alert" : "check"} size={14} />
            {galatDisertakan ? `${galatDisertakan} baris perlu diperbaiki` : "Tidak ada baris bermasalah"}
          </span>
          {validasi.jumlahPeringatan > 0 && (
            <span className="peringatan">
              <PIcon name="info" size={14} /> {validasi.jumlahPeringatan} peringatan
            </span>
          )}
        </div>
        {sumber.catatan && (
          <p className="nk-periksa-catatan">
            <PIcon name="info" size={15} /> {sumber.catatan}
          </p>
        )}

        <div className={`nk-periksa-isi ${sumber.pratinjau ? "dengan-pratinjau" : ""}`}>
          {sumber.pratinjau && (
            <figure className="nk-pratinjau">
              <img src={sumber.pratinjau} alt="Foto yang dipindai" />
              <figcaption>Foto asli sebagai acuan</figcaption>
            </figure>
          )}
          <div className="nk-tabel-wrap">
            <table className="nk-tabel nk-tabel-edit">
              <thead>
                <tr>
                  <th aria-label="Sertakan" />
                  <th>Tanggal</th>
                  <th>Uraian</th>
                  <th>Jenis</th>
                  <th>Kategori</th>
                  <th>Metode</th>
                  <th className="kanan">Nominal (Rp)</th>
                  <th aria-label="Hapus" />
                </tr>
              </thead>
              <tbody>
                {draf.map((d) => {
                  const masalah = validasi.masalah[d.key] ?? [];
                  const galat = d.disertakan && masalah.some((m) => m.tingkat === "galat");
                  const peringatan = d.disertakan && !galat && masalah.length > 0;
                  return (
                    <Fragment key={d.key}>
                      <tr className={`${galat ? "baris-galat" : peringatan ? "baris-peringatan" : ""} ${d.disertakan ? "" : "baris-mati"}`}>
                        <td data-label="Sertakan">
                          <input type="checkbox" checked={d.disertakan} onChange={(e) => ubah(d.key, { disertakan: e.target.checked })} aria-label="Sertakan baris" />
                          {d.baris && <small className="nk-no-baris">#{d.baris}</small>}
                        </td>
                        <td data-label="Tanggal">
                          <input type="date" value={d.tanggal} max={hariIni} onChange={(e) => ubah(d.key, { tanggal: e.target.value })} aria-label="Tanggal" />
                        </td>
                        <td data-label="Uraian">
                          <input value={d.uraian} placeholder="Contoh: Beli cabai 5 kg" onChange={(e) => ubah(d.key, { uraian: e.target.value })} aria-label="Uraian" />
                        </td>
                        <td data-label="Jenis">
                          <select value={d.arah} onChange={(e) => ubah(d.key, { arah: e.target.value as Arah })} aria-label="Jenis">
                            <option value="masuk">Masuk</option>
                            <option value="keluar">Keluar</option>
                          </select>
                        </td>
                        <td data-label="Kategori">
                          <select value={d.kategoriId} onChange={(e) => ubah(d.key, { kategoriId: e.target.value })} aria-label="Kategori">
                            {kategori
                              .filter((k) => k.arah === d.arah)
                              .map((k) => (
                                <option key={k.id} value={k.id}>
                                  {k.nama}
                                </option>
                              ))}
                          </select>
                        </td>
                        <td data-label="Metode">
                          <select value={d.metode} onChange={(e) => ubah(d.key, { metode: e.target.value as Metode })} aria-label="Metode">
                            {METODE.map((m) => (
                              <option key={m}>{m}</option>
                            ))}
                          </select>
                        </td>
                        <td data-label="Nominal" className="kanan">
                          <input
                            inputMode="numeric"
                            className="kanan"
                            value={d.nominal ? d.nominal.toLocaleString("id-ID") : ""}
                            placeholder="0"
                            onChange={(e) => ubah(d.key, { nominal: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                            aria-label="Nominal"
                          />
                        </td>
                        <td>
                          <button className="nk-icon-btn kecil" onClick={() => setDraf((x) => x.filter((b) => b.key !== d.key))} aria-label="Hapus baris">
                            <PIcon name="trash" size={15} />
                          </button>
                        </td>
                      </tr>
                      {d.disertakan && masalah.length > 0 && (
                        <tr className="baris-masalah">
                          <td colSpan={8}>
                            {masalah.map((m) => (
                              <span key={m.pesan} className={m.tingkat}>
                                <PIcon name={m.tingkat === "galat" ? "alert" : "info"} size={13} /> {m.pesan}
                              </span>
                            ))}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            <button className="nk-btn hantu kecil" onClick={() => setDraf((d) => [...d, barisKosong(hariIni, { tanggal: d[d.length - 1]?.tanggal || hariIni })])}>
              <PIcon name="plus" size={15} /> Tambah baris
            </button>
          </div>
        </div>

        <footer className="nk-periksa-foot">
          <div className="nk-periksa-total">
            <span>
              Masuk <b className="masuk">{rupiah(totalMasuk)}</b>
            </span>
            <span>
              Keluar <b className="keluar">{rupiah(totalKeluar)}</b>
            </span>
          </div>
          <div className="nk-periksa-aksi">
            <button className="nk-btn sekunder" onClick={batal}>
              Batal
            </button>
            <button className="nk-btn" onClick={simpan} disabled={!bisaSimpan}>
              <PIcon name="check" size={16} /> Konfirmasi dan simpan{disertakan.length ? ` (${disertakan.length})` : ""}
            </button>
          </div>
          {!bisaSimpan && disertakan.length > 0 && <small className="nk-periksa-hint">Perbaiki atau hapus centang baris yang ditandai merah untuk menyimpan.</small>}
        </footer>

        {konfirmasiBatal && (
          <div className="nk-konfirmasi-mini" role="alertdialog" aria-label="Batalkan pencatatan">
            <p>Batalkan? Data yang belum dikonfirmasi tidak akan disimpan.</p>
            <div>
              <button className="nk-btn sekunder kecil" onClick={() => setKonfirmasiBatal(false)}>
                Lanjut periksa
              </button>
              <button className="nk-btn bahaya kecil" onClick={onBatal}>
                Ya, batalkan
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
