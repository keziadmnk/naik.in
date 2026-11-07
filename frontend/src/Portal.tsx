import { useState, type FormEvent, type ReactNode } from "react";
import { api } from "./api";
import { AppShell } from "./app/AppShell";
import { Akun } from "./app/Akun";
import { Beranda } from "./app/Beranda";
import { Keuangan } from "./app/keuangan/Keuangan";
import { Pengaturan } from "./app/Pengaturan";
import { SimulasiKur } from "./app/kur/SimulasiKur";
import { LabelProduk } from "./app/label/LabelProduk";
import { Laporan } from "./app/laporan/HalamanLaporan";
import { PIcon, type PIconName } from "./components/icons";
import { goTo, type AppRoute } from "./routes";
import { tandaiMasuk, useToko } from "./state/store";

export { goTo, type AppRoute };

function PortalLogo({ dark = false }: { dark?: boolean }) {
  return (
    <button className={`portal-logo ${dark ? "dark" : ""}`} onClick={() => goTo("landing")}>
      NAIK<span>.IN</span>
      <i />
    </button>
  );
}

function Field({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  required = false,
  error,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);
  const password = type === "password";
  return (
    <label className={`form-field ${error ? "has-error" : ""}`}>
      <span>{label}</span>
      <div className="field-control">
        <input
          type={password && visible ? "text" : type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          required={required}
        />
        {password && (
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            aria-label="Tampilkan kata sandi"
          >
            <PIcon name={visible ? "eyeoff" : "eye"} size={17} />
          </button>
        )}
      </div>
      {error && <small>{error}</small>}
    </label>
  );
}

function MiniChart({ down = false }: { down?: boolean }) {
  return (
    <svg className="mini-chart" viewBox="0 0 160 55" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`miniFill${down}`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#5B65DC" stopOpacity=".25" />
          <stop offset="1" stopColor="#5B65DC" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#miniFill${down})`}
        d={
          down
            ? "M0 14 C30 18 40 38 70 30 S110 42 160 37 V55H0Z"
            : "M0 42 C25 39 35 22 58 29 S90 34 112 18 S142 16 160 8 V55H0Z"
        }
      />
      <path
        className="mini-line"
        d={
          down
            ? "M0 14 C30 18 40 38 70 30 S110 42 160 37"
            : "M0 42 C25 39 35 22 58 29 S90 34 112 18 S142 16 160 8"
        }
      />
    </svg>
  );
}

function AuthVisual() {
  return (
    <div className="auth-visual">
      <div className="auth-grid" />
      <PortalLogo />
      <div className="auth-message">
        <span>
          <PIcon name="sparkle" size={13} /> AI Business Readiness
        </span>
        <h1>
          Pahami Bisnismu.
          <br />
          NAIK.IN Kelasnya
        </h1>
        <p>Know Your Business. Prepare to Grow.</p>
      </div>
      <div className="auth-dashboard">
        <div className="auth-dash-head">
          <span>Performa Keuangan</span>
          <b>6 Bulan</b>
        </div>
        <strong>Rp24.500.000</strong>
        <small>Total omzet demo</small>
        <MiniChart />
        <div className="auth-dash-stats">
          <span>
            <i />
            Pemasukan
          </span>
          <span>
            <i />
            Pengeluaran
          </span>
        </div>
      </div>
      <div className="auth-float">
        <PIcon name="sparkle" size={14} />
        <span>
          <b>Insight AI siap</b>
          <small>Arus kas tumbuh positif</small>
        </span>
      </div>
    </div>
  );
}

function AuthPage({ mode }: { mode: "login" | "register" }) {
  const login = mode === "login";
  const [email, setEmail] = useState(login ? "demo@naik.in" : "");
  const [password, setPassword] = useState(login ? "demo123456" : "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { kirim, muatUlang } = useToko();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (login) {
      setLoading(true);
      const result = await api.login(email, password);
      if (!result.ok) {
        setLoading(false);
        return setError(result.message ?? "Email atau kata sandi tidak sesuai.");
      }
      tandaiMasuk(true);
      // Mode server: semua data akun dimuat dari database
      const dariServer = await muatUlang();
      setLoading(false);
      if (!dariServer) {
        const saya = await api.me();
        if (saya.ok && saya.user) kirim({ type: "profil", profil: { namaPemilik: saya.user.name, email: saya.user.email } });
      }
      sessionStorage.setItem("naikin-demo-auth", "true");
      goTo("beranda");
    } else {
      if (!name || !email || !phone || !password || password !== confirm)
        return setError("Lengkapi formulir dan pastikan konfirmasi kata sandi sesuai.");
      if (password.length < 8) return setError("Kata sandi minimal 8 karakter.");
      if (!agreed) return setError("Setujui Syarat dan Ketentuan untuk melanjutkan.");
      setLoading(true);
      const result = await api.register(name, email, password);
      if (!result.ok) {
        setLoading(false);
        return setError(result.message ?? "Pendaftaran gagal.");
      }
      tandaiMasuk(true);
      const dariServer = await muatUlang();
      setLoading(false);
      if (!dariServer) {
        // Mode lokal: akun baru mulai tanpa catatan
        kirim({ type: "reset" });
        kirim({ type: "demo", demo: { akunKosong: true } });
      }
      kirim({ type: "profil", profil: { namaPemilik: name, email, telepon: phone } });
      sessionStorage.setItem("naikin-demo-auth", "true");
      goTo("onboarding");
    }
  };

  return (
    <main className="auth-page">
      <AuthVisual />
      <section className="auth-form-wrap">
        <button className="auth-back" onClick={() => goTo("landing")}>
          ← Kembali ke beranda
        </button>
        <form className="auth-form" onSubmit={submit}>
          <div className="mobile-auth-logo">
            <PortalLogo dark />
          </div>
          <span className="auth-kicker">{login ? "Masuk ke akun" : "Mulai bersama NAIK.IN"}</span>
          <h2>{login ? "Selamat Datang Kembali!" : "Buat Akun NAIK.IN"}</h2>
          <p>
            {login
              ? "Masuk dan lanjutkan perjalanan bisnismu bersama NAIK.IN."
              : "Mulai pahami kondisi dan kesiapan usahamu bersama AI."}
          </p>
          {error && (
            <div className="form-alert">
              <PIcon name="alert" size={17} />
              {error}
            </div>
          )}
          {!login && (
            <Field
              label="Nama Lengkap"
              placeholder="Masukkan nama lengkap"
              value={name}
              onChange={setName}
              required
            />
          )}
          <Field
            label="Email"
            type="email"
            placeholder="nama@email.com"
            value={email}
            onChange={setEmail}
            required
          />
          {!login && (
            <Field
              label="Nomor WhatsApp"
              type="tel"
              placeholder="08xxxxxxxxxx"
              value={phone}
              onChange={setPhone}
              required
            />
          )}
          <Field
            label="Kata Sandi"
            type="password"
            placeholder="Minimal 8 karakter"
            value={password}
            onChange={setPassword}
            required
          />
          {!login && (
            <Field
              label="Konfirmasi Kata Sandi"
              type="password"
              placeholder="Ulangi kata sandi"
              value={confirm}
              onChange={setConfirm}
              required
            />
          )}
          {login ? (
            <div className="form-options">
              <label>
                <input type="checkbox" defaultChecked /> Ingat Saya
              </label>
              <button type="button">Lupa Kata Sandi?</button>
            </div>
          ) : (
            <label className="terms">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                Saya menyetujui <b>Syarat dan Ketentuan</b> serta <b>Kebijakan Privasi.</b>
              </span>
            </label>
          )}
          <button className="portal-primary auth-submit" type="submit" disabled={loading}>
            {loading ? "Memproses..." : login ? "Masuk" : "Daftar Sekarang"}
            <PIcon name="arrow" size={17} />
          </button>
          {login && (
            <div className="demo-credentials">
              <span>Akun demo</span>
              <b>demo@naik.in</b>
              <b>Kata sandi: demo123456</b>
            </div>
          )}
          <div className="auth-switch">
            {login ? "Belum punya akun?" : "Sudah punya akun?"}
            <button type="button" onClick={() => goTo(login ? "register" : "login")}>
              {login ? "Daftar" : "Masuk"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

const SLIDE_TUR: { ikon: PIconName; judul: string; teks: string; poin: string[] }[] = [
  {
    ikon: "wallet",
    judul: "Keuangan",
    teks: "Catat uang masuk dan keluar dengan scan foto, unggah file, atau ketik manual.",
    poin: ["Semua hasil diperiksa dulu sebelum disimpan", "Rekap kas mingguan & bulanan otomatis", "Ringkasan AI dari angka yang dihitung sistem"],
  },
  {
    ikon: "calc",
    judul: "Simulasi Kesiapan KUR",
    teks: "Coba rencana pinjaman dan lihat dampaknya ke kas usahamu sebelum mengajukan.",
    poin: ["Geser plafon & tenor pinjaman", "Uji kas saat minggu sedang sepi"],
  },
  {
    ikon: "tag",
    judul: "Label Produk",
    teks: "Periksa apakah kemasanmu sudah memuat keterangan wajib label pangan olahan.",
    poin: ["Cek 9 keterangan wajib label BPOM", "Saran perbaikan yang mudah diikuti"],
  },
  {
    ikon: "report",
    judul: "Laporan",
    teks: "Rangkum kondisi usaha 6 bulan dalam satu dokumen rapi yang siap dicetak.",
    poin: ["Rekap arus kas & laba", "Bisa diunduh dan dibagikan"],
  },
];

function TurAplikasi({ onSelesai }: { onSelesai: () => void }) {
  const [i, setI] = useState(0);
  const slide = SLIDE_TUR[i];
  const terakhir = i === SLIDE_TUR.length - 1;
  return (
    <section className="onboarding-shell nk-tur" aria-label="Kenalan dengan NAIK.IN">
      <div className="onboarding-heading">
        <span>
          Kenalan dulu · {i + 1} dari {SLIDE_TUR.length}
        </span>
        <h1>Empat menu untuk usahamu</h1>
      </div>
      <div className="onboarding-card nk-tur-kartu">
        <span className="nk-tur-ikon">
          <PIcon name={slide.ikon} size={30} />
        </span>
        <h2>{slide.judul}</h2>
        <p>{slide.teks}</p>
        <ul>
          {slide.poin.map((p) => (
            <li key={p}>
              <PIcon name="check" size={14} /> {p}
            </li>
          ))}
        </ul>
        <div className="nk-tur-titik" role="tablist" aria-label="Slide">
          {SLIDE_TUR.map((s, k) => (
            <button key={s.judul} role="tab" aria-selected={k === i} aria-label={`Slide ${k + 1}: ${s.judul}`} className={k === i ? "aktif" : ""} onClick={() => setI(k)} />
          ))}
        </div>
        <div className="onboarding-actions">
          <button className="portal-secondary" onClick={onSelesai}>
            Lewati
          </button>
          {i > 0 && (
            <button className="portal-secondary" onClick={() => setI(i - 1)}>
              Kembali
            </button>
          )}
          <button className="portal-primary" onClick={() => (terakhir ? onSelesai() : setI(i + 1))}>
            {terakhir ? "Isi profil usaha" : "Lanjut"} <PIcon name="arrow" size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

function Onboarding() {
  const { profil, turSelesai, kirim } = useToko();
  const [step, setStep] = useState(1);
  const [tur, setTur] = useState(!turSelesai);
  const [business, setBusiness] = useState({
    name: profil.namaUsaha,
    category: profil.kategoriUsaha,
    date: profil.mulaiUsaha,
    location: profil.kota,
  });
  const simpanProfil = () =>
    kirim({ type: "profil", profil: { namaUsaha: business.name, kategoriUsaha: business.category, mulaiUsaha: business.date, kota: business.location } });
  if (tur)
    return (
      <main className="onboarding-page">
        <header>
          <PortalLogo dark />
          <button onClick={() => goTo("login")}>Keluar</button>
        </header>
        <TurAplikasi
          onSelesai={() => {
            kirim({ type: "turSelesai" });
            setTur(false);
          }}
        />
      </main>
    );
  return (
    <main className="onboarding-page">
      <header>
        <PortalLogo dark />
        <button onClick={() => goTo("login")}>Keluar</button>
      </header>
      <section className="onboarding-shell">
        <div className="onboarding-heading">
          <span>Langkah {step} dari 3</span>
          <h1>Siapkan profil usahamu</h1>
          <p>Informasi ini membantu NAIK.IN memberikan pengalaman analisis yang lebih relevan.</p>
        </div>
        <div className="stepper">
          {[1, 2, 3].map((item) => (
            <div className={item <= step ? "active" : ""} key={item}>
              <i>{item < step ? <PIcon name="check" size={14} /> : item}</i>
              <span>{["Profil Usaha", "Kondisi Pencatatan", "Mulai Analisis"][item - 1]}</span>
            </div>
          ))}
        </div>
        <div className="onboarding-card">
          {step === 1 && (
            <div className="onboarding-content">
              <h2>Profil Usaha</h2>
              <p>Ceritakan sedikit tentang usaha yang sedang kamu jalankan.</p>
              <div className="form-grid">
                <Field
                  label="Nama Usaha"
                  value={business.name}
                  onChange={(value) => setBusiness({ ...business, name: value })}
                />
                <label className="form-field">
                  <span>Kategori Usaha</span>
                  <select
                    value={business.category}
                    onChange={(e) => setBusiness({ ...business, category: e.target.value })}
                  >
                    <option>Makanan & Minuman</option>
                    <option>Perdagangan</option>
                    <option>Jasa</option>
                    <option>Kerajinan</option>
                  </select>
                </label>
                <Field
                  label="Tanggal Mulai Usaha"
                  type="date"
                  value={business.date}
                  onChange={(value) => setBusiness({ ...business, date: value })}
                />
                <Field
                  label="Lokasi Usaha"
                  value={business.location}
                  onChange={(value) => setBusiness({ ...business, location: value })}
                />
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="onboarding-content">
              <h2>Kondisi Pencatatan</h2>
              <p>Pilih jawaban yang paling sesuai. Kamu dapat mengubahnya nanti.</p>
              <div className="choice-group">
                <label>Metode pembayaran yang digunakan</label>
                <div className="choice-grid">
                  {["Tunai", "Transfer Bank", "QRIS", "Marketplace"].map((item) => (
                    <button className="selected" key={item}>
                      <i>
                        <PIcon name="check" size={13} />
                      </i>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div className="question-row">
                <span>
                  <b>Apakah rekening pribadi dan usaha dipisahkan?</b>
                  <small>Membantu analisis arus kas lebih akurat.</small>
                </span>
                <div>
                  <button>Belum</button>
                  <button className="selected">Sudah</button>
                </div>
              </div>
              <div className="question-row">
                <span>
                  <b>Apakah kamu memiliki buku kas atau file transaksi?</b>
                  <small>Data dapat diunggah setelah onboarding.</small>
                </span>
                <div>
                  <button>Tidak</button>
                  <button className="selected">Ya</button>
                </div>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="onboarding-content final-step">
              <div className="success-orb">
                <PIcon name="sparkle" size={28} />
              </div>
              <h2>Profil usahamu siap!</h2>
              <p>
                Kamu bisa langsung menambahkan data keuangan untuk mendapatkan insight pertama, atau
                menjelajahi dashboard terlebih dahulu.
              </p>
              <div className="start-options">
                <button onClick={() => goTo("keuangan")}>
                  <span>
                    <PIcon name="upload" />
                  </span>
                  <b>Mulai Input Keuangan</b>
                  <small>Unggah catatan atau input manual</small>
                  <PIcon name="arrow" />
                </button>
                <button onClick={() => goTo("beranda")}>
                  <span>
                    <PIcon name="grid" />
                  </span>
                  <b>Lewati untuk Sekarang</b>
                  <small>Jelajahi dashboard NAIK.IN</small>
                  <PIcon name="arrow" />
                </button>
              </div>
            </div>
          )}
          <div className="onboarding-actions">
            {step > 1 && (
              <button className="portal-secondary" onClick={() => setStep(step - 1)}>
                Kembali
              </button>
            )}
            {step < 3 && (
              <button
                className="portal-primary"
                onClick={() => {
                  if (step === 1) simpanProfil();
                  setStep(step + 1);
                }}
              >
                Lanjutkan <PIcon name="arrow" size={16} />
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export function PortalRouter({ route, sub }: { route: AppRoute; sub: string | null }) {
  if (route === "login" || route === "register") return <AuthPage mode={route} />;
  if (route === "onboarding") return <Onboarding />;
  const pages: Partial<Record<AppRoute, ReactNode>> = {
    beranda: <Beranda />,
    keuangan: <Keuangan sub={sub} />,
    kur: <SimulasiKur />,
    label: <LabelProduk sub={sub} />,
    laporan: <Laporan />,
    akun: <Akun />,
    pengaturan: <Pengaturan />,
  };
  return <AppShell route={route}>{pages[route] ?? <Beranda />}</AppShell>;
}
