import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        navy: "var(--color-navy)",
        "navy-hover": "var(--color-navy-hover)",
        tint: "var(--color-tint)",
        accent: "var(--color-accent)",
        text: "var(--color-text)",
        "text-body": "var(--color-text-body)",
        muted: "var(--color-muted)",
        border: "var(--color-border)",
        ok: "var(--color-ok)",
        "ok-bg": "var(--color-ok-bg)",
        warn: "var(--color-warn)",
        "warn-bg": "var(--color-warn-bg)",
        danger: "var(--color-danger)",
        "danger-bg": "var(--color-danger-bg)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        control: "var(--radius-control)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
      },
    },
  },
  plugins: [],
};

export default config;
