import { useEffect, useMemo, useState } from "react";
import { PIcon } from "../../components/icons";
import { Kosong } from "../../components/ui";
import { kategoriMap } from "../../data/categories";
import { METODE, type Transaksi } from "../../data/types";
import { rupiah, tanggal, tanggalPanjang } from "../../lib/format";
import { useToko } from "../../state/store";

const LABEL_SUMBER: Record<Transaksi["sumber"], string> = {
  contoh: "Data contoh",
  manual: "Input manual",
  unggah_file: "Unggah file",
  scan_foto: "Scan foto",
};

const PER_HALAMAN = 25;

/** Drawer detail transaksi (desain Figma). */
export function DetailTransaksi({ id, onTutup }: { id: string; onTutup: () => void }) {
  const { transaksi, kategori, kirim } = useToko();
  const [hapus, setHapus] = useState(false);
  const t = transaksi.find((x) => x.id === id);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onTutup();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onTutup]);
  if (!t) return null;
  const peta = kategoriMap(kategori);
  return (
    <div className="drawer-backdrop" onClick={onTutup}>
      <aside className="transaction-drawer" role="dialog" aria-modal="true" aria-label="Detail transaksi" onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            <span>Detail transaksi</span>
            <h3>{t.uraian}</h3>
          </div>
          <button onClick={onTutup} aria-label="Tutup">
            <PIcon name="close" />
          </button>
        </header>
        <div className="drawer-amount">
          <span>{t.arah === "masuk" ? "Pemasukan" : "Pengeluaran"}</span>
          <strong>
            {t.arah === "masuk" ? "+" : "−"}
            {rupiah(t.nominal)}
          </strong>
          <small>{tanggalPanjang(t.tanggal)}</small>
        </div>
        <div className="drawer-details">
          <div>
            <span>Tanggal</span>
            <b>{tanggalPanjang(t.tanggal)}</b>
          </div>
          <div>
            <span>Kategori</span>
            <select value={t.kategoriId} onChange={(e) => kirim({ type: "ubahTransaksi", id: t.id, perubahan: { kategoriId: e.target.value } })} aria-label="Ubah kategori">
              {kategori
                .filter((k) => k.arah === t.arah)
                .map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <span>Metode Pembayaran</span>
            <b>{t.metode}</b>
          </div>
          <div>
            <span>Sumber Data</span>
            <b>{LABEL_SUMBER[t.sumber]}</b>
          </div>
          <div>
            <span>Laba usaha</span>
            <b>{peta[t.kategoriId]?.kelompok === "pribadi" ? "Tidak dihitung (pribadi)" : "Dihitung"}</b>
          </div>
        </div>
        {hapus ? (
          <div className="fg-konfirmasi">
            <span>Hapus transaksi ini dari riwayat?</span>
            <button className="portal-secondary" onClick={() => setHapus(false)}>
              Batal
            </button>
            <button
              className="portal-primary fg-bahaya"
              onClick={() => {
                kirim({ type: "hapusTransaksi", id: t.id });
                onTutup();
              }}
            >
              Hapus
            </button>
          </div>
        ) : (
          <button className="portal-secondary" onClick={() => setHapus(true)}>
            <PIcon name="trash" size={15} />
            Hapus Transaksi
          </button>
        )}
      </aside>
    </div>
  );
}

type Filter = { cari: string; dari: string; sampai: string; arah: "" | "masuk" | "keluar"; kategori: string; metode: string };
const FILTER_AWAL: Filter = { cari: "", dari: "", sampai: "", arah: "", kategori: "", metode: "" };

function unduhCsv(baris: Transaksi[]) {
  const isi = [
    ["Tanggal", "Deskripsi", "Jenis", "Metode", "Nominal"],
    ...baris.map((t) => [t.tanggal, t.uraian, t.arah === "masuk" ? "Pemasukan" : "Pengeluaran", t.metode, t.nominal]),
  ]
    .map((r) => r.map((v) => (typeof v === "string" && /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(";"))
    .join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([`﻿${isi}`], { type: "text/csv;charset=utf-8" }));
  a.download = "riwayat-transaksi.csv";
  a.click();
}

export function Riwayat() {
  const { transaksi, kategori } = useToko();
  const [f, setF] = useState<Filter>(FILTER_AWAL);
  const [bukaFilter, setBukaFilter] = useState(false);
  const [halaman, setHalaman] = useState(1);
  const [detail, setDetail] = useState<string | null>(null);
  const peta = kategoriMap(kategori);

  const hasil = useMemo(() => {
    const q = f.cari.trim().toLowerCase();
    return transaksi
      .filter(
        (t) =>
          (!q || t.uraian.toLowerCase().includes(q) || String(t.nominal).includes(q.replace(/\D/g, "") || "§")) &&
          (!f.dari || t.tanggal >= f.dari) &&
          (!f.sampai || t.tanggal <= f.sampai) &&
          (!f.arah || t.arah === f.arah) &&
          (!f.kategori || t.kategoriId === f.kategori) &&
          (!f.metode || t.metode === f.metode),
      )
      .reverse();
  }, [transaksi, f]);

  useEffect(() => setHalaman(1), [f]);
  const aktif = Object.entries(f).filter(([k, v]) => k !== "cari" && k !== "arah" && v).length;
  const totalHalaman = Math.max(1, Math.ceil(hasil.length / PER_HALAMAN));
  const tampil = hasil.slice((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN);
  const perTanggal = tampil.reduce<Record<string, Transaksi[]>>((g, t) => ((g[t.tanggal] = [...(g[t.tanggal] ?? []), t]), g), {});
  const nomorHalaman = Array.from(new Set([1, halaman - 1, halaman, halaman + 1, totalHalaman])).filter((n) => n >= 1 && n <= totalHalaman).sort((a, b) => a - b);

  return (
    <div className="history-content">
      <div className="table-tools">
        <label>
          <PIcon name="search" size={17} />
          <input value={f.cari} onChange={(e) => setF({ ...f, cari: e.target.value })} placeholder="Cari transaksi..." aria-label="Cari transaksi" />
        </label>
        <div className="fg-jenis" role="radiogroup" aria-label="Jenis transaksi">
          {(
            [
              ["", "Semua"],
              ["masuk", "Pemasukan"],
              ["keluar", "Pengeluaran"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} role="radio" aria-checked={f.arah === id} className={f.arah === id ? "active" : ""} onClick={() => setF({ ...f, arah: id })}>
              {label}
            </button>
          ))}
        </div>
        <button className={bukaFilter || aktif ? "aktif" : ""} onClick={() => setBukaFilter(!bukaFilter)} aria-expanded={bukaFilter}>
          <PIcon name="filter" size={16} />
          Filter{aktif ? ` (${aktif})` : ""}
        </button>
        <button className="export" onClick={() => unduhCsv(hasil)}>
          <PIcon name="download" size={16} />
          Export CSV
        </button>
      </div>
      {bukaFilter && (
        <div className="nk-filter">
          <label>
            Dari
            <input type="date" value={f.dari} onChange={(e) => setF({ ...f, dari: e.target.value })} />
          </label>
          <label>
            Sampai
            <input type="date" value={f.sampai} onChange={(e) => setF({ ...f, sampai: e.target.value })} />
          </label>
          <label>
            Kategori
            <select value={f.kategori} onChange={(e) => setF({ ...f, kategori: e.target.value })}>
              <option value="">Semua</option>
              {kategori.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
          </label>
          <label>
            Metode
            <select value={f.metode} onChange={(e) => setF({ ...f, metode: e.target.value })}>
              <option value="">Semua</option>
              {METODE.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          {aktif > 0 && (
            <button className="nk-btn hantu kecil" onClick={() => setF({ ...FILTER_AWAL, cari: f.cari, arah: f.arah })}>
              Hapus filter
            </button>
          )}
        </div>
      )}

      {hasil.length === 0 ? (
        <Kosong ikon="search" judul="Tidak ada transaksi" teks={transaksi.length ? "Coba ubah kata kunci atau filter." : "Riwayat masih kosong. Catat transaksi pertamamu di tab Upload & Scan."} />
      ) : (
        <>
          <div className="table-wrap transaction-table nk-hanya-laptop">
            <table>
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Deskripsi</th>
                  <th>Jenis</th>
                  <th>Metode</th>
                  <th>Nominal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tampil.map((t) => (
                  <tr key={t.id} onClick={() => setDetail(t.id)}>
                    <td>{tanggal(t.tanggal)}</td>
                    <td>
                      <b>{t.uraian}</b>
                    </td>
                    <td>
                      <span className={t.arah === "masuk" ? "type income" : "type expense"}>{t.arah === "masuk" ? "Pemasukan" : "Pengeluaran"}</span>
                    </td>
                    <td>{t.metode}</td>
                    <td className={t.arah === "masuk" ? "amount in" : "amount out"}>
                      {t.arah === "masuk" ? "+" : "−"}
                      {rupiah(t.nominal)}
                    </td>
                    <td>
                      <button
                        aria-label="Lihat & ubah"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetail(t.id);
                        }}
                      >
                        <PIcon name="edit" size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="nk-kartu-list nk-hanya-hp">
            {Object.entries(perTanggal).map(([tgl, daftar]) => (
              <div key={tgl} className="nk-kartu-grup">
                <h4>{tanggalPanjang(tgl)}</h4>
                {daftar.map((t) => (
                  <button key={t.id} className="nk-kartu-tx" onClick={() => setDetail(t.id)}>
                    <span>
                      <b>{t.uraian}</b>
                      <small>
                        {t.arah === "masuk" ? "Pemasukan" : "Pengeluaran"} · {t.metode}
                      </small>
                    </span>
                    <strong className={`nominal ${t.arah}`}>
                      {t.arah === "masuk" ? "+" : "−"}
                      {rupiah(t.nominal)}
                    </strong>
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className="pagination">
            <span>
              Menampilkan {(halaman - 1) * PER_HALAMAN + 1}–{Math.min(hasil.length, halaman * PER_HALAMAN)} dari {hasil.length.toLocaleString("id-ID")} transaksi
            </span>
            <div>
              <button onClick={() => setHalaman(Math.max(1, halaman - 1))} disabled={halaman === 1} aria-label="Sebelumnya">
                ‹
              </button>
              {nomorHalaman.map((n, i) => (
                <span key={n} className="fg-halaman-no">
                  {i > 0 && n - nomorHalaman[i - 1] > 1 && <em>…</em>}
                  <button className={n === halaman ? "active" : ""} onClick={() => setHalaman(n)}>
                    {n}
                  </button>
                </span>
              ))}
              <button onClick={() => setHalaman(Math.min(totalHalaman, halaman + 1))} disabled={halaman === totalHalaman} aria-label="Berikutnya">
                ›
              </button>
            </div>
          </div>
        </>
      )}
      {detail && <DetailTransaksi id={detail} onTutup={() => setDetail(null)} />}
    </div>
  );
}
