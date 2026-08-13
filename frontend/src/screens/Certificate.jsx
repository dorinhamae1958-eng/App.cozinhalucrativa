import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Award, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Certificate() {
  const { slug } = useParams();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/certificate/${slug}`)
      .then((r) => setCert(r.data))
      .catch((e) => setError(e.response?.data?.detail || "Não foi possível carregar o certificado"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
    </div>
  );

  if (error) return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center" data-testid="certificate-error">
      <h1 className="font-display text-2xl font-bold">Certificado indisponível</h1>
      <p className="mt-3 text-stone-400">{error}</p>
      <Link to="/meus-cursos" className="mt-6 inline-block text-amber-400 hover:underline">
        Voltar para Meus Cursos
      </Link>
    </div>
  );

  const dateStr = cert?.issued_at
    ? new Date(cert.issued_at).toLocaleDateString("pt-BR", {
        day: "2-digit", month: "long", year: "numeric",
      })
    : "";

  const handlePrint = () => window.print();

  return (
    <div data-testid="certificate-page" className="mx-auto max-w-5xl px-6 py-16 md:px-12">
      <div className="mb-8 flex items-center justify-between print:hidden">
        <Link to="/meus-cursos" className="text-xs uppercase tracking-widest text-stone-400 hover:text-amber-400">
          ← meus cursos
        </Link>
        <Button
          data-testid="download-cert-btn"
          onClick={handlePrint}
          className="rounded-full bg-amber-600 px-6 font-semibold text-stone-50 hover:bg-amber-700"
        >
          <Download className="mr-2 h-4 w-4" /> Baixar / Imprimir
        </Button>
      </div>

      {/* Certificate */}
      <div className="relative overflow-hidden rounded-3xl border-4 border-double border-amber-500/30 bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 p-12 shadow-2xl md:p-20 print:border-amber-600 print:shadow-none">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-amber-600/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-amber-700/10 blur-3xl" />

        <div className="relative text-center">
          <Award className="mx-auto h-14 w-14 text-amber-500" />
          <p className="mt-4 text-xs uppercase tracking-[0.4em] text-amber-500 font-semibold">
            certificado de conclusão
          </p>
          <p className="mt-10 text-sm uppercase tracking-widest text-stone-400">certificamos que</p>
          <h1
            data-testid="cert-student"
            className="mt-3 font-display text-4xl font-black italic leading-tight text-stone-50 sm:text-6xl"
          >
            {cert.student_name}
          </h1>
          <p className="mt-10 max-w-2xl mx-auto text-base text-stone-300 leading-relaxed">
            concluiu com aproveitamento o curso
          </p>
          <h2 className="mt-3 font-display text-2xl font-bold text-amber-400 sm:text-3xl">
            {cert.course_title}
          </h2>
          <p className="mt-2 text-sm text-stone-400">com carga horária de {cert.duration}</p>

          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-8 border-t border-stone-700 pt-8">
            <div>
              <p className="font-display text-lg font-bold text-stone-50">{dateStr}</p>
              <p className="mt-1 text-[10px] uppercase tracking-widest text-stone-500">data de emissão</p>
            </div>
            <div>
              <p className="font-display text-lg font-bold text-stone-50">{cert.instructor}</p>
              <p className="mt-1 text-[10px] uppercase tracking-widest text-stone-500">instrutor</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
