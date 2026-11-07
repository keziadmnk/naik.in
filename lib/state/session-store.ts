"use client";

import { create } from "zustand";
import { createClientAdapter } from "../data/adapter";
import type { Analysis, Business, JsonValue, Report, Repository } from "../data/types";
import { getDemoPreset } from "../data/presets";
import type { PresetId } from "../data/presets";

export type SessionTransaction = {
  id: string;
  tanggal: string;
  uraian: string;
  kategori: string;
  nominal: number;
  arah: "masuk" | "keluar";
};

export type LoanScenario = {
  plafon: number;
  bungaTahunan: number;
  tenorBulan: number;
};

export type FinanceIntake = {
  periodeHari: 30 | 60 | 90;
  sumber: { tipe: "csv" | "xlsx" | "pdf" | "cashbook" | "nota"; nama: string; status: "siap" | "diproses" | "manual" }[];
  pemetaanKolom: { tanggal: string; nominal: string; uraian: string } | null;
  extractionConfirmed: boolean;
  penjualanTunai: boolean | null;
  semuaPenjualanQris: boolean | null;
  estimasiHppRasio: number | null;
  biayaTetap: Record<string, number>;
  cicilanLama: number;
  kebutuhanRtMin: number;
};

type SessionState = {
  mode: "demo" | "live";
  presetId: PresetId;
  business: Business | null;
  confirmedTransactions: SessionTransaction[];
  costs: JsonValue;
  financeIntake: FinanceIntake | null;
  loanScenario: LoanScenario | null;
  labelResult: JsonValue | null;
  activeReport: Report | null;
  adapter: Repository;
  setBusiness: (business: Business) => void;
  setTransactions: (transactions: SessionTransaction[]) => void;
  setCosts: (costs: JsonValue) => void;
  setFinanceIntake: (intake: FinanceIntake) => void;
  setLoanScenario: (scenario: LoanScenario) => void;
  setLabelResult: (result: JsonValue) => void;
  saveAnalysis: (jenis: Analysis["jenis"], input: JsonValue, hasil: JsonValue, keyakinan?: number | null) => Promise<Analysis>;
  saveReport: (isi: JsonValue) => Promise<Report>;
  loadReport: (kodePublik: string) => Promise<Report | null>;
  selectPreset: (presetId: PresetId) => void;
  enterLiveMode: () => void;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  mode: "demo",
  presetId: "bu-sari",
  business: null,
  confirmedTransactions: [],
  costs: null,
  financeIntake: null,
  loanScenario: null,
  labelResult: null,
  activeReport: null,
  adapter: createClientAdapter(),
  setBusiness: (business) => set({ business }),
  setTransactions: (confirmedTransactions) => set({ confirmedTransactions }),
  setCosts: (costs) => set({ costs }),
  setFinanceIntake: (financeIntake) => set({ financeIntake, costs: { ...financeIntake.biayaTetap, cicilanLama: financeIntake.cicilanLama, kebutuhanRtMin: financeIntake.kebutuhanRtMin } }),
  setLoanScenario: (loanScenario) => set({ loanScenario }),
  setLabelResult: (labelResult) => set({ labelResult }),
  saveAnalysis: async (jenis, input, hasil, keyakinan = null) => {
    const business = get().business;
    if (!business) throw new Error("Profil usaha perlu disimpan sebelum analisis.");
    return get().adapter.analyses.create({ businessId: business.id, jenis, input, hasil, keyakinan });
  },
  saveReport: async (isi) => {
    const business = get().business;
    if (!business) throw new Error("Profil usaha perlu disimpan sebelum laporan.");
    const report = await get().adapter.reports.create({ businessId: business.id, kodePublik: "", isi });
    set({ activeReport: report });
    return report;
  },
  loadReport: async (kodePublik) => {
    const report = await get().adapter.reports.getByPublicCode(kodePublik);
    set({ activeReport: report });
    return report;
  },
  selectPreset: (presetId) => {
    const preset = getDemoPreset(presetId);
    set({
      mode: "demo",
      presetId,
      business: preset.business,
      confirmedTransactions: preset.transactions,
      costs: preset.costs,
      financeIntake: {
        periodeHari: 90,
        sumber: [{ tipe: "csv", nama: "Data preset 90 hari", status: "siap" }],
        pemetaanKolom: null,
        extractionConfirmed: false,
        penjualanTunai: true,
        semuaPenjualanQris: false,
        estimasiHppRasio: null,
        biayaTetap: preset.costs.biayaTetap,
        cicilanLama: preset.costs.cicilanLama,
        kebutuhanRtMin: preset.costs.kebutuhanRtMin,
      },
      loanScenario: null,
      labelResult: preset.label.fields,
      activeReport: null,
    });
  },
  enterLiveMode: () => set({
    mode: "live",
    business: null,
    confirmedTransactions: [],
    costs: null,
    financeIntake: null,
    loanScenario: null,
    labelResult: null,
    activeReport: null,
  }),
}));
