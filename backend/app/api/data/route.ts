import { denganKonteks } from "@/lib/server/rute";


const tgl = (d: Date | string | null) => (d ? (typeof d === "string" ? d.slice(0, 10) : new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)) : null);

export async function GET() {
  return denganKonteks(
    async ({ user, businessId, db }) => {
      const { rows: [u] } = await db.query("SELECT name, email, phone FROM users WHERE id = $1", [user.id]);
      const { rows: [set] } = await db.query("SELECT * FROM user_settings WHERE user_id = $1", [user.id]);
      const pengaturan = {
        demo: { akunKosong: set?.demo_akun_kosong ?? false, dataTigaBulan: set?.demo_data_tiga_bulan ?? false, modeOffline: set?.mode_offline ?? false },
        kur: { cicilanLama: Number(set?.kur_cicilan_lama ?? 0), konservatif: set?.kur_konservatif ?? false, kebutuhanRT: set?.kur_kebutuhan_rt == null ? null : Number(set.kur_kebutuhan_rt) },
        turSelesai: set?.tur_selesai ?? false,
      };

      if (!businessId) {
        return {
          punyaUsaha: false,
          profil: { namaPemilik: u.name, email: u.email, telepon: u.phone ?? "", namaUsaha: "", kategoriUsaha: "Makanan & Minuman", kota: "", mulaiUsaha: "" },
          kategoriTambahan: [], transaksi: [], temuanDitindak: [], hariLibur: [], biayaRutin: [],
          pengingat: { harian: true, jam: "20:00", mingguan: true }, simulasi: [], produk: [], ringkasanAi: null,
          ...pengaturan,
        };
      }

      const { rows: [b] } = await db.query("SELECT nama, kota, kategori_usaha, mulai_usaha FROM businesses WHERE id = $1", [businessId]);
      const kategori = await db.query(
        "SELECT kode, nama, arah, kelompok, tetap FROM categories WHERE business_id = $1 AND aktif ORDER BY urutan, nama",
        [businessId],
      );
      const transaksi = await db.query(
        `SELECT t.id, t.tanggal, t.uraian, t.arah, c.kode AS kategori, t.metode, t.nominal, t.sumber, t.dikonfirmasi_at
         FROM transactions t JOIN categories c ON c.id = t.category_id
         WHERE t.business_id = $1 AND t.dihapus_at IS NULL
         ORDER BY t.tanggal, t.dibuat`,
        [businessId],
      );
      const temuan = await db.query("SELECT kunci FROM findings WHERE business_id = $1 AND status <> 'terbuka'", [businessId]);
      const libur = await db.query("SELECT tanggal FROM closed_days WHERE business_id = $1 ORDER BY tanggal", [businessId]);
      const biaya = await db.query("SELECT id, nama, jenis, nominal_bulanan FROM recurring_costs WHERE business_id = $1 ORDER BY urutan, dibuat", [businessId]);
      const pengingat = await db.query("SELECT jenis, to_char(jam, 'HH24:MI') AS jam, aktif FROM reminders WHERE business_id = $1", [businessId]);
      const harian = pengingat.rows.find((r) => r.jenis === "catat_harian");
      const mingguan = pengingat.rows.find((r) => r.jenis === "ringkasan_mingguan");
      const simulasi = await db.query("SELECT * FROM loan_simulations WHERE business_id = $1 ORDER BY dibuat DESC LIMIT 20", [businessId]);
      const produk = await db.query(
        `SELECT p.id, p.nama, c.mode, c.isian, c.teks_lain, c.dikonfirmasi_at
         FROM products p
         LEFT JOIN LATERAL (SELECT * FROM label_checks lc WHERE lc.product_id = p.id ORDER BY lc.dikonfirmasi_at DESC LIMIT 1) c ON true
         WHERE p.business_id = $1 AND p.dihapus_at IS NULL
         ORDER BY p.dibuat`,
        [businessId],
      );
      const { rows: [ai] } = await db.query(
        "SELECT poin, sumber, dibuat, jumlah_transaksi FROM ai_summaries WHERE business_id = $1 ORDER BY dibuat DESC LIMIT 1",
        [businessId],
      );

      return {
        punyaUsaha: true,
        profil: {
          namaPemilik: u.name, email: u.email, telepon: u.phone ?? "",
          namaUsaha: b.nama, kategoriUsaha: b.kategori_usaha, kota: b.kota, mulaiUsaha: tgl(b.mulai_usaha) ?? "",
        },
        kategoriTambahan: kategori.rows.map((k) => ({ id: k.kode, nama: k.nama, arah: k.arah, kelompok: k.kelompok, tetap: k.tetap || undefined })),
        transaksi: transaksi.rows.map((t) => ({
          id: t.id, tanggal: tgl(t.tanggal), uraian: t.uraian, arah: t.arah, kategoriId: t.kategori, metode: t.metode,
          nominal: Number(t.nominal), sumber: t.sumber, dikonfirmasiAt: new Date(t.dikonfirmasi_at).toISOString(),
        })),
        temuanDitindak: temuan.rows.map((r) => r.kunci),
        hariLibur: libur.rows.map((r) => tgl(r.tanggal)),
        biayaRutin: biaya.rows.map((r) => ({ id: r.id, nama: r.nama, jenis: r.jenis, nominalBulanan: Number(r.nominal_bulanan) })),
        pengingat: { harian: harian?.aktif ?? true, jam: harian?.jam ?? "20:00", mingguan: mingguan?.aktif ?? true },
        simulasi: simulasi.rows.map((s) => ({
          id: s.id, dibuat: new Date(s.dibuat).toISOString(), plafon: Number(s.plafon), tenor: s.tenor, bungaTahunan: Number(s.bunga_tahunan),
          cicilan: Number(s.cicilan_baru), status: s.status, npl: Number(s.npl_indikatif), kebutuhanRT: Number(s.kebutuhan_rt),
          cicilanLama: Number(s.cicilan_lama), diLaporan: s.di_laporan,
        })),
        produk: produk.rows.map((p) => ({
          id: p.id, nama: p.nama, mode: p.mode ?? "draf", data: p.isian ?? null, teksLain: p.teks_lain ?? "",
          diperiksaPada: p.dikonfirmasi_at ? tgl(p.dikonfirmasi_at) : null,
        })),
        ringkasanAi: ai ? { poin: ai.poin, sumber: ai.sumber, diperbaruiPada: tgl(ai.dibuat), jumlahTransaksi: ai.jumlah_transaksi } : null,
        ...pengaturan,
      };
    },
    { butuhUsaha: false },
  );
}
