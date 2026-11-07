import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { PIcon, type PIconName } from "../components/icons";
import { Modal } from "../components/ui";
import { api } from "../api";
import { tandaiMasuk, useToko } from "../state/store";
import { goTo, type AppRoute } from "../routes";

// ---------------------------------------------------------------------------
// Permintaan "Catat" (dari tombol + di HP, navigasi cepat Beranda, temuan, dll.)
// ---------------------------------------------------------------------------

export type ModeCatat = "scan" | "unggah" | "manual";
export type PermintaanCatat = { mode: ModeCatat; tanggal?: string };

const KonteksCatat = createContext<{
  permintaan: PermintaanCatat | null;
  minta: (p: PermintaanCatat) => void;
  selesai: () => void;
}>({ permintaan: null, minta: () => {}, selesai: () => {} });

export const useCatat = () => useContext(KonteksCatat);

// ---------------------------------------------------------------------------

type ItemNav = { route: AppRoute; label: string; pendek: string; icon: PIconName };

/** Tepat lima menu, berurutan. Pengaturan tidak ada di sini (hanya lewat dropdown avatar). */
export const NAV: ItemNav[] = [
  { route: "beranda", label: "Beranda", pendek: "Beranda", icon: "home" },
  { route: "keuangan", label: "Keuangan", pendek: "Keuangan", icon: "wallet" },
  { route: "kur", label: "Simulasi Kesiapan KUR", pendek: "Simulasi KUR", icon: "calc" },
  { route: "label", label: "Label Produk", pendek: "Label", icon: "tag" },
  { route: "laporan", label: "Laporan", pendek: "Laporan", icon: "report" },
];

const JUDUL: Partial<Record<AppRoute, string>> = {
  beranda: "Beranda",
  keuangan: "Keuangan",
  kur: "Simulasi Kesiapan KUR",
  label: "Label Produk",
  laporan: "Laporan",
  akun: "Akun",
  pengaturan: "Pengaturan",
};

function Logo() {
  return (
    <button className="nk-logo" onClick={() => goTo("beranda")} aria-label="NAIK.IN — ke Beranda">
      NAIK<span>.IN</span>
      <i />
    </button>
  );
}

const inisial = (nama: string) =>
  nama
    .replace(/^(ibu|bapak|pak|bu)\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((k) => k[0]?.toUpperCase() ?? "")
    .join("");

function MenuAkun({ onKeluar }: { onKeluar: () => void }) {
  const { profil } = useToko();
  const [buka, setBuka] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!buka) return;
    const tutup = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setBuka(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setBuka(false);
    document.addEventListener("mousedown", tutup);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", tutup);
      document.removeEventListener("keydown", esc);
    };
  }, [buka]);
  const pilih = (aksi: () => void) => () => {
    setBuka(false);
    aksi();
  };
  return (
    <div className="nk-akun" ref={ref}>
      <button className="nk-avatar-btn" onClick={() => setBuka(!buka)} aria-haspopup="menu" aria-expanded={buka} aria-label="Menu akun">
        <span className="nk-avatar">{inisial(profil.namaPemilik)}</span>
        <span className="nk-avatar-nama">
          <b>{profil.namaPemilik}</b>
          <small>{profil.namaUsaha}</small>
        </span>
        <PIcon name="chevronDown" size={15} />
      </button>
      {buka && (
        <div className="nk-dropdown" role="menu">
          <div className="nk-dropdown-head">
            <span className="nk-avatar besar">{inisial(profil.namaPemilik)}</span>
            <div>
              <b>{profil.namaPemilik}</b>
              <span>{profil.namaUsaha}</span>
              <small>{profil.email}</small>
            </div>
          </div>
          <button role="menuitem" onClick={pilih(() => goTo("akun"))}>
            <PIcon name="user" size={17} />
            <span>
              Akun
              <small>Profil usaha dan data akun</small>
            </span>
          </button>
          <button role="menuitem" onClick={pilih(() => goTo("pengaturan"))}>
            <PIcon name="settings" size={17} />
            <span>
              Pengaturan
              <small>Biaya rutin, kategori, pengingat, data</small>
            </span>
          </button>
          <hr />
          <button role="menuitem" className="keluar" onClick={pilih(onKeluar)}>
            <PIcon name="logout" size={17} />
            <span>Keluar</span>
          </button>
        </div>
      )}
    </div>
  );
}

function Pengingat() {
  const { temuan, pengingat } = useToko();
  const [buka, setBuka] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!buka) return;
    const tutup = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setBuka(false);
    document.addEventListener("mousedown", tutup);
    return () => document.removeEventListener("mousedown", tutup);
  }, [buka]);
  const perluDicek = temuan.filter((t) => t.jenis !== "hari_belum_dicatat").length;
  const hariKosong = temuan.filter((t) => t.jenis === "hari_belum_dicatat").length;
  const item = [
    perluDicek > 0 && { ikon: "alert" as const, teks: `${perluDicek} catatan perlu dicek`, aksi: () => goTo("keuangan", "perlu-dicek") },
    hariKosong > 0 && { ikon: "calendar" as const, teks: `${hariKosong} rentang hari belum dicatat`, aksi: () => goTo("keuangan", "perlu-dicek") },
    pengingat.harian && { ikon: "bell" as const, teks: `Pengingat catat harian pukul ${pengingat.jam.replace(":", ".")}`, aksi: () => goTo("pengaturan") },
  ].filter(Boolean) as { ikon: PIconName; teks: string; aksi: () => void }[];
  const ada = perluDicek + hariKosong > 0;
  return (
    <div className="nk-akun" ref={ref}>
      <button className="nk-icon-btn nk-lonceng" onClick={() => setBuka(!buka)} aria-label={`Pengingat${ada ? " (ada yang baru)" : ""}`} aria-expanded={buka}>
        <PIcon name="bell" size={19} />
        {ada && <i />}
      </button>
      {buka && (
        <div className="nk-dropdown nk-dropdown-pengingat" role="menu">
          <div className="nk-dropdown-judul">Pengingat</div>
          {item.length === 0 && <p className="nk-muted">Tidak ada pengingat.</p>}
          {item.map((i) => (
            <button
              key={i.teks}
              role="menuitem"
              onClick={() => {
                setBuka(false);
                i.aksi();
              }}
            >
              <PIcon name={i.ikon} size={17} />
              <span>{i.teks}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LembarCatat({ onPilih, onTutup }: { onPilih: (m: ModeCatat) => void; onTutup: () => void }) {
  const opsi: { mode: ModeCatat; ikon: PIconName; judul: string; teks: string }[] = [
    { mode: "scan", ikon: "camera", judul: "Scan foto", teks: "Foto nota atau buku kas" },
    { mode: "unggah", ikon: "upload", judul: "Unggah file", teks: "CSV, XLSX, PDF, JPG, PNG" },
    { mode: "manual", ikon: "pen", judul: "Input manual", teks: "Ketik transaksi satu per satu" },
  ];
  return (
    <div className="nk-overlay nk-overlay-lembar" onMouseDown={onTutup}>
      <div className="nk-lembar" role="dialog" aria-modal="true" aria-label="Catat transaksi" onMouseDown={(e) => e.stopPropagation()}>
        <i className="nk-lembar-pegangan" />
        <h3>Catat transaksi</h3>
        <p>Semua hasil akan diperiksa dulu sebelum disimpan.</p>
        {opsi.map((o) => (
          <button key={o.mode} onClick={() => onPilih(o.mode)}>
            <span>
              <PIcon name={o.ikon} size={20} />
            </span>
            <span>
              <b>{o.judul}</b>
              <small>{o.teks}</small>
            </span>
            <PIcon name="chevronRight" size={16} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function AppShell({ route, children }: { route: AppRoute; children: ReactNode }) {
  const { demo, kirim, sinkron, server, muatUlang } = useToko();
  const [konfirmasiKeluar, setKonfirmasiKeluar] = useState(false);
  const [lembar, setLembar] = useState(false);
  const [permintaan, setPermintaan] = useState<PermintaanCatat | null>(null);
  const [keluarProses, setKeluarProses] = useState(false);

  const minta = (p: PermintaanCatat) => {
    setPermintaan(p);
    if (route !== "keuangan") goTo("keuangan");
  };

  const keluar = async () => {
    setKeluarProses(true);
    await api.logout();
    sessionStorage.removeItem("naikin-demo-auth");
    tandaiMasuk(false);
    kirim({ type: "keluar" });
    setKeluarProses(false);
    setKonfirmasiKeluar(false);
    goTo("login");
  };

  const adaFab = route === "beranda" || route === "keuangan";

  return (
    <KonteksCatat.Provider value={{ permintaan, minta, selesai: () => setPermintaan(null) }}>
      <div className="nk-shell">
        <aside className="nk-sidebar" aria-label="Navigasi utama">
          <div className="nk-sidebar-logo">
            <Logo />
          </div>
          <nav>
            {NAV.map((item) => (
              <button
                key={item.route}
                className={route === item.route ? "aktif" : ""}
                aria-current={route === item.route ? "page" : undefined}
                title={item.label}
                onClick={() => goTo(item.route)}
              >
                <PIcon name={item.icon} size={19} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="nk-main">
          <header className="nk-topbar">
            <div className="nk-topbar-judul">
              <span className="nk-logo-hp">
                <Logo />
              </span>
              <h1>{JUDUL[route] ?? "NAIK.IN"}</h1>
            </div>
            <div className="nk-topbar-aksi">
              <Pengingat />
              <MenuAkun onKeluar={() => setKonfirmasiKeluar(true)} />
            </div>
          </header>
          {demo.modeOffline && (
            <div className="nk-offline" role="status">
              <PIcon name="bolt" size={15} />
              Mode offline: catatan disimpan di perangkat, fitur AI & scan otomatis dinonaktifkan sementara.
            </div>
          )}
          {sinkron.status === "galat" && (
            <div className="nk-sinkron-galat" role="alert">
              <PIcon name="alert" size={15} />
              <span>
                Perubahan terakhir gagal disimpan ke database: {sinkron.pesan}
              </span>
              <button className="nk-btn sekunder kecil" onClick={() => void muatUlang()}>
                <PIcon name="refresh" size={14} /> Muat ulang dari server
              </button>
            </div>
          )}
          {!server && !demo.modeOffline && (
            <div className="nk-mode-lokal" role="status">
              <PIcon name="info" size={14} /> Mode lokal: data contoh disimpan di browser ini saja, belum tersambung ke database.
            </div>
          )}
          <main className="nk-konten">{children}</main>
        </div>

        <nav className="nk-bottomnav" aria-label="Navigasi utama">
          {NAV.map((item) => (
            <button key={item.route} className={route === item.route ? "aktif" : ""} aria-current={route === item.route ? "page" : undefined} onClick={() => goTo(item.route)}>
              <PIcon name={item.icon} size={20} />
              <span>{item.pendek}</span>
            </button>
          ))}
        </nav>
        {adaFab && (
          <button className="nk-fab" onClick={() => setLembar(true)} aria-label="Catat transaksi">
            <PIcon name="plus" size={24} />
          </button>
        )}
        {lembar && (
          <LembarCatat
            onTutup={() => setLembar(false)}
            onPilih={(mode) => {
              setLembar(false);
              minta({ mode });
            }}
          />
        )}
        {konfirmasiKeluar && (
          <Modal
            judul="Keluar dari akun?"
            onTutup={() => setKonfirmasiKeluar(false)}
            lebar={420}
            aksi={
              <>
                <button className="nk-btn sekunder" onClick={() => setKonfirmasiKeluar(false)}>
                  Batal
                </button>
                <button className="nk-btn bahaya" onClick={keluar} disabled={keluarProses}>
                  {keluarProses ? "Keluar..." : "Ya, keluar"}
                </button>
              </>
            }
          >
            <p>Catatan yang sudah dikonfirmasi tetap tersimpan. Kamu perlu masuk lagi untuk membuka dasbor.</p>
          </Modal>
        )}
      </div>
    </KonteksCatat.Provider>
  );
}
