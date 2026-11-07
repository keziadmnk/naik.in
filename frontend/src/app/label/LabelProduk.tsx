import { useEffect, useMemo, useRef, useState } from "react";
import { api, type CekRitelAi, type KlaimAi, type KunciItemLabelAi } from "../../api";
import { PageHeader } from "../../components/figma";
import { PIcon } from "../../components/icons";
import { KameraLangsung, kameraLangsungTersedia } from "../../components/KameraLangsung";
import { GarisPindai } from "../../components/Pemindai";
import { Cincin, Istilah, Modal, PERNYATAAN } from "../../components/ui";
import {
  KETERANGAN_WAJIB, PANDUAN_LABEL, cariKlaim, cekAlamatProdusen, cekBeratBersih, cekKedaluwarsa, cekNomorIzin, dataLabelKosong,
  asalUsulTidakBerlaku, drafTeksLabel, hitungSkor, susunSaran, type DataLabel, type DrafLabel, type KunciLabel, type Lokasi, type ModeLabel, type StatusItem,
} from "../../lib/engine/label";
import { tanggal } from "../../lib/format";
import { goTo } from "../../routes";
import { idBaru, useToko, type ProdukLabel } from "../../state/store";


const LABEL_LOKASI: Record<Lokasi, string> = {
  utama: "Di depan (utama)",
  lain: "Di belakang/samping",
  tidak_terlihat: "Tidak ada",
};

const LABEL_STATUS_TAMPIL: Record<StatusItem, string> = {
  Sesuai: "Sesuai",
  "Ada tapi kurang": "Ada tapi kurang",
  "Tidak ada": "Tidak terdeteksi",
  "Tidak berlaku": "Tidak berlaku",
};

const KELAS_STATUS: Record<StatusItem, string> = {
  Sesuai: "ok",
  "Ada tapi kurang": "kurang",
  "Tidak ada": "tidak",
  "Tidak berlaku": "na",
};

const PETA_AI: Record<KunciItemLabelAi, KunciLabel> = {
  product_name_and_brand: "namaProduk",
  ingredients_list: "daftarBahan",
  net_weight: "beratBersih",
  manufacturer_address: "produsen",
  halal_info: "halal",
  production_code: "kodeProduksi",
  expiry_date: "kedaluwarsa",
  registration_number: "nomorIzin",
  special_ingredient_origin: "asalUsul",
};
const LOKASI_DARI_AI: Record<"MAIN_PANEL" | "OTHER" | "NOT_VISIBLE", Lokasi> = { MAIN_PANEL: "utama", OTHER: "lain", NOT_VISIBLE: "tidak_terlihat" };

const CEK_RITEL: [keyof CekRitelAi, string][] = [
  ["has_nutrition_facts_ing", "Informasi Nilai Gizi"],
  ["has_bpom_2d_barcode", "2D barcode BPOM"],
  ["has_gs1_retail_barcode", "Barcode ritel (GS1)"],
  ["has_allergen_warning", "Peringatan alergen"],
];

function hintFormat(kunci: KunciLabel, nilai: string, kota: string) {
  if (!nilai.trim()) return null;
  return kunci === "nomorIzin" ? cekNomorIzin(nilai) : kunci === "kedaluwarsa" ? cekKedaluwarsa(nilai) : kunci === "produsen" ? cekAlamatProdusen(nilai, kota) : kunci === "beratBersih" ? cekBeratBersih(nilai) : null;
}

const kelasSkor = (kategori: string) => (kategori === "Lengkap" ? "ok" : kategori === "Hampir lengkap" ? "kurang" : "tidak");

function Kemasan({ produk }: { produk: ProdukLabel }) {
  const nama = (produk.data.namaProduk.nilai || produk.nama).replace(/\s+\d+\s*(g|gr|kg|ml|l)$/i, "");
  return (
    <div className="lp-kemasan" aria-hidden="true">
      <span>{nama}</span>
      <small>{produk.data.beratBersih.nilai || "—"}</small>
    </div>
  );
}


function DaftarProduk() {
  const { produk, profil } = useToko();
  const daftar = produk.map((p) => ({ p, h: p.diperiksaPada ? hitungSkor(p.data, p.mode, profil.kota) : null }));
  return (
    <div className="fg-halaman">
      <PageHeader title="Label Produk" subtitle="Periksa kelengkapan 9 keterangan wajib pada kemasan produkmu.">
        <button className="portal-primary" onClick={() => goTo("label", "tambah")}>
          <PIcon name="plus" size={16} />
          Tambah Produk
        </button>
      </PageHeader>

      {daftar.length === 0 ? (
        <section className="lp-kosong">
          <span>
            <PIcon name="tag" size={24} />
          </span>
          <h3>Belum ada produk</h3>
          <p>Foto kemasan depan dan belakang, periksa hasil bacanya, lalu lihat apa saja yang perlu dilengkapi.</p>
          <button className="portal-primary" onClick={() => goTo("label", "tambah")}>
            <PIcon name="plus" size={16} />
            Tambah Produk
          </button>
        </section>
      ) : (
        <div className="lp-grid">
          {daftar.map(({ p, h }) => (
            <button key={p.id} className="lp-kartu" onClick={() => goTo("label", h ? p.id : `periksa-${p.id}`)}>
              <div className="lp-kartu-gambar">
                <Kemasan produk={p} />
              </div>
              <div className="lp-kartu-isi">
                <div className="lp-kartu-atas">
                  <h3>{p.nama}</h3>
                  {h ? <span className={`lp-pil ${kelasSkor(h.kategori)}`}>{h.kategori}</span> : <span className="lp-pil na">Belum diperiksa</span>}
                </div>
                <p>
                  {p.mode === "draf" ? "Desain draf" : "Sudah beredar"}
                  {p.diperiksaPada && ` · diperiksa ${tanggal(p.diperiksaPada)}`}
                </p>
                <div className="lp-skor-bar">
                  <span>Kelengkapan label</span>
                  <b>{h ? `${Math.round(h.skor)}/100` : "—"}</b>
                  <i>
                    <em className={h ? kelasSkor(h.kategori) : ""} style={{ width: `${h ? h.skor : 0}%` }} />
                  </i>
                </div>
              </div>
            </button>
          ))}
          <button className="lp-kartu lp-tambah" onClick={() => goTo("label", "tambah")}>
            <PIcon name="plus" size={22} />
            <b>Tambah produk</b>
            <span>Foto kemasan untuk diperiksa</span>
          </button>
        </div>
      )}
    </div>
  );
}


type Foto = { file: File; url: string };
const LANGKAH = ["Foto kemasan", "Periksa hasil baca", "Hasil & rekomendasi"];

function Langkah({ aktif }: { aktif: number }) {
  return (
    <ol className="lp-langkah">
      {LANGKAH.map((l, i) => (
        <li key={l} className={i < aktif ? "selesai" : i === aktif ? "aktif" : ""}>
          <span>{i < aktif ? <PIcon name="check" size={13} /> : i + 1}</span>
          {l}
        </li>
      ))}
    </ol>
  );
}

function SlotFoto({ judul, foto, onPilih, onHapus, memindai = false }: { judul: string; foto: Foto | null; onPilih: (f: File) => void; onHapus: () => void; memindai?: boolean }) {
  const kamera = useRef<HTMLInputElement>(null);
  const berkas = useRef<HTMLInputElement>(null);
  const [kameraBuka, setKameraBuka] = useState(false);
  const terima = (f?: File) => f && onPilih(f);
  const ambilFoto = () => (kameraLangsungTersedia() ? setKameraBuka(true) : kamera.current?.click());
  return (
    <div className="lp-slot">
      <div className="lp-slot-judul">
        <b>{judul}</b>
        {foto && (
          <button onClick={onHapus} aria-label={`Hapus foto ${judul}`}>
            Hapus
          </button>
        )}
      </div>
      <div
        className={`lp-slot-gambar ${foto ? "ada" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          terima(e.dataTransfer.files[0]);
        }}
      >
        {foto ? (
          <>
            <img src={foto.url} alt={judul} />
            {memindai && <GarisPindai />}
          </>
        ) : (
          <div>
            <PIcon name="camera" size={26} />
            <span>Belum ada foto</span>
          </div>
        )}
      </div>
      <div className="lp-slot-aksi">
        <button className="portal-secondary" onClick={ambilFoto}>
          <PIcon name="camera" size={15} />
          Ambil foto
        </button>
        <button className="portal-secondary" onClick={() => berkas.current?.click()}>
          <PIcon name="upload" size={15} />
          Pilih file
        </button>
      </div>
      <input ref={kamera} type="file" accept="image/jpeg,image/png" capture="environment" hidden onChange={(e) => (terima(e.target.files?.[0]), (e.target.value = ""))} />
      <input ref={berkas} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" hidden onChange={(e) => (terima(e.target.files?.[0]), (e.target.value = ""))} />
      {kameraBuka && (
        <KameraLangsung
          judul={`Foto ${judul.toLowerCase()}`}
          petunjuk="Arahkan kamera ke kemasan. Pastikan tulisan tajam, tidak silau, dan seluruh label masuk bingkai."
          onAmbil={(f) => {
            setKameraBuka(false);
            onPilih(f);
          }}
          onTutup={() => setKameraBuka(false)}
          onGagal={() => {
            setKameraBuka(false);
            kamera.current?.click();
          }}
        />
      )}
    </div>
  );
}

function AlurPeriksa({ produkAwal }: { produkAwal: ProdukLabel | null }) {
  const { profil, demo, kirim } = useToko();
  const [langkah, setLangkah] = useState(0);
  const [depan, setDepan] = useState<Foto | null>(null);
  const [belakang, setBelakang] = useState<Foto | null>(null);
  const [proses, setProses] = useState(false);
  const [info, setInfo] = useState<{ jenis: "ok" | "manual"; teks: string } | null>(null);
  const [dariAi, setDariAi] = useState<Set<KunciLabel>>(new Set());
  const [draf, setDraf] = useState<DataLabel>(() => produkAwal?.data ?? dataLabelKosong());
  const [nama, setNama] = useState(produkAwal?.nama ?? "");
  const [mode, setMode] = useState<ModeLabel>(produkAwal?.mode ?? "beredar");
  const [teksLain, setTeksLain] = useState(produkAwal?.teksLain ?? "");
  const [galat, setGalat] = useState<string | null>(null);
  const [ringkasanAi, setRingkasanAi] = useState<string[]>([]);
  const [klaimAi, setKlaimAi] = useState<KlaimAi[]>([]);
  const [ritelAi, setRitelAi] = useState<CekRitelAi | null>(null);
  const [catatanAi, setCatatanAi] = useState<Partial<Record<KunciLabel, string>>>({});
  const skorSementara = useMemo(() => hitungSkor(draf, mode, profil.kota), [draf, mode, profil.kota]);

  const pasang = (setter: (f: Foto | null) => void, lama: Foto | null) => (file: File) => {
    if (!/^image\/(jpeg|png)$/.test(file.type) && !/\.(jpe?g|png)$/i.test(file.name)) {
      setGalat("Format foto harus JPG, JPEG, atau PNG.");
      return;
    }
    setGalat(null);
    if (lama) URL.revokeObjectURL(lama.url);
    setter({ file, url: URL.createObjectURL(file) });
  };
  const ubah = (k: KunciLabel, p: Partial<DataLabel[KunciLabel]>) => {
    setDraf((d) => ({ ...d, [k]: { ...d[k], ...p, ...(p.nilai || p.tidakBerlaku ? { tidakTerbaca: false } : {}) } }));
    setDariAi((s) => {
      const n = new Set(s);
      n.delete(k);
      return n;
    });
  };

  const baca = async () => {
    setProses(true);
    let terisi = new Set<KunciLabel>();
    let alasan: string | null = null;
    if (demo.modeOffline) alasan = "mode offline";
    else {
      const res = await api.labelScan({ depan: depan?.file, belakang: belakang?.file });
      if (!res.ok || !res.data) alasan = res.alasan ?? "AI tidak aktif";
      else {
        const { extracted_items, executive_summary, prohibited_claims_detected, additional_retail_checks } = res.data;
        const hasil: DataLabel = dataLabelKosong();
        const catatan: Partial<Record<KunciLabel, string>> = {};
        for (const [kunciAi, x] of Object.entries(extracted_items) as [KunciItemLabelAi, (typeof extracted_items)[KunciItemLabelAi]][]) {
          const kunci = PETA_AI[kunciAi];
          if (!kunci) continue;
          if (x.note?.trim()) catatan[kunci] = x.note.trim();
          const bisaNa = KETERANGAN_WAJIB.find((k) => k.kunci === kunci)?.bisaTidakBerlaku;
          if (x.found && x.raw_text?.trim()) {
            const lokasi = LOKASI_DARI_AI[x.location] === "tidak_terlihat" ? "utama" : LOKASI_DARI_AI[x.location];
            hasil[kunci] = { ...hasil[kunci], nilai: x.raw_text.trim(), lokasi: !depan && lokasi === "utama" ? "lain" : lokasi, tidakBerlaku: false };
            terisi = new Set(terisi).add(kunci);
          } else if (x.status_hint === "UNREADABLE") {
            hasil[kunci] = { nilai: "", lokasi: "tidak_terlihat", tidakBerlaku: false, tidakTerbaca: true };
          } else if (x.status_hint === "NOT_APPLICABLE" && bisaNa) {
            hasil[kunci] = { nilai: "", lokasi: "tidak_terlihat", tidakBerlaku: true };
          }
        }
        setDraf(hasil);
        setNama(hasil.namaProduk.nilai);
        setCatatanAi(catatan);
        setRingkasanAi(executive_summary.slice(0, 5));
        setRitelAi(additional_retail_checks);
        setKlaimAi(prohibited_claims_detected);
        setTeksLain(prohibited_claims_detected.map((k) => k.quoted_text.trim()).filter(Boolean).join("\n"));
      }
    }
    setDariAi(terisi);
    setInfo(
      alasan
        ? { jenis: "manual", teks: `Pembacaan otomatis belum tersedia (${alasan}). Isi keterangan di bawah sesuai foto kemasan.` }
        : { jenis: "ok", teks: `${terisi.size} dari 9 keterangan terbaca dari foto. Cocokkan dengan kemasan, perbaiki yang keliru, lalu tekan Lanjut.` },
    );
    setProses(false);
    setLangkah(1);
  };

  const lanjut = () => {
    const namaFinal = nama.trim() || draf.namaProduk.nilai.trim() || "Produk tanpa nama";
    const produk: ProdukLabel = {
      id: produkAwal?.id ?? idBaru(),
      nama: namaFinal,
      mode,
      data: draf,
      teksLain,
      diperiksaPada: new Date().toISOString().slice(0, 10),
    };
    kirim({ type: "simpanProduk", produk, konfirmasi: true, dariAi: dariAi.size > 0 });
    goTo("label", produk.id);
  };

  const adaFoto = !!(depan || belakang);

  return (
    <div className="lp-alur">
      <button className="lp-kembali" onClick={() => (langkah === 1 ? setLangkah(0) : goTo("label"))}>
        ← {langkah === 1 ? "Kembali ke foto kemasan" : "Daftar produk"}
      </button>
      <div className="lp-alur-kepala">
        <h2>{produkAwal ? `Periksa ulang: ${produkAwal.nama}` : "Tambah produk"}</h2>
        <Langkah aktif={langkah} />
      </div>

      {langkah === 0 && (
        <section className="lp-panel">
          <div className="lp-panel-kepala">
            <h3>Foto kemasan</h3>
            <p>Ambil foto langsung atau pilih file JPG, JPEG, atau PNG. Pastikan tulisan terlihat jelas dan tidak silau.</p>
          </div>
          <div className="lp-foto-grid">
            <SlotFoto judul="Kemasan depan" foto={depan} memindai={proses} onPilih={pasang(setDepan, depan)} onHapus={() => setDepan(null)} />
            <SlotFoto judul="Kemasan belakang" foto={belakang} memindai={proses} onPilih={pasang(setBelakang, belakang)} onHapus={() => setBelakang(null)} />
          </div>
          {galat && (
            <p className="lp-galat" role="alert">
              {galat}
            </p>
          )}
          <div className="lp-kaki">
            <button className="lp-tautan" onClick={() => setLangkah(1)}>
              Isi manual tanpa foto
            </button>
            <button className="portal-primary" onClick={baca} disabled={!adaFoto || proses}>
              {proses ? (
                <>
                  <span className="nk-spinner" /> Membaca kemasan…
                </>
              ) : (
                <>
                  Baca label <PIcon name="arrow" size={15} />
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {langkah === 1 && (
        <div className={`lp-periksa ${adaFoto ? "dengan-foto" : ""}`}>
          {adaFoto && (
            <aside className="lp-periksa-foto">
              {depan && (
                <figure>
                  <img src={depan.url} alt="Kemasan depan" />
                  <figcaption>Depan</figcaption>
                </figure>
              )}
              {belakang && (
                <figure>
                  <img src={belakang.url} alt="Kemasan belakang" />
                  <figcaption>Belakang</figcaption>
                </figure>
              )}
            </aside>
          )}
          <section className="lp-panel">
            <div className="lp-panel-kepala">
              <h3>Periksa hasil baca</h3>
              <p>Pastikan setiap keterangan sama persis dengan yang tertulis di kemasan. Hasil baru tersimpan setelah kamu menekan Lanjut.</p>
            </div>
            {ringkasanAi.length > 0 && (
              <div className="lp-ringkasan">
                <h4>Ringkasan Eksekutif AI (5 Poin Utama)</h4>
                <ol>
                  {ringkasanAi.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ol>
              </div>
            )}
            {info && (
              <p className={`lp-info ${info.jenis}`}>
                {info.teks}
                {info.jenis === "manual" && (depan || belakang) && !demo.modeOffline && (
                  <button type="button" className="lp-coba-lagi" onClick={baca} disabled={proses}>
                    {proses ? "Membaca…" : "Coba baca lagi"}
                  </button>
                )}
              </p>
            )}
            <div className={`lp-skor-langsung ${skorSementara.kategori === "Lengkap" ? "ok" : skorSementara.kategori === "Hampir lengkap" ? "kurang" : "tidak"}`} aria-live="polite">
              <div>
                <span>Skor kelengkapan sementara</span>
                <b>
                  {Math.round(skorSementara.skor)}/100 · {skorSementara.kategori}
                </b>
              </div>
              <i>
                <em style={{ width: `${Math.round(skorSementara.skor)}%` }} />
              </i>
              <small>Berubah otomatis saat isian diperbaiki.</small>
            </div>

            <div className="lp-form-atas">
              <label className="lp-field">
                <span>Nama produk</span>
                <input
                  className={info?.jenis === "ok" && !nama.trim() ? "isian-cek" : undefined}
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder={info?.jenis === "ok" && !nama.trim() ? "Tidak terbaca dari foto — ketik dari kemasan" : "Contoh: Keripik Balado 200 g"}
                />
              </label>
              <div className="lp-field">
                <span>Status kemasan</span>
                <div className="lp-pilihan">
                  {(
                    [
                      ["beredar", "Sudah beredar"],
                      ["draf", "Desain draf"],
                    ] as const
                  ).map(([id, l]) => (
                    <button key={id} className={mode === id ? "aktif" : ""} onClick={() => setMode(id)}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <ol className="lp-isian">
              {KETERANGAN_WAJIB.map((k, i) => {
                const isian = draf[k.kunci];
                const izinDraf = mode === "draf" && k.kunci === "nomorIzin";
                const asalUsulLulus = k.kunci === "asalUsul" && asalUsulTidakBerlaku(draf);
                const na = k.kunci === "asalUsul" ? asalUsulLulus : !!isian.tidakBerlaku;
                const belumTerdeteksi = info?.jenis === "ok" && !isian.tidakTerbaca && !isian.nilai.trim();
                const hint = na || izinDraf ? null : hintFormat(k.kunci, isian.nilai, profil.kota);
                return (
                  <li key={k.kunci} className={na || izinDraf ? "nonaktif" : ""}>
                    <div className="lp-isian-kepala">
                      <span className="lp-no">{i + 1}</span>
                      <b>
                        <Istilah arti={`Contoh: ${k.contoh}`}>{k.nama}</Istilah>
                      </b>
                      {dariAi.has(k.kunci) && <em className="lp-tag">terbaca dari foto</em>}
                      {k.bisaTidakBerlaku && (
                        <label className="lp-cek">
                          <input type="checkbox" checked={!!isian.tidakBerlaku} onChange={(e) => ubah(k.kunci, { tidakBerlaku: e.target.checked })} />
                          Tidak berlaku
                        </label>
                      )}
                    </div>
                    {izinDraf ? (
                      <small className="lp-catatan">Desain draf: nomor izin belum dinilai. Sisakan ruang untuk nomor izin dan 2D barcode.</small>
                    ) : na ? (
                      <small className="lp-catatan">{asalUsulLulus ? "Tidak berlaku (lulus): produk sudah mencantumkan keterangan halal." : `${k.bisaTidakBerlaku}.`}</small>
                    ) : (
                      <>
                        <div className="lp-isian-input">
                          <input
                            className={isian.tidakTerbaca || (k.kunci === "asalUsul" && belumTerdeteksi) ? "isian-cek" : undefined}
                            value={isian.nilai}
                            placeholder={isian.tidakTerbaca ? "Tidak terbaca dari foto — ketik dari kemasan" : k.contoh}
                            onChange={(e) => ubah(k.kunci, { nilai: e.target.value, lokasi: isian.lokasi === "tidak_terlihat" && e.target.value ? "utama" : isian.lokasi })}
                            aria-label={k.nama}
                          />
                          <select value={isian.lokasi} onChange={(e) => ubah(k.kunci, { lokasi: e.target.value as Lokasi })} aria-label={`Letak ${k.nama}`}>
                            {(Object.keys(LABEL_LOKASI) as Lokasi[]).map((l) => (
                              <option key={l} value={l}>
                                {LABEL_LOKASI[l]}
                              </option>
                            ))}
                          </select>
                        </div>
                        {isian.tidakTerbaca && <small className="lp-hint tidak">Ada di kemasan tetapi tidak terbaca dari foto (buram/silau/terpotong). Ketik manual atau foto ulang lebih dekat.</small>}
                        {belumTerdeteksi && (
                          <small className="lp-tidak-terdeteksi">
                            <b>Tidak terdeteksi.</b> {PANDUAN_LABEL[k.kunci]}
                          </small>
                        )}
                        {hint && <small className={`lp-hint ${hint.valid ? "ok" : "kurang"}`}>{hint.pesan}</small>}
                        {dariAi.has(k.kunci) && catatanAi[k.kunci] && <small className="lp-catatan-ai">Catatan baca: {catatanAi[k.kunci]}</small>}
                      </>
                    )}
                  </li>
                );
              })}
            </ol>
            <label className="lp-field">
              <span>Tulisan lain di kemasan (slogan, klaim)</span>
              <textarea rows={2} value={teksLain} onChange={(e) => setTeksLain(e.target.value)} placeholder="Contoh: Keripik pedas khas Padang" />
            </label>
            {klaimAi.length > 0 && (
              <div className="lp-klaim-ai">
                <h4>Klaim yang sebaiknya diganti</h4>
                <ul>
                  {klaimAi.map((k) => (
                    <li key={k.quoted_text}>
                      <q>{k.quoted_text}</q> — {k.violation_reason}
                      <span>Saran: {k.suggested_replacement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {ritelAi && (
              <div className="lp-ritel">
                <span>Untuk masuk ritel modern:</span>
                {CEK_RITEL.map(([k, l]) => (
                  <em key={k} className={ritelAi[k] ? "ada" : ""}>
                    <PIcon name={ritelAi[k] ? "check" : "close"} size={12} /> {l}
                  </em>
                ))}
              </div>
            )}
            <div className="lp-kaki">
              <button className="portal-secondary" onClick={() => setLangkah(0)}>
                Kembali
              </button>
              <button className="portal-primary" onClick={lanjut}>
                Lanjut <PIcon name="arrow" size={15} />
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}


function HasilProduk({ produk }: { produk: ProdukLabel }) {
  const { profil, demo, kirim } = useToko();
  const h = useMemo(() => hitungSkor(produk.data, produk.mode, profil.kota), [produk, profil.kota]);
  const klaim = useMemo(() => cariKlaim(produk.teksLain), [produk.teksLain]);
  const saran = useMemo(() => susunSaran(h), [h]);
  const [teksDraf, setTeksDraf] = useState<{ teks: DrafLabel; sumber: "ai" | "templat" } | null>(null);
  const [proses, setProses] = useState(false);
  const [tersalin, setTersalin] = useState<"depan" | "belakang" | null>(null);
  const [hapus, setHapus] = useState(false);
  useEffect(() => setTeksDraf(null), [produk]);

  const drafTemplat = drafTeksLabel(produk.data, produk.mode);
  const teks = teksDraf?.teks ?? drafTemplat;
  const rapikan = async () => {
    setProses(true);
    if (demo.modeOffline) setTeksDraf({ teks: drafTemplat, sumber: "templat" });
    else {
      const res = await api.labelFix({
        ...Object.fromEntries(KETERANGAN_WAJIB.map((k) => [k.kunci, produk.data[k.kunci].tidakBerlaku ? "tidak berlaku" : produk.data[k.kunci].nilai || null])),
        mode: produk.mode,
        klaimYangPerluDiganti: klaim.map((k) => k.kutipan),
      });
      setTeksDraf(res.ok && res.data ? { teks: { depan: res.data.label_depan, belakang: res.data.label_belakang }, sumber: "ai" } : { teks: drafTemplat, sumber: "templat" });
    }
    setProses(false);
  };
  const hitung = (st: StatusItem) => h.items.filter((i) => i.status === st).length;

  return (
    <div className="lp-hasil">
      <button className="lp-kembali" onClick={() => goTo("label")}>
        ← Daftar produk
      </button>

      <section className="lp-hero">
        <div className="lp-hero-gambar">
          <Kemasan produk={produk} />
        </div>
        <div className="lp-hero-info">
          <span className="lp-eyebrow">{produk.mode === "draf" ? "Desain draf" : "Kemasan sudah beredar"}</span>
          <h2>{produk.nama}</h2>
          <p>Diperiksa {produk.diperiksaPada ? tanggal(produk.diperiksaPada) : "—"}</p>
          <div className="lp-hitung">
            <span>
              <b>{hitung("Sesuai")}</b> sesuai
            </span>
            <span>
              <b>{hitung("Ada tapi kurang")}</b> kurang
            </span>
            <span>
              <b>{hitung("Tidak ada")}</b> tidak terdeteksi
            </span>
            <span>
              <b>{hitung("Tidak berlaku")}</b> tidak berlaku
            </span>
          </div>
          <div className="lp-hero-aksi">
            <button className="portal-secondary" onClick={() => goTo("label", `periksa-${produk.id}`)}>
              <PIcon name="camera" size={15} />
              Periksa ulang
            </button>
            <button className="lp-tautan bahaya" onClick={() => setHapus(true)}>
              Hapus produk
            </button>
          </div>
        </div>
        <div className={`lp-hero-skor ${kelasSkor(h.kategori)}`}>
          <Cincin rasio={h.skor / 100} ukuran={128} tebal={10}>
            <div className="lp-skor-angka">
              <strong>{Math.round(h.skor)}</strong>
              <span>dari 100</span>
            </div>
          </Cincin>
          <b>{h.kategori}</b>
          <small>{PERNYATAAN}</small>
        </div>
      </section>

      <div className="lp-hasil-grid">
        <section className="lp-panel">
          <div className="lp-panel-kepala">
            <h3>Hasil pemeriksaan</h3>
            <p>9 keterangan wajib label pangan olahan{h.catatanDraf ? ` · ${h.catatanDraf}` : ""}</p>
          </div>
          <ul className="lp-cek-list">
            {h.items.map((i) => (
              <li key={i.kunci}>
                <span className={`lp-titik ${KELAS_STATUS[i.status]}`} />
                <div>
                  <b>{i.nama}</b>
                </div>
                <span className={`lp-pil ${KELAS_STATUS[i.status]}`}>{LABEL_STATUS_TAMPIL[i.status]}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="lp-panel">
          <div className="lp-panel-kepala">
            <h3>Rekomendasi</h3>
            <p>Urut dari yang paling berpengaruh ke skor.</p>
          </div>
          {saran.length === 0 && klaim.length === 0 ? (
            <p className="lp-selesai">
              <PIcon name="check" size={16} /> Semua keterangan wajib sudah sesuai.
            </p>
          ) : (
            <ol className="lp-saran">
              {saran.map((x) => {
                const item = h.items.find((i) => i.kunci === x.kunci)!;
                return (
                  <li key={x.kunci}>
                    <b>{item.nama}</b>
                    <p>{x.teks}</p>
                  </li>
                );
              })}
              {klaim.map((k) => (
                <li key={k.kutipan} className="klaim">
                  <b>Hindari klaim “{k.kutipan}”</b>
                  <p>
                    {k.alasan} Ganti dengan: <i>{k.saran}</i>
                  </p>
                </li>
              ))}
            </ol>
          )}
          <button className="lp-tautan" onClick={() => goTo("label", `periksa-${produk.id}`)}>
            Perbaiki isian →
          </button>
        </section>
      </div>

      <section className="lp-panel">
        <div className="lp-panel-kepala lp-draf-kepala">
          <div>
            <h3>Draf teks label</h3>
            <p>{teksDraf?.sumber === "ai" ? "Dirapikan AI dari data yang kamu periksa." : "Disusun dari data yang kamu periksa; yang belum ada ditandai [ISI: …]."}</p>
          </div>
          <div className="lp-draf-aksi">
            <button className="portal-primary" onClick={rapikan} disabled={proses}>
              {proses ? "Merapikan…" : "Rapikan dengan AI"}
            </button>
          </div>
        </div>
        <div className="lp-draf-dua">
          {(
            [
              ["depan", "Teks kemasan depan", "Bagian utama: nama & jenis produk, berat bersih, halal, nomor izin edar."],
              ["belakang", "Teks kemasan belakang", "Komposisi, produsen, kode produksi, kedaluwarsa, asal usul bahan."],
            ] as const
          ).map(([sisi, judul, ket]) => (
            <div key={sisi} className="lp-draf-sisi">
              <div className="lp-draf-sisi-kepala">
                <div>
                  <b>{judul}</b>
                  <small>{ket}</small>
                </div>
                <button
                  className="portal-secondary"
                  onClick={() => {
                    navigator.clipboard?.writeText(teks[sisi]).then(() => {
                      setTersalin(sisi);
                      window.setTimeout(() => setTersalin(null), 2000);
                    });
                  }}
                >
                  {tersalin === sisi ? "Tersalin" : "Salin"}
                </button>
              </div>
              <pre className="lp-draf">{teks[sisi]}</pre>
            </div>
          ))}
        </div>
      </section>

      {hapus && (
        <Modal
          judul="Hapus produk?"
          nada="bahaya"
          onTutup={() => setHapus(false)}
          lebar={400}
          aksi={
            <>
              <button className="nk-btn sekunder" onClick={() => setHapus(false)}>
                Batal
              </button>
              <button
                className="nk-btn bahaya"
                onClick={() => {
                  kirim({ type: "hapusProduk", id: produk.id });
                  goTo("label");
                }}
              >
                Hapus
              </button>
            </>
          }
        >
          <p>“{produk.nama}” dan hasil pemeriksaannya akan dihapus dari daftar.</p>
        </Modal>
      )}
    </div>
  );
}


export function LabelProduk({ sub }: { sub: string | null }) {
  const { produk } = useToko();
  if (sub === "tambah") return <AlurPeriksa key="baru" produkAwal={null} />;
  if (sub?.startsWith("periksa-")) {
    const p = produk.find((x) => x.id === sub.slice("periksa-".length));
    return p ? <AlurPeriksa key={p.id} produkAwal={p} /> : <DaftarProduk />;
  }
  if (sub) {
    const p = produk.find((x) => x.id === sub);
    if (p?.diperiksaPada) return <HasilProduk produk={p} />;
    if (p) return <AlurPeriksa key={p.id} produkAwal={p} />;
  }
  return <DaftarProduk />;
}
