import React, { useRef, useState } from "react";
import { toast } from "sonner";
import ShareCard9x16 from "@/components/ShareCard9x16";
import { nodeToPngBlob, shareBlobOrFallback } from "@/lib/share-achievement";

/**
 * Small snapshot tile used inside certificates.
 * Kept minimal: same visual across both mission + grand certificates.
 */
export function CertificateSnapshotCard({ label, value }) {
  return (
    <div className="rounded-xl border border-stone-700 bg-stone-950/40 p-3 text-center">
      <p className="text-[10px] uppercase tracking-widest text-stone-500">{label}</p>
      <p className="mt-1 font-display text-lg font-black text-stone-50">{value}</p>
    </div>
  );
}

/**
 * useShareableAchievement — centralizes the 9:16 image generation flow.
 * Renders a hidden <ShareCard9x16 /> off-screen and exposes:
 *   - shareCardNode: JSX to include in the page (hidden absolutely-positioned)
 *   - handleShare(): fires image capture + native share or download fallback
 *   - sharing: boolean loading state
 *
 * Same logic used by MissionCertificate + JourneyCertificate → zero duplication.
 */
export function useShareableAchievement({
  studentName, emoji, title, subtitle, dateStr, snapshot, filename, caption,
}) {
  const shareCardRef = useRef(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (!shareCardRef.current) return;
    setSharing(true);
    try {
      const blob = await nodeToPngBlob(shareCardRef.current);
      const res = await shareBlobOrFallback(blob, { filename, caption, title });
      if (res.shared) toast.success("Conquista compartilhada!");
      else if (!res.cancelled) toast.success("Imagem baixada. Cole no seu Status ou Story 📲");
    } catch (err) {
      console.warn("[share-achievement] falha ao gerar imagem:", err);
      toast.error("Não foi possível gerar a imagem. Tente novamente.");
    } finally {
      setSharing(false);
    }
  };

  const shareCardNode = (
    <div
      aria-hidden
      style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }}
    >
      <ShareCard9x16
        ref={shareCardRef}
        studentName={studentName}
        emoji={emoji}
        missionTitle={title}
        missionSubtitle={subtitle}
        dateStr={dateStr}
        snapshot={snapshot}
      />
    </div>
  );

  return { handleShare, sharing, shareCardNode };
}
