import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getDeviceId, getDeviceName } from "@/lib/device";
import { Button } from "@/components/ui/button";
import { Monitor, Smartphone, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

function iconFor(name = "") {
  if (/iPhone|iPad|Android/i.test(name)) return Smartphone;
  return Monitor;
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const processed = useRef(false);
  const [state, setState] = useState({ status: "loading", devices: [], sessionId: null });

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const run = async () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const sessionId = params.get("session_id");
      // Clean the hash so a refresh doesn't retry auth.
      window.history.replaceState(null, "", window.location.pathname);

      if (!sessionId) {
        navigate("/", { replace: true });
        return;
      }
      await authenticate(sessionId);
    };

    const authenticate = async (sessionId) => {
      try {
        const { data } = await api.post("/auth/session", {
          session_id: sessionId,
          device_id: getDeviceId(),
          device_name: getDeviceName(),
        });
        setUser(data.user);
        navigate("/meus-cursos", { replace: true });
      } catch (e) {
        const status = e?.response?.status;
        const body = e?.response?.data;
        if (status === 409 && body?.code === "DEVICE_LIMIT") {
          setState({ status: "device_limit", devices: body.devices || [], sessionId });
          return;
        }
        if (status === 402 && body?.code === "NO_ACCESS") {
          toast.error("Não encontramos uma assinatura para este e-mail. Faça sua assinatura para entrar.");
          navigate("/planos", { replace: true });
          return;
        }
        console.error("Auth callback error:", e);
        navigate("/", { replace: true });
      }
    };

    // expose authenticate for the retry button below via closure
    window.__cl_retry_auth = authenticate;
    run();
  }, [navigate, setUser]);

  if (state.status === "device_limit") {
    return <DeviceLimitScreen sessionId={state.sessionId} devices={state.devices} />;
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      data-testid="auth-callback"
      style={{ background: "#FAF6F0" }}
    >
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#A24D2A] border-t-transparent" />
        <p className="text-sm" style={{ color: "#5F4A3F" }}>Entrando na sua conta…</p>
      </div>
    </div>
  );
}

function DeviceLimitScreen({ sessionId, devices }) {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [busy, setBusy] = useState(null);

  const disconnectAndRetry = async (device_id) => {
    setBusy(device_id);
    try {
      await api.post("/devices/disconnect", { device_id });
      const { data } = await api.post("/auth/session", {
        session_id: sessionId,
        device_id: getDeviceId(),
        device_name: getDeviceName(),
      });
      setUser(data.user);
      toast.success("Dispositivo anterior desconectado. Bem-vindo(a)!");
      navigate("/meus-cursos", { replace: true });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Não foi possível concluir. Tente novamente.");
      setBusy(null);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6" data-testid="device-limit-screen" style={{ background: "#FAF6F0" }}>
      <div
        className="w-full max-w-lg rounded-2xl border p-8 shadow-lg"
        style={{ background: "#FFFFFF", borderColor: "#EED3C3" }}
      >
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-full" style={{ background: "#FBE9DA", color: "#8A3F21" }}>
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="font-display text-2xl font-black leading-tight" style={{ color: "#2E1B12" }}>
          Limite de dispositivos atingido
        </h1>
        <p className="mt-2 text-sm" style={{ color: "#5F4A3F" }}>
          Sua conta permite <b>2 dispositivos cadastrados</b>. Para usar este novo dispositivo,
          escolha qual dos anteriores deseja desconectar.
        </p>

        <div className="mt-6 space-y-3">
          {devices.map((d) => {
            const Icon = iconFor(d.device_name);
            return (
              <div
                key={d.device_id}
                data-testid={`limit-device-${d.device_id}`}
                className="flex items-center gap-3 rounded-xl border p-4"
                style={{ borderColor: "#EED3C3", background: "#FAF6F0" }}
              >
                <div className="grid h-10 w-10 flex-none place-items-center rounded-lg" style={{ background: "#F4E1D5", color: "#8A3F21" }}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold" style={{ color: "#2E1B12" }}>{d.device_name}</p>
                  <p className="text-[11px]" style={{ color: "#7D6656" }}>
                    Último acesso: {formatWhen(d.last_seen_at)}
                  </p>
                </div>
                <Button
                  data-testid={`disconnect-device-${d.device_id}`}
                  disabled={busy === d.device_id}
                  onClick={() => disconnectAndRetry(d.device_id)}
                  className="rounded-full text-white"
                  style={{ background: "#A24D2A" }}
                >
                  {busy === d.device_id ? "Desconectando…" : "Desconectar"}
                </Button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => navigate("/", { replace: true })}
          className="mt-6 text-xs font-semibold underline"
          style={{ color: "#5F4A3F" }}
        >
          Cancelar e voltar
        </button>
      </div>
    </div>
  );
}

function formatWhen(iso) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}
