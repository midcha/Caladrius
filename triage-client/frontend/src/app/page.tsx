import TriageProvider from "../components/TriageProvider";
import TriageFlow from "../components/TriageFlow";

export default function Page() {
  return (
    <TriageProvider>
      <header style={{ marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>AI Triage</h1>
        <p style={{ opacity: 0.7, margin: "6px 0 0" }}>
          Client-only UI (App Router + Turbopack)
        </p>
      </header>
      <TriageFlow />
    </TriageProvider>
  );
}
