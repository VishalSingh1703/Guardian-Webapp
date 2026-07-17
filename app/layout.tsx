import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Guardian — Emergency Assist",
  description:
    "Scan. Report an accident or parking issue. Trigger help. Zero install.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Guardian",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d12",
  width: "device-width",
  initialScale: 1,
  // Zoom left enabled on purpose — an emergency app must stay accessible (WCAG 1.4.4).
  viewportFit: "cover",
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-full">
        {/* Warm the DNS/TLS handshake to the API origin so the first call is fast. */}
        {API_BASE && <link rel="preconnect" href={API_BASE} crossOrigin="anonymous" />}
        {/* Phone-first: constrain width so it also degrades gracefully on desktop. */}
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
