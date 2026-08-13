import './globals.css'

export const metadata = {
  title: 'Cozinha Lucrativa · Cursos Premium',
  description: 'Transforme sua cozinha em uma fonte de renda. Cursos completos de gastronomia lucrativa.',
  manifest: '/manifest.json',
  applicationName: 'Cozinha Lucrativa',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Cozinha Lucrativa',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport = {
  themeColor: '#8A3F21',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

const swBootstrap = `
(function() {
  if (!('serviceWorker' in navigator)) return;
  // Disabled ONLY on localhost to avoid controllerchange reload loops during
  // local HMR. On preview/production the SW is required for PWA installability.
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Aggressively unregister any previously installed SW so we always run
    // Next.js dev bundles directly.
    navigator.serviceWorker.getRegistrations && navigator.serviceWorker.getRegistrations()
      .then(function(regs){ regs.forEach(function(r){ r.unregister(); }); })
      .catch(function(){});
    return;
  }
  var currentVersion = null;
  var reloading = false;

  function safeReload() {
    if (reloading) return;
    reloading = true;
    try {
      var cn = document.createElement('div');
      cn.setAttribute('data-testid','sw-updating');
      cn.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:99999;background:#C96A3D;color:#FFF8F0;padding:10px 16px;border-radius:999px;font:600 13px/1.2 system-ui,sans-serif;box-shadow:0 4px 20px rgba(201,106,61,.35)';
      cn.textContent = 'Atualizando para versão mais recente…';
      document.body && document.body.appendChild(cn);
    } catch(e) {}
    setTimeout(function() { location.reload(); }, 400);
  }

  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').then(function(reg) {
      // Check for a new service worker every 60s
      setInterval(function() { reg.update().catch(function(){}); }, 60000);
    }).catch(function(){});

    // When a new service worker takes control, reload once to get fresh assets
    navigator.serviceWorker.addEventListener('controllerchange', safeReload);

    // Poll a lightweight version endpoint every 60s. If the server-side build
    // identifier changes, force a reload so all clients pick up new deploys.
    function checkVersion() {
      fetch('/version.json', { cache: 'no-store' })
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(data) {
          if (!data || !data.version) return;
          if (currentVersion == null) { currentVersion = data.version; return; }
          if (data.version !== currentVersion) safeReload();
        })
        .catch(function(){});
    }
    checkVersion();
    setInterval(checkVersion, 60000);
  });
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Cozinha Lucrativa" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
        {/*
          SAFE: `swBootstrap` is a build-time constant defined above with no
          user or runtime input. It only wires up the /sw.js service worker
          and polls /version.json. No XSS surface here.
        */}
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: swBootstrap }} />
      </body>
    </html>
  )
}
