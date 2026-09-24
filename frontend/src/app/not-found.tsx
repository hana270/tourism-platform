export default function NotFound() {
  return (
    <html lang="fr">
      <body className="min-h-screen flex items-center justify-center bg-white text-[#0f0f0f] px-6">
        <div className="text-center max-w-sm">
          <p className="text-sm font-medium text-[#8a8a8a] mb-2 tracking-wide">404</p>
          <h1 className="font-semibold text-2xl mb-3">Page introuvable</h1>
          <p className="text-sm text-[#5a5a5a] mb-6">
            La page que vous recherchez n&apos;existe pas ou a été déplacée.
          </p>
          <a
            href="/fr/dashboard"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-[#0f0f0f] text-white text-sm font-medium hover:opacity-85 transition-opacity"
          >
            Retour au tableau de bord
          </a>
        </div>
      </body>
    </html>
  );
}
