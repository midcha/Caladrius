import PriorityQueue from "../../components/PriorityQueue";

export default function Home() {
  return (
    <main className="caladrius-shell">
      <div className="caladrius-container">
        <header className="panel">
          <p className="kicker">Emergency Department</p>
          <h1 className="title">ED Triage Priority Queue</h1>
          <div className="titleBar" />
          <p className="sub">Manage incoming patients and prioritize care. Use caution — triage decisions affect outcomes.</p>
        </header>

        <div className="layout-grid">
          <section className="list-column">
            <div className="panel">
              <PriorityQueue />
            </div>
          </section>

          <aside className="spacer-column" />
        </div>
      </div>
    </main>
  );
}
