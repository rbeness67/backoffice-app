import "./Home.css";

export default function Home() {
  return (
    <div className="home">
      <div className="home-header">
        <h1 className="home-title">Accueil</h1>
        <p className="home-subtitle">
          KPIs à définir plus tard (placeholder).
        </p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Factures</div>
          <div className="kpi-value">—</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">En attente</div>
          <div className="kpi-value">—</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Montant TTC</div>
          <div className="kpi-value">—</div>
        </div>
      </div>
    </div>
  );
}
