import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, BRL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Award, Loader2, Download, ArrowLeft, Crown, Sparkles, Share2, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CertificateSnapshotCard, useShareableAchievement } from "@/components/certificate-primitives";

export default function MissionCertificate() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/journey/certificate/${id}`)
      .then((r) => setCert(r.data))
      .catch((e) => setError(e.response?.data?.detail || "Missão ainda não concluída."))
      .finally(() => setLoading(false));
  }, [id]);

  const studentName = cert?.student_name || user?.name || "Empreendedora";
  const dateStr = (cert?.issued_at
    ? new Date(cert.issued_at)
    : new Date()
  ).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const snapshotItems = cert?.snapshot ? [
    { label: "Faturamento", value: BRL(cert.snapshot.total_revenue) },
    { label: "Clientes",    value: cert.snapshot.clients_count },
    { label: "Entregas",    value: cert.snapshot.delivered_count },
    { label: "Recorrentes", value: cert.snapshot.recurring_count },
  ] : [];

  const { handleShare, sharing, shareCardNode } = useShareableAchievement({
    studentName,
    emoji: cert?.mission?.emoji,
    title: cert?.mission?.title || "",
    subtitle: cert?.mission?.objective,
    dateStr,
    snapshot: snapshotItems,
    filename: `conquista-missao-${cert?.mission?.id || "x"}-cozinha-lucrativa.png`,
    caption: `🎉 Acabei de conquistar a missão “${cert?.mission?.title || ""}” na Jornada Renda Lucrativa do app Cozinha Lucrativa! 🍰👑`,
  });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center" data-testid="mission-cert-locked">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-amber-500/10 text-amber-500">
          <Crown className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl font-black">Missão ainda não concluída</h1>
        <p className="mt-3 text-stone-400">{error || "Conclua esta missão para desbloquear o certificado."}</p>
        <Button
          onClick={() => navigate("/jornada")}
          className="mt-6 rounded-full bg-amber-600 px-6 font-semibold hover:bg-amber-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para a Jornada
        </Button>
      </div>
    );
  }

  const handlePrint = () => window.print();

  return (
    <div data-testid="mission-certificate-page" className="mx-auto max-w-5xl px-6 py-14 md:px-12">
      {/* Toolbar (hidden on print) */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/jornada" className="text-xs uppercase tracking-widest text-stone-400 hover:text-amber-400">
          ← jornada
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button
            data-testid="share-mission-btn"
            onClick={handleShare}
            disabled={sharing}
            className="rounded-full bg-emerald-500 px-6 font-bold text-stone-950 hover:bg-emerald-600"
          >
            {sharing ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
            Compartilhar conquista
          </Button>
          <Button
            data-testid="download-mission-cert-btn"
            onClick={handlePrint}
            className="rounded-full bg-amber-600 px-6 font-semibold text-stone-50 hover:bg-amber-700"
          >
            <Download className="mr-2 h-4 w-4" /> Baixar certificado
          </Button>
        </div>
      </div>

      {/* Celebration banner */}
      <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center print:hidden">
        <p className="font-display text-2xl font-black text-emerald-200">
          🎉 Parabéns, {studentName.split(" ")[0]}!
        </p>
        <p className="mt-1 text-sm text-stone-300">
          Você conquistou a missão <b className="text-amber-300">{cert.mission.title}</b>.
        </p>
      </div>

      {/* Certificate — same visual style as JourneyCertificate */}
      <div className="relative overflow-hidden rounded-3xl border-4 border-double border-amber-500/40 bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 p-10 shadow-2xl md:p-16 print:border-amber-600 print:shadow-none">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-amber-600/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-amber-700/10 blur-3xl" />

        <div className="relative text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-500 text-stone-950 shadow-[0_10px_40px_rgba(217,119,6,0.35)] text-3xl">
            {cert.mission.emoji}
          </div>
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.35em] text-amber-500">
            <Sparkles className="h-3 w-3" /> Certificado de missão
          </p>

          <p className="mt-8 text-xs uppercase tracking-[0.4em] text-stone-400">certificamos que</p>
          <h1
            data-testid="mission-cert-student"
            className="mt-3 font-display text-4xl font-black italic leading-tight text-stone-50 sm:text-5xl md:text-6xl"
          >
            {studentName}
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-sm leading-relaxed text-stone-300 sm:text-base">
            concluiu a missão
          </p>
          <h2 className="mt-2 font-display text-2xl font-black text-amber-400 sm:text-3xl">
            {cert.mission.title}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-stone-400">
            {cert.mission.objective}
          </p>
          {cert.mission.progress_label && (
            <p className="mt-2 text-xs uppercase tracking-widest text-stone-500">
              {cert.mission.progress_label}
            </p>
          )}

          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 text-left sm:grid-cols-4">
            {snapshotItems.map((s) => (
              <CertificateSnapshotCard key={s.label} label={s.label} value={s.value} />
            ))}
          </div>

          <div className="mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-8 border-t border-stone-700 pt-6 print:border-amber-600/40">
            <div>
              <p className="font-display text-lg font-bold text-stone-50">{dateStr}</p>
              <p className="mt-1 text-[10px] uppercase tracking-widest text-stone-500">data da conquista</p>
            </div>
            <div>
              <p className="font-display text-lg font-bold text-stone-50">Cozinha Lucrativa</p>
              <p className="mt-1 text-[10px] uppercase tracking-widest text-stone-500">plataforma</p>
            </div>
          </div>

          <p className="mt-8 text-[10px] uppercase tracking-[0.3em] text-stone-500">
            missão {cert.mission.id} de 7 · jornada renda lucrativa · {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* Hint below */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-800 bg-stone-900/40 p-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-sm font-black text-stone-50">Divulgue sua conquista</p>
            <p className="text-xs text-stone-400">Gera uma imagem vertical pronta para WhatsApp Status e Instagram Stories.</p>
          </div>
        </div>
        <Button
          onClick={handleShare}
          disabled={sharing}
          data-testid="share-mission-btn-bottom"
          className="rounded-full bg-emerald-500 px-5 font-bold text-stone-950 hover:bg-emerald-600"
        >
          {sharing ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
          Compartilhar Conquista
        </Button>
      </div>

      {shareCardNode}
    </div>
  );
}
