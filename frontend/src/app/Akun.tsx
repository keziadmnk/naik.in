import { useState } from "react";
import { PIcon } from "../components/icons";
import type { ProfilUsaha } from "../data/types";
import { useToko } from "../state/store";
import { lamaUsaha } from "./Beranda";

const KATEGORI_USAHA = ["Makanan & Minuman", "Perdagangan", "Jasa", "Kerajinan"];

function Isian({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="nk-field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function FormProfilUsaha() {
  const { profil, hariIni, kirim } = useToko();
  const [p, setP] = useState<ProfilUsaha>(profil);
  const [tersimpan, setTersimpan] = useState(false);
  const set = (k: keyof ProfilUsaha) => (v: string) => {
    setP({ ...p, [k]: v });
    setTersimpan(false);
  };
  return (
    <form
      className="nk-form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        kirim({ type: "profil", profil: { namaUsaha: p.namaUsaha, kategoriUsaha: p.kategoriUsaha, kota: p.kota, mulaiUsaha: p.mulaiUsaha } });
        setTersimpan(true);
      }}
    >
      <Isian label="Nama usaha" value={p.namaUsaha} onChange={set("namaUsaha")} />
      <label className="nk-field">
        <span>Kategori usaha</span>
        <select value={p.kategoriUsaha} onChange={(e) => set("kategoriUsaha")(e.target.value)}>
          {KATEGORI_USAHA.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </label>
      <Isian label="Kota" value={p.kota} onChange={set("kota")} />
      <label className="nk-field">
        <span>Mulai usaha</span>
        <input type="date" value={p.mulaiUsaha} max={hariIni} onChange={(e) => set("mulaiUsaha")(e.target.value)} />
        <small>Usaha berjalan {lamaUsaha(p.mulaiUsaha, hariIni)}</small>
      </label>
      <div className="nk-form-aksi">
        <button className="nk-btn" type="submit">
          Simpan profil usaha
        </button>
        {tersimpan && (
          <span className="nk-ok">
            <PIcon name="check" size={15} /> Tersimpan
          </span>
        )}
      </div>
    </form>
  );
}

export function Akun() {
  const { profil, kirim } = useToko();
  const [a, setA] = useState({ namaPemilik: profil.namaPemilik, email: profil.email, telepon: profil.telepon });
  const [tersimpan, setTersimpan] = useState(false);
  return (
    <div className="nk-halaman nk-akun-halaman">
      <section className="nk-card nk-set-kartu">
        <h3>Data akun</h3>
        <form
          className="nk-form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            kirim({ type: "profil", profil: a });
            setTersimpan(true);
          }}
        >
          <Isian label="Nama lengkap" value={a.namaPemilik} onChange={(v) => (setA({ ...a, namaPemilik: v }), setTersimpan(false))} />
          <Isian label="Email" type="email" value={a.email} onChange={(v) => (setA({ ...a, email: v }), setTersimpan(false))} />
          <Isian label="Nomor WhatsApp" type="tel" value={a.telepon} onChange={(v) => (setA({ ...a, telepon: v }), setTersimpan(false))} />
          <label className="nk-field">
            <span>Kata sandi</span>
            <input type="password" value="••••••••••" disabled />
            <small>Ubah kata sandi lewat menu Lupa Kata Sandi di halaman masuk.</small>
          </label>
          <div className="nk-form-aksi">
            <button className="nk-btn" type="submit">
              Simpan data akun
            </button>
            {tersimpan && (
              <span className="nk-ok">
                <PIcon name="check" size={15} /> Tersimpan
              </span>
            )}
          </div>
        </form>
      </section>
      <section className="nk-card nk-set-kartu">
        <h3>Profil usaha</h3>
        <FormProfilUsaha />
      </section>
    </div>
  );
}
