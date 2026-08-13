import React, { useRef, useState } from "react";
import { Upload, X, Sparkles, User, MapPin, MessageCircle, Instagram, Calendar, ChefHat, Palette, Wand2 } from "lucide-react";
import { useBrand } from "@/context/BrandContext";
import { STYLES, SHAPES, LANGUAGES } from "./brandTokens";
import { fileToDataUrl, autoCropLogo } from "./logoUtils";
import { EmblemaShape } from "./EmblemaShape";
import { generateSlogan } from "@/lib/aiClient";

/**
 * BrandIdentityForm — cabeça do módulo Kit da Marca.
 *
 * Todos os materiais (Emblemas, Rótulos, Cartões, Cartões-fidelidade)
 * consomem esse mesmo estado. A usuária preenche uma única vez.
 */

export default function BrandIdentityForm() {
  const { profile, updateProfile, resetProfile, syncToVitrine } = useBrand();
  const fileRef = useRef(null);
  const [logoError, setLogoError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const style = STYLES.find((s) => s.id === profile.styleId) || STYLES[2];
  const lang = LANGUAGES[style.lang];

  const handleLogo = async (file) => {
    setLogoError("");
    if (!file) return;
    if (!/^image\/(png|jpe?g|svg\+xml|webp)$/i.test(file.type)) {
      setLogoError("Formato não suportado. Use PNG, JPG, SVG ou WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("Arquivo muito grande (máx 2 MB).");
      return;
    }
    setProcessing(true);
    try {
      const raw = await fileToDataUrl(file);
      const cropped = await autoCropLogo(raw);
      updateProfile({ logoDataUrl: cropped });
    } catch {
      setLogoError("Falha ao ler o arquivo.");
    } finally {
      setProcessing(false);
    }
  };

  const clearLogo = () => {
    updateProfile({ logoDataUrl: null });
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSave = async () => {
    await syncToVitrine();
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const handleGenerateSlogan = async () => {
    setAiError("");
    const name = (profile.name || "").trim();
    if (!name) {
      setAiError("Preencha o nome da marca primeiro.");
      return;
    }
    setAiLoading(true);
    try {
      const slogan = await generateSlogan({
        brandName: name,
        styleId: profile.styleId,
        city: profile.city,
        specialty: null,
      });
      if (slogan) updateProfile({ slogan });
    } catch (e) {
      setAiError("Não deu para gerar agora. Tente novamente em alguns segundos.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <section
      data-testid="brand-identity-form"
      className="mb-8 overflow-hidden rounded-3xl border shadow-sm"
      style={{ borderColor: "#EED3C3", background: "linear-gradient(180deg, #FFFDF9 0%, #FAF3E7 100%)" }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4 md:px-8" style={{ borderColor: "#EED3C3" }}>
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full" style={{ background: "#2E1B12", color: "#F5B98A" }}>
            <ChefHat className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: "#A24D2A" }}>
              Passo 1
            </p>
            <h2 className="font-display text-xl font-black" style={{ color: "#2E1B12" }}>
              Identidade da sua marca
            </h2>
          </div>
        </div>
        <p className="max-w-md text-xs leading-relaxed" style={{ color: "#5F4A3F" }}>
          Preencha uma vez só. Todas as artes deste app usam esses dados automaticamente.
        </p>
      </div>

      {/* Body: 2 colunas (form + preview) */}
      <div className="grid gap-6 p-6 md:grid-cols-[1fr_260px] md:gap-8 md:p-8">
        {/* --- COLUNA ESQUERDA: form --- */}
        <div className="space-y-5">
          {/* Nome + slogan */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldWrapper label="Nome da marca" icon={ChefHat} testid="brand-field-name">
              <input
                data-testid="brand-input-name"
                type="text"
                value={profile.name}
                onChange={(e) => updateProfile({ name: e.target.value.toUpperCase() })}
                maxLength={40}
                placeholder="DELÍCIAS DA ANA"
                className="brand-field-input"
              />
            </FieldWrapper>
            <FieldWrapper label="Slogan" icon={Sparkles} testid="brand-field-slogan">
              <div className="relative">
                <input
                  data-testid="brand-input-slogan"
                  type="text"
                  value={profile.slogan}
                  onChange={(e) => updateProfile({ slogan: e.target.value })}
                  maxLength={60}
                  placeholder="feito com carinho, do jeitinho de casa"
                  className="brand-field-input pr-[112px]"
                />
                <button
                  type="button"
                  onClick={handleGenerateSlogan}
                  disabled={aiLoading || !profile.name?.trim()}
                  data-testid="ai-generate-slogan"
                  title={!profile.name?.trim() ? "Preencha o nome da marca primeiro" : "Gerar slogan com IA (Claude)"}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white transition-transform hover:scale-[1.03] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg,#A24D2A 0%,#8A3F21 100%)" }}
                >
                  <Wand2 className="h-3 w-3" />
                  {aiLoading ? "Gerando…" : "IA"}
                </button>
              </div>
              {aiError && (
                <p className="mt-1 text-[10px] font-semibold" style={{ color: "#C0392B" }} data-testid="ai-slogan-error">
                  {aiError}
                </p>
              )}
            </FieldWrapper>
          </div>

          {/* Contato */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldWrapper label="Instagram" icon={Instagram} testid="brand-field-instagram">
              <input
                data-testid="brand-input-instagram"
                type="text"
                value={profile.instagram}
                onChange={(e) => updateProfile({ instagram: e.target.value.replace(/\s/g, "") })}
                maxLength={30}
                placeholder="@delicias.da.ana"
                className="brand-field-input"
              />
            </FieldWrapper>
            <FieldWrapper label="WhatsApp" icon={MessageCircle} testid="brand-field-whatsapp">
              <input
                data-testid="brand-input-whatsapp"
                type="tel"
                value={profile.whatsapp}
                onChange={(e) => updateProfile({ whatsapp: e.target.value.replace(/\D/g, "").slice(0, 15) })}
                maxLength={15}
                placeholder="11999990000"
                className="brand-field-input"
              />
            </FieldWrapper>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldWrapper label="Cidade" icon={MapPin} testid="brand-field-city">
              <input
                data-testid="brand-input-city"
                type="text"
                value={profile.city}
                onChange={(e) => updateProfile({ city: e.target.value })}
                maxLength={40}
                placeholder="São Paulo · SP"
                className="brand-field-input"
              />
            </FieldWrapper>
            <FieldWrapper label="Desde (ano de fundação)" icon={Calendar} testid="brand-field-year">
              <input
                data-testid="brand-input-year"
                type="text"
                value={profile.foundedYear}
                onChange={(e) => updateProfile({ foundedYear: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                maxLength={4}
                placeholder="2024"
                className="brand-field-input"
              />
            </FieldWrapper>
          </div>

          {/* Mensagem embalagem */}
          <FieldWrapper label="Mensagem que aparece na embalagem/cartão" icon={User} testid="brand-field-package">
            <textarea
              data-testid="brand-input-package"
              rows={2}
              value={profile.packageMessage}
              onChange={(e) => updateProfile({ packageMessage: e.target.value })}
              maxLength={200}
              placeholder="Obrigada pela confiança! Que cada mordida traga um sorriso."
              className="brand-field-input resize-none"
            />
          </FieldWrapper>

          {/* Estilo visual */}
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: "#A24D2A" }}>
              <Palette className="h-3.5 w-3.5" /> Estilo visual da marca
            </div>
            <div className="flex flex-wrap gap-2" data-testid="style-picker">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => updateProfile({ styleId: s.id })}
                  data-testid={`style-${s.id}`}
                  className={`brand-style-chip ${profile.styleId === s.id ? "active" : ""}`}
                  title={LANGUAGES[s.lang].name}
                >
                  <span
                    aria-hidden
                    className="brand-style-swatch"
                    style={{ background: s.palette.accent, borderColor: s.palette.ring }}
                  />
                  <span className="flex flex-col items-start leading-tight">
                    <span className="text-[12px] font-black">{s.name}</span>
                    <span className="text-[9px] font-semibold uppercase tracking-widest opacity-70">
                      {LANGUAGES[s.lang].name}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Formato do emblema */}
          <div>
            <div className="mb-2 text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: "#A24D2A" }}>
              Formato preferido do emblema
            </div>
            <div className="flex flex-wrap gap-2" data-testid="shape-picker">
              {SHAPES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => updateProfile({ shape: s.id })}
                  data-testid={`shape-${s.id}`}
                  className={`mat-tab ${profile.shape === s.id ? "active" : ""}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Logo upload */}
          <div>
            <div className="mb-2 text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: "#A24D2A" }}>
              Sua logo (opcional)
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label
                htmlFor="brand-logo-upload"
                data-testid="upload-logo-btn"
                className="inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white transition-transform hover:scale-[1.02]"
                style={{ background: "#2E1B12" }}
              >
                <Upload className="h-3.5 w-3.5" />
                {profile.logoDataUrl ? "Trocar logo" : "Enviar sua logo"}
              </label>
              <input
                id="brand-logo-upload"
                ref={fileRef}
                type="file"
                data-testid="upload-logo-input"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => handleLogo(e.target.files?.[0])}
              />
              {profile.logoDataUrl ? (
                <>
                  <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs font-semibold" style={{ borderColor: "#E7C9A9", color: "#2E1B12" }}>
                    <img src={profile.logoDataUrl} alt="prévia" className="h-6 w-6 rounded-md object-contain" data-testid="logo-preview" />
                    Logo aplicada em todos os materiais
                  </div>
                  <button
                    type="button"
                    onClick={clearLogo}
                    data-testid="clear-logo"
                    className="inline-flex items-center gap-1 rounded-full border-2 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest transition-colors"
                    style={{ borderColor: "#A24D2A", color: "#A24D2A" }}
                  >
                    <X className="h-3 w-3" /> Remover
                  </button>
                </>
              ) : (
                <span className="text-[11px]" style={{ color: "#5F4A3F" }}>
                  PNG/JPG/SVG até 2 MB · o app remove o espaço em branco ao redor automaticamente.
                </span>
              )}
              {processing && (
                <span className="text-[11px] font-semibold" style={{ color: "#8A3F21" }}>Otimizando…</span>
              )}
            </div>
            {logoError && (
              <p className="mt-2 text-[11px] font-semibold" style={{ color: "#C0392B" }} data-testid="logo-error">{logoError}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              data-testid="brand-save-btn"
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-[0.18em] text-white transition-transform hover:scale-[1.02]"
              style={{ background: "#A24D2A" }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {saved ? "Salvo com sucesso" : "Salvar e sincronizar"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm("Isso apaga a identidade preenchida. Continuar?")) resetProfile();
              }}
              data-testid="brand-reset-btn"
              className="text-[11px] font-semibold underline"
              style={{ color: "#8A7864" }}
            >
              Resetar identidade
            </button>
          </div>
        </div>

        {/* --- COLUNA DIREITA: preview live --- */}
        <aside className="flex flex-col items-center gap-3 rounded-2xl border p-5" style={{ borderColor: "#EED3C3", background: "#FAF3E7" }}>
          <p className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: "#A24D2A" }}>
            Prévia ao vivo
          </p>
          <div data-testid="brand-live-preview">
            <EmblemaShape
              shape={profile.shape || "shield"}
              size={200}
              style={style}
              lang={lang}
              iconKey="bolo"
              customLogoUrl={profile.logoDataUrl}
              ringText={profile.slogan?.toUpperCase() || "ARTESANAL · FEITO EM CASA"}
              brand={profile.name || "SUA MARCA"}
              foundedYear={profile.foundedYear}
            />
          </div>
          <div className="text-center text-[10px] leading-relaxed" style={{ color: "#5F4A3F" }}>
            Atualiza em tempo real conforme você digita.
          </div>
        </aside>
      </div>
    </section>
  );
}

function FieldWrapper({ label, icon: Icon, children, testid }) {
  return (
    <label className="block" data-testid={testid}>
      <span className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: "#A24D2A" }}>
        {Icon ? <Icon className="h-3 w-3" strokeWidth={2.4} /> : null}
        {label}
      </span>
      {children}
    </label>
  );
}
