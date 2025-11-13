// frontend/src/pages/alertas.tsx
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

/* ======================= Tipos ======================= */
type ProductoAlerta = {
  id: number;
  nombre: string;
  precio_unitario: number;
  stock_actual: number;
  stock_minimo: number;
};

type ListResp = { items: ProductoAlerta[]; count: number };

/* ======================= Endpoints ======================= */
const ALERTAS_URL = "/api/inventario/alertas/"; //
const ADD_STOCK_URL = "/api/productos/add/"; //

/* ======================= Helpers ======================= */
function getCookie(name: string) {
  const m = document.cookie.match(
    new RegExp("(^|; )" + name.replace(/([$?*|{}()[\]\\/+^])/g, "\\$1") + "=([^;]*)")
  );
  return m ? decodeURIComponent(m[2]) : "";
}

/* ======================= Página Principal ======================= */
export default function Alertas() {
  const [items, setItems] = useState<ProductoAlerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Producto seleccionado para reabastecer
  const [targetProduct, setTargetProduct] = useState<ProductoAlerta | null>(null);

  async function fetchAlertas() {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await apiFetch(ALERTAS_URL, null, "GET");
      if (!res.ok) throw new Error();
      const data = (await res.json()) as ListResp;
      setItems(data.items || []);
    } catch {
      setErrorMsg("No se pudo cargar el listado de alertas.");
    } finally {
      setLoading(false);
    }
  }

  // Cargar alertas al montar
  useEffect(() => {
    fetchAlertas();
  }, []);

  // Callback para cuando el modal de reabastecer es exitoso
  const handleSuccessReabastecer = () => {
    setTargetProduct(null); // Cierra el modal
    fetchAlertas(); // Vuelve a cargar la lista de alertas
  };

  if (loading) return <div style={{ padding: 16 }}>Cargando alertas...</div>;
  if (errorMsg) return <div style={styles.errorBox}>{errorMsg}</div>;

  return (
    <div style={{ padding: 16 }}>
      <h1 style={styles.h1}>Alertas de Stock Bajo</h1>

      {items.length === 0 ? (
        <div style={styles.emptyBox}>
          <span style={{ fontSize: 48 }}>🎉</span>
          <h3 style={{ margin: "8px 0" }}>¡Todo en orden!</h3>
          <div>No hay productos con stock bajo en este momento.</div>
        </div>
      ) : (
        <div style={styles.grid}>
          {items.map((p) => (
            <AlertCard
              key={p.id}
              product={p}
              onReabastecer={() => setTargetProduct(p)}
            />
          ))}
        </div>
      )}

      {/* Modal de Reabastecimiento */}
      {targetProduct && (
        <ReabastecerModal
          product={targetProduct}
          onClose={() => setTargetProduct(null)}
          onSuccess={handleSuccessReabastecer}
        />
      )}
    </div>
  );
}

/* ======================= Componente: Tarjeta de Alerta ======================= */
function AlertCard({
  product,
  onReabastecer,
}: {
  product: ProductoAlerta;
  onReabastecer: () => void;
}) {
  // Lógica de criticidad basada en el mockup
  const isCritico = product.stock_actual <= 2;
  const tagStyle = isCritico ? styles.tagCritico : styles.tagAdvertencia;
  const tagText = isCritico ? "Crítico" : "Advertencia";

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>{product.nombre}</h2>
      <div style={styles.cardStat}>
        Stock Actual: <span style={{ fontWeight: 800 }}>{product.stock_actual}</span>
      </div>
      <div style={styles.cardStat}>
        Stock Mínimo: <span>{product.stock_minimo}</span>
      </div>
      <div style={{ marginTop: 8 }}>
        <span style={tagStyle}>{tagText}</span>
      </div>
      <button onClick={onReabastecer} style={styles.btnReabastecer}>
        Reabastecer
      </button>
    </div>
  );
}

/* ======================= Componente: Modal Reabastecer ======================= */
function ReabastecerModal({
  product,
  onClose,
  onSuccess,
}: {
  product: ProductoAlerta;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [cantidad, setCantidad] = useState("0");
  const [motivo, setMotivo] = useState("Reabastecimiento");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    setMsg(null);
    const cantNum = Number(cantidad);

    if (!Number.isInteger(cantNum) || cantNum <= 0) {
      setMsg("La cantidad debe ser un número entero mayor a 0.");
      return;
    }
    if (!motivo.trim()) {
      setMsg("El motivo es obligatorio.");
      return;
    }

    // Payload para /api/productos/add/
    const payload = {
      producto_id: product.id,
      cantidad: cantNum,
      motivo: motivo.trim(),
    };

    const csrf = getCookie("csrftoken");
    try {
      setBusy(true);
      const res = await apiFetch(ADD_STOCK_URL, payload, "POST", {
        "X-CSRFToken": csrf,
        "Content-Type": "application/json",
      });
      if (!res.ok) {
        setMsg((await res.text()) || "No se pudo agregar el stock.");
        return;
      }
      onSuccess(); // Llama al callback de éxito
    } catch {
      setMsg("Error de red.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.modalCard}>
        <div style={styles.modalHeader}>
          <h2 style={{ margin: 0 }}>Reabastecer Producto</h2>
          <button onClick={onClose} style={styles.iconBtn}>✕</button>
        </div>
        <div style={{ color: "#666", marginBottom: 12 }}>
          Ingresa la cantidad de unidades que se añaden al stock de:
          <br />
          <strong style={{ color: brandColor }}>{product.nombre}</strong>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <label style={styles.field}>
            <span>Cantidad (Entrada)</span>
            <input
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              type="number"
              min={1}
              step={1}
              style={styles.inputStyle}
            />
          </label>
          <label style={styles.field}>
            <span>Motivo</span>
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              style={styles.inputStyle}
            />
          </label>
        </div>

        {msg && <div style={styles.errorBoxModal}>{msg}</div>}

        <div style={styles.modalFooter}>
          <button onClick={onClose} style={styles.btnSecondary} disabled={busy}>
            Cancelar
          </button>
          <button onClick={submit} style={styles.btnPrimary} disabled={busy}>
            {busy ? "Guardando..." : "Confirmar Entrada"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ======================= Estilos (Basados en Mockup) ======================= */
const brandColor = "#d86f3a";

const styles: Record<string, React.CSSProperties> = {
  h1: { fontSize: 30, margin: "8px 0 18px 4px" },
  errorBox: {
    padding: 16,
    color: "#b01010",
    background: "#fdeaea",
    borderRadius: 10,
  },
  emptyBox: {
    padding: 48,
    textAlign: "center",
    background: "#f9f9f9",
    borderRadius: 16,
    border: "1px dashed #ddd",
    color: "#666",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: 16,
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    border: "1px solid #f0f0f0",
    boxShadow: "0 8px 25px rgba(0,0,0,0.05)",
    padding: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 700,
    margin: "0 0 12px 0",
    color: "#222",
  },
  cardStat: {
    fontSize: 14,
    color: "#555",
    lineHeight: 1.6,
  },
  tagAdvertencia: {
    background: "#fdf8e7",
    color: "#a37b0a",
    border: "1px solid #fceec9",
    padding: "4px 8px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
  },
  tagCritico: {
    background: "#fdeaea",
    color: "#a61d24",
    border: "1px solid #f5c2c7",
    padding: "4px 8px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
  },
  btnReabastecer: {
    width: "100%",
    marginTop: 18,
    border: "none",
    background: brandColor,
    color: "#fff",
    padding: "12px 14px",
    borderRadius: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  // --- Estilos de Modal (reutilizados) ---
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "grid",
    placeItems: "center",
    zIndex: 1000,
  },
  modalCard: {
    width: 460,
    maxWidth: "92vw",
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
    padding: 18,
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  iconBtn: {
    background: "transparent",
    border: "none",
    padding: 6,
    cursor: "pointer",
    fontSize: 16,
    borderRadius: 8,
  },
  field: {
    display: "grid",
    gap: 6,
  },
  inputStyle: {
    borderRadius: 12,
    border: "1px solid #e6e6e6",
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    background: "#fff",
  },
  btnPrimary: {
    border: "none",
    background: brandColor,
    color: "#fff",
    padding: "10px 16px",
    borderRadius: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  btnSecondary: {
    border: "none",
    background: "#f0f0f0",
    color: "#333",
    padding: "10px 16px",
    borderRadius: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  errorBoxModal: {
    marginTop: 12,
    color: "#b01010",
    background: "#fdeaea",
    padding: 10,
    borderRadius: 10,
  },
};