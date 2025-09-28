import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Caladrius Admin",
  description: "Caladrius • AI-assisted triage and ED operations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Global CSS variables and lightweight theme primitives inferred
            from the triage-client components. These only affect styling
            and intentionally do not change any runtime behavior. */}
        <style>{`
          :root{
            --panel: rgba(255,255,255,0.95);
            --panel-border: rgba(2,6,23,0.06);
            --radius: 12px;
            --panel-shadow: 0 8px 24px rgba(2,6,23,0.06);
            --blur: 8px;
            --teal: #0891b2;
            --healing: #06b6d4;
            --success: #10b981;
            --danger: #ef4444;
            --warning: #f59e0b;
            --muted: #6b7280;
            --text: #0f172a;
            --placeholder: #9ca3af;
            --focus-ring: 0 0 0 6px rgba(8,145,178,0.08);
            --blue-1: #3b82f6;
            --blue-2: #60a5fa;
          }

          /* App shell */
          .caladrius-shell{
            min-height:100vh;
            overflow:auto;
            background: linear-gradient(180deg, #fbfdff 0%, #f8fafc 100%);
            padding: 40px 32px;
            color: var(--text);
          }

          .caladrius-container{
            width: 100%;
            margin: 0;
            display: grid;
            grid-template-rows: auto 1fr; /* header + content */
            min-height: 100vh;
            gap: 28px;
          }

          /* Panels follow the client "glass" style */
          .panel{
            background: var(--panel);
            backdrop-filter: blur(var(--blur));
            border: 1px solid var(--panel-border);
            border-radius: var(--radius);
            box-shadow: var(--panel-shadow);
            padding: 20px;
          }

          /* Page header primitives */
          .kicker{ font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:.08em; margin:0 0 6px 0 }
          .title{ font-weight:700; font-size:24px; margin:0 0 8px 0 }
          .titleBar{ height:4px; border-radius:999px; background: linear-gradient(90deg,var(--blue-1),var(--blue-2)); margin-top:10px }
          .sub{ font-size:15px; color:var(--muted); margin:8px 0 0 0 }

          /* Layout grid now spans full width and remaining height */
          .layout-grid{ display:grid; grid-template-columns: 1fr; gap: 28px; align-items:start }
       .list-column{ width:100% }
       .spacer-column{ display:none }

          /* Draggable item hook */
          .draggable-item{ transition: transform .18s ease, box-shadow .18s ease; }
          .draggable-item:active, .draggable-item.dragging{ box-shadow: 0 14px 36px rgba(2,6,23,0.12); transform: translateY(-4px) scale(1.01) }

          /* Utility tag style used by PriorityBadge (fallback) */
          .tag{ display:inline-flex; align-items:center; gap:8px; padding:6px 12px; border-radius:999px; font-weight:700; font-size:12px }

          /* Ensure small screens remain usable */
          @media (max-width:900px){ .layout-grid{ grid-template-columns: 1fr } .list-column{ max-width:100% } }
        `}</style>

        {children}
      </body>
    </html>
  );
}
