const KOTA = [
  "Banda Aceh", "Langsa", "Lhokseumawe", "Sabang", "Subulussalam", "Medan", "Binjai", "Pematangsiantar", "Pematang Siantar", "Tebing Tinggi",
  "Tanjungbalai", "Tanjung Balai", "Sibolga", "Padangsidimpuan", "Padang Sidempuan", "Gunungsitoli", "Deli Serdang", "Padang", "Bukittinggi",
  "Payakumbuh", "Pariaman", "Solok", "Sawahlunto", "Padang Panjang", "Pekanbaru", "Dumai", "Batam", "Tanjungpinang", "Tanjung Pinang", "Jambi",
  "Sungai Penuh", "Palembang", "Prabumulih", "Lubuklinggau", "Lubuk Linggau", "Pagar Alam", "Pagaralam", "Bengkulu", "Bandar Lampung",
  "Metro", "Pangkalpinang", "Pangkal Pinang",
  "Jakarta", "Jakarta Pusat", "Jakarta Utara", "Jakarta Barat", "Jakarta Selatan", "Jakarta Timur", "Bogor", "Depok", "Bekasi", "Tangerang",
  "Tangerang Selatan", "Serang", "Cilegon", "Bandung", "Cimahi", "Sukabumi", "Cirebon", "Tasikmalaya", "Banjar", "Karawang", "Purwakarta",
  "Subang", "Garut", "Sumedang", "Cianjur", "Majalengka", "Kuningan", "Indramayu", "Semarang", "Surakarta", "Solo", "Salatiga", "Magelang",
  "Pekalongan", "Tegal", "Kudus", "Pati", "Jepara", "Demak", "Rembang", "Blora", "Grobogan", "Boyolali", "Klaten", "Sukoharjo", "Wonogiri",
  "Karanganyar", "Sragen", "Kendal", "Batang", "Pemalang", "Brebes", "Banyumas", "Purwokerto", "Cilacap", "Kebumen", "Purworejo", "Wonosobo",
  "Temanggung", "Banjarnegara", "Purbalingga", "Yogyakarta", "Sleman", "Bantul", "Kulon Progo", "Gunungkidul", "Gunung Kidul", "Surabaya",
  "Sidoarjo", "Gresik", "Malang", "Batu", "Kediri", "Blitar", "Madiun", "Mojokerto", "Pasuruan", "Probolinggo", "Jember", "Banyuwangi",
  "Lumajang", "Bondowoso", "Situbondo", "Lamongan", "Tuban", "Bojonegoro", "Ngawi", "Magetan", "Ponorogo", "Pacitan", "Trenggalek",
  "Tulungagung", "Nganjuk", "Jombang", "Bangkalan", "Sampang", "Pamekasan", "Sumenep",
  "Denpasar", "Badung", "Gianyar", "Tabanan", "Buleleng", "Singaraja", "Klungkung", "Karangasem", "Mataram", "Bima", "Lombok", "Kupang",
  "Ende", "Maumere",
  "Pontianak", "Singkawang", "Palangka Raya", "Palangkaraya", "Banjarmasin", "Banjarbaru", "Balikpapan", "Samarinda", "Bontang",
  "Tarakan", "Tanjung Selor",
  "Makassar", "Parepare", "Pare-Pare", "Palopo", "Gowa", "Maros", "Bone", "Manado", "Bitung", "Tomohon", "Kotamobagu", "Gorontalo",
  "Palu", "Kendari", "Baubau", "Bau-Bau", "Mamuju",
  "Ambon", "Tual", "Ternate", "Tidore", "Sofifi", "Jayapura", "Sorong", "Manokwari", "Merauke", "Timika", "Nabire",
];

const lolos = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const POLA_KOTA = new RegExp(`(^|[^\\p{L}])(${[...KOTA].sort((a, b) => b.length - a.length).map(lolos).join("|")})(?=[^\\p{L}]|$)`, "iu");
const POLA_ADMINISTRATIF = /(^|[^\p{L}])(kota|kab\.?|kabupaten|kec\.?|kecamatan)\s+[\p{L}]{3,}/iu;

export function cariKota(alamat: string, kotaTambahan = ""): string | null {
  const tambahan = kotaTambahan.trim();
  if (tambahan && alamat.toLocaleLowerCase().includes(tambahan.toLocaleLowerCase())) return tambahan;
  const m = alamat.match(POLA_KOTA);
  if (m) return m[2];
  const a = alamat.match(POLA_ADMINISTRATIF);
  return a ? a[0].replace(/^[^\p{L}]/u, "").trim() : null;
}
