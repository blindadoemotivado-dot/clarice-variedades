import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { PwaInstallPrompt } from "../components/store/PwaInstallPrompt";
import { SplashScreen } from "../components/store/SplashScreen";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você está procurando não existe ou foi alterada.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Não foi possível carregar a página
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ocorreu um erro temporário. Você pode tentar recarregar ou voltar para a vitrine inicial.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Voltar para o início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0, viewport-fit=cover" },
      { title: "Clarice Achadinhos — Melhores Ofertas do Mercado Livre" },
      {
        name: "description",
        content:
          "Curadoria diária de achadinhos com desconto verificado no Mercado Livre com frete grátis e compra 100% segura.",
      },
      { name: "theme-color", content: "#FFE600" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Clarice" },
      { name: "application-name", content: "Clarice Achadinhos" },
      { name: "msapplication-TileColor", content: "#0F172A" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Clarice Achadinhos" },
      { property: "og:url", content: "https://clariceachadinhos.vercel.app" },
      { property: "og:title", content: "Clarice Achadinhos — Melhores Ofertas do Mercado Livre" },
      {
        property: "og:description",
        content:
          "Economize de verdade! Achadinhos verificados diariamente com frete rápido e compra 100% segura no Mercado Livre.",
      },
      { property: "og:locale", content: "pt_BR" },
      {
        property: "og:image",
        content: "https://clariceachadinhos.vercel.app/og-image.png",
      },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Clarice Achadinhos — Melhores Ofertas do Mercado Livre" },
      {
        name: "twitter:description",
        content:
          "Economize de verdade! Achadinhos verificados diariamente com frete rápido e compra 100% segura no Mercado Livre.",
      },
      {
        name: "twitter:image",
        content: "https://clariceachadinhos.vercel.app/og-image.png",
      },
    ],
    links: [
      { rel: "canonical", href: "https://clariceachadinhos.vercel.app" },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/icons/favicon-32x32.png" },
      { rel: "shortcut icon", href: "/favicon.ico" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/icons/apple-touch-icon.png" },
      { rel: "apple-touch-icon-precomposed", href: "/icons/apple-touch-icon.png" },
      { rel: "apple-touch-startup-image", href: "/icons/apple-splash.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("[Clarice PWA] Service Worker registrado com sucesso:", reg.scope);
          })
          .catch((err) => {
            console.warn("[Clarice PWA] Falha ao registrar Service Worker:", err);
          });
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <SplashScreen />
      <PwaInstallPrompt />
    </QueryClientProvider>
  );
}
