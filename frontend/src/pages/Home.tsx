import "./Home.css";
import { useMemo, useState, useEffect } from "react";

import { useInvoicesData } from "@/hooks/invoices/useInvoicesData";
import { getStructureLabel } from "@/utils/stuctureLabel";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import {
  BarChart,
  Bar,
  XAxis,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

function toDateSafe(value: any): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabelFRFromKey(key: string) {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  const label = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" }).format(d);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatEUR(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}

export default function Home() {
  const data = useInvoicesData();

  const [activeStructure, setActiveStructure] = useState<string | null>(null);

  const normalized = useMemo(() => {
    return (data.items ?? []).map((i: any) => {
      const structure = i.structure ?? i.invoiceStructure ?? i.invoice_structure ?? "";
      const structureLabel = getStructureLabel(structure);
      return {
        ...i,
        structure,
        structureLabel,
        amountTTC: Number(i.amountTTC ?? 0) || 0,
      };
    });
  }, [data.items]);

  const hasInvoices = normalized.length > 0;

  const kpis = useMemo(() => {
    if (!hasInvoices) {
      return {
        totalInvoices: 0,
        totalTTC: 0,
        currentMonthCount: 0,
        currentMonthTTC: 0,
      };
    }

    const totalInvoices = normalized.length;
    const totalTTC = normalized.reduce((acc, i) => acc + (Number(i.amountTTC) || 0), 0);

    const now = new Date();
    const currentMonthKey = monthKey(new Date(now.getFullYear(), now.getMonth(), 1));

    const currentMonthInvoices = normalized.filter((i) => {
      const d = toDateSafe(i.invoiceDate);
      return d ? monthKey(d) === currentMonthKey : false;
    });

    const currentMonthCount = currentMonthInvoices.length;
    const currentMonthTTC = currentMonthInvoices.reduce(
      (acc, i) => acc + (Number(i.amountTTC) || 0),
      0
    );

    return {
      totalInvoices,
      totalTTC,
      currentMonthCount,
      currentMonthTTC,
    };
  }, [normalized, hasInvoices]);

  // Bar chart: TTC par mois (6 derniers mois)
  const monthBarData = useMemo(() => {
    if (!hasInvoices) return [];

    const map = new Map<string, { key: string; label: string; ttc: number; count: number }>();

    for (const inv of normalized) {
      const d = toDateSafe(inv.invoiceDate);
      if (!d) continue;
      const k = monthKey(d);
      if (!map.has(k)) map.set(k, { key: k, label: monthLabelFRFromKey(k), ttc: 0, count: 0 });
      const row = map.get(k)!;
      row.ttc += Number(inv.amountTTC) || 0;
      row.count += 1;
    }

    const sorted = Array.from(map.values()).sort((a, b) => (a.key < b.key ? -1 : 1));
    return sorted.slice(Math.max(0, sorted.length - 6));
  }, [normalized, hasInvoices]);

  // Line chart: nombre de factures par mois (6 derniers mois)
  const monthLineData = useMemo(() => {
    return monthBarData.map((m) => ({ label: m.label, count: m.count }));
  }, [monthBarData]);

  // Pie chart: TTC par structure
  const structurePieData = useMemo(() => {
    if (!hasInvoices) return [];

    const map = new Map<string, number>();
    for (const inv of normalized) {
      const label = String(inv.structureLabel ?? "").trim();
      if (!label) continue;
      map.set(label, (map.get(label) ?? 0) + (Number(inv.amountTTC) || 0));
    }

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [normalized, hasInvoices]);

  // Set initial active structure once data is present
  useEffect(() => {
    if (!activeStructure && structurePieData.length) {
      setActiveStructure(structurePieData[0].name);
    }
  }, [activeStructure, structurePieData]);

  const chartConfig = {
    ttc: { label: "Montant TTC", color: "hsl(var(--chart-1))" },
    count: { label: "Factures", color: "hsl(var(--chart-2))" },
    pie: { label: "Répartition TTC", color: "hsl(var(--chart-3))" },
  } as const;

  return (
    <div className="home">
      <div className="home-header">
        <h1 className="home-title">Accueil</h1>
        <p className="home-subtitle">
          {hasInvoices ? "Vue d’ensemble des factures et indicateurs." : "Commence par ajouter ta première facture."}
        </p>
      </div>

      {/* KPI */}
      <div className="kpi-grid">
        <Card className="kpi-card">
          <CardHeader className="kpi-card-header">
            <CardTitle className="kpi-label">Factures (total)</CardTitle>
          </CardHeader>
          <CardContent className="kpi-card-content">
            {data.loading ? <Skeleton className="h-7 w-20" /> : <div className="kpi-value">{kpis.totalInvoices}</div>}
          </CardContent>
        </Card>

        <Card className="kpi-card">
          <CardHeader className="kpi-card-header">
            <CardTitle className="kpi-label">Ce mois-ci</CardTitle>
          </CardHeader>
          <CardContent className="kpi-card-content">
            {data.loading ? <Skeleton className="h-7 w-20" /> : <div className="kpi-value">{kpis.currentMonthCount}</div>}
          </CardContent>
        </Card>

        <Card className="kpi-card">
          <CardHeader className="kpi-card-header">
            <CardTitle className="kpi-label">Montant TTC (total)</CardTitle>
          </CardHeader>
          <CardContent className="kpi-card-content">
            {data.loading ? <Skeleton className="h-7 w-32" /> : <div className="kpi-value">{formatEUR(kpis.totalTTC)}</div>}
          </CardContent>
        </Card>

        <Card className="kpi-card">
          <CardHeader className="kpi-card-header">
            <CardTitle className="kpi-label">Montant TTC (ce mois)</CardTitle>
          </CardHeader>
          <CardContent className="kpi-card-content">
            {data.loading ? <Skeleton className="h-7 w-32" /> : <div className="kpi-value">{formatEUR(kpis.currentMonthTTC)}</div>}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <Card className="chart-card">
          <CardHeader className="chart-card-header">
            <CardTitle className="chart-title">Montant TTC par mois</CardTitle>
            <div className="chart-subtitle">Derniers mois disponibles</div>
          </CardHeader>
          <CardContent className="chart-card-content">
            {data.loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : !monthBarData.length ? (
              <div className="text-sm text-muted-foreground py-16 text-center">Aucune donnée disponible</div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthBarData}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="ttc" radius={6} fill="var(--color-ttc)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>


        {/* Pie chart */}
        <Card className="chart-card">
          <CardHeader className="chart-card-header">
            <CardTitle className="chart-title">Répartition du TTC par structure</CardTitle>
            <div className="chart-subtitle">Clique sur une structure pour la mettre en avant</div>
          </CardHeader>
          <CardContent className="chart-card-content">
            {data.loading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : !structurePieData.length ? (
              <div className="text-sm text-muted-foreground py-20 text-center">
                Aucune facture enregistrée pour le moment
              </div>
            ) : (
              <>
                <ChartContainer config={chartConfig} className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={structurePieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={2}
                        activeIndex={
                          activeStructure
                            ? structurePieData.findIndex((x) => x.name === activeStructure)
                            : -1
                        }
                        onMouseEnter={(_, idx) => {
                          const item = structurePieData[idx];
                          if (item) setActiveStructure(item.name);
                        }}
                      >
                        {structurePieData.map((entry, idx) => (
                          <Cell
                            key={entry.name}
                            fill={`hsl(var(--chart-${(idx % 5) + 1}))`}
                            opacity={activeStructure && entry.name !== activeStructure ? 0.35 : 1}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>

                <div className="pie-legend">
                  {structurePieData.map((s, idx) => {
                    const active = s.name === activeStructure;
                    return (
                      <div
                        key={s.name}
                        className={`pie-legend-item ${active ? "active" : ""}`}
                        onClick={() => setActiveStructure(s.name)}
                        title={formatEUR(s.value)}
                      >
                        <span
                          className="pie-dot"
                          style={{ color: `hsl(var(--chart-${(idx % 5) + 1}))` }}
                        />
                        <span>
                          {s.name} ({formatEUR(s.value)})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {data.error ? <div className="home-error">{data.error}</div> : null}
    </div>
  );
}
