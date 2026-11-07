"use client";

import { useEffect, useState } from "react";
import { Button, Dialog } from "./ui";

export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    const handler = (installEvent: Event) => {
      installEvent.preventDefault();
      setEvent(installEvent as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!event) {
      setShowIos(true);
      return;
    }
    await event.prompt();
    setEvent(null);
  };

  return (
    <>
      <Button variant="secondary" onClick={install}>Pasang aplikasi</Button>
      <Dialog open={showIos} title="Pasang di iPhone atau iPad" onClose={() => setShowIos(false)}>
        <p className="text-sm text-text-body">Buka menu Bagikan di Safari, lalu pilih <strong>Tambahkan ke Layar Utama</strong>.</p>
      </Dialog>
    </>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}
