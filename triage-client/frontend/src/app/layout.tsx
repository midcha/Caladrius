import "./globals.css";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Caladrius | AI Triage",
  description: "Client UI for triage flow",
  icons: {
    icon: "/caladrius.png",
    shortcut: "/caladrius.png",
    apple: "/caladrius.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px 16px",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            position: "sticky",
            top: 0,
            background: "#ffffff",
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
            }}>
              <Image src="/caladrius.png" alt="Caladrius" width={22} height={22} />
            </div>
            <strong style={{ fontSize: 16 }}>Caladrius • AI Triage</strong>
          </div>
        </header>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
