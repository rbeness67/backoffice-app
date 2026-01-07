export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Accueil</h1>
        <p className="text-muted-foreground">
          KPIs à définir plus tard (placeholder).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Factures</div>
          <div className="text-2xl font-semibold">—</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">En attente</div>
          <div className="text-2xl font-semibold">—</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Montant TTC</div>
          <div className="text-2xl font-semibold">—</div>
        </div>
      </div>
    </div>
  );
}
