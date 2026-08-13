import React, { forwardRef } from "react";
import { Crown, Sparkles, Award, Trophy } from "lucide-react";

// Reusable 9:16 vertical share card (1080×1920).
// Rendered off-screen inside a fixed position wrapper by the sharer.
// Kept purposefully simple: solid dark background + gold accents to match the app.
const ShareCard9x16 = forwardRef(function ShareCard9x16(
  { studentName, emoji, missionTitle, missionSubtitle, dateStr, snapshot, tone = "amber" },
  ref
) {
  const accent = tone === "amber" ? "#f59e0b" : "#22c55e";
  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        height: 1920,
        background: "linear-gradient(180deg, #1c1917 0%, #0c0a09 60%, #0c0a09 100%)",
        color: "#fafaf9",
        fontFamily: "'Playfair Display', Georgia, serif",
        position: "relative",
        overflow: "hidden",
        padding: "120px 90px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Ambient blobs */}
      <div style={{ position: "absolute", top: -200, right: -200, width: 700, height: 700, background: `${accent}22`, borderRadius: "50%", filter: "blur(120px)" }} />
      <div style={{ position: "absolute", bottom: -260, left: -260, width: 700, height: 700, background: `${accent}18`, borderRadius: "50%", filter: "blur(120px)" }} />

      {/* Top brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 60, position: "relative" }}>
        <div style={{ width: 68, height: 68, background: accent, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 10px 40px ${accent}55` }}>
          <Crown size={38} color="#111" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-0.02em", fontFamily: "'Inter', sans-serif" }}>Cozinha Lucrativa</div>
          <div style={{ fontSize: 18, letterSpacing: "0.35em", textTransform: "uppercase", color: accent, marginTop: 4, fontWeight: 700, fontFamily: "'Inter', sans-serif" }}>
            aplicativo · renda extra
          </div>
        </div>
      </div>

      {/* Achievement label */}
      <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignSelf: "center", alignItems: "center", gap: 14, padding: "14px 34px", border: `2px solid ${accent}55`, background: `${accent}18`, borderRadius: 999, fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 900, letterSpacing: "0.3em", textTransform: "uppercase", color: accent, marginBottom: 60 }}>
          <Sparkles size={22} color={accent} /> Conquista Desbloqueada
        </div>

        <div style={{ fontSize: 260, lineHeight: 1, marginBottom: 40 }}>
          {emoji || "🏆"}
        </div>

        <div style={{ fontSize: 40, textTransform: "uppercase", letterSpacing: "0.4em", color: "#a8a29e", marginBottom: 24, fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>
          {studentName ? "eu conquistei" : "conquista"}
        </div>

        <div style={{ fontSize: 100, fontWeight: 900, fontStyle: "italic", color: "#fafaf9", lineHeight: 1.05, marginBottom: 30 }}>
          {missionTitle}
        </div>

        {missionSubtitle && (
          <div style={{ fontSize: 34, color: "#d6d3d1", lineHeight: 1.4, maxWidth: 800, alignSelf: "center", fontFamily: "'Inter', sans-serif", marginBottom: 40 }}>
            {missionSubtitle}
          </div>
        )}

        {studentName && (
          <div style={{ fontSize: 44, color: accent, fontWeight: 900, fontStyle: "italic", marginTop: 20 }}>
            {studentName}
          </div>
        )}
      </div>

      {/* Bottom snapshot */}
      {snapshot && (
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginTop: 50, paddingTop: 40, borderTop: "1px solid #292524", fontFamily: "'Inter', sans-serif" }}>
          {snapshot.map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, letterSpacing: "0.3em", textTransform: "uppercase", color: "#78716c", fontWeight: 700 }}>{s.label}</div>
              <div style={{ fontSize: 40, fontWeight: 900, color: "#fafaf9", marginTop: 8, fontFamily: "'Playfair Display', Georgia, serif" }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 40, fontFamily: "'Inter', sans-serif" }}>
        <div style={{ fontSize: 20, color: "#78716c", letterSpacing: "0.25em", textTransform: "uppercase", fontWeight: 700 }}>
          {dateStr}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 20, color: accent, letterSpacing: "0.25em", textTransform: "uppercase", fontWeight: 800 }}>
          <Trophy size={22} /> selo oficial
        </div>
      </div>
    </div>
  );
});

export default ShareCard9x16;
