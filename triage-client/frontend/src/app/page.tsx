import TriageProvider from "../components/TriageProvider";
import TriageFlow from "../components/TriageFlow";

export default function Page() {
  return (
    <TriageProvider>
      <header style={{ marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Caladrius</h1>
        <p style={{ opacity: 0.7, margin: "6px 0 0" }}>
          The privacy-first AI triage assistant
        </p>
      </header>
      <TriageFlow />
    </TriageProvider>
  );
}
