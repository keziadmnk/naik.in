import { useEffect, useState, type ReactNode } from "react";
import { PortalRouter } from "./Portal";
import { bacaRute } from "./routes";
import { TokoProvider } from "./state/store";

type IconName =
  | "scan"
  | "chart"
  | "detect"
  | "sparkle"
  | "credit"
  | "stress"
  | "label"
  | "report"
  | "upload"
  | "insight"
  | "arrow"
  | "menu"
  | "close"
  | "check";

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const paths: Record<IconName, ReactNode> = {
    scan: (
      <>
        <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
        <path d="M8 9h8M8 12h8M8 15h5" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
      </>
    ),
    detect: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4M11 8v3l2 2" />
      </>
    ),
    sparkle: (
      <>
        <path d="M12 3c.4 4.2 2.8 6.6 7 7-4.2.4-6.6 2.8-7 7-.4-4.2-2.8-6.6-7-7 4.2-.4 6.6-2.8 7-7Z" />
        <path d="M19 3v4M21 5h-4" />
      </>
    ),
    credit: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M3 10h18M7 15h3" />
      </>
    ),
    stress: (
      <>
        <path d="M3 18 8 13l3 3 7-9" />
        <path d="M14 7h4v4" />
        <path d="M3 5v14h18" />
      </>
    ),
    label: (
      <>
        <path d="M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3" />
        <rect x="7" y="7" width="10" height="10" rx="2" />
        <path d="M9.5 10h5M9.5 13h3" />
      </>
    ),
    report: (
      <>
        <path d="M6 3h9l3 3v15H6z" />
        <path d="M14 3v4h4M9 11h6M9 15h6" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4M8 8l4-4 4 4" />
        <path d="M5 14v5h14v-5" />
      </>
    ),
    insight: (
      <>
        <path d="M9 18h6M10 22h4" />
        <path d="M8.5 15.5a7 7 0 1 1 7 0c-.7.5-1.5 1.2-1.5 2.5h-4c0-1.3-.8-2-1.5-2.5Z" />
      </>
    ),
    arrow: <path d="M5 12h14M14 7l5 5-5 5" />,
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
  };

  return <svg {...common}>{paths[name]}</svg>;
}

const features: {
  icon: IconName;
  title: string;
  description: string;
  points: string[];
  featured?: boolean;
}[] = [
  {
    icon: "chart",
    title: "Keuangan",
    description: "Catat uang masuk dan keluar usaha tanpa repot, lalu pahami kondisinya.",
    points: ["Catat dengan scan & unggah file", "Riwayat transaksi", "Rekap kas mingguan & bulanan", "Ringkasan AI"],
    featured: true,
  },
  {
    icon: "credit",
    title: "Simulasi Kesiapan KUR",
    description: "Coba rencana pinjaman dan lihat dampaknya ke kas usaha sebelum mengajukan.",
    points: ["Slider rencana pinjaman", "Uji kas saat minggu sepi"],
  },
  {
    icon: "label",
    title: "Label Produk",
    description: "Periksa kelengkapan keterangan pada kemasan produkmu.",
    points: ["Cek 9 keterangan wajib label BPOM", "Saran perbaikan label"],
  },
  {
    icon: "report",
    title: "Laporan",
    description: "Rangkum kondisi usaha dalam satu dokumen yang rapi.",
    points: ["Rekap 6 bulan", "Siap cetak & dibagikan"],
  },
];

function Logo() {
  return (
    <a className="logo" href="#beranda" aria-label="NAIK.IN Beranda">
      NAIK<span>.IN</span>
      <i />
    </a>
  );
}

function LineChart({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      className={compact ? "line-chart compact" : "line-chart"}
      viewBox="0 0 340 112"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={compact ? "area-compact" : "area"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5B65DC" stopOpacity=".28" />
          <stop offset="1" stopColor="#5B65DC" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className="chart-grid" d="M0 20H340M0 56H340M0 92H340" />
      <path
        className="chart-area"
        fill={`url(#${compact ? "area-compact" : "area"})`}
        d="M0 90 C34 86 50 67 82 73 S126 84 158 56 S202 49 225 55 S271 35 292 38 S320 19 340 17 V112 H0Z"
      />
      <path
        className="chart-path"
        d="M0 90 C34 86 50 67 82 73 S126 84 158 56 S202 49 225 55 S271 35 292 38 S320 19 340 17"
      />
      {!compact && (
        <path
          className="chart-path secondary"
          d="M0 75 C42 71 61 84 98 77 S151 71 180 80 S233 65 260 69 S307 56 340 61"
        />
      )}
    </svg>
  );
}

function HeroDashboard() {
  return (
    <div className="dashboard-stage" aria-label="Pratinjau antarmuka analisis NAIK.IN">
      <div className="stage-glow" />

      <article className="dash-card financial-card">
        <div className="card-topline">
          <div>
            <span className="eyebrow">Ringkasan Keuangan</span>
            <h3>Financial Health</h3>
          </div>
          <span className="mini-pill">6 Bulan</span>
        </div>
        <div className="metric-main">
          <span>Total Pendapatan</span>
          <strong>Rp24.500.000</strong>
          <small>+12,8% dari periode lalu</small>
        </div>
        <div className="bar-chart" aria-hidden="true">
          {[38, 55, 46, 72, 64, 88].map((value, index) => (
            <div key={index} className="bar-slot">
              <i style={{ height: `${value}%` }} />
              <span>{["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"][index]}</span>
            </div>
          ))}
        </div>
        <div className="split-metrics">
          <div>
            <span>Pengeluaran</span>
            <b>Rp15,2 jt</b>
          </div>
          <div>
            <span>Arus Kas Bersih</span>
            <b>+Rp9,3 jt</b>
          </div>
        </div>
      </article>

      <article className="dash-card ai-card">
        <div className="app-bar">
          <div className="tiny-logo">N</div>
          <span>Dashboard Bisnis</span>
          <div className="app-actions">
            <i />
            <i />
          </div>
        </div>
        <div className="ai-body">
          <div className="ai-kicker">
            <Icon name="sparkle" size={13} /> NAIK.IN AI Analysis
          </div>
          <div className="ai-heading-row">
            <div>
              <span>Halo, Pemilik Usaha</span>
              <h3>Memahami Keuangan Bisnismu</h3>
            </div>
            <span className="period-pill">Jan—Jun 2026</span>
          </div>
          <div className="summary-grid">
            <div>
              <span>Pendapatan</span>
              <strong>Rp24,5 jt</strong>
              <small>+12,8%</small>
            </div>
            <div>
              <span>Pengeluaran</span>
              <strong>Rp15,2 jt</strong>
              <small>62% rasio</small>
            </div>
            <div>
              <span>Laba Bersih</span>
              <strong>Rp9,3 jt</strong>
              <small>Sehat</small>
            </div>
          </div>
          <div className="analytics-panel">
            <div className="panel-head">
              <div>
                <b>Tren Arus Kas</b>
                <span> Pendapatan vs pengeluaran</span>
              </div>
              <div className="legend">
                <i />
                Pendapatan <i />
                Pengeluaran
              </div>
            </div>
            <LineChart />
            <div className="month-labels">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>Mei</span>
              <span>Jun</span>
            </div>
          </div>
          <div className="insight-panel">
            <div className="insight-icon">
              <Icon name="sparkle" size={15} />
            </div>
            <div>
              <span>AI Insight</span>
              <p>Pendapatan usahamu menunjukkan tren meningkat selama periode analisis.</p>
            </div>
            <button aria-label="Buka insight">
              <Icon name="arrow" size={15} />
            </button>
          </div>
        </div>
      </article>

      <article className="dash-card credit-card">
        <div className="credit-top">
          <span className="glass-pill">
            <Icon name="credit" size={13} /> Credit Readiness
          </span>
          <i className="status-dot" />
        </div>
        <h3>Simulasi Kemampuan Cicilan</h3>
        <p>Ukur kesiapan arus kas sebelum menentukan pembiayaan.</p>
        <div className="credit-values">
          <div>
            <span>Rencana Pinjaman</span>
            <b>Rp30.000.000</b>
          </div>
          <div>
            <span>Tenor</span>
            <b>24 Bulan</b>
          </div>
        </div>
        <div className="capacity">
          <div className="capacity-head">
            <span>Kapasitas arus kas</span>
            <b>72%</b>
          </div>
          <div className="progress">
            <i />
          </div>
          <div className="capacity-labels">
            <span>Estimasi tersedia</span>
            <span>Kewajiban cicilan</span>
          </div>
        </div>
        <div className="scenario">
          <span>Skenario Analisis</span>
          <b>Skenario Normal</b>
        </div>
        <a href="#pilar">
          Lihat Simulasi <Icon name="arrow" size={15} />
        </a>
      </article>

      <div className="float-chip anomaly-chip">
        <span className="chip-icon">
          <Icon name="detect" size={16} />
        </span>
        <div>
          <b>3 Transaksi</b>
          <small>Perlu diperiksa</small>
        </div>
      </div>
      <div className="float-chip insight-chip">
        <Icon name="sparkle" size={15} />
        <b>Insight Keuangan Siap</b>
      </div>
      <div className="float-chip trend-chip">
        <div>
          <small>Tren Laba</small>
          <b>+18,4%</b>
        </div>
        <LineChart compact />
      </div>
    </div>
  );
}

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("visible")),
      { threshold: 0.12 },
    );
    document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <main>
      <section className="hero" id="beranda">
        <div className="hero-grid" />
        <div className="orb orb-one" />
        <div className="orb orb-two" />
        <nav className="nav-shell" aria-label="Navigasi utama">
          <Logo />
          <div className={`nav-links ${menuOpen ? "open" : ""}`}>
            {[
              ["Beranda", "#beranda"],
              ["Fitur", "#fitur"],
              ["Cara Kerja", "#cara-kerja"],
              ["Tentang Kami", "#pilar"],
              ["FAQ", "#faq"],
            ].map(([label, link]) => (
              <a key={label} href={link} onClick={closeMenu}>
                {label}
              </a>
            ))}
            <div className="mobile-nav-actions">
              <a href="#/login" onClick={closeMenu}>
                Masuk
              </a>
              <a className="nav-cta" href="#/register" onClick={closeMenu}>
                Mulai Gratis
              </a>
            </div>
          </div>
          <div className="nav-actions">
            <a href="#/login">Masuk</a>
            <a className="nav-cta" href="#/register">
              Mulai Gratis
            </a>
          </div>
          <button
            className="menu-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-label="Buka menu"
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
        </nav>

        <div className="hero-content">
          <div className="hero-badge">
            <Icon name="sparkle" size={14} /> AI-Powered Business Readiness Platform
          </div>
          <h1>
            Pahami Bisnismu.
            <br />
            <span>NAIK.IN Kelasnya</span>
          </h1>
          <p>
            Ubah catatan keuangan dan informasi produk menjadi insight bisnis yang lebih jelas.
            Analisis kesehatan keuangan, simulasikan kesiapan kredit, dan persiapkan produkmu untuk
            berkembang bersama AI.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#/register">
              Mulai Analisis Gratis <Icon name="arrow" size={17} />
            </a>
            <a className="button secondary" href="#cara-kerja">
              Lihat Cara Kerja <span>↗</span>
            </a>
          </div>
        </div>
        <HeroDashboard />
        <div className="hero-bottom-glow" />
        <div className="wave" aria-hidden="true">
          <svg viewBox="0 0 1440 155" preserveAspectRatio="none">
            <path
              fill="#FAFAFD"
              d="M0,98 C230,163 370,118 579,107 C844,92 1064,191 1440,70 L1440,155 L0,155 Z"
            />
          </svg>
        </div>
      </section>

      <section className="section features-section" id="fitur">
        <div className="container">
          <header className="section-heading reveal">
            <span className="section-badge">Our Features</span>
            <h2>
              Satu Platform, Lebih Banyak
              <br />
              <span>Peluang untuk Naik Kelas.</span>
            </h2>
            <p>
              Empat menu utama untuk mencatat keuangan, menyiapkan rencana pinjaman, memeriksa
              label, dan merangkum kondisi usahamu.
            </p>
          </header>
          <div className="feature-grid">
            {features.map((feature, index) => (
              <article
                className={`feature-card reveal ${feature.featured ? "featured" : ""}`}
                style={{ transitionDelay: `${(index % 4) * 70}ms` }}
                key={feature.title}
              >
                <div className="feature-icon">
                  <Icon name={feature.icon} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <ul className="feature-points">
                  {feature.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <a href="#/register">
                  {feature.featured ? "Mulai Mencatat" : "Coba Sekarang"} <span>↗</span>
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section pillars-section" id="pilar">
        <div className="container">
          <header className="section-heading compact-heading reveal">
            <span className="section-badge">Business Readiness</span>
            <h2>
              Dua Kesiapan, Satu Langkah
              <br />
              <span>untuk Berkembang.</span>
            </h2>
          </header>
          <div className="pillar-grid">
            <article className="pillar-card financial-pillar reveal">
              <div className="pillar-copy">
                <span className="pillar-label">01 · Keuangan</span>
                <h3>Financial Readiness</h3>
                <p>
                  Kenali kondisi keuangan, ukur kesiapan kredit, dan simulasikan kemampuan membayar
                  cicilan KUR sebelum mengambil keputusan pembiayaan.
                </p>
                <div className="mini-features">
                  {[
                    "Kesehatan Keuangan",
                    "Kesiapan Kredit",
                    "Simulasi KUR",
                    "Stress Test Cicilan",
                  ].map((item) => (
                    <span key={item}>
                      <Icon name="check" size={13} />
                      {item}
                    </span>
                  ))}
                </div>
                <a href="#/kur">
                  Jelajahi Financial Readiness <Icon name="arrow" size={16} />
                </a>
              </div>
              <div className="pillar-visual finance-visual">
                <div className="visual-top">
                  <span>Performa Usaha</span>
                  <b>+24.8%</b>
                </div>
                <div className="kur-visual-row">
                  <div>
                    <span>Kapasitas Cicilan</span>
                    <b>Rp1,8 jt / bulan</b>
                  </div>
                  <div>
                    <span>Kesiapan KUR</span>
                    <b>
                      <i />
                      Relatif Aman
                    </b>
                  </div>
                </div>
                <LineChart />
                <div className="visual-stats">
                  <span>
                    <i />
                    Pendapatan
                  </span>
                  <span>
                    <i />
                    Pengeluaran
                  </span>
                  <em>Simulasi berdasarkan arus kas</em>
                </div>
              </div>
            </article>
            <article className="pillar-card product-pillar reveal">
              <div className="pillar-copy">
                <span className="pillar-label">02 · Produk</span>
                <h3>Product Readiness</h3>
                <p>
                  Persiapkan informasi dan kelengkapan label produk untuk menjangkau pasar yang
                  lebih luas.
                </p>
                <div className="mini-features">
                  {[
                    "AI Label Scanner",
                    "Pemeriksaan Informasi Produk",
                    "Rekomendasi Persiapan",
                  ].map((item) => (
                    <span key={item}>
                      <Icon name="check" size={13} />
                      {item}
                    </span>
                  ))}
                </div>
                <a href="#cara-kerja">
                  Jelajahi Product Readiness <Icon name="arrow" size={16} />
                </a>
              </div>
              <div className="pillar-visual label-visual">
                <div className="scan-corners" />
                <div className="package">
                  <div className="package-top" />
                  <b>Produk Lokal</b>
                  <span>Informasi Produk</span>
                  <i />
                  <i />
                  <i />
                </div>
                <div className="scan-line" />
                <span className="scan-status">
                  <Icon name="sparkle" size={12} /> AI sedang memeriksa
                </span>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="section how-section" id="cara-kerja">
        <div className="container">
          <header className="section-heading reveal">
            <span className="section-badge">How It Works</span>
            <h2>
              Dari Data Menjadi <span>Langkah Nyata.</span>
            </h2>
            <p>
              Tiga langkah sederhana untuk memahami bisnis dan merencanakan pertumbuhan dengan lebih
              percaya diri.
            </p>
          </header>
          <div className="steps">
            {[
              {
                number: "01",
                icon: "upload" as IconName,
                title: "Unggah Data Usaha",
                text: "Masukkan catatan keuangan atau informasi produk yang ingin dianalisis.",
              },
              {
                number: "02",
                icon: "sparkle" as IconName,
                title: "Analisis dengan AI",
                text: "AI membantu membaca data, mengidentifikasi informasi penting, dan menemukan hal yang perlu diperiksa.",
              },
              {
                number: "03",
                icon: "insight" as IconName,
                title: "Dapatkan Insight",
                text: "Pahami hasil analisis dan rekomendasi untuk mempersiapkan langkah pengembangan usaha.",
              },
            ].map((step, index) => (
              <article
                className="step reveal"
                style={{ transitionDelay: `${index * 120}ms` }}
                key={step.number}
              >
                <span className="step-number">{step.number}</span>
                <div className="step-icon">
                  <Icon name={step.icon} size={25} />
                </div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section cta-wrap" id="mulai">
        <div className="container">
          <div className="cta-panel reveal">
            <div className="cta-grid" />
            <div className="cta-glow" />
            <span className="cta-kicker">
              <Icon name="sparkle" size={14} /> Mulai Bertumbuh
            </span>
            <h2>
              Siap Membawa Bisnismu
              <br />
              <span>Naik ke Level Berikutnya?</span>
            </h2>
            <p>Mulai pahami kondisi keuangan dan kesiapan produk usahamu bersama NAIK.IN.</p>
            <a href="#/register" className="button white">
              Mulai Sekarang <Icon name="arrow" size={17} />
            </a>
          </div>
        </div>
      </section>

      <footer id="faq">
        <div className="container">
          <div className="footer-top">
            <div>
              <Logo />
              <p>Know Your Business. Prepare to Grow.</p>
            </div>
            <div className="footer-links">
              <a href="#beranda">Beranda</a>
              <a href="#fitur">Fitur</a>
              <a href="#cara-kerja">Cara Kerja</a>
              <a href="#faq">FAQ</a>
              <a href="#faq">Kebijakan Privasi</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 NAIK.IN. All rights reserved.</span>
            <span>Memberdayakan UMKM Indonesia dengan insight yang lebih baik.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function App() {
  const [rute, setRute] = useState(() => bacaRute());

  useEffect(() => {
    const ubah = () => setRute(bacaRute());
    window.addEventListener("hashchange", ubah);
    return () => window.removeEventListener("hashchange", ubah);
  }, []);

  return <TokoProvider>{rute ? <PortalRouter route={rute.route} sub={rute.sub} /> : <LandingPage />}</TokoProvider>;
}

export default App;
