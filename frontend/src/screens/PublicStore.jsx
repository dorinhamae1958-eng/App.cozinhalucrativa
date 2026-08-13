import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, BRL } from "@/lib/api";
import { waLink } from "@/lib/imageUtils";
import { MessageCircle, Loader2, ChefHat, Instagram, ImageOff } from "lucide-react";

export default function PublicStore() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.get(`/vitrine/${slug}`)
      .then((r) => setData(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (data?.store_name) document.title = `${data.store_name} · Cozinha Lucrativa`;
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-50 grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }
  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-orange-50 grid place-items-center px-6 text-center">
        <div>
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-orange-100">
            <ChefHat className="h-8 w-8 text-orange-500" />
          </div>
          <h1 className="font-display text-2xl font-black text-stone-800">Ops, essa lojinha não existe</h1>
          <p className="mt-2 text-sm text-stone-600">Verifique o link ou fale com o dono da vitrine.</p>
        </div>
      </div>
    );
  }

  const { store_name, tagline, whatsapp, intro_message, products } = data;

  const orderText = (p) => {
    const greet = intro_message?.trim() || `Olá!`;
    return `${greet}\n\nTenho interesse no ${p.name} por ${BRL(p.price)}.`;
  };

  return (
    <div data-testid="public-store" className="min-h-screen bg-gradient-to-b from-orange-50 via-amber-50 to-white">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-orange-100/70 to-transparent" />
        <div className="relative mx-auto max-w-xl px-5 pt-14 pb-8 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30">
            <ChefHat className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <h1
            data-testid="store-name"
            className="font-display text-3xl font-black leading-tight text-stone-900 sm:text-4xl"
          >
            {store_name}
          </h1>
          {tagline && (
            <p className="mt-2 text-sm text-stone-600">{tagline}</p>
          )}
          {whatsapp && (
            <a
              data-testid="store-whatsapp-header"
              href={waLink(whatsapp, `Olá! Vi sua vitrine e quero saber mais.`)}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-transform hover:scale-105"
            >
              <MessageCircle className="h-4 w-4" />
              Falar no WhatsApp
            </a>
          )}
        </div>
      </header>

      {/* Products */}
      <main className="mx-auto max-w-xl px-5 pb-24">
        {products.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-orange-200 bg-white/70 p-10 text-center">
            <p className="text-sm text-stone-600">Ainda não há produtos disponíveis. Volte em breve!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((p) => (
              <article
                key={p.id}
                data-testid={`product-${p.id}`}
                className="overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-sm transition-all hover:shadow-md"
              >
                <div className="aspect-[4/3] w-full bg-orange-100">
                  {p.photo ? (
                    <img src={p.photo} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="grid h-full place-items-center text-orange-300">
                      <ImageOff className="h-10 w-10" strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="font-display text-xl font-black text-stone-900">{p.name}</h2>
                  {p.short_description && (
                    <p className="mt-1 text-sm text-stone-600">{p.short_description}</p>
                  )}
                  <div className="mt-3 flex items-baseline gap-2">
                    <span data-testid={`price-${p.id}`} className="font-display text-2xl font-black text-orange-600">
                      {BRL(p.price)}
                    </span>
                    {p.yield_quantity > 1 && (
                      <span className="text-xs text-stone-500">/ {p.yield_unit}</span>
                    )}
                  </div>
                  {whatsapp ? (
                    <a
                      data-testid={`order-${p.id}`}
                      href={waLink(whatsapp, orderText(p))}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-500/30 transition-transform hover:scale-[1.02] hover:bg-emerald-600"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Pedir no WhatsApp
                    </a>
                  ) : (
                    <div className="mt-4 rounded-full bg-stone-100 py-3 text-center text-xs text-stone-500">
                      Configure o WhatsApp da loja para receber pedidos
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="mt-10 text-center text-xs text-stone-400">
          Feito com <span className="text-orange-500">♥</span> em Cozinha Lucrativa
        </p>
      </main>
    </div>
  );
}
