import React, { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Landing from "@/pages/Landing";
import CourseDetail from "@/pages/CourseDetail";
import Dashboard from "@/pages/Dashboard";
import Player from "@/pages/Player";
import AuthCallback from "@/pages/AuthCallback";
import Plans from "@/pages/Plans";
import PaymentSuccess from "@/pages/PaymentSuccess";
import Certificate from "@/pages/Certificate";
import Calculadora from "@/pages/Calculadora";
import PublicStore from "@/pages/PublicStore";
import MinhaVitrine from "@/pages/MinhaVitrine";
import Encomendas from "@/pages/Encomendas";
import MinhasAnotacoes from "@/pages/MinhasAnotacoes";
import CourseModules from "@/pages/CourseModules";
import Bonus from "@/pages/Bonus";
import Jornada from "@/pages/Jornada";
import JourneyCertificate from "@/pages/JourneyCertificate";
import MissionCertificate from "@/pages/MissionCertificate";
import Materiais from "@/pages/Materiais";
import Perfil from "@/pages/Perfil";
import PlantaoDuvidas from "@/pages/PlantaoDuvidas";
import PlantaoAdmin from "@/pages/PlantaoAdmin";
import NotFound from "@/pages/NotFound.jsx";
import LegalDoc from "@/pages/LegalDoc.jsx";
import CadernoFab from "@/components/CadernoFab";
import PWAInstall from "@/components/PWAInstall";
import AffiliatesAdmin from "@/pages/AffiliatesAdmin";
import AccessCodesAdmin from "@/pages/AccessCodesAdmin";
import { captureRefFromUrl } from "@/lib/affiliate";

function LoginRedirect() {
  const { login } = useAuth();
  useEffect(() => {
    login();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "#FAF6F0" }}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#A24D2A] border-t-transparent" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#FAF6F0" }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#A24D2A] border-t-transparent" />
      </div>
    );
  }
  // Acesso pago: sem login → login Google direto; logado mas sem assinatura → pagamento.
  if (!user) return <LoginRedirect />;
  if (!user.has_access) return <Navigate to="/planos" replace />;
  return children;
}

function LandingOrDashboard() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#FAF6F0" }}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#A24D2A] border-t-transparent" />
      </div>
    );
  }
  return user ? <Navigate to="/meus-cursos" replace /> : <Landing />;
}

function AppShell() {
  const location = useLocation();
  // Handle OAuth callback synchronously during render (no useEffect race)
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }

  // Public storefront: full-page, no app chrome
  if (location.pathname.startsWith("/vitrine/")) {
    return (
      <Routes>
        <Route path="/vitrine/:slug" element={<PublicStore />} />
      </Routes>
    );
  }

  // Meu Caderno flutuante: só nas telas de estudo (curso/módulos/player).
  const isStudyRoute =
    location.pathname.startsWith("/curso/") ||
    location.pathname.startsWith("/player/");

  return (
    <div className="flex min-h-screen flex-col bg-stone-950 text-stone-50">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingOrDashboard />} />
          <Route path="/planos" element={<Plans />} />
          <Route path="/curso/:slug" element={<CourseDetail />} />
          <Route
            path="/curso/:slug/modulos"
            element={
              <ProtectedRoute>
                <CourseModules />
              </ProtectedRoute>
            }
          />
          <Route
            path="/meus-cursos"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/player/:slug"
            element={
              <ProtectedRoute>
                <Player />
              </ProtectedRoute>
            }
          />
          <Route
            path="/certificado/:slug"
            element={
              <ProtectedRoute>
                <Certificate />
              </ProtectedRoute>
            }
          />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route
            path="/calculadora"
            element={
              <ProtectedRoute>
                <Calculadora />
              </ProtectedRoute>
            }
          />
          <Route
            path="/minha-vitrine"
            element={
              <ProtectedRoute>
                <MinhaVitrine />
              </ProtectedRoute>
            }
          />
          <Route
            path="/encomendas"
            element={
              <ProtectedRoute>
                <Encomendas />
              </ProtectedRoute>
            }
          />
          <Route
            path="/minhas-anotacoes"
            element={
              <ProtectedRoute>
                <MinhasAnotacoes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bonus-extra"
            element={
              <ProtectedRoute>
                <Bonus />
              </ProtectedRoute>
            }
          />
          <Route
            path="/materiais"
            element={
              <ProtectedRoute>
                <Materiais />
              </ProtectedRoute>
            }
          />
          <Route
            path="/jornada"
            element={
              <ProtectedRoute>
                <Jornada />
              </ProtectedRoute>
            }
          />
          <Route
            path="/perfil"
            element={
              <ProtectedRoute>
                <Perfil />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plantao"
            element={
              <ProtectedRoute>
                <PlantaoDuvidas />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/plantao"
            element={
              <ProtectedRoute>
                <PlantaoAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/afiliados"
            element={
              <ProtectedRoute>
                <AffiliatesAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/codigos"
            element={
              <ProtectedRoute>
                <AccessCodesAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/jornada/certificado"
            element={
              <ProtectedRoute>
                <JourneyCertificate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/jornada/certificado/missao/:id"
            element={
              <ProtectedRoute>
                <MissionCertificate />
              </ProtectedRoute>
            }
          />
          {/* Aliases legados apontam para a mesma página */}
          <Route
            path="/logotipo"
            element={
              <ProtectedRoute>
                <Bonus />
              </ProtectedRoute>
            }
          />
          {/* Documentos legais (versão beta) */}
          <Route path="/termos" element={<LegalDoc />} />
          <Route path="/privacidade" element={<LegalDoc />} />
          {/* Fallback: rota não encontrada */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      {isStudyRoute && <CadernoFab />}
    </div>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    captureRefFromUrl();
  }, []);

  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppShell />
          <Toaster
            position="bottom-right"
            theme="light"
            toastOptions={{
              style: {
                background: "#f4eee1",
                border: "1px solid #e8e2d3",
                color: "#3d4030",
              },
            }}
          />
          <PWAInstall />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
