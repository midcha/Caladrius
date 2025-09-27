import "./globals.css";

export const metadata = {
  title: "AI Triage",
  description: "Client UI for triage flow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
