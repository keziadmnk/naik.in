import { PIcon } from "./icons";

export function GarisPindai() {
  return <i className="nk-pindai-garis" aria-hidden="true" />;
}

export function Pemindai({ src, teks, subteks }: { src?: string | null; teks: string; subteks?: string }) {
  return (
    <div className="nk-pindai" role="status" aria-live="polite">
      <div className="nk-pindai-bingkai">
        {src ? (
          <img src={src} alt="Dokumen yang sedang dibaca" />
        ) : (
          <span className="nk-pindai-dok">
            <PIcon name="report" size={44} />
          </span>
        )}
        <GarisPindai />
      </div>
      <b>{teks}</b>
      {subteks && <small>{subteks}</small>}
    </div>
  );
}
