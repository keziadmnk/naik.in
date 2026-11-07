import { useMemo } from "react";
import { rekomendasi, siapkanData, type DataPinjaman, type Kapasitas } from "../../lib/engine/loan";
import { useToko } from "../../state/store";

export function useDataPinjaman(): DataPinjaman {
  const { transaksi, perluDicek, kategori, hariIni, hariLibur } = useToko();
  return useMemo(
    () => siapkanData(transaksi.filter((t) => !perluDicek.has(t.id)), kategori, hariIni, hariLibur),
    [transaksi, perluDicek, kategori, hariIni, hariLibur],
  );
}

export function useKapasitasKur(data: DataPinjaman) {
  const { kur } = useToko();
  const kebutuhanRT = 0;
  const kap: Kapasitas = useMemo(
    () => ({ labaRata: data.labaRata, labaStress: data.labaStress, labaTerburuk: data.labaTerburuk, kebutuhanRT, cicilanLama: kur.cicilanLama }),
    [data, kebutuhanRT, kur.cicilanLama],
  );
  const rek = useMemo(() => rekomendasi(kap, kur.konservatif), [kap, kur.konservatif]);
  return { kebutuhanRT, kap, rek };
}
