"use client";

import { Camera, CameraOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Card } from "./ui";

type Detector = { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>> };
type DetectorConstructor = new (options?: { formats?: string[] }) => Detector;
declare global { interface Window { BarcodeDetector?: DetectorConstructor } }

export function BarcodeScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("Belum memindai.");
  const [value, setValue] = useState("");

  async function start() {
    if (!window.BarcodeDetector) { setStatus("Perangkat ini belum mendukung pemindaian kamera. Gunakan input manual."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setActive(true); setStatus("Arahkan kamera ke QR atau barcode.");
    } catch { setStatus("Kamera tidak dapat dibuka. Periksa izin kamera atau gunakan input manual."); }
  }

  function stop() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null; setActive(false);
  }

  useEffect(() => {
    if (!active || !videoRef.current || !window.BarcodeDetector) return;
    const detector = new window.BarcodeDetector({ formats: ["qr_code", "ean_13", "ean_8", "code_128"] });
    let cancelled = false;
    async function scan() {
      if (cancelled || !videoRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        const found = codes[0]?.rawValue;
        if (found) { setValue(found); setStatus("Kode terbaca. Periksa kembali hasilnya sebelum menyimpan."); stop(); return; }
      } catch { /* kamera tetap berjalan; status manual tetap tersedia */ }
      if (!cancelled) window.setTimeout(() => void scan(), 350);
    }
    void scan();
    return () => { cancelled = true; };
  }, [active]);

  return <Card><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-navy">Scan QR / barcode</h2><p className="mt-1 text-sm text-muted">Pemeriksaan keterbacaan saja, bukan persetujuan BPOM atau keputusan ritel.</p></div>{active ? <CameraOff className="text-accent" aria-hidden="true" /> : <Camera className="text-accent" aria-hidden="true" />}</div><div className="mt-4 overflow-hidden rounded-card bg-navy">{active ? <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" aria-label="Pratinjau kamera scan barcode" /> : <div className="flex aspect-video items-center justify-center p-6 text-center text-sm text-indigo-100">Kamera siap digunakan bila browser mendukungnya.</div>}</div><div className="mt-3 flex flex-wrap gap-2"><Button onClick={() => void start()} disabled={active}>Mulai scan</Button>{active && <Button variant="secondary" onClick={stop}>Berhenti</Button>}</div><p className="mt-3 text-sm text-text-body" role="status">{status}</p>{value && <p className="mt-2 break-all rounded-control bg-tint p-3 text-sm font-bold text-navy">Hasil: {value}</p>}</Card>;
}
