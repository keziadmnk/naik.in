import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HARI_INI_DEMO, PROFIL_DEMO, produkDemo, transaksiDemo } from "../src/data/demo";
import { cariKlaim, hitungSkor } from "../src/lib/engine/label";

const tujuan = resolve(dirname(fileURLToPath(import.meta.url)), "../../backend/db/seed-data/bu-sari.json");
const transaksi = transaksiDemo().map((t) => ({
  tanggal: t.tanggal,
  uraian: t.uraian,
  arah: t.arah,
  kategori: t.kategoriId,
  metode: t.metode,
  nominal: t.nominal,
}));
const p = produkDemo();
const skor = hitungSkor(p.data, p.mode, PROFIL_DEMO.kota);
const produk = [{
  id: p.id,
  nama: p.nama,
  mode: p.mode,
  isian: p.data,
  teksLain: p.teksLain,
  skor: Math.round(skor.skor * 100) / 100,
  kategori: skor.kategori,
  rincian: skor.items,
  klaim: cariKlaim(p.teksLain),
}];
mkdirSync(dirname(tujuan), { recursive: true });
writeFileSync(
  tujuan,
  JSON.stringify(
    {
      keterangan: "Dihasilkan oleh frontend/scripts/export-demo.ts — jangan diedit manual.",
      hariIni: HARI_INI_DEMO,
      profil: PROFIL_DEMO,
      biayaRutin: [
        { nama: "Sewa kios", jenis: "usaha", nominalBulanan: 800000 },
        { nama: "Listrik & air usaha", jenis: "usaha", nominalBulanan: 350000 },
      ],
      transaksi,
      produk,
    },
    null,
    1,
  ) + "\n",
);
console.log(`✔ ${transaksi.length} transaksi diekspor ke ${tujuan}`);
