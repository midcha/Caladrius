import PriorityQueue from "../../components/PriorityQueue";

export default function Home() {
  return (
    <main className="caladrius-shell">
      <div className="caladrius-container">
        <header className="panel">
          <div style={{display:"flex", alignItems:"center", gap:12}}>
            <div aria-label="Caladrius" title="Caladrius" style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              background: '#000',
              display: 'grid',
              placeItems: 'center',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)'
            }}>
              <img src="/caladrius.png" alt="Caladrius" width={24} height={24} style={{ display:'block', objectFit:'contain' }} />
            </div>
            <div>
              <p className="kicker">Caladrius • Emergency Department</p>
              <h1 className="title">Admin Triage Dashboard</h1>
            </div>
          </div>
          <div className="titleBar" />
          <p className="sub">AI-assisted prioritization and oversight for incoming patients. Decisions here guide care delivery—review with clinical judgment.</p>
        </header>

        <div className="layout-grid">
          <section className="list-column" style={{height:'100%'}}>
            <div className="panel" style={{height:'100%', display:'flex'}}>
              <PriorityQueue />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
