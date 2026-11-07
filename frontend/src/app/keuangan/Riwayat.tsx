import { useMemo, useState } from "react";
import { PIcon } from "../../components/icons";
import { Kosong, Panel } from "../../components/ui";
import { kategoriMap } from "../../data/categories";
import { METODE, type Transaksi } from "../../data/types";
import { NAMA_JENIS } from "../../lib/findings";
import { rupiah, tanggal, tanggalPanjang } from "../../lib/format";
import { useToko } from "../../state/store";

const LABEL_SUMBER: Record<Transaksi["sumber"], string> = {
  contoh: "Data contoh",
  manual: "Input manual",
  unggah_file: "Unggah file",
  scan_foto: "Scan foto",
};

export function BadgeStatus({ perlu }: { perlu: boolean }) {
  return perlu ? (
    <span className="nk-badge kuning">
      <PIcon name="alert" size={12} /> Perlu dicek
    </span>
  ) : (
    <span className="nk-badge hijau">
      <PIcon name="check" size={12} /> Terkonfirmasi
    </span>
  );
}

export function DetailTransaksi({ id, onTutup }: { id: string; onTutup: () => void }) {
  const { transaksi, kategori, temuan, perluDicek, kirim } = useToko();
  const [hapus, setHapus] = useState(false);
  const t = transaksi.find((x) => x.id === id);
  if (!t) return null;
  const peta = kategoriMap(kategori);
  const terkait = temuan.filter((f) => f.transaksiIds.includes(t.id));
  return (
    <Panel judul="Detail transaksi" onTutup={onTutup}>
      <div className="nk-detail">
        <span className={`nk-detail-nominal ${t.arah}`}>
          {t.arah === "masuk" ? "+" : "−"}
          {rupiah(t.nominal)}
        </span>
        <h4>{t.uraian}</h4>
        <BadgeStatus perlu={perluDicek.has(t.id)} />
        <dl>
          <dt>Tanggal</dt>
          <dd>{tanggalPanjang(t.tanggal)}</dd>
          <dt>Jenis</dt>
          <dd>{t.arah === "masuk" ? "Uang masuk" : "Uang keluar"}</dd>
          <dt>Kategori</dt>
          <dd>
            <select value={t.kategoriId} onChange={(e) => kirim({ type: "ubahTransaksi", id: t.id, perubahan: { kategoriId: e.target.value } })} aria-label="Ubah kategori">
              {kategori
                .filter((k) => k.arah === t.arah)
                .map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
            </select>
          </dd>
          <dt>Metode</dt>
          <dd>{t.metode}</dd>
          <dt>Sumber</dt>
          <dd>{LABEL_SUMBER[t.sumber]}</dd>
          <dt>Kelompok</dt>
          <dd>{peta[t.kategoriId]?.kelompok === "pribadi" ? "Tidak dihitung ke laba usaha" : "Dihitung ke laba usaha"}</dd>
        </dl>
        <div className="nk-alasan">
          <b>
            <PIcon name="sparkle" size={14} /> Alasan deteksi AI
          </b>
          {terkait.length ? (
            terkait.map((f) => (
              <p key={f.id}>
                <span className="nk-badge kuning">{NAMA_JENIS[f.jenis]}</span> {f.alasan}
              </p>
            ))
          ) : (
            <p>Tidak ada yang janggal: kategori, tanggal, dan nominal sesuai pola catatan sebelumnya.</p>
          )}
        </div>
        {hapus ? (
          <div className="nk-konfirmasi-baris">
            <span>Hapus transaksi ini dari riwayat?</span>
            <button className="nk-btn sekunder kecil" onClick={() => setHapus(false)}>
              Batal
            </button>
            <button
              className="nk-btn bahaya kecil"
              onClick={() => {
                kirim({ type: "hapusTransaksi", id: t.id });
                onTutup();
              }}
            >
              Hapus
            </button>
          </div>
        ) : (
          <button className="nk-btn hantu bahaya-teks" onClick={() => setHapus(true)}>
            <PIcon name="trash" size={15} /> Hapus transaksi
          </button>
        )}
      </div>
    </Panel>
  );
}

type Filter = { cari: string; dari: string; sampai: string; arah: "" | "masuk" | "keluar"; kategori: string; metode: string; status: "" | "ok" | "cek" };
const FILTER_AWAL: Filter = { cari: "", dari: "", sampai: "", arah: "", kategori: "", metode: "", status: "" };

export function Riwayat() {
  const { transaksi, kategori, perluDicek } = useToko();
  const [f, setF] = useState<Filter>(FILTER_AWAL);
  const [bukaFilter, setBukaFilter] = useState(false);
  const [batas, setBatas] = useState(40);
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
          (!f.metode || t.metode === f.metode) &&
          (!f.status || (f.status === "cek") === perluDicek.has(t.id)),
      )
      .reverse();
  }, [transaksi, f, perluDicek]);

  const aktif = Object.entries(f).filter(([k, v]) => k !== "cari" && v).length;
  const tampil = hasil.slice(0, batas);
  const perTanggal = tampil.reduce<Record<string, Transaksi[]>>((g, t) => ((g[t.tanggal] = [...(g[t.tanggal] ?? []), t]), g), {});

  return (
    <div className="nk-riwayat">
      <div className="nk-toolbar">
        <label className="nk-cari">
          <PIcon name="search" size={16} />
          <input value={f.cari} onChange={(e) => setF({ ...f, cari: e.target.value })} placeholder="Cari uraian atau nominal" aria-label="Cari transaksi" />
        </label>
        <button className={`nk-btn sekunder ${bukaFilter ? "aktif" : ""}`} onClick={() => setBukaFilter(!bukaFilter)} aria-expanded={bukaFilter}>
          <PIcon name="filter" size={16} /> Filter{aktif ? ` (${aktif})` : ""}
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
            Masuk/keluar
            <select value={f.arah} onChange={(e) => setF({ ...f, arah: e.target.value as Filter["arah"] })}>
              <option value="">Semua</option>
              <option value="masuk">Masuk</option>
              <option value="keluar">Keluar</option>
            </select>
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
          <label>
            Status
            <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Filter["status"] })}>
              <option value="">Semua</option>
              <option value="ok">Terkonfirmasi</option>
              <option value="cek">Perlu dicek</option>
            </select>
          </label>
          {aktif > 0 && (
            <button className="nk-btn hantu kecil" onClick={() => setF({ ...FILTER_AWAL, cari: f.cari })}>
              Hapus filter
            </button>
          )}
        </div>
      )}
      <p className="nk-muted kecil">{hasil.length.toLocaleString("id-ID")} transaksi</p>

      {hasil.length === 0 ? (
        <Kosong ikon="search" judul="Tidak ada transaksi" teks={transaksi.length ? "Coba ubah kata kunci atau filter." : "Riwayat masih kosong. Catat transaksi pertamamu di panel Catat."} />
      ) : (
        <>
          <div className="nk-tabel-wrap nk-hanya-laptop">
            <table className="nk-tabel">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Uraian</th>
                  <th>Kategori</th>
                  <th>Metode</th>
                  <th>Status</th>
                  <th className="kanan">Nominal</th>
                </tr>
              </thead>
              <tbody>
                {tampil.map((t) => (
                  <tr key={t.id} className="bisa-klik" onClick={() => setDetail(t.id)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setDetail(t.id)}>
                    <td className="nowrap">{tanggal(t.tanggal)}</td>
                    <td>{t.uraian}</td>
                    <td>{peta[t.kategoriId]?.nama ?? t.kategoriId}</td>
                    <td>{t.metode}</td>
                    <td>
                      <BadgeStatus perlu={perluDicek.has(t.id)} />
                    </td>
                    <td className={`kanan nowrap nominal ${t.arah}`}>
                      {t.arah === "masuk" ? "+" : "−"}
                      {rupiah(t.nominal)}
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
                        {peta[t.kategoriId]?.nama} · {t.metode}
                      </small>
                      <BadgeStatus perlu={perluDicek.has(t.id)} />
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
          {hasil.length > batas && (
            <button className="nk-btn sekunder penuh" onClick={() => setBatas(batas + 60)}>
              Tampilkan lebih banyak ({(hasil.length - batas).toLocaleString("id-ID")} lagi)
            </button>
          )}
        </>
      )}
      {detail && <DetailTransaksi id={detail} onTutup={() => setDetail(null)} />}
    </div>
  );
}
