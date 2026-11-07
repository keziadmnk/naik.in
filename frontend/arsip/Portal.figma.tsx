import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { api } from "../src/api";

export type AppRoute =
  | "login"
  | "register"
  | "onboarding"
  | "beranda"
  | "keuangan"
  | "kur"
  | "label"
  | "laporan"
  | "profil"
  | "pengaturan";

export const goTo = (route: AppRoute | "landing") => {
  window.location.hash = route === "landing" ? "#beranda" : `#/${route}`;
  window.scrollTo({ top: 0, behavior: "smooth" });
};

type PIconName =
  | "grid"
  | "wallet"
  | "calc"
  | "scan"
  | "report"
  | "bell"
  | "chevron"
  | "user"
  | "settings"
  | "logout"
  | "arrow"
  | "upload"
  | "sparkle"
  | "search"
  | "filter"
  | "more"
  | "eye"
  | "eyeoff"
  | "check"
  | "alert"
  | "plus"
  | "download"
  | "trash"
  | "edit"
  | "menu"
  | "close"
  | "calendar"
  | "lock"
  | "file";

function PIcon({ name, size = 20 }: { name: PIconName; size?: number }) {
  const paths: Record<PIconName, ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    wallet: (
      <>
        <path d="M4 7h14a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H5a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h11v4" />
        <path d="M16 13h5M17 13h.01" />
      </>
    ),
    calc: (
      <>
        <rect x="4" y="2" width="16" height="20" rx="3" />
        <path d="M8 6h8v4H8zM8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
      </>
    ),
    scan: (
      <>
        <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
        <path d="M7 12h10" />
      </>
    ),
    report: (
      <>
        <path d="M6 3h9l3 3v15H6zM14 3v4h4" />
        <path d="M9 16v-3M12 16V9M15 16v-5" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
      </>
    ),
    arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
    upload: (
      <>
        <path d="M12 16V3M7 8l5-5 5 5" />
        <path d="M4 15v5h16v-5" />
      </>
    ),
    sparkle: (
      <>
        <path d="M12 3c.4 4.2 2.8 6.6 7 7-4.2.4-6.6 2.8-7 7-.4-4.2-2.8-6.6-7-7 4.2-.4 6.6-2.8 7-7Z" />
        <path d="M19 3v4M21 5h-4" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    filter: <path d="M4 5h16l-6 7v6l-4 2v-8Z" />,
    more: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <circle cx="19" cy="12" r="1" fill="currentColor" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    eyeoff: (
      <>
        <path d="m3 3 18 18M10.6 6.2A10 10 0 0 1 12 6c6.5 0 10 6 10 6a16 16 0 0 1-2 2.6M6.2 6.2C3.4 8 2 12 2 12s3.5 6 10 6a9.7 9.7 0 0 0 3-.5" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    alert: (
      <>
        <path d="M12 3 2.5 20h19Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    download: (
      <>
        <path d="M12 3v12M7 10l5 5 5-5" />
        <path d="M4 20h16" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M9 3h6l1 4H8zM7 7l1 14h8l1-14" />
      </>
    ),
    edit: (
      <>
        <path d="m14 5 5 5M4 20l4-1 11-11-4-4L4 15Z" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4M17 3v4M3 10h18" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    file: (
      <>
        <path d="M6 3h9l3 3v15H6zM14 3v4h4M9 12h6M9 16h6" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

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

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (login) {
      setLoading(true);
      const result = await api.login(email, password);
      setLoading(false);
      if (!result.ok) return setError(result.message ?? "Email atau kata sandi tidak sesuai.");
      sessionStorage.setItem("naikin-demo-auth", "true");
      goTo("beranda");
    } else {
      if (!name || !email || !phone || !password || password !== confirm)
        return setError("Lengkapi formulir dan pastikan konfirmasi kata sandi sesuai.");
      if (password.length < 8) return setError("Kata sandi minimal 8 karakter.");
      if (!agreed) return setError("Setujui Syarat dan Ketentuan untuk melanjutkan.");
      setLoading(true);
      const result = await api.register(name, email, password);
      setLoading(false);
      if (!result.ok) return setError(result.message ?? "Pendaftaran gagal.");
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

function Onboarding() {
  const [step, setStep] = useState(1);
  const [business, setBusiness] = useState({
    name: "Kriuk Nusantara",
    category: "Makanan & Minuman",
    date: "2022-03-18",
    location: "Bandung, Jawa Barat",
  });
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
              <button className="portal-primary" onClick={() => setStep(step + 1)}>
                Lanjutkan <PIcon name="arrow" size={16} />
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

const navItems: { route: AppRoute; label: string; icon: PIconName }[] = [
  { route: "beranda", label: "Beranda", icon: "grid" },
  { route: "keuangan", label: "Keuangan", icon: "wallet" },
  { route: "kur", label: "Simulasi KUR", icon: "calc" },
  { route: "label", label: "Label Produk", icon: "scan" },
  { route: "laporan", label: "Laporan", icon: "report" },
];

const routeTitles: Record<AppRoute, string> = {
  login: "Masuk",
  register: "Daftar",
  onboarding: "Onboarding",
  beranda: "Beranda",
  keuangan: "Keuangan",
  kur: "Simulasi KUR",
  label: "Label Produk",
  laporan: "Laporan",
  profil: "Profil Akun",
  pengaturan: "Pengaturan",
};

function AppShell({ route, children }: { route: AppRoute; children: ReactNode }) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const logout = () => {
    sessionStorage.removeItem("naikin-demo-auth");
    goTo("login");
  };
  return (
    <div className="app-shell">
      <aside className={`app-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-head">
          <PortalLogo dark />
          <button onClick={() => setSidebarOpen(false)}>
            <PIcon name="close" />
          </button>
        </div>
        <nav>
          {navItems.map((item) => (
            <button
              key={item.route}
              className={route === item.route ? "active" : ""}
              onClick={() => {
                goTo(item.route);
                setSidebarOpen(false);
              }}
            >
              <PIcon name={item.icon} size={19} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-help">
          <span>
            <PIcon name="sparkle" size={17} />
          </span>
          <b>Butuh bantuan?</b>
          <p>Pelajari cara membaca insight dan laporan bisnismu.</p>
          <button>Pusat Bantuan</button>
        </div>
        <small>NAIK.IN Prototype v1.0</small>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <button className="mobile-menu" onClick={() => setSidebarOpen(true)}>
            <PIcon name="menu" />
          </button>
          <div className="page-title">
            <small>NAIK.IN / {routeTitles[route]}</small>
            <h1>{routeTitles[route]}</h1>
          </div>
          <div className="topbar-actions">
            <button className="notification">
              <PIcon name="bell" size={19} />
              <i />
            </button>
            <div className="account-wrap">
              <button className="account-button" onClick={() => setAccountOpen(!accountOpen)}>
                <span className="avatar">AN</span>
                <span>
                  <b>Andi Nugraha</b>
                  <small>Kriuk Nusantara</small>
                </span>
                <PIcon name="chevron" size={15} />
              </button>
              {accountOpen && (
                <div className="account-menu">
                  <div className="account-menu-head">
                    <span className="avatar">AN</span>
                    <div>
                      <b>Andi Nugraha</b>
                      <small>umkm@gmail.com</small>
                    </div>
                  </div>
                  <button onClick={() => goTo("profil")}>
                    <PIcon name="user" size={17} />
                    Profil Akun
                  </button>
                  <button onClick={() => goTo("pengaturan")}>
                    <PIcon name="settings" size={17} />
                    Pengaturan
                  </button>
                  <hr />
                  <button className="logout" onClick={logout}>
                    <PIcon name="logout" size={17} />
                    Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="page-content">{children}</div>
      </div>
    </div>
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

const rupiah = (value: number) => `Rp${Math.round(value).toLocaleString("id-ID")}`;

function CashflowChart({ weekly = false }: { weekly?: boolean }) {
  const data = weekly ? [62, 48, 70, 55, 82, 61, 76, 91, 69, 85, 78, 96] : [44, 57, 52, 70, 65, 86];
  const expense = weekly
    ? [40, 45, 43, 48, 52, 47, 51, 55, 50, 58, 54, 61]
    : [36, 41, 38, 48, 46, 54];
  const points = (values: number[]) =>
    values.map((v, i) => `${(i / (values.length - 1)) * 680},${180 - v * 1.45}`).join(" ");
  return (
    <div className="cash-chart">
      <div className="chart-y">
        <span>30 jt</span>
        <span>20 jt</span>
        <span>10 jt</span>
        <span>0</span>
      </div>
      <svg viewBox="0 0 680 190" preserveAspectRatio="none">
        <defs>
          <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#5B65DC" stopOpacity=".22" />
            <stop offset="1" stopColor="#5B65DC" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[30, 80, 130, 180].map((y) => (
          <line key={y} x1="0" x2="680" y1={y} y2={y} className="gridline" />
        ))}
        <polygon points={`0,190 ${points(data)} 680,190`} fill="url(#cashFill)" />
        <polyline points={points(data)} className="income-line" />
        <polyline points={points(expense)} className="expense-line" />
        {data.map((v, i) => (
          <circle
            key={i}
            cx={(i / (data.length - 1)) * 680}
            cy={180 - v * 1.45}
            r="4"
            className="income-dot"
          />
        ))}
      </svg>
      <div className="chart-x">
        {(weekly
          ? ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "M12"]
          : ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"]
        ).map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </div>
  );
}

function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <div className="inner-page-header">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function Dashboard() {
  const [period, setPeriod] = useState("6 Bulan");
  const [weekly, setWeekly] = useState(false);
  const metrics = [
    {
      label: "Total Omzet",
      value: "Rp142.500.000",
      change: "+12,8%",
      note: "vs periode sebelumnya",
    },
    { label: "Estimasi Laba Usaha", value: "Rp48.200.000", change: "33,8%", note: "margin laba" },
    {
      label: "Harga Pokok Penjualan",
      value: "Rp61.400.000",
      change: "Estimasi HPP",
      note: "data inventori 82%",
    },
    {
      label: "Total Pengeluaran Kas",
      value: "Rp94.300.000",
      change: "−4,2%",
      note: "operasional & lainnya",
    },
    {
      label: "Laba Minggu Tersepi",
      value: "Rp1.850.000",
      change: "Perlu perhatian",
      note: "12–18 Mei 2026",
      warning: true,
    },
  ];
  return (
    <>
      <div className="dashboard-welcome">
        <div>
          <span>Data demo ilustratif</span>
          <h2>
            Halo, Selamat Datang Kembali! <i>👋</i>
          </h2>
          <p>Pantau performa dan kesiapan bisnismu dalam satu tempat.</p>
        </div>
        <div className="business-meta">
          <b>Kriuk Nusantara</b>
          <span>Periode Jan–Jun 2026</span>
          <small>Terakhir diperbarui 18 Jun, 10.24</small>
        </div>
      </div>
      <div className="period-row">
        <div className="period-tabs">
          {["Bulan Ini", "3 Bulan", "6 Bulan"].map((item) => (
            <button
              className={period === item ? "active" : ""}
              onClick={() => setPeriod(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
        <button className="icon-text-button">
          <PIcon name="calendar" size={16} /> Jan–Jun 2026
        </button>
      </div>
      <div className="metric-grid">
        {metrics.map((metric, index) => (
          <article className="metric-card" key={metric.label}>
            <div className="metric-top">
              <span>{metric.label}</span>
              <i>
                <PIcon
                  name={["wallet", "sparkle", "report", "upload", "alert"][index] as PIconName}
                  size={17}
                />
              </i>
            </div>
            <strong>{metric.value}</strong>
            <div className={metric.warning ? "metric-change warning" : "metric-change"}>
              <b>{metric.change}</b>
              <span>{metric.note}</span>
            </div>
            <MiniChart down={index === 3 || index === 4} />
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
            <div className="view-toggle">
              <button className={!weekly ? "active" : ""} onClick={() => setWeekly(false)}>
                Bulanan
              </button>
              <button className={weekly ? "active" : ""} onClick={() => setWeekly(true)}>
                Mingguan
              </button>
            </div>
          </div>
          <div className="chart-legend">
            <span>
              <i className="indigo" />
              Pemasukan
            </span>
            <span>
              <i className="navy" />
              Pengeluaran
            </span>
            <span>
              <i className="lavender" />
              Arus kas bersih
            </span>
          </div>
          <CashflowChart weekly={weekly} />
        </article>
        <article className="ai-insight-panel">
          <div className="ai-panel-head">
            <span>
              <PIcon name="sparkle" size={18} />
            </span>
            <div>
              <small>Analisis berbasis data demo</small>
              <h3>NAIK.IN AI Insights</h3>
            </div>
          </div>
          <div className="insight-list">
            <div>
              <i className="positive">
                <PIcon name="check" size={13} />
              </i>
              <p>Arus kas usahamu menunjukkan tren positif.</p>
            </div>
            <div>
              <i className="attention">
                <PIcon name="alert" size={13} />
              </i>
              <p>Terdapat 3 pengeluaran yang perlu dikonfirmasi.</p>
            </div>
            <div>
              <i className="attention">
                <PIcon name="alert" size={13} />
              </i>
              <p>Performa minggu tersepi perlu diperhatikan sebelum merencanakan cicilan.</p>
            </div>
          </div>
          <button onClick={() => goTo("keuangan")}>
            Lihat Analisis Lengkap <PIcon name="arrow" size={15} />
          </button>
        </article>
      </div>
      <div className="quick-section">
        <div>
          <h3>Navigasi Cepat</h3>
          <p>Lanjutkan analisis bisnis melalui fitur utama.</p>
        </div>
        <div className="quick-grid">
          {[
            ["upload", "Upload Data Keuangan", "Tambahkan transaksi terbaru", "keuangan"],
            ["calc", "Simulasi KUR", "Uji kemampuan cicilan", "kur"],
            ["scan", "Scan Label Produk", "Periksa informasi kemasan", "label"],
            ["report", "Lihat Laporan", "Buka rangkuman analisis", "laporan"],
          ].map(([icon, title, text, route]) => (
            <button key={title} onClick={() => goTo(route as AppRoute)}>
              <i>
                <PIcon name={icon as PIconName} />
              </i>
              <span>
                <b>{title}</b>
                <small>{text}</small>
              </span>
              <PIcon name="arrow" size={16} />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

type Transaction = {
  id: number;
  date: string;
  desc: string;
  category: string;
  type: "Pemasukan" | "Pengeluaran";
  method: string;
  amount: number;
  status: string;
};
const initialTransactions: Transaction[] = [
  {
    id: 1,
    date: "18 Jun 2026",
    desc: "Penjualan QRIS",
    category: "Penjualan",
    type: "Pemasukan",
    method: "QRIS",
    amount: 2450000,
    status: "Terkonfirmasi",
  },
  {
    id: 2,
    date: "17 Jun 2026",
    desc: "Pembelian bahan baku",
    category: "Bahan baku",
    type: "Pengeluaran",
    method: "Transfer",
    amount: 875000,
    status: "Terkonfirmasi",
  },
  {
    id: 3,
    date: "16 Jun 2026",
    desc: "Transfer ke rekening pribadi",
    category: "Belum jelas",
    type: "Pengeluaran",
    method: "Transfer",
    amount: 1200000,
    status: "Perlu diperiksa",
  },
  {
    id: 4,
    date: "15 Jun 2026",
    desc: "Penjualan marketplace",
    category: "Penjualan",
    type: "Pemasukan",
    method: "Marketplace",
    amount: 3180000,
    status: "Terkonfirmasi",
  },
  {
    id: 5,
    date: "14 Jun 2026",
    desc: "Biaya pengiriman",
    category: "Operasional",
    type: "Pengeluaran",
    method: "Tunai",
    amount: 420000,
    status: "Terkonfirmasi",
  },
];

function FinancePage() {
  const [tab, setTab] = useState("Ringkasan Keuangan");
  const [transactions, setTransactions] = useState(initialTransactions);
  const [search, setSearch] = useState("");
  const [uploadStage, setUploadStage] = useState<"idle" | "scanning" | "confirm">("idle");
  const [drawer, setDrawer] = useState<Transaction | null>(null);
  const tabs = [
    "Ringkasan Keuangan",
    "Upload & Scan",
    "Riwayat Transaksi",
    "Anomali & Konfirmasi",
    "Hasil Analisis AI",
  ];
  const filtered = transactions.filter((t) => t.desc.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <PageHeader
        title="Keuangan"
        subtitle="Kelola transaksi, pahami arus kas, dan temukan insight keuangan usahamu."
      >
        <button className="portal-primary" onClick={() => setTab("Upload & Scan")}>
          <PIcon name="plus" size={16} />
          Tambah Data
        </button>
      </PageHeader>
      <div className="demo-strip">
        <PIcon name="sparkle" size={14} />
        <span>
          Data yang tampil adalah <b>data demo ilustratif</b> untuk menunjukkan cara kerja
          prototype.
        </span>
      </div>
      <div className="page-tabs">
        {tabs.map((item) => (
          <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>
            {item}
            {item === "Anomali & Konfirmasi" && <i>3</i>}
          </button>
        ))}
      </div>
      {tab === "Ringkasan Keuangan" && <FinanceSummary />}
      {tab === "Upload & Scan" && (
        <UploadScan
          stage={uploadStage}
          setStage={setUploadStage}
          onConfirm={() => {
            setUploadStage("idle");
            setTab("Riwayat Transaksi");
          }}
        />
      )}
      {tab === "Riwayat Transaksi" && (
        <TransactionHistory
          transactions={filtered}
          search={search}
          setSearch={setSearch}
          onDelete={(id) => setTransactions(transactions.filter((t) => t.id !== id))}
          onOpen={setDrawer}
        />
      )}
      {tab === "Anomali & Konfirmasi" && <Anomalies />}
      {tab === "Hasil Analisis AI" && <FinancialAnalysis />}
      {drawer && <TransactionDrawer transaction={drawer} onClose={() => setDrawer(null)} />}
    </>
  );
}

function FinanceSummary() {
  return (
    <div className="tab-content">
      <div className="summary-metrics">
        {[
          ["Total Pemasukan", "Rp142,5 jt", "+12,8%"],
          ["Total Pengeluaran", "Rp94,3 jt", "−4,2%"],
          ["Estimasi Laba", "Rp48,2 jt", "33,8% margin"],
          ["Arus Kas Bersih", "Rp48,2 jt", "+18,1%"],
          ["Saldo Kas", "Rp31,7 jt", "Tersedia"],
          ["Jumlah Transaksi", "486", "6 bulan"],
        ].map(([a, b, c]) => (
          <article key={a}>
            <span>{a}</span>
            <strong>{b}</strong>
            <small>{c}</small>
          </article>
        ))}
      </div>
      <div className="finance-chart-grid">
        <article className="panel">
          <div className="panel-title">
            <div>
              <span>Perbandingan</span>
              <h3>Pemasukan vs Pengeluaran</h3>
            </div>
            <button>
              <PIcon name="more" />
            </button>
          </div>
          <CashflowChart />
        </article>
        <article className="panel completeness">
          <div className="panel-title">
            <div>
              <span>Kualitas analisis</span>
              <h3>Kelengkapan Data Keuangan</h3>
            </div>
            <b>83%</b>
          </div>
          <div className="completion-ring">
            <div>
              <strong>5/6</strong>
              <span>bulan tersedia</span>
            </div>
          </div>
          <div className="month-dots">
            {["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"].map((m, i) => (
              <span className={i === 2 ? "missing" : ""} key={m}>
                <i>{i === 2 ? "!" : "✓"}</i>
                {m}
              </span>
            ))}
          </div>
          <p>
            Data transaksi bulan <b>Maret</b> belum lengkap. Lengkapi untuk analisis KUR penuh.
          </p>
          <button>Lengkapi data</button>
        </article>
      </div>
      <div className="three-panels">
        <article className="panel donut-panel">
          <h3>Kategori Pengeluaran</h3>
          <div className="donut-wrap">
            <div className="donut">
              <b>Rp94,3 jt</b>
              <span>Total</span>
            </div>
            <div>
              {[
                ["Bahan baku", "42%"],
                ["Operasional", "28%"],
                ["Pribadi", "12%"],
                ["Lainnya", "18%"],
              ].map((x) => (
                <span key={x[0]}>
                  <i />
                  {x[0]}
                  <b>{x[1]}</b>
                </span>
              ))}
            </div>
          </div>
        </article>
        <article className="panel trend-panel">
          <h3>Tren Finansial 6 Bulan</h3>
          <MiniChart />
          <p>Tren laba meningkat stabil dalam tiga bulan terakhir.</p>
        </article>
        <article className="panel cash-health">
          <h3>Kesehatan Arus Kas</h3>
          <div className="score-circle">
            <b>78</b>
            <span>/100</span>
          </div>
          <strong>Baik</strong>
          <p>Pertahankan rasio pengeluaran dan perkuat cadangan kas.</p>
        </article>
      </div>
    </div>
  );
}

function UploadScan({
  stage,
  setStage,
  onConfirm,
}: {
  stage: "idle" | "scanning" | "confirm";
  setStage: (v: "idle" | "scanning" | "confirm") => void;
  onConfirm: () => void;
}) {
  const [file, setFile] = useState("");
  if (stage === "scanning")
    return (
      <div className="scan-process">
        <div className="scan-preview">
          <div className="fake-document">
            <b>REKAP TRANSAKSI</b>
            {Array.from({ length: 8 }).map((_, i) => (
              <i key={i} />
            ))}
          </div>
          <span />
        </div>
        <div className="scan-progress">
          <span>NAIK.IN AI Scanner</span>
          <h3>Sedang membaca dokumen...</h3>
          <p>Jangan tutup halaman ini. Proses demo berlangsung beberapa detik.</p>
          {[
            "Membaca Dokumen",
            "Mengekstrak Transaksi",
            "Mengelompokkan Data",
            "Memeriksa Kelengkapan",
            "Memeriksa Potensi Anomali",
          ].map((x, i) => (
            <div className={i < 4 ? "done" : "active"} key={x}>
              <i>{i < 4 ? <PIcon name="check" size={13} /> : i + 1}</i>
              <span>{x}</span>
            </div>
          ))}
          <button className="portal-primary" onClick={() => setStage("confirm")}>
            Lihat Hasil Ekstraksi
          </button>
        </div>
      </div>
    );
  if (stage === "confirm")
    return (
      <div className="confirm-extraction">
        <div className="subsection-heading">
          <div>
            <span>Hasil ekstraksi demo</span>
            <h3>Konfirmasi Transaksi</h3>
            <p>
              Periksa dan edit informasi sebelum disimpan. Data dengan keyakinan rendah ditandai.
            </p>
          </div>
          <b>12 transaksi ditemukan</b>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Keterangan</th>
                <th>Pemasukan</th>
                <th>Pengeluaran</th>
                <th>Kategori</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["12/06/2026", "Penjualan Harian", "2.450.000", "—", "Penjualan", "Terdeteksi"],
                ["13/06/2026", "Beli Bahan", "—", "875.000", "Bahan baku", "Terdeteksi"],
                ["14/06/2026", "Transfer BCA", "—", "1.200.000", "Belum jelas", "Perlu verifikasi"],
              ].map((r, i) => (
                <tr key={i}>
                  {r.slice(0, 5).map((c, j) => (
                    <td key={j}>
                      <input defaultValue={c} />
                    </td>
                  ))}
                  <td>
                    <span className={i === 2 ? "status warning" : "status success"}>{r[5]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="confirm-note">
          <PIcon name="alert" size={17} />
          <span>
            1 transaksi perlu diverifikasi. NAIK.IN tidak akan menyimpannya sebagai data final tanpa
            konfirmasi.
          </span>
        </div>
        <button className="portal-primary confirm-button" onClick={onConfirm}>
          Konfirmasi & Simpan Transaksi <PIcon name="arrow" size={16} />
        </button>
      </div>
    );
  return (
    <div className="upload-layout">
      <div className="upload-main">
        <div className="subsection-heading">
          <span>AI Financial Scanner</span>
          <h3>Scan & Analisis Data Keuangan</h3>
          <p>Unggah catatan transaksi usahamu untuk dibaca dan dirapikan secara otomatis.</p>
        </div>
        <label className={`dropzone ${file ? "has-file" : ""}`}>
          <input
            type="file"
            accept=".csv,.pdf,.jpg,.jpeg,.png"
            onChange={(e) => setFile(e.target.files?.[0]?.name || "")}
          />
          {file ? (
            <>
              <i>
                <PIcon name="file" size={28} />
              </i>
              <h4>{file}</h4>
              <p>File siap diproses · Klik untuk mengganti</p>
            </>
          ) : (
            <>
              <i>
                <PIcon name="upload" size={28} />
              </i>
              <h4>Tarik dan letakkan file di sini</h4>
              <p>atau klik untuk memilih dari perangkatmu</p>
              <small>CSV, PDF, JPG, JPEG, atau PNG · Maks. 10 MB</small>
            </>
          )}{" "}
        </label>
        <div className="file-types">
          {["Buku Kas", "Mutasi Rekening", "Rekap QRIS", "Nota Penjualan", "Nota Pengeluaran"].map(
            (item) => (
              <button key={item}>
                <PIcon name="file" size={16} />
                {item}
              </button>
            ),
          )}
        </div>
        <div className="upload-actions">
          <label className="portal-secondary">
            <input type="file" onChange={(e) => setFile(e.target.files?.[0]?.name || "")} />
            <PIcon name="upload" size={16} />
            Pilih File
          </label>
          <button className="portal-primary" disabled={!file} onClick={() => setStage("scanning")}>
            <PIcon name="sparkle" size={16} />
            Scan dengan AI
          </button>
        </div>
      </div>
      <ManualTransaction />
    </div>
  );
}

function ManualTransaction() {
  const [saved, setSaved] = useState(false);
  return (
    <aside className="manual-card">
      <span>Input alternatif</span>
      <h3>Input Transaksi Manual</h3>
      <p>Tambahkan satu transaksi tanpa mengunggah dokumen.</p>
      <Field label="Tanggal Transaksi" type="date" value="2026-06-18" />
      <label className="form-field">
        <span>Jenis</span>
        <select>
          <option>Pemasukan</option>
          <option>Pengeluaran</option>
        </select>
      </label>
      <label className="form-field">
        <span>Kategori</span>
        <select>
          <option>Penjualan</option>
          <option>Bahan baku</option>
          <option>Operasional</option>
          <option>Pribadi</option>
        </select>
      </label>
      <Field label="Nominal" type="number" placeholder="0" />
      <label className="form-field">
        <span>Metode Pembayaran</span>
        <select>
          <option>QRIS</option>
          <option>Tunai</option>
          <option>Transfer Bank</option>
        </select>
      </label>
      <Field label="Keterangan" placeholder="Contoh: Penjualan harian" />
      <button className="portal-primary" onClick={() => setSaved(true)}>
        {saved ? (
          <>
            <PIcon name="check" size={15} />
            Transaksi Tersimpan
          </>
        ) : (
          <>
            <PIcon name="plus" size={15} />
            Tambah Transaksi
          </>
        )}
      </button>
    </aside>
  );
}

function TransactionHistory({
  transactions,
  search,
  setSearch,
  onDelete,
  onOpen,
}: {
  transactions: Transaction[];
  search: string;
  setSearch: (s: string) => void;
  onDelete: (id: number) => void;
  onOpen: (t: Transaction) => void;
}) {
  return (
    <div className="history-content">
      <div className="table-tools">
        <label>
          <PIcon name="search" size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari transaksi..."
          />
        </label>
        <button>
          <PIcon name="calendar" size={16} />
          1–30 Juni 2026
        </button>
        <button>
          <PIcon name="filter" size={16} />
          Semua Kategori
        </button>
        <button className="export">
          <PIcon name="download" size={16} />
          Export CSV
        </button>
      </div>
      <div className="table-wrap transaction-table">
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Deskripsi</th>
              <th>Kategori</th>
              <th>Jenis</th>
              <th>Metode</th>
              <th>Nominal</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} onClick={() => onOpen(t)}>
                <td>{t.date}</td>
                <td>
                  <b>{t.desc}</b>
                </td>
                <td>{t.category}</td>
                <td>
                  <span className={t.type === "Pemasukan" ? "type income" : "type expense"}>
                    {t.type}
                  </span>
                </td>
                <td>{t.method}</td>
                <td className={t.type === "Pemasukan" ? "amount in" : "amount out"}>
                  {t.type === "Pemasukan" ? "+" : "−"}
                  {rupiah(t.amount)}
                </td>
                <td>
                  <span
                    className={t.status.includes("Perlu") ? "status warning" : "status success"}
                  >
                    {t.status}
                  </span>
                </td>
                <td>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(t);
                    }}
                  >
                    <PIcon name="edit" size={15} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Hapus transaksi ini?")) onDelete(t.id);
                    }}
                  >
                    <PIcon name="trash" size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <span>
          Menampilkan 1–{transactions.length} dari {transactions.length} transaksi
        </span>
        <div>
          <button>‹</button>
          <button className="active">1</button>
          <button>2</button>
          <button>3</button>
          <button>›</button>
        </div>
      </div>
    </div>
  );
}

function TransactionDrawer({
  transaction,
  onClose,
}: {
  transaction: Transaction;
  onClose: () => void;
}) {
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="transaction-drawer" onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            <span>Detail transaksi</span>
            <h3>{transaction.desc}</h3>
          </div>
          <button onClick={onClose}>
            <PIcon name="close" />
          </button>
        </header>
        <div className="drawer-amount">
          <span>{transaction.type}</span>
          <strong>{rupiah(transaction.amount)}</strong>
          <small>{transaction.status}</small>
        </div>
        <div className="drawer-details">
          {[
            ["Tanggal", transaction.date],
            ["Kategori", transaction.category],
            ["Metode Pembayaran", transaction.method],
            ["Sumber Data", "Ekstraksi AI · Rekap Juni.pdf"],
            ["ID Transaksi", `TRX-2026-00${transaction.id}`],
          ].map((x) => (
            <div key={x[0]}>
              <span>{x[0]}</span>
              <b>{x[1]}</b>
            </div>
          ))}
        </div>
        <div className="audit-note">
          <PIcon name="file" size={17} />
          <span>
            <b>Catatan audit tersimpan</b>
            <small>Data hasil ekstraksi awal tetap disimpan meskipun transaksi diedit.</small>
          </span>
        </div>
        <button className="portal-primary">
          <PIcon name="edit" size={15} />
          Edit Transaksi
        </button>
      </aside>
    </div>
  );
}

function Anomalies() {
  const [resolved, setResolved] = useState<number[]>([]);
  const [split, setSplit] = useState(false);
  const items = [
    {
      title: "Kemungkinan transaksi pribadi tercampur",
      desc: "Transfer ke rekening pribadi",
      amount: "Rp1.200.000",
      reason: "Penerima transaksi tidak terkait pemasok terdaftar.",
      suggest: "Pribadi",
    },
    {
      title: "Potensi transaksi duplikat",
      desc: "Pembelian Bahan Baku",
      amount: "Rp875.000",
      reason: "Nominal dan waktu transaksi sangat berdekatan.",
      suggest: "Periksa duplikat",
    },
    {
      title: "Pengeluaran tidak biasa",
      desc: "Pembelian Peralatan",
      amount: "Rp4.800.000",
      reason: "Nominal 3,2× lebih tinggi dari rata-rata kategori.",
      suggest: "Aset usaha",
    },
  ];
  return (
    <div className="anomaly-layout">
      <div className="anomaly-intro">
        <span>
          <PIcon name="sparkle" size={18} />
        </span>
        <div>
          <h3>3 transaksi perlu ditinjau</h3>
          <p>
            Konfirmasi membantu menjaga akurasi analisis. Data asli tetap disimpan sebagai catatan
            audit.
          </p>
        </div>
        <b>{resolved.length}/3 selesai</b>
      </div>
      {items.map((item, i) => (
        <article
          className={`anomaly-card ${resolved.includes(i) ? "resolved" : ""}`}
          key={item.title}
        >
          <div className="anomaly-icon">
            <PIcon name={resolved.includes(i) ? "check" : "alert"} />
          </div>
          <div className="anomaly-info">
            <span>{item.title}</span>
            <h3>{item.desc}</h3>
            <strong>{item.amount}</strong>
            <div>
              <small>Alasan ditandai</small>
              <p>{item.reason}</p>
            </div>
            <div>
              <small>Saran klasifikasi</small>
              <p>
                <b>{item.suggest}</b>
              </p>
            </div>
            {i === 0 && !resolved.includes(i) && (
              <div className="classification">
                <label>Apakah transaksi ini digunakan untuk usaha atau pribadi?</label>
                <div>
                  {["Usaha", "Pribadi", "Gabungan"].map((x) => (
                    <button
                      className={x === "Gabungan" && split ? "active" : ""}
                      onClick={() => setSplit(x === "Gabungan")}
                      key={x}
                    >
                      {x}
                    </button>
                  ))}
                </div>
                {split && (
                  <div className="split-inputs">
                    <Field label="Bagian Usaha" value="700000" />
                    <Field label="Bagian Pribadi" value="500000" />
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="anomaly-actions">
            {resolved.includes(i) ? (
              <span>
                <PIcon name="check" size={14} />
                Terkonfirmasi
              </span>
            ) : (
              <>
                <button>
                  <PIcon name="edit" size={14} />
                  Edit
                </button>
                <button className="portal-primary" onClick={() => setResolved([...resolved, i])}>
                  Konfirmasi
                </button>
              </>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function FinancialAnalysis() {
  return (
    <div className="analysis-content">
      <div className="analysis-gauges">
        {[
          ["Revenue Performance", 82, "Sangat Baik"],
          ["Profitability", 76, "Baik"],
          ["Cashflow Health", 68, "Perlu Dijaga"],
          ["Expense Efficiency", 73, "Baik"],
          ["Data Completeness", 83, "5 dari 6 bulan"],
        ].map(([title, score, label]) => (
          <article key={String(title)}>
            <div className="gauge" style={{ "--score": `${score}%` } as React.CSSProperties}>
              <b>{score}</b>
              <span>/100</span>
            </div>
            <h3>{title}</h3>
            <p>{label}</p>
          </article>
        ))}
      </div>
      <article className="ai-summary-card">
        <div className="ai-summary-icon">
          <PIcon name="sparkle" size={24} />
        </div>
        <div>
          <span>NAIK.IN AI Financial Summary</span>
          <h2>Analisis Kondisi Keuangan Usaha</h2>
          <p>
            Pendapatan usaha menunjukkan tren meningkat, tetapi terdapat fluktuasi arus kas pada
            beberapa minggu. Pertimbangkan memperkuat cadangan kas sebelum mengambil kewajiban
            cicilan baru.
          </p>
          <div className="recommendations">
            {[
              "Pisahkan uang usaha dan pribadi",
              "Perbaiki transaksi yang belum jelas",
              "Evaluasi biaya operasional",
              "Siapkan cadangan kas",
            ].map((x) => (
              <span key={x}>
                <PIcon name="check" size={13} />
                {x}
              </span>
            ))}
          </div>
          <button onClick={() => goTo("kur")}>
            Lanjut ke Simulasi KUR <PIcon name="arrow" size={15} />
          </button>
        </div>
      </article>
    </div>
  );
}

const loanCategories = {
  "KUR Super Mikro": { min: 1000000, max: 10000000, rate: 3 },
  "KUR Mikro — Sektor Produksi": { min: 10000000, max: 100000000, rate: 6 },
  "KUR Kecil": { min: 100000000, max: 500000000, rate: 7 },
};

function KurPage() {
  const [category, setCategory] = useState<keyof typeof loanCategories>(
    "KUR Mikro — Sektor Produksi",
  );
  const [amount, setAmount] = useState(30000000);
  const [tenor, setTenor] = useState(24);
  const [downsideMode, setDownsideMode] = useState("Kuartil Bawah");
  const config = loanCategories[category];
  const baselineCash = 8200000,
    downsideCash = 3100000,
    essential = 1900000;
  const monthlyRate = config.rate / 100 / 12;
  const payment =
    monthlyRate === 0
      ? amount / tenor
      : (amount * monthlyRate * Math.pow(1 + monthlyRate, tenor)) /
        (Math.pow(1 + monthlyRate, tenor) - 1);
  const recommendedPayment = downsideCash - essential;
  const recommendedAmount = Math.max(
    config.min,
    Math.min(
      config.max,
      (recommendedPayment * (Math.pow(1 + monthlyRate, tenor) - 1)) /
        (monthlyRate * Math.pow(1 + monthlyRate, tenor)),
    ),
  );
  const baselineBuffer = baselineCash - essential - payment;
  const downsideBuffer = downsideCash - essential - payment;
  const risk =
    baselineBuffer < 0 ? "Risiko Tinggi" : downsideBuffer < 0 ? "Hati-hati" : "Relatif Aman";
  const riskClass = risk === "Relatif Aman" ? "safe" : risk === "Hati-hati" ? "caution" : "danger";
  const applyRecommended = () => setAmount(Math.round(recommendedAmount / 100000) * 100000);
  return (
    <>
      <PageHeader
        title="Simulasi Kesiapan KUR"
        subtitle="Uji kemampuan membayar cicilan berdasarkan kondisi keuangan dan ketahanan kas usahamu."
      >
        <span className="disclaimer">
          <PIcon name="alert" size={14} />
          Bukan keputusan persetujuan kredit bank
        </span>
      </PageHeader>
      <div className="demo-strip">
        <PIcon name="sparkle" size={14} />
        <span>
          Simulasi menggunakan <b>data demo ilustratif</b> dan formula amortisasi standar.
        </span>
      </div>
      <section className="validation-card">
        <div>
          <span>Validasi data 6 bulan</span>
          <h3>Data Keuangan Hampir Lengkap</h3>
          <p>
            Untuk hasil penuh, konfirmasi transaksi bulan Maret. Prototype tetap membuka simulasi
            agar alur dapat dicoba.
          </p>
        </div>
        <div className="timeline">
          {["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"].map((m, i) => (
            <span className={i === 2 ? "missing" : ""} key={m}>
              <i>{i === 2 ? "!" : "✓"}</i>
              <b>{m}</b>
              <small>{i === 2 ? "Perlu konfirmasi" : "Lengkap"}</small>
            </span>
          ))}
        </div>
        <button onClick={() => goTo("keuangan")}>
          Lengkapi Data Keuangan <PIcon name="arrow" size={15} />
        </button>
      </section>
      <section className="ai-loan-recommendation">
        <div className="recommendation-icon">
          <PIcon name="sparkle" size={23} />
        </div>
        <div>
          <span>Rekomendasi Awal NAIK.IN AI</span>
          <h3>Rentang cicilan yang lebih sesuai dengan kemampuan kas</h3>
          <p>
            Berdasarkan arus kas enam bulan terakhir dan kondisi minggu tersepi, estimasi dihitung
            dari kas tersedia setelah kebutuhan esensial.
          </p>
          <div className="recommendation-values">
            <div>
              <small>Rentang cicilan</small>
              <b>
                {rupiah(recommendedPayment * 0.7)} – {rupiah(recommendedPayment)}
              </b>
            </div>
            <div>
              <small>Nominal disarankan</small>
              <b>{rupiah(recommendedAmount)}</b>
            </div>
            <div>
              <small>Tenor aktif</small>
              <b>{tenor} Bulan</b>
            </div>
          </div>
        </div>
        <button onClick={applyRecommended}>Gunakan Rekomendasi AI</button>
      </section>
      <section className="simulator-card">
        <div className="simulator-head">
          <div>
            <span>Simulator interaktif</span>
            <h3>Atur Rencana Pinjamanmu</h3>
          </div>
          <div className="rate-badge">
            <small>Suku Bunga Acuan</small>
            <b>{config.rate}% Efektif / Tahun</b>
            <i title="Asumsi regulasi untuk kategori yang dipilih. Skema perhitungan menggunakan amortisasi bulanan standar.">
              ?
            </i>
          </div>
        </div>
        <div className="simulator-grid">
          <div className="loan-controls">
            <label className="select-label">
              <span>Kategori KUR</span>
              <select
                value={category}
                onChange={(e) => {
                  const value = e.target.value as keyof typeof loanCategories;
                  setCategory(value);
                  setAmount(loanCategories[value].min);
                }}
              >
                {Object.keys(loanCategories).map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
              <small>Tarif dapat berbeda berdasarkan kategori, sektor, dan riwayat pinjaman.</small>
            </label>
            <div className="range-block">
              <div>
                <span>Jumlah Pinjaman</span>
                <strong>{rupiah(amount)}</strong>
              </div>
              <div className="range-track-wrap">
                <input
                  type="range"
                  min={config.min}
                  max={config.max}
                  step={500000}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
                <i className="safe-range" />
                <em
                  style={{
                    left: `${Math.min(96, Math.max(2, ((recommendedAmount - config.min) / (config.max - config.min)) * 100))}%`,
                  }}
                  title="Rekomendasi AI"
                />
              </div>
              <div className="range-labels">
                <span>{rupiah(config.min)}</span>
                <span>Area rekomendasi AI</span>
                <span>{rupiah(config.max)}</span>
              </div>
            </div>
            <div className="tenor-control">
              <span>Tenor Pinjaman</span>
              <div>
                {[12, 24, 36].map((x) => (
                  <button
                    className={tenor === x ? "active" : ""}
                    onClick={() => setTenor(x)}
                    key={x}
                  >
                    {x} Bulan
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="simulation-outputs">
            {[
              ["Estimasi Cicilan per Bulan", rupiah(payment), "calc"],
              ["Batas Cicilan Direkomendasikan", rupiah(recommendedPayment), "wallet"],
              ["Sisa Kas Setelah Cicilan", rupiah(baselineBuffer), "report"],
              ["Risiko Tekanan Pembayaran", risk, "alert"],
            ].map(([a, b, icon], i) => (
              <article className={i === 3 ? riskClass : ""} key={a}>
                <i>
                  <PIcon name={icon as PIconName} size={18} />
                </i>
                <span>{a}</span>
                <strong>{b}</strong>
                {i === 0 && <small>Formula amortisasi · {tenor} bulan</small>}
                {i === 3 && <small>Indikator internal NAIK.IN</small>}
              </article>
            ))}
          </div>
        </div>
      </section>
      <div className="section-title">
        <span>Analisis ketahanan pembayaran</span>
        <h2>Dual-Layer Cashflow Assessment</h2>
        <p>
          Menilai kemampuan cicilan bukan hanya saat usaha ramai, tetapi juga ketika pendapatan
          menurun.
        </p>
      </div>
      <div className="dual-layer">
        <article className="layer-card">
          <header>
            <i>01</i>
            <div>
              <span>Baseline Cashflow</span>
              <h3>Rata-Rata Keuangan 6 Bulan</h3>
            </div>
          </header>
          <CashflowChart />
          <div className="layer-stats">
            {[
              ["Laba operasional", "Rp10,1 jt"],
              ["Kas tersedia", "Rp8,2 jt"],
              ["Kebutuhan esensial", "Rp1,9 jt"],
              ["Setelah cicilan", rupiah(baselineBuffer)],
            ].map((x) => (
              <div key={x[0]}>
                <span>{x[0]}</span>
                <b>{x[1]}</b>
              </div>
            ))}
          </div>
          <p>
            Baseline adalah kapasitas internal berdasarkan data usaha, bukan metode penilaian
            universal bank.
          </p>
        </article>
        <article className="layer-card downside">
          <header>
            <i>02</i>
            <div>
              <span>Downside Stress Test</span>
              <h3>Ketahanan Kas Saat Minggu Sepi</h3>
            </div>
          </header>
          <div className="downside-toggle">
            {["Kuartil Bawah", "Minggu Tersepi Aktif"].map((x) => (
              <button
                className={downsideMode === x ? "active" : ""}
                onClick={() => setDownsideMode(x)}
                key={x}
              >
                {x}
              </button>
            ))}
          </div>
          <WeeklyBars />
          <div className="layer-stats">
            {[
              ["Kas minggu sepi", "Rp775 rb"],
              ["Skenario × 4", "Rp3,1 jt"],
              ["Kebutuhan esensial", "Rp1,9 jt"],
              ["Setelah cicilan", rupiah(downsideBuffer)],
            ].map((x) => (
              <div key={x[0]}>
                <span>{x[0]}</span>
                <b>{x[1]}</b>
              </div>
            ))}
          </div>
          <p>
            Kas minggu sepi × 4 adalah skenario konservatif, bukan forecast atau formula universal
            bank.
          </p>
        </article>
      </div>
      <StressComparison
        payment={payment}
        baseline={baselineCash - essential}
        downside={downsideCash - essential}
      />
      <section className={`readiness-status ${riskClass}`}>
        <div className="status-mark">
          <PIcon name={riskClass === "safe" ? "check" : "alert"} size={27} />
        </div>
        <div>
          <span>Hasil Simulasi Kesiapan Pembayaran</span>
          <h2>{risk}</h2>
          <p>
            {risk === "Relatif Aman"
              ? "Skenario rata-rata dan performa rendah masih memiliki buffer untuk cicilan."
              : risk === "Hati-hati"
                ? "Arus kas rata-rata cukup, tetapi skenario performa rendah menunjukkan potensi kekurangan kas."
                : "Bahkan kondisi rata-rata belum memiliki buffer yang cukup untuk cicilan ini."}
          </p>
          <small>Status simulasi internal NAIK.IN, bukan rating atau keputusan kredit bank.</small>
        </div>
        <div className="risk-indicator">
          <span>
            Indikator Risiko Pembayaran{" "}
            <i title="Berasal dari simulasi ketahanan arus kas, bukan probabilitas gagal bayar resmi atau penilaian bank.">
              ?
            </i>
          </span>
          <b>{riskClass === "safe" ? "Rendah" : riskClass === "caution" ? "Sedang" : "Tinggi"}</b>
        </div>
      </section>
      <ReserveSection
        payment={payment}
        baseline={baselineCash - essential}
        downside={downsideCash - essential}
        shortfall={Math.max(0, -downsideBuffer)}
        applyRecommended={applyRecommended}
      />
    </>
  );
}

function WeeklyBars() {
  const values = [
    62, 75, 48, 70, 35, 68, 82, 44, 73, 28, 64, 77, 52, 80, 39, 71, 88, 46, 67, 31, 74, 85, 43, 69,
    55, 78,
  ];
  return (
    <div className="weekly-bars">
      {values.map((v, i) => (
        <i
          key={i}
          className={v < 45 ? "low" : ""}
          style={{ height: `${v}%` }}
          title={`Minggu ${i + 1}: indeks ${v}`}
        />
      ))}
    </div>
  );
}

function StressComparison({
  payment,
  baseline,
  downside,
}: {
  payment: number;
  baseline: number;
  downside: number;
}) {
  const max = Math.max(baseline, payment, downside);
  return (
    <section className="stress-comparison panel">
      <div className="panel-title">
        <div>
          <span>Perbandingan cakupan</span>
          <h3>Normal vs Performa Rendah</h3>
        </div>
        <span className="chart-note">Demo · diperbarui real-time</span>
      </div>
      <div className="comparison-bars">
        {[
          ["Kas Kondisi Normal", baseline, "normal"],
          ["Kas Performa Rendah", downside, "low"],
          ["Cicilan KUR", payment, "payment"],
        ].map(([label, value, cls]) => (
          <div key={String(label)}>
            <span>{label}</span>
            <div>
              <i
                className={String(cls)}
                style={{ width: `${Math.min(100, (Number(value) / max) * 100)}%` }}
              />
              <em>{rupiah(Number(value))}</em>
            </div>
          </div>
        ))}
      </div>
      <div className="coverage-cards">
        <div>
          <span>Cakupan baseline</span>
          <b>{(baseline / payment).toFixed(1)}×</b>
          <small>{baseline >= payment ? "Mencukupi" : "Belum cukup"}</small>
        </div>
        <div>
          <span>Cakupan downside</span>
          <b>{(downside / payment).toFixed(1)}×</b>
          <small>{downside >= payment ? "Mencukupi" : "Defisit"}</small>
        </div>
      </div>
    </section>
  );
}

function ReserveSection({
  payment,
  baseline,
  downside,
  shortfall,
  applyRecommended,
}: {
  payment: number;
  baseline: number;
  downside: number;
  shortfall: number;
  applyRecommended: () => void;
}) {
  const reserve = Math.max(payment * 2, shortfall * 3);
  return (
    <section className="reserve-section">
      <div className="reserve-chart">
        <div className="panel-title">
          <div>
            <span>Perencanaan buffer</span>
            <h3>Ketahanan Kas & Cadangan Cicilan</h3>
          </div>
        </div>
        <div className="reserve-visual">
          {[
            ["Kas normal", baseline],
            ["Kas performa rendah", downside],
            ["Cicilan bulanan", payment],
            ["Cadangan disarankan", reserve],
          ].map(([a, b], i) => (
            <div key={String(a)}>
              <span>{a}</span>
              <b>{rupiah(Number(b))}</b>
              <i
                style={{ height: `${Math.min(100, (Number(b) / baseline) * 100)}%` }}
                className={`bar-${i}`}
              />
            </div>
          ))}
        </div>
        <p>
          Cadangan dihitung transparan sebagai nilai terbesar antara 2× cicilan atau estimasi
          kekurangan kas selama 3 periode rendah.
        </p>
      </div>
      <div className="reserve-ai">
        <span>
          <PIcon name="sparkle" size={17} />
          Rekomendasi AI
        </span>
        <h3>
          {shortfall > 0
            ? "Perkuat cadangan sebelum mengambil cicilan"
            : "Buffer kas terlihat memadai"}
        </h3>
        <p>
          Pada kondisi rata-rata, kas usaha diperkirakan cukup. Namun skenario minggu sepi perlu
          tetap diantisipasi.
        </p>
        <ul>
          <li>Kurangi nominal pinjaman bila buffer menipis.</li>
          <li>Pertimbangkan tenor yang lebih panjang.</li>
          <li>Sisihkan cadangan saat periode ramai.</li>
          <li>Evaluasi pengeluaran nonprioritas.</li>
        </ul>
        <button onClick={applyRecommended}>Gunakan Nominal yang Direkomendasikan</button>
        <button className="save-simulation" onClick={() => goTo("laporan")}>
          <PIcon name="report" size={14} />
          Simpan Hasil ke Laporan
        </button>
      </div>
    </section>
  );
}

type ChecklistStatus = "Ditemukan" | "Tidak Ditemukan" | "Perlu Verifikasi" | "Tidak Berlaku";
function LabelPage() {
  const [tab, setTab] = useState("Daftar Produk");
  const [scanStage, setScanStage] = useState(0);
  const tabs = ["Daftar Produk", "Scan Label", "Hasil Pemeriksaan", "Rekomendasi AI"];
  return (
    <>
      <PageHeader
        title="Label Produk"
        subtitle="Periksa kelengkapan informasi kemasan berdasarkan ketentuan pangan olahan yang relevan."
      >
        <button
          className="portal-primary"
          onClick={() => {
            setTab("Scan Label");
            setScanStage(0);
          }}
        >
          <PIcon name="plus" size={16} />
          Tambah Produk
        </button>
      </PageHeader>
      <div className="demo-strip">
        <PIcon name="sparkle" size={14} />
        <span>
          Pemeriksaan ini adalah <b>prototype berbasis aturan ilustratif</b>, bukan sertifikasi atau
          persetujuan BPOM.
        </span>
      </div>
      <div className="page-tabs">
        {tabs.map((x) => (
          <button className={tab === x ? "active" : ""} onClick={() => setTab(x)} key={x}>
            {x}
          </button>
        ))}
      </div>
      {tab === "Daftar Produk" && (
        <ProductList
          onScan={() => setTab("Scan Label")}
          onResult={() => setTab("Hasil Pemeriksaan")}
        />
      )}
      {tab === "Scan Label" && (
        <ProductScanner
          stage={scanStage}
          setStage={setScanStage}
          onDone={() => setTab("Hasil Pemeriksaan")}
        />
      )}
      {tab === "Hasil Pemeriksaan" && (
        <LabelResults onRecommendations={() => setTab("Rekomendasi AI")} />
      )}
      {tab === "Rekomendasi AI" && <ProductRecommendations />}
    </>
  );
}

function ProductPack() {
  return (
    <div className="product-pack">
      <div className="pack-glow" />
      <span>KERIPIK</span>
      <b>
        Pisang
        <br />
        Nusantara
      </b>
      <small>Rasa Manis Gurih</small>
      <div className="banana-shape" />
      <em>Berat Bersih 120 g</em>
    </div>
  );
}
function ProductList({ onScan, onResult }: { onScan: () => void; onResult: () => void }) {
  return (
    <div className="product-content">
      <div className="product-filter">
        <label>
          <PIcon name="search" size={17} />
          <input placeholder="Cari produk..." />
        </label>
        <button>
          <PIcon name="filter" size={16} />
          Semua Status
        </button>
      </div>
      <div className="product-grid">
        <article className="product-card">
          <div className="product-image">
            <ProductPack />
          </div>
          <div>
            <span className="status warning">Perlu dilengkapi</span>
            <h3>Keripik Pisang Nusantara</h3>
            <p>Makanan ringan · PIRT</p>
            <small>Scan terakhir 16 Juni 2026</small>
            <div className="product-score">
              <span>Kesiapan informasi</span>
              <b>74%</b>
              <i>
                <em />
              </i>
            </div>
            <button onClick={onResult}>
              Lihat Analisis <PIcon name="arrow" size={15} />
            </button>
          </div>
        </article>
        <button className="add-product-card" onClick={onScan}>
          <i>
            <PIcon name="plus" size={24} />
          </i>
          <b>Tambah Produk Baru</b>
          <span>Unggah kemasan untuk diperiksa</span>
        </button>
      </div>
    </div>
  );
}
function ProductScanner({
  stage,
  setStage,
  onDone,
}: {
  stage: number;
  setStage: (n: number) => void;
  onDone: () => void;
}) {
  if (stage === 1)
    return (
      <div className="product-scanning">
        <div className="scanner-stage">
          <ProductPack />
          <span className="product-scan-line" />
          {["Nama produk", "Komposisi", "Berat bersih", "Informasi produsen"].map((x, i) => (
            <i key={x} className={`callout callout-${i}`}>
              {x}
              <em />
            </i>
          ))}
        </div>
        <div className="scan-progress product-progress">
          <span>NAIK.IN Product Scanner</span>
          <h3>Menganalisis informasi kemasan...</h3>
          <p>AI mengekstrak teks. Mesin aturan menentukan pemeriksaan yang relevan.</p>
          {[
            "Mendeteksi area label",
            "Membaca teks kemasan",
            "Mencocokkan kategori produk",
            "Menyiapkan hasil verifikasi",
          ].map((x, i) => (
            <div className={i < 3 ? "done" : "active"} key={x}>
              <i>{i < 3 ? <PIcon name="check" size={13} /> : i + 1}</i>
              <span>{x}</span>
            </div>
          ))}
          <button className="portal-primary" onClick={() => setStage(2)}>
            Tinjau Hasil Scan
          </button>
        </div>
      </div>
    );
  if (stage === 2)
    return (
      <div className="ocr-confirm">
        <div className="subsection-heading">
          <span>Konfirmasi diperlukan</span>
          <h3>Periksa Informasi yang Terdeteksi</h3>
          <p>Edit hasil OCR yang kurang tepat dan tandai area yang tidak terbaca.</p>
        </div>
        <div className="ocr-layout">
          <div className="ocr-pack">
            <div className="scan-frame">
              <ProductPack />
            </div>
            <button>Unggah gambar lebih jelas</button>
          </div>
          <div className="ocr-fields">
            <Field label="Nama Produk" value="Keripik Pisang Nusantara" />
            <Field label="Kategori Pangan" value="Makanan ringan berbasis buah" />
            <Field label="Komposisi" value="Pisang, minyak nabati, gula, garam" />
            <Field label="Berat Bersih" value="120 g" />
            <div className="ocr-warning">
              <PIcon name="alert" size={15} />
              Nomor perizinan kurang terbaca. Mohon verifikasi manual.
            </div>
            <Field label="Nomor Perizinan" value="P-IRT 2XXXXXXXXXXX-XX" />
            <button className="portal-primary" onClick={onDone}>
              Konfirmasi Hasil Scan <PIcon name="arrow" size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  return (
    <div className="label-upload-layout">
      <div className="label-form">
        <div className="subsection-heading">
          <span>Informasi produk</span>
          <h3>Tambahkan Kemasan Produk</h3>
          <p>Gunakan foto terang dan pastikan tulisan pada kemasan terlihat jelas.</p>
        </div>
        <div className="form-grid">
          <Field label="Nama Produk" value="Keripik Pisang Nusantara" />
          <label className="form-field">
            <span>Kategori Pangan</span>
            <select>
              <option>Makanan ringan berbasis buah</option>
            </select>
          </label>
          <label className="form-field">
            <span>Jenis Perizinan yang Dimiliki</span>
            <select>
              <option>PIRT</option>
              <option>BPOM MD</option>
              <option>Belum ada</option>
            </select>
          </label>
          <label className="form-field">
            <span>Tujuan Pasar</span>
            <select>
              <option>Ritel lokal & marketplace</option>
              <option>Ritel modern</option>
              <option>Ekspor</option>
            </select>
          </label>
        </div>
        <div className="pack-upload-grid">
          <label>
            <input type="file" accept=".jpg,.jpeg,.png,.pdf" />
            <PIcon name="upload" />
            <b>Kemasan Depan</b>
            <span>JPG, PNG, atau PDF</span>
          </label>
          <label>
            <input type="file" accept=".jpg,.jpeg,.png,.pdf" />
            <PIcon name="upload" />
            <b>Kemasan Belakang</b>
            <span>JPG, PNG, atau PDF</span>
          </label>
          <label className="additional">
            <input type="file" multiple />
            <PIcon name="plus" />
            <b>Foto tambahan area yang kurang jelas</b>
          </label>
        </div>
        <button className="portal-primary" onClick={() => setStage(1)}>
          <PIcon name="scan" size={16} />
          Mulai Scan dengan AI
        </button>
      </div>
      <aside className="upload-tips">
        <span>
          <PIcon name="sparkle" size={17} />
        </span>
        <h3>Tips hasil scan terbaik</h3>
        <ul>
          <li>Gunakan pencahayaan merata.</li>
          <li>Hindari pantulan pada plastik.</li>
          <li>Pastikan teks tidak terpotong.</li>
          <li>Unggah sisi depan dan belakang.</li>
        </ul>
        <small>
          AI tidak menentukan kewajiban regulasi. Checklist ditentukan berdasarkan kategori dan
          jalur perizinan.
        </small>
      </aside>
    </div>
  );
}
function LabelResults({ onRecommendations }: { onRecommendations: () => void }) {
  const initial: { title: string; status: ChecklistStatus; applicable: boolean }[] = [
    { title: "Nama Produk", status: "Ditemukan", applicable: true },
    { title: "Daftar Bahan / Komposisi", status: "Ditemukan", applicable: true },
    { title: "Berat Bersih / Isi Bersih", status: "Ditemukan", applicable: true },
    { title: "Nama dan Alamat Produsen / Importir", status: "Perlu Verifikasi", applicable: true },
    { title: "Informasi Halal Jika Dipersyaratkan", status: "Ditemukan", applicable: true },
    { title: "Tanggal dan Kode Produksi", status: "Tidak Ditemukan", applicable: true },
    { title: "Keterangan Kedaluwarsa", status: "Ditemukan", applicable: true },
    {
      title: "Nomor Izin Edar / Informasi Perizinan",
      status: "Perlu Verifikasi",
      applicable: true,
    },
    {
      title: "Asal-Usul Bahan Tertentu Jika Dipersyaratkan",
      status: "Tidak Berlaku",
      applicable: false,
    },
  ];
  const [items, setItems] = useState(initial);
  const applicable = items.filter((x) => x.applicable),
    found = applicable.filter((x) => x.status === "Ditemukan").length;
  const score = Math.round((found / applicable.length) * 100);
  const cycle = (index: number) => {
    const statuses: ChecklistStatus[] = [
      "Ditemukan",
      "Tidak Ditemukan",
      "Perlu Verifikasi",
      "Tidak Berlaku",
    ];
    setItems(
      items.map((x, i) =>
        i === index
          ? { ...x, status: statuses[(statuses.indexOf(x.status) + 1) % statuses.length] }
          : x,
      ),
    );
  };
  return (
    <div className="label-results">
      <div className="readiness-overview">
        <div className="product-mini">
          <ProductPack />
          <div>
            <span>Hasil pemeriksaan demo</span>
            <h3>Keripik Pisang Nusantara</h3>
            <p>Makanan ringan berbasis buah · Jalur PIRT</p>
          </div>
        </div>
        <div className="readiness-gauge" style={{ "--score": `${score}%` } as React.CSSProperties}>
          <div>
            <b>{score}%</b>
            <span>Kesiapan Informasi Label</span>
          </div>
        </div>
        <div className="readiness-counts">
          <div>
            <b>{found}</b>
            <span>Ditemukan</span>
          </div>
          <div>
            <b>{applicable.filter((x) => x.status === "Tidak Ditemukan").length}</b>
            <span>Belum ada</span>
          </div>
          <div>
            <b>{applicable.filter((x) => x.status === "Perlu Verifikasi").length}</b>
            <span>Verifikasi</span>
          </div>
          <div>
            <b>{items.filter((x) => !x.applicable).length}</b>
            <span>Tidak berlaku</span>
          </div>
        </div>
      </div>
      <div className="checklist-heading">
        <div>
          <span>Rule-based checklist</span>
          <h3>Informasi Label yang Relevan</h3>
          <p>Klik status untuk mencoba memperbarui hasil verifikasi.</p>
        </div>
        <b>
          {found} dari {applicable.length} persyaratan berlaku ditemukan
        </b>
      </div>
      <div className="checklist-grid">
        {items.map((item, i) => (
          <article key={item.title}>
            <i className={`check-status ${item.status.toLowerCase().replaceAll(" ", "-")}`}>
              <PIcon
                name={
                  item.status === "Ditemukan"
                    ? "check"
                    : item.status === "Tidak Berlaku"
                      ? "close"
                      : "alert"
                }
                size={15}
              />
            </i>
            <span>
              <b>{item.title}</b>
              <small>
                {item.applicable
                  ? "Berlaku untuk kategori produk"
                  : "Tidak dipersyaratkan pada kategori ini"}
              </small>
            </span>
            <button
              onClick={() => cycle(i)}
              className={item.status.toLowerCase().replaceAll(" ", "-")}
            >
              {item.status}
            </button>
          </article>
        ))}
      </div>
      <div className="additional-checks">
        <h3>Pemeriksaan Tambahan</h3>
        <p>Persyaratan resmi dipisahkan dari rekomendasi kesiapan pasar ritel.</p>
        <div>
          {[
            ["Informasi Nilai Gizi", "Perlu evaluasi kategori", "Regulasi"],
            ["Informasi Alergen", "Perlu verifikasi bahan", "Regulasi"],
            ["Instruksi Penyimpanan", "Direkomendasikan", "Regulasi"],
            ["BPOM 2D Barcode", "Tidak berlaku untuk PIRT", "Regulasi"],
            ["Barcode Ritel", "Belum tersedia", "Rekomendasi pasar"],
          ].map((x) => (
            <span key={x[0]}>
              <i>
                <PIcon name={x[2] === "Regulasi" ? "file" : "report"} size={15} />
              </i>
              <b>{x[0]}</b>
              <small>{x[1]}</small>
              <em>{x[2]}</em>
            </span>
          ))}
        </div>
      </div>
      <div className="regulatory-note">
        <PIcon name="file" size={18} />
        <span>
          <b>Referensi mesin aturan prototype</b>
          <small>
            PerBPOM No. 31/2018, No. 20/2021, No. 6/2024, dan No. 10/2026. Verifikasi regulasi
            terkini tetap diperlukan.
          </small>
        </span>
        <button onClick={onRecommendations}>
          Lihat Rekomendasi AI <PIcon name="arrow" size={15} />
        </button>
      </div>
    </div>
  );
}
function ProductRecommendations() {
  const [resolved, setResolved] = useState<number[]>([]);
  const recs = [
    [
      "Tinggi",
      "Tanggal dan kode produksi belum terdeteksi",
      "Tambahkan kode produksi yang mudah dibaca pada area kemasan.",
      "PerBPOM 31/2018",
    ],
    [
      "Sedang",
      "Informasi produsen perlu diverifikasi",
      "Pastikan nama dan alamat produsen terbaca lengkap.",
      "PerBPOM 31/2018",
    ],
    [
      "Sedang",
      "Nomor perizinan kurang jelas",
      "Periksa kesesuaian nomor dengan jalur perizinan produk.",
      "Panduan Registrasi BPOM",
    ],
    [
      "Rendah",
      "Siapkan barcode untuk ekspansi ritel",
      "Barcode ritel bukan bagian universal dari sembilan informasi utama.",
      "Rekomendasi kesiapan pasar",
    ],
  ];
  return (
    <div className="product-recommendations">
      <div className="ai-recommendation-head">
        <span>
          <PIcon name="sparkle" size={20} />
        </span>
        <div>
          <small>Penjelasan AI berdasarkan hasil checklist</small>
          <h3>Rekomendasi Penyempurnaan Label</h3>
          <p>Prioritaskan informasi yang berlaku dan belum ditemukan atau belum terverifikasi.</p>
        </div>
      </div>
      {recs.map((x, i) => (
        <article className={resolved.includes(i) ? "resolved" : ""} key={x[1]}>
          <span className={`priority p-${x[0].toLowerCase()}`}>{x[0]}</span>
          <div>
            <h3>{x[1]}</h3>
            <p>{x[2]}</p>
            <small>
              <PIcon name="file" size={13} />
              {x[3]}
            </small>
          </div>
          <button onClick={() => setResolved([...resolved, i])}>
            {resolved.includes(i) ? (
              <>
                <PIcon name="check" size={14} />
                Selesai
              </>
            ) : (
              "Tandai Selesai"
            )}
          </button>
        </article>
      ))}
      <div className="save-product-result">
        <div>
          <b>Catatan penting</b>
          <p>
            Skor menunjukkan kelengkapan awal informasi label, bukan sertifikasi atau persetujuan
            resmi BPOM.
          </p>
        </div>
        <button className="portal-primary" onClick={() => goTo("laporan")}>
          Simpan Hasil Pemeriksaan <PIcon name="arrow" size={15} />
        </button>
      </div>
    </div>
  );
}

function ReportsPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const reports = [
    ["Laporan Financial Health", "Keuangan", "Jan–Jun 2026", "18 Jun 2026", "Selesai"],
    ["Laporan Simulasi Kesiapan KUR", "KUR", "Jan–Jun 2026", "18 Jun 2026", "Selesai"],
    ["Kesiapan Label — Keripik Pisang", "Produk", "Juni 2026", "16 Jun 2026", "Perlu diperbarui"],
  ];
  return (
    <>
      <PageHeader
        title="Laporan"
        subtitle="Seluruh hasil analisis dan rekomendasi bisnismu tersusun dalam satu tempat."
      >
        <button className="portal-primary">
          <PIcon name="plus" size={16} />
          Buat Laporan
        </button>
      </PageHeader>
      <div className="report-type-grid">
        {[
          [
            "wallet",
            "Financial Health Report",
            "Ringkasan kesehatan keuangan, arus kas, anomali, dan rekomendasi.",
          ],
          [
            "calc",
            "KUR Borrowing Readiness",
            "Simulasi cicilan, stress test, ketahanan kas, dan indikator risiko.",
          ],
          [
            "scan",
            "Product Label Readiness",
            "Checklist informasi label, temuan, dan rekomendasi penyempurnaan.",
          ],
        ].map((x) => (
          <article key={x[1]}>
            <i>
              <PIcon name={x[0] as PIconName} />
            </i>
            <h3>{x[1]}</h3>
            <p>{x[2]}</p>
            <button onClick={() => setPreview(x[1])}>
              Lihat laporan terbaru <PIcon name="arrow" size={14} />
            </button>
          </article>
        ))}
      </div>
      <section className="report-library">
        <div className="library-head">
          <div>
            <h3>Library Laporan</h3>
            <p>Kelola dan unduh laporan yang telah dibuat.</p>
          </div>
          <div>
            <button>
              <PIcon name="filter" size={15} />
              Semua Jenis
            </button>
            <button>
              <PIcon name="calendar" size={15} />
              Semua Tanggal
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nama Laporan</th>
                <th>Jenis</th>
                <th>Periode</th>
                <th>Tanggal Dibuat</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r, i) => (
                <tr key={r[0]}>
                  <td>
                    <b>
                      <PIcon name="file" size={16} />
                      {r[0]}
                    </b>
                  </td>
                  <td>{r[1]}</td>
                  <td>{r[2]}</td>
                  <td>{r[3]}</td>
                  <td>
                    <span className={r[4] === "Selesai" ? "status success" : "status warning"}>
                      {r[4]}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => setPreview(r[0])} title="Lihat Detail">
                      <PIcon name="eye" size={16} />
                    </button>
                    <button title="Unduh PDF">
                      <PIcon name="download" size={16} />
                    </button>
                    <button title="Hapus">
                      <PIcon name="trash" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {preview && <ReportPreview title={preview} onClose={() => setPreview(null)} />}
    </>
  );
}
function ReportPreview({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            <span>Pratinjau PDF</span>
            <h3>{title}</h3>
          </div>
          <div>
            <button>
              <PIcon name="download" size={16} />
              Unduh PDF
            </button>
            <button onClick={onClose}>
              <PIcon name="close" />
            </button>
          </div>
        </header>
        <div className="pdf-page">
          <div className="pdf-brand">
            <PortalLogo dark />
            <span>LAPORAN BUSINESS READINESS</span>
          </div>
          <div className="pdf-heading">
            <span>DATA DEMO ILUSTRATIF</span>
            <h1>{title}</h1>
            <p>Kriuk Nusantara · Periode Januari–Juni 2026</p>
          </div>
          <div className="pdf-summary">
            {[
              ["Total Omzet", "Rp142,5 jt"],
              ["Estimasi Laba", "Rp48,2 jt"],
              ["Arus Kas Bersih", "Rp48,2 jt"],
              ["Kelengkapan Data", "83%"],
            ].map((x) => (
              <div key={x[0]}>
                <span>{x[0]}</span>
                <b>{x[1]}</b>
              </div>
            ))}
          </div>
          <section>
            <h3>Ringkasan Analisis</h3>
            <p>
              Pendapatan menunjukkan tren meningkat dengan arus kas rata-rata yang positif. Beberapa
              transaksi masih memerlukan konfirmasi untuk meningkatkan akurasi hasil.
            </p>
            <CashflowChart />
          </section>
          <section>
            <h3>Temuan & Rekomendasi</h3>
            <div className="pdf-findings">
              <span>
                <i>01</i>
                <p>Perkuat cadangan kas untuk menghadapi periode penjualan rendah.</p>
              </span>
              <span>
                <i>02</i>
                <p>Pisahkan pengeluaran pribadi dari transaksi operasional usaha.</p>
              </span>
              <span>
                <i>03</i>
                <p>Lengkapi transaksi bulan Maret sebelum membuat keputusan pembiayaan.</p>
              </span>
            </div>
          </section>
          <footer>
            <b>Catatan Metodologi</b>
            <p>
              Hasil menggunakan data demo dan metode simulasi internal. Bukan keputusan kredit bank,
              sertifikasi BPOM, atau nasihat keuangan profesional.
            </p>
            <span>NAIK.IN · Know Your Business. Prepare to Grow.</span>
          </footer>
        </div>
      </div>
    </div>
  );
}

function ProfilePage() {
  const [saved, setSaved] = useState(false);
  return (
    <>
      <PageHeader
        title="Profil Akun"
        subtitle="Kelola identitas pemilik dan informasi utama usahamu."
      />
      <div className="settings-layout">
        <aside className="profile-card">
          <span className="large-avatar">AN</span>
          <h3>Andi Nugraha</h3>
          <p>Pemilik Kriuk Nusantara</p>
          <button>Ubah Foto</button>
          <small>Bergabung sejak Juni 2026</small>
        </aside>
        <section className="settings-card">
          <div className="settings-heading">
            <h3>Informasi Profil</h3>
            <p>Pastikan informasi ini tetap akurat.</p>
          </div>
          <div className="form-grid">
            <Field label="Nama Lengkap" value="Andi Nugraha" />
            <Field label="Email" type="email" value="umkm@gmail.com" />
            <Field label="Nomor WhatsApp" value="0812 3456 7890" />
            <Field label="Nama Usaha" value="Kriuk Nusantara" />
            <label className="form-field">
              <span>Jenis Usaha</span>
              <select>
                <option>Makanan & Minuman</option>
              </select>
            </label>
            <Field label="Tanggal Mulai Usaha" type="date" value="2022-03-18" />
            <Field label="Lokasi Usaha" value="Bandung, Jawa Barat" />
          </div>
          <button className="portal-primary" onClick={() => setSaved(true)}>
            {saved ? (
              <>
                <PIcon name="check" size={15} />
                Perubahan Tersimpan
              </>
            ) : (
              "Simpan Perubahan"
            )}
          </button>
        </section>
      </div>
    </>
  );
}
function SettingsPage() {
  const [notifications, setNotifications] = useState([true, true, false]);
  return (
    <>
      <PageHeader
        title="Pengaturan"
        subtitle="Atur keamanan, notifikasi, dan pengelolaan dokumen akun."
      />
      <div className="settings-sections">
        <section className="settings-card">
          <div className="settings-heading">
            <i>
              <PIcon name="lock" />
            </i>
            <div>
              <h3>Ubah Kata Sandi</h3>
              <p>Gunakan kata sandi yang kuat dan unik.</p>
            </div>
          </div>
          <div className="form-grid three">
            <Field label="Kata Sandi Saat Ini" type="password" />
            <Field label="Kata Sandi Baru" type="password" />
            <Field label="Konfirmasi Kata Sandi" type="password" />
          </div>
          <button className="portal-secondary">Perbarui Kata Sandi</button>
        </section>
        <section className="settings-card">
          <div className="settings-heading">
            <i>
              <PIcon name="bell" />
            </i>
            <div>
              <h3>Preferensi Notifikasi</h3>
              <p>Pilih informasi yang ingin kamu terima.</p>
            </div>
          </div>
          {[
            "Insight keuangan mingguan",
            "Pengingat data belum lengkap",
            "Informasi produk dan fitur baru",
          ].map((x, i) => (
            <label className="toggle-row" key={x}>
              <span>
                <b>{x}</b>
                <small>
                  {i === 0
                    ? "Ringkasan performa setiap Senin."
                    : i === 1
                      ? "Pengingat untuk melengkapi transaksi."
                      : "Pembaruan yang relevan untuk usahamu."}
                </small>
              </span>
              <input
                type="checkbox"
                checked={notifications[i]}
                onChange={() => setNotifications(notifications.map((v, j) => (i === j ? !v : v)))}
              />
              <i />
            </label>
          ))}
        </section>
        <section className="settings-card">
          <div className="settings-heading">
            <i>
              <PIcon name="file" />
            </i>
            <div>
              <h3>Pengelolaan Dokumen</h3>
              <p>Atur dokumen yang tersimpan di prototype.</p>
            </div>
          </div>
          <div className="storage-bar">
            <span>
              <b>18,4 MB</b> dari 1 GB digunakan
            </span>
            <i>
              <em />
            </i>
          </div>
          <button className="portal-secondary">Kelola Dokumen</button>
        </section>
        <section className="settings-card">
          <div className="settings-heading">
            <i>
              <PIcon name="user" />
            </i>
            <div>
              <h3>Privasi dan Keamanan</h3>
              <p>Kontrol data dan sesi akunmu.</p>
            </div>
          </div>
          <div className="security-row">
            <span>
              <b>Sesi aktif</b>
              <small>Chrome · Perangkat saat ini</small>
            </span>
            <span className="status success">Aktif</span>
          </div>
          <button className="portal-secondary">Unduh Data Akun</button>
        </section>
        <section className="danger-zone">
          <div>
            <h3>Keluar dari akun</h3>
            <p>Kamu perlu masuk kembali untuk mengakses dashboard.</p>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem("naikin-demo-auth");
              goTo("login");
            }}
          >
            <PIcon name="logout" size={16} />
            Keluar
          </button>
        </section>
      </div>
    </>
  );
}

export function PortalRouter({ route }: { route: AppRoute }) {
  if (route === "login" || route === "register") return <AuthPage mode={route} />;
  if (route === "onboarding") return <Onboarding />;
  const pages: Partial<Record<AppRoute, ReactNode>> = {
    beranda: <Dashboard />,
    keuangan: <FinancePage />,
    kur: <KurPage />,
    label: <LabelPage />,
    laporan: <ReportsPage />,
    profil: <ProfilePage />,
    pengaturan: <SettingsPage />,
  };
  return <AppShell route={route}>{pages[route] ?? <Dashboard />}</AppShell>;
}
