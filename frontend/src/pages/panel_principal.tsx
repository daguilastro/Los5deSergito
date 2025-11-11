// src/pages/panel_principal.tsx
import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "../lib/api"; // ajusta la ruta si tu wrapper está en otro sitio

// === Tipos que devuelve tu API ===
type DashboardSummary = {
  period: { year: number; month: number };
  ventas_mes: { value: number; delta_pct_vs_prev: number | null };
  inventario: { units: number };
  ventas_por_mes: { year: number; month: number; total: number }[];
  top_productos_mes: { producto: string; unidades: number }[];
};

const API_URL = "/api/dashboard/summary/"; // ajusta si tu endpoint difiere

export default function PanelPrincipal() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiFetch(API_URL, null, "GET");
        if (!alive) return;
        if (!res.ok) {
          setErrorMsg("No se pudo cargar el panel. Intente de nuevo.");
          setLoading(false);
          return;
        }
        const json = (await res.json()) as DashboardSummary;
        setData(json);
      } catch (e) {
        if (!alive) return;
        setErrorMsg("Error de red al cargar el panel.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        <PageTitle>Pagina Principal</PageTitle>
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div style={{ padding: 16 }}>
        <PageTitle>Pagina Principal</PageTitle>
        <div style={{ color: "#b01010", background: "#fdeaea", padding: 12, borderRadius: 10 }}>
          {errorMsg}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const money = (v: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
  const num = (v: number) => new Intl.NumberFormat("es-CO").format(v);

  return (
    <div style={{ padding: 16 }}>
      <PageTitle>Pagina Principal</PageTitle>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(280px, 1fr))", gap: 16, marginBottom: 28 }}>
        <KpiCard
          title="Ventas del Mes"
          main={money(data.ventas_mes.value)}
          subtitle={
            data.ventas_mes.delta_pct_vs_prev == null
              ? "Sin dato de mes anterior"
              : (data.ventas_mes.delta_pct_vs_prev >= 0 ? "+" : "") +
                data.ventas_mes.delta_pct_vs_prev.toFixed(2) +
                "% vs. mes anterior"
          }
          subtitleColor={data.ventas_mes.delta_pct_vs_prev == null ? "#666" : data.ventas_mes.delta_pct_vs_prev >= 0 ? "#1f8a36" : "#c0392b"}
          icon="📈"
        />
        <KpiCard
          title="Productos en Inventario"
          main={`${num(data.inventario.units)} unidades`}
          subtitle={data.ventas_mes.delta_pct_vs_prev == null ? " " : ""}
          icon="📦"
        />
      </div>

      {/* Reportes y análisis */}
      <SectionTitle>Reportes y Análisis</SectionTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        <Card title="Ventas por Mes" subtitle="Resumen de ventas de los últimos 12 meses.">
          <Bars ventas={data.ventas_por_mes} money={money} />
        </Card>

        <Card title="Productos Más Vendidos" subtitle="Los 5 productos con mayor cantidad de ventas.">
          <TopList items={data.top_productos_mes} />
        </Card>
      </div>
    </div>
  );
}

/* ============ Componentes UI simples ============ */

function PageTitle({ children }: { children: React.ReactNode }) {
  return <h1 style={{ fontSize: 30, margin: "8px 0 18px 4px" }}>{children}</h1>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 26, margin: "6px 0 14px 4px" }}>{children}</h2>;
}

function KpiCard({
  title,
  main,
  subtitle,
  subtitleColor,
  icon,
}: {
  title: string;
  main: string;
  subtitle?: string;
  subtitleColor?: string;
  icon?: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: 18,
        boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 12,
        alignItems: "start",
      }}
    >
      <div>
        <div style={{ color: "#6b6b6b", fontSize: 14 }}>{title}</div>
        <div style={{ fontSize: 36, fontWeight: 800, marginTop: 4 }}>{main}</div>
        {subtitle ? (
          <div style={{ fontSize: 12, color: subtitleColor ?? "#8b8b8b", marginTop: 6 }}>{subtitle}</div>
        ) : null}
      </div>
      {icon ? (
        <div
          style={{
            background: "#fde1d5",
            color: "#e27641",
            width: 36,
            height: 36,
            borderRadius: 10,
            display: "grid",
            placeItems: "center",
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          {icon}
        </div>
      ) : null}
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: 18, boxShadow: "0 10px 30px rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
      {subtitle ? <div style={{ fontSize: 12, color: "#8b8b8b", marginTop: 4 }}>{subtitle}</div> : null}
      <div style={{ marginTop: 14 }}>{children}</div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div
      style={{
        background: "linear-gradient(90deg,#eee,#f8f8f8,#eee)",
        height: 120,
        borderRadius: 12,
        margin: "8px 0",
        animation: "shimmer 1.2s linear infinite",
        backgroundSize: "300% 100%",
      }}
    />
  );
}

/* ============ Gráfico de barras simple (sin librerías) ============ */

function Bars({
  ventas,
  money,
}: {
  ventas: { year: number; month: number; total: number }[];
  money: (v: number) => string;
}) {
  const maxTotal = useMemo(() => Math.max(1, ...ventas.map((v) => v.total)), [ventas]);

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${ventas.length}, 1fr)`,
          alignItems: "end",
          gap: 8,
          height: 220,
          padding: "8px 0",
        }}
      >
        {ventas.map((v, i) => {
          const h = Math.round((v.total / maxTotal) * 200) + 10; // altura mínima 10
          return (
            <div key={i} title={`${monthNameEs(v.month)} ${v.year} — ${money(v.total)}`} style={{ display: "grid", gridTemplateRows: "1fr auto", gap: 6 }}>
              <div
                style={{
                  height: h,
                  background: "#e27641",
                  borderRadius: 8,
                  boxShadow: "inset 0 -8px 12px rgba(0,0,0,0.06)",
                }}
              />
              <div style={{ textAlign: "center", fontSize: 11, color: "#666" }}>{shortMonthEs(v.month)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopList({ items }: { items: { producto: string; unidades: number }[] }) {
  if (items.length === 0) {
    return <div style={{ color: "#888" }}>No hay datos para el mes actual.</div>;
  }
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {items.map((it, idx) => (
        <div
          key={idx}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 8,
            padding: "10px 12px",
            background: "#fafafa",
            borderRadius: 12,
            border: "1px solid #eee",
          }}
        >
          <div style={{ fontWeight: 600 }}>{it.producto}</div>
          <div style={{ color: "#555" }}>{it.unidades} u.</div>
        </div>
      ))}
    </div>
  );
}

/* ============ Helpers ============ */

function monthNameEs(m: number) {
  const d = new Date(2024, m - 1, 1);
  return d.toLocaleString("es-ES", { month: "long" });
}
function shortMonthEs(m: number) {
  const d = new Date(2024, m - 1, 1);
  return d.toLocaleString("es-ES", { month: "short" }).replace(".", "");
}
