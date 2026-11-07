"use client";

import { CloudOff, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

export function ConnectionStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return (
    <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold ${online ? "bg-ok-bg text-ok" : "bg-warn-bg text-warn"}`} role="status" aria-live="polite">
      {online ? <Wifi size={14} aria-hidden="true" /> : <CloudOff size={14} aria-hidden="true" />}
      {online ? "Terhubung" : "Offline · Mode Demo"}
    </span>
  );
}
