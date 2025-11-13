// src/pages/panel_principal.tsx
import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "../lib/api";

// === Tipos que devuelve tu API ===
type DashboardSummary = {
  period: { year: number; month: number };
  ventas_mes: { value: number; delta_pct_vs_prev: number | null };
  inventario: { units: number };
  ventas_por_mes: { year: number; month: number; total: number }[];
  top_productos_mes: { producto: string; unidades: number }[];
};

const API_URL = "/api/dashboard/summary/";

/* ===== SVG Icons ===== */
const TrendingUpIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);

const PackageIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

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
      <div style={{ padding: 16, animation: "fadeIn 0.3s ease" }}>
        <PageTitle>Pagina Principal</PageTitle>
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div style={{ padding: 16, animation: "fadeIn 0.3s ease" }}>
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
    <div style={{ padding: 16, animation: "fadeIn 0.4s ease" }}>
      <PageTitle>Pagina Principal</PageTitle>

      {/* KPIs */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(2, minmax(280px, 1fr))", 
        gap: 16, 
        marginBottom: 28 
      }}>
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
          icon={<TrendingUpIcon />}
        />
        <KpiCard
          title="Productos en Inventario"
          main={`${num(data.inventario.units)} unidades`}
          subtitle={data.ventas_mes.delta_pct_vs_prev == null ? " " : ""}
          icon={<PackageIcon />}
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
  return <h1 style={{ fontSize: 30, margin: "8px 0 18px 4px", fontWeight: 700 }}>{children}</h1>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 26, margin: "6px 0 14px 4px", fontWeight: 700 }}>{children}</h2>;
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
  icon?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: 20,
        boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 16,
        alignItems: "start",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 12px 35px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.06)";
      }}
    >
      <div>
        <div style={{ color: "#6b6b6b", fontSize: 14, fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: 36, fontWeight: 800, marginTop: 8, color: "#1a1a1a" }}>{main}</div>
        {subtitle ? (
          <div style={{ fontSize: 12, color: subtitleColor ?? "#8b8b8b", marginTop: 8, fontWeight: 500 }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      {icon ? (
        <div
          style={{
            background: "linear-gradient(135deg, #fde1d5 0%, #fceee5 100%)",
            color: "#e27641",
            width: 48,
            height: 48,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            boxShadow: "0 4px 12px rgba(226, 118, 65, 0.15)",
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
    <div 
      style={{ 
        background: "#fff", 
        borderRadius: 16, 
        padding: 20, 
        boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 12px 35px rgba(0,0,0,0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.06)";
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
      {subtitle ? <div style={{ fontSize: 12, color: "#8b8b8b", marginTop: 4 }}>{subtitle}</div> : null}
      <div style={{ marginTop: 16 }}>{children}</div>
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
          const h = Math.round((v.total / maxTotal) * 200) + 10;
          return (
            <div 
              key={i} 
              title={`${monthNameEs(v.month)} ${v.year} — ${money(v.total)}`} 
              style={{ 
                display: "grid", 
                gridTemplateRows: "1fr auto", 
                gap: 6,
                animation: `barGrow 0.6s ease ${i * 0.05}s backwards`
              }}
            >
              <div
                style={{
                  height: h,
                  background: "linear-gradient(180deg, #e27641 0%, #d66535 100%)",
                  borderRadius: 8,
                  boxShadow: "0 4px 12px rgba(226, 118, 65, 0.2)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scaleY(1.05)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(226, 118, 65, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scaleY(1)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(226, 118, 65, 0.2)";
                }}
              />
              <div style={{ textAlign: "center", fontSize: 11, color: "#666", fontWeight: 500 }}>
                {shortMonthEs(v.month)}
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes barGrow {
          from { transform: scaleY(0); opacity: 0; }
          to { transform: scaleY(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function TopList({ items }: { items: { producto: string; unidades: number }[] }) {
  if (items.length === 0) {
    return <div style={{ color: "#888" }}>No hay datos para el mes actual.</div>;
  }
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {items.map((it, idx) => (
        <div
          key={idx}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 10,
            padding: "12px 14px",
            background: "#fafafa",
            borderRadius: 12,
            border: "1px solid #eee",
            transition: "all 0.2s ease",
            animation: `slideIn 0.4s ease ${idx * 0.08}s backwards`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f5f5f5";
            e.currentTarget.style.transform = "translateX(4px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#fafafa";
            e.currentTarget.style.transform = "translateX(0)";
          }}
        >
          <div style={{ fontWeight: 600 }}>{it.producto}</div>
          <div style={{ color: "#e27641", fontWeight: 700 }}>{it.unidades} u.</div>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
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