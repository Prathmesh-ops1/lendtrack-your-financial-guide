import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "LendTrack — Intelligent Debt & Liability Manager" },
      {
        name: "description",
        content:
          "Track loans, EMIs, credit cards and insurance in one beautiful dashboard. Get smart alerts before payments are due.",
      },
      { name: "author", content: "LendTrack" },
      { property: "og:title", content: "LendTrack — Intelligent Debt & Liability Manager" },
      {
        property: "og:description",
        content: "Track loans, EMIs, credit cards and insurance with smart alerts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "LendTrack — Intelligent Debt & Liability Manager" },
      { name: "description", content: "LendTrack is a web app that helps users manage debts and liabilities with smart payment alerts." },
      { property: "og:description", content: "LendTrack is a web app that helps users manage debts and liabilities with smart payment alerts." },
      { name: "twitter:description", content: "LendTrack is a web app that helps users manage debts and liabilities with smart payment alerts." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4f524d02-16ba-4903-adeb-57da14e51496/id-preview-19553d38--b7c1bcd2-991f-4474-8e13-956c03d2039e.lovable.app-1777039927561.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4f524d02-16ba-4903-adeb-57da14e51496/id-preview-19553d38--b7c1bcd2-991f-4474-8e13-956c03d2039e.lovable.app-1777039927561.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
  return (
    <>
      <Outlet />
      <Toaster richColors position="top-right" />
    </>
  );
}
