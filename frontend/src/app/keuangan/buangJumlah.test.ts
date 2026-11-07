import { describe, expect, it } from "vitest";
import { buangJumlah } from "./PanelCatat";

describe("uraian hasil AI tanpa penanda kuantitas", () => {
  it("membuang ×N, xN, (N), Nx di akhir nama item", () => {
    expect(buangJumlah("Indomie telor kari ayam ×1")).toBe("Indomie telor kari ayam");
    expect(buangJumlah("Maggi x2")).toBe("Maggi");
    expect(buangJumlah("Teh manis hangat × 3")).toBe("Teh manis hangat");
    expect(buangJumlah("Jagung bakar (2)")).toBe("Jagung bakar");
    expect(buangJumlah("Es teh 3x")).toBe("Es teh");
  });

  it("satuan barang & angka di tengah nama tetap utuh", () => {
    expect(buangJumlah("beli cabai 5 kg")).toBe("beli cabai 5 kg");
    expect(buangJumlah("Standing pouch 500 pcs")).toBe("Standing pouch 500 pcs");
    expect(buangJumlah("Telor ½ mateng")).toBe("Telor ½ mateng");
    expect(buangJumlah("Minyak goreng 10 L")).toBe("Minyak goreng 10 L");
  });
});
