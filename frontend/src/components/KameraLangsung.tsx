import { useEffect, useRef, useState } from "react";
import { PIcon } from "./icons";
import { Modal } from "./ui";

export const kameraLangsungTersedia = () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext;

export function KameraLangsung({
  judul = "Ambil foto",
  petunjuk,
  onAmbil,
  onTutup,
  onGagal,
}: {
  judul?: string;
  petunjuk?: string;
  onAmbil: (file: File) => void;
  onTutup: () => void;
  onGagal: (alasan: string) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [kamera, setKamera] = useState<MediaDeviceInfo[]>([]);
  const [pilihan, setPilihan] = useState<string | null>(null);
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    let batal = false;
    let aktif: MediaStream | null = null;
    setSiap(false);
    navigator.mediaDevices
      .getUserMedia({
        video: pilihan ? { deviceId: { exact: pilihan }, width: { ideal: 1920 }, height: { ideal: 1080 } } : { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      .then(async (s) => {
        if (batal) return s.getTracks().forEach((t) => t.stop());
        aktif = s;
        setStream(s);
        const daftar = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
        if (!batal) setKamera(daftar);
      })
      .catch((e: unknown) => {
        if (batal) return;
        const nama = e instanceof DOMException ? e.name : "";
        onGagal(nama === "NotAllowedError" ? "Izin kamera ditolak." : nama === "NotFoundError" ? "Kamera tidak ditemukan." : "Kamera tidak dapat dibuka.");
      });
    return () => {
      batal = true;
      aktif?.getTracks().forEach((t) => t.stop());
    };
  }, [pilihan]);

  useEffect(() => {
    if (video.current && stream) video.current.srcObject = stream;
  }, [stream]);

  const jepret = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const kanvas = document.createElement("canvas");
    kanvas.width = v.videoWidth;
    kanvas.height = v.videoHeight;
    kanvas.getContext("2d")?.drawImage(v, 0, 0);
    kanvas.toBlob(
      (blob) => {
        if (!blob) return;
        stream?.getTracks().forEach((t) => t.stop());
        onAmbil(new File([blob], `kamera-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  };

  const gantiKamera = () => {
    if (kamera.length < 2) return;
    const sekarang = stream?.getVideoTracks()[0]?.getSettings().deviceId;
    const i = kamera.findIndex((k) => k.deviceId === sekarang);
    setPilihan(kamera[(i + 1) % kamera.length].deviceId);
  };

  return (
    <Modal judul={judul} onTutup={onTutup} lebar={720}>
      <div className="nk-kamera">
        {petunjuk && <p className="nk-muted">{petunjuk}</p>}
        <div className="nk-kamera-layar">
          <video ref={video} autoPlay playsInline muted onLoadedData={() => setSiap(true)} />
          {!siap && <span className="nk-kamera-memuat">Menyalakan kamera…</span>}
        </div>
        <div className="nk-kamera-aksi">
          {kamera.length > 1 ? (
            <button type="button" className="portal-secondary" onClick={gantiKamera}>
              <PIcon name="refresh" size={15} /> Ganti kamera
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="portal-primary" onClick={jepret} disabled={!siap}>
            <PIcon name="camera" size={16} /> Ambil foto
          </button>
        </div>
      </div>
    </Modal>
  );
}
