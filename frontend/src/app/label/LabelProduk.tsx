import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { PIcon } from "../../components/icons";
import { Cincin, Istilah, Modal, Pernyataan, Segmen } from "../../components/ui";
import {
  KETERANGAN_WAJIB, cariKlaim, cekAlamatProdusen, cekBeratBersih, cekKedaluwarsa, cekNomorIzin, dataLabelKosong,
  drafTeksLabel, hitungSkor, susunSaran, type DataLabel, type KunciLabel, type Lokasi, type ModeLabel, type StatusItem,
} from "../../lib/engine/label";
import { tanggal } from "../../lib/format";
import { idBaru, useToko, type ProdukLabel } from "../../state/store";

const LABEL_LOKASI: Record<Lokasi, string> = {
  utama: "Di depan (utama)",
  lain: "Di belakang/samping",
  tidak_terlihat: "Tidak ada",
};

const KELAS_STATUS: Record<StatusItem, string> = {
  Sesuai: "hijau",
  "Ada tapi kurang": "kuning",
  "Tidak ada": "merah",
  "Tidak berlaku": "abu",
};

/** Cocokkan kunci keluaran AI (bebas) ke 9 keterangan wajib. */
const POLA_AI: [RegExp, KunciLabel][] = [
  [/nama|merek|brand|product/i, "namaProduk"],
  [/komposisi|bahan|ingredient/i, "daftarBahan"],
  [/berat|netto|net|isi/i, "beratBersih"],
  [/produsen|alamat|producer|pabrik/i, "produsen"],
  [/halal/i, "halal"],
  [/kode|produksi|batch|lot/i, "kodeProduksi"],
  [/kedaluwarsa|kadaluarsa|expir|baik digunakan/i, "kedaluwarsa"],
  [/izin|pirt|irt|md|permit|bpom/i, "nomorIzin"],
  [/asal|origin/i, "asalUsul"],
];

function hintFormat(kunci: KunciLabel, nilai: string, kota: string) {
  if (!nilai.trim()) return null;
  const h =
    kunci === "nomorIzin" ? cekNomorIzin(nilai) : kunci === "kedaluwarsa" ? cekKedaluwarsa(nilai) : kunci === "produsen" ? cekAlamatProdusen(nilai, kota) : kunci === "beratBersih" ? cekBeratBersih(nilai) : null;
  return h;
}

function FormLabel({ produk, onSimpan }: { produk: ProdukLabel; onSimpan: (p: ProdukLabel) => void }) {
  const { profil, demo } = useToko();
  const [draf, setDraf] = useState<DataLabel>(produk.data);
  const [teksLain, setTeksLain] = useState(produk.teksLain);
  const [nama, setNama] = useState(produk.nama);
  const [mode, setMode] = useState<ModeLabel>(produk.mode);
  const [foto, setFoto] = useState<{ url: string; nama: string }[]>([]);
  const [proses, setProses] = useState(false);
  const [pesanAi, setPesanAi] = useState<{ teks: string; jenis: "ok" | "info" } | null>(null);
  const inputFoto = useRef<HTMLInputElement>(null);
  const fileTerakhir = useRef<File | null>(null);

  useEffect(() => {
    setDraf(produk.data);
    setTeksLain(produk.teksLain);
    setNama(produk.nama);
    setMode(produk.mode);
    setFoto([]);
    setPesanAi(null);
  }, [produk.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const berubah = JSON.stringify(draf) !== JSON.stringify(produk.data) || teksLain !== produk.teksLain || nama !== produk.nama || mode !== produk.mode;
  const ubah = (k: KunciLabel, p: Partial<DataLabel[KunciLabel]>) => setDraf((d) => ({ ...d, [k]: { ...d[k], ...p } }));

  const bacaAi = async (file: File) => {
    setPesanAi(null);
    if (demo.modeOffline) {
      setPesanAi({ jenis: "info", teks: "Mode offline: isi keterangan di bawah sesuai foto." });
      return;
    }
    setProses(true);
    const res = await api.labelScan(file);
    setProses(false);
    if (!res.ok || !res.data) {
      setPesanAi({ jenis: "info", teks: `Pembacaan otomatis belum tersedia (${res.alasan ?? "AI tidak aktif"}). Isi keterangan di bawah sesuai foto.` });
      return;
    }
    const hasil = { ...draf };
    let terisi = 0;
    for (const [kunciAi, f] of Object.entries(res.data.fields)) {
      const cocok = POLA_AI.find(([re]) => re.test(kunciAi));
      if (!cocok || !f.found || !f.value) continue;
      hasil[cocok[1]] = { ...hasil[cocok[1]], nilai: f.value, lokasi: f.lokasi, tidakBerlaku: false };
      terisi += 1;
    }
    setDraf(hasil);
    setPesanAi({ jenis: "ok", teks: `AI membaca ${terisi} keterangan. Periksa dulu — hasil belum disimpan sampai kamu menekan “Konfirmasi & hitung skor”.` });
  };

  return (
    <section className="nk-card nk-label-form" aria-labelledby="judul-periksa-label">
      <div className="nk-card-head">
        <div>
          <span className="nk-eyebrow">Periksa dulu</span>
          <h3 id="judul-periksa-label">9 keterangan wajib label</h3>
        </div>
        <Segmen
          label="Status kemasan"
          pilihan={[
            { id: "draf", label: "Desain draf" },
            { id: "beredar", label: "Sudah beredar" },
          ]}
          nilai={mode}
          onPilih={setMode}
        />
      </div>

      <label className="nk-field">
        <span>Nama produk (untuk daftar)</span>
        <input value={nama} onChange={(e) => setNama(e.target.value)} />
      </label>

      <div className="nk-foto-kemasan">
        <div className="nk-foto-daftar">
          {foto.map((f) => (
            <img key={f.url} src={f.url} alt={`Foto kemasan ${f.nama}`} />
          ))}
          <button type="button" className="nk-foto-tambah" onClick={() => inputFoto.current?.click()}>
            <PIcon name="camera" size={20} />
            <span>{foto.length ? "Tambah foto" : "Foto kemasan depan & belakang"}</span>
          </button>
        </div>
        <div className="nk-foto-aksi">
          <button className="nk-btn sekunder kecil" disabled={!foto.length || proses} onClick={() => fileTerakhir.current && bacaAi(fileTerakhir.current)}>
            <PIcon name="sparkle" size={14} /> {proses ? "Membaca…" : "Baca otomatis dengan AI"}
          </button>
          <small>Foto hanya dibaca untuk mengisi kolom; hasilnya tetap kamu periksa.</small>
        </div>
        <input
          ref={inputFoto}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            fileTerakhir.current = file;
            setFoto((f) => [...f, { url: URL.createObjectURL(file), nama: file.name }]);
          }}
        />
        {pesanAi && (
          <p className={`nk-pesan-ai ${pesanAi.jenis}`}>
            <PIcon name={pesanAi.jenis === "ok" ? "sparkle" : "info"} size={14} /> {pesanAi.teks}
          </p>
        )}
      </div>

      <ol className="nk-label-isian">
        {KETERANGAN_WAJIB.map((k, i) => {
          const isian = draf[k.kunci];
          const hint = isian.tidakBerlaku ? null : hintFormat(k.kunci, isian.nilai, profil.kota);
          const izinDraf = mode === "draf" && k.kunci === "nomorIzin";
          return (
            <li key={k.kunci} className={isian.tidakBerlaku || izinDraf ? "nonaktif" : ""}>
              <div className="nk-label-isian-head">
                <span className="nomor">{i + 1}</span>
                <b>
                  <Istilah arti={`Contoh: ${k.contoh}`}>{k.nama}</Istilah>
                </b>
                {k.bisaTidakBerlaku && (
                  <label className="nk-tidak-berlaku" title={k.bisaTidakBerlaku}>
                    <input type="checkbox" checked={!!isian.tidakBerlaku} onChange={(e) => ubah(k.kunci, { tidakBerlaku: e.target.checked })} />
                    Tidak berlaku
                  </label>
                )}
              </div>
              {izinDraf ? (
                <small className="nk-muted kecil">Mode desain draf: nomor izin belum dinilai. Sisakan ruang untuk nomor izin dan 2D barcode.</small>
              ) : isian.tidakBerlaku ? (
                <small className="nk-muted kecil">{k.bisaTidakBerlaku}.</small>
              ) : (
                <>
                  <div className="nk-label-isian-input">
                    <input value={isian.nilai} placeholder={k.contoh} onChange={(e) => ubah(k.kunci, { nilai: e.target.value, lokasi: isian.lokasi === "tidak_terlihat" && e.target.value ? "utama" : isian.lokasi })} aria-label={k.nama} />
                    <select value={isian.lokasi} onChange={(e) => ubah(k.kunci, { lokasi: e.target.value as Lokasi })} aria-label={`Letak ${k.nama}`}>
                      {(Object.keys(LABEL_LOKASI) as Lokasi[]).map((l) => (
                        <option key={l} value={l}>
                          {LABEL_LOKASI[l]}
                        </option>
                      ))}
                    </select>
                  </div>
                  {hint && (
                    <small className={hint.valid ? "nk-hint ok" : "nk-hint kurang"}>
                      <PIcon name={hint.valid ? "check" : "alert"} size={12} /> {hint.pesan}
                    </small>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ol>

      <label className="nk-field">
        <span>Teks lain di kemasan (slogan, klaim)</span>
        <textarea rows={2} value={teksLain} onChange={(e) => setTeksLain(e.target.value)} placeholder="Contoh: Keripik pedas khas Padang" />
      </label>

      <div className="nk-label-simpan">
        {berubah && <span className="nk-badge kuning">Belum dikonfirmasi</span>}
        <button
          className="nk-btn"
          onClick={() => onSimpan({ ...produk, nama: nama.trim() || produk.nama, mode, data: draf, teksLain, diperiksaPada: new Date().toISOString().slice(0, 10) })}
          disabled={!berubah && produk.diperiksaPada !== null}
        >
          <PIcon name="check" size={16} /> Konfirmasi & hitung skor
        </button>
      </div>
    </section>
  );
}

function HasilLabel({ produk }: { produk: ProdukLabel }) {
  const { profil, demo } = useToko();
  const hasil = useMemo(() => hitungSkor(produk.data, produk.mode, profil.kota), [produk, profil.kota]);
  const klaim = useMemo(() => cariKlaim(produk.teksLain), [produk.teksLain]);
  const saran = useMemo(() => susunSaran(hasil), [hasil]);
  const [teksDraf, setTeksDraf] = useState<{ teks: string; sumber: "ai" | "templat" } | null>(null);
  const [proses, setProses] = useState(false);
  const [tersalin, setTersalin] = useState(false);

  useEffect(() => setTeksDraf(null), [produk]);

  if (!produk.diperiksaPada)
    return (
      <section className="nk-card nk-label-hasil">
        <div className="nk-kosong">
          <span>
            <PIcon name="tag" size={22} />
          </span>
          <b>Belum ada skor</b>
          <p>Isi 9 keterangan wajib di sebelah, lalu tekan “Konfirmasi & hitung skor”.</p>
        </div>
      </section>
    );

  const drafTemplat = drafTeksLabel(produk.data, produk.mode);
  const tulisUlang = async () => {
    setProses(true);
    if (demo.modeOffline) {
      setTeksDraf({ teks: drafTemplat, sumber: "templat" });
      setProses(false);
      return;
    }
    const res = await api.labelFix({
      ...Object.fromEntries(KETERANGAN_WAJIB.map((k) => [k.kunci, produk.data[k.kunci].tidakBerlaku ? "tidak berlaku" : produk.data[k.kunci].nilai || null])),
      mode: produk.mode,
      klaimYangPerluDiganti: klaim.map((k) => k.kutipan),
    });
    setTeksDraf(res.ok && res.data ? { teks: res.data.label_belakang, sumber: "ai" } : { teks: drafTemplat, sumber: "templat" });
    setProses(false);
  };
  const teks = teksDraf?.teks ?? drafTemplat;

  return (
    <section className="nk-card nk-label-hasil" aria-labelledby="judul-hasil-label">
      <div className="nk-label-skor">
        <Cincin rasio={hasil.skor / 100} ukuran={120} tebal={11}>
          <div className="nk-kunci-cincin">
            <strong>{Math.round(hasil.skor)}</strong>
            <span>dari 100</span>
          </div>
        </Cincin>
        <div>
          <span className="nk-eyebrow">Skor kelengkapan label</span>
          <h3 id="judul-hasil-label" className={`teks-${hasil.kategori === "Lengkap" ? "hijau" : hasil.kategori === "Hampir lengkap" ? "kuning" : "merah"}`}>
            {hasil.kategori}
          </h3>
          <p className="nk-muted kecil">
            Diperiksa {tanggal(produk.diperiksaPada)} · {produk.mode === "draf" ? "desain draf" : "kemasan beredar"}
          </p>
          {hasil.catatanDraf && <p className="nk-muted kecil">{hasil.catatanDraf}</p>}
        </div>
      </div>
      <Pernyataan />

      <table className="nk-tabel nk-label-tabel">
        <thead>
          <tr>
            <th>Keterangan</th>
            <th>Status</th>
            <th className="kanan">Poin</th>
          </tr>
        </thead>
        <tbody>
          {hasil.items.map((i) => (
            <tr key={i.kunci}>
              <td>
                <b>{i.nama}</b>
                {i.catatan.length > 0 && <small>{i.catatan.join(" ")}</small>}
              </td>
              <td>
                <span className={`nk-badge status-${KELAS_STATUS[i.status]}`}>{i.status}</span>
              </td>
              <td className="kanan nowrap">{i.status === "Tidak berlaku" ? "—" : `${i.poin.toLocaleString("id-ID")}/${i.bobot}`}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {klaim.length > 0 && (
        <div className="nk-klaim">
          <b>
            <PIcon name="alert" size={15} /> Klaim yang perlu dihindari
          </b>
          {klaim.map((k) => (
            <div key={k.kutipan}>
              <p>
                “<mark>{k.kutipan}</mark>” — {k.alasan}
              </p>
              <small>Ganti dengan: {k.saran}</small>
            </div>
          ))}
          <small className="nk-muted kecil">Periksa ke BPOM sebelum mencetak ulang kemasan.</small>
        </div>
      )}

      {saran.length > 0 && (
        <div className="nk-saran-label">
          <b>Saran perbaikan (urut dari yang paling berpengaruh)</b>
          <ol>
            {saran.map((s) => (
              <li key={s.kunci}>{s.teks}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="nk-draf-label">
        <div className="nk-card-head">
          <div>
            <span className="nk-eyebrow">Draf teks label belakang</span>
            <small className="nk-muted kecil">{teksDraf?.sumber === "ai" ? "Ditulis AI dari data yang kamu konfirmasi" : "Dari data yang kamu konfirmasi; yang belum ada ditandai [ISI: …]"}</small>
          </div>
          <div className="nk-draf-aksi">
            <button
              className="nk-btn sekunder kecil"
              onClick={() => {
                navigator.clipboard?.writeText(teks).then(() => {
                  setTersalin(true);
                  window.setTimeout(() => setTersalin(false), 2000);
                });
              }}
            >
              <PIcon name={tersalin ? "check" : "file"} size={14} /> {tersalin ? "Tersalin" : "Salin"}
            </button>
            <button className="nk-btn kecil" onClick={tulisUlang} disabled={proses}>
              <PIcon name="sparkle" size={14} /> {proses ? "Menulis…" : "Rapikan dengan AI"}
            </button>
          </div>
        </div>
        <pre>{teks}</pre>
      </div>
    </section>
  );
}

export function LabelProduk() {
  const { produk, profil, kirim } = useToko();
  const [pilihan, setPilihan] = useState<string | null>(produk[0]?.id ?? null);
  const [hapus, setHapus] = useState<ProdukLabel | null>(null);
  const aktif = produk.find((p) => p.id === pilihan) ?? produk[0];
  const [toast, setToast] = useState<string | null>(null);

  const tambah = () => {
    const baru: ProdukLabel = { id: idBaru(), nama: `Produk ${produk.length + 1}`, mode: "draf", data: dataLabelKosong(), teksLain: "", diperiksaPada: null };
    kirim({ type: "simpanProduk", produk: baru });
    setPilihan(baru.id);
  };

  return (
    <div className="nk-halaman nk-label">
      <div className="nk-label-produk">
        {produk.map((p) => {
          const skor = p.diperiksaPada ? Math.round(hitungSkor(p.data, p.mode, profil.kota).skor) : null;
          return (
            <button key={p.id} className={`nk-produk-chip ${aktif?.id === p.id ? "aktif" : ""}`} onClick={() => setPilihan(p.id)}>
              <PIcon name="tag" size={15} />
              <span>{p.nama}</span>
              <em>{skor === null ? "Belum dicek" : `${skor}/100`}</em>
            </button>
          );
        })}
        <button className="nk-btn hantu kecil" onClick={tambah}>
          <PIcon name="plus" size={14} /> Tambah produk
        </button>
        {aktif && produk.length > 1 && (
          <button className="nk-btn hantu kecil bahaya-teks" onClick={() => setHapus(aktif)}>
            <PIcon name="trash" size={14} /> Hapus
          </button>
        )}
      </div>

      {aktif ? (
        <div className="nk-label-grid">
          <FormLabel
            produk={aktif}
            onSimpan={(p) => {
              kirim({ type: "simpanProduk", produk: p, konfirmasi: true });
              setToast("Data label dikonfirmasi, skor diperbarui.");
              window.setTimeout(() => setToast(null), 2500);
            }}
          />
          <HasilLabel produk={aktif} />
        </div>
      ) : (
        <section className="nk-card">
          <div className="nk-kosong">
            <span>
              <PIcon name="tag" size={22} />
            </span>
            <b>Belum ada produk</b>
            <p>Tambahkan produk untuk memeriksa kelengkapan labelnya.</p>
            <button className="nk-btn" onClick={tambah}>
              <PIcon name="plus" size={16} /> Tambah produk
            </button>
          </div>
        </section>
      )}

      <p className="nk-pernyataan">
        <PIcon name="info" size={15} />
        Pemeriksaan mengacu pada keterangan wajib Peraturan BPOM tentang Label Pangan Olahan. Ini alat bantu persiapan, bukan keputusan kredit atau persetujuan izin;
        konfirmasikan ke BPOM atau Dinas Kesehatan setempat.
      </p>

      {hapus && (
        <Modal
          judul="Hapus produk?"
          onTutup={() => setHapus(null)}
          lebar={400}
          aksi={
            <>
              <button className="nk-btn sekunder" onClick={() => setHapus(null)}>
                Batal
              </button>
              <button
                className="nk-btn bahaya"
                onClick={() => {
                  kirim({ type: "hapusProduk", id: hapus.id });
                  setPilihan(null);
                  setHapus(null);
                }}
              >
                Hapus
              </button>
            </>
          }
        >
          <p>“{hapus.nama}” dan hasil pemeriksaannya akan dihapus.</p>
        </Modal>
      )}
      {toast && (
        <div className="nk-toast" role="status">
          <PIcon name="check" size={16} /> {toast}
        </div>
      )}
    </div>
  );
}
