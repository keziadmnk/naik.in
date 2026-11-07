export type AppRoute =
  | "login"
  | "register"
  | "onboarding"
  | "beranda"
  | "keuangan"
  | "kur"
  | "label"
  | "laporan"
  | "akun"
  | "pengaturan";

const SEMUA: AppRoute[] = ["login", "register", "onboarding", "beranda", "keuangan", "kur", "label", "laporan", "akun", "pengaturan"];

export function goTo(route: AppRoute | "landing", sub?: string) {
  window.location.hash = route === "landing" ? "#beranda" : `#/${route}${sub ? `/${sub}` : ""}`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function bacaRute(hash = window.location.hash): { route: AppRoute; sub: string | null } | null {
  if (!hash.startsWith("#/")) return null;
  const [route, sub] = hash.slice(2).split("/");
  if (route === "profil") return { route: "akun", sub: null };
  return SEMUA.includes(route as AppRoute) ? { route: route as AppRoute, sub: sub ?? null } : { route: "beranda", sub: null };
}
