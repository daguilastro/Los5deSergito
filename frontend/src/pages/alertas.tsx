// frontend/src/pages/alertas.tsx
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

/* ======================= Helper para leer usuario ======================= */
function getCurrentUser(): {
  id: number;
  username: string;
  rol: string;
} | null {
  try {
    const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

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
const ALERTAS_URL = "/api/inventario/alertas/";
const ADD_STOCK_URL = "/api/productos/add/";

/* ======================= Helpers ======================= */
function getCookie(name: string) {
  const m = document.cookie.match(
    new RegExp("(^|; )" + name.replace(/([$?*|{}()[\]\\\/+^])/g, "\\$1") + "=([^;]*)")
  );
  return m ? decodeURIComponent(m[2]) : "";
}

/* ======================= Página Principal ======================= */
export default function Alertas() {
  const [items, setItems] = useState<ProductoAlerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [targetProduct, setTargetProduct] = useState<ProductoAlerta | null>(null);
  
  const currentUser = getCurrentUser();
  const isVendedor = (currentUser?.rol || "").toLowerCase() === "vendedor";

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

  useEffect(() => {
    fetchAlertas();
  }, []);

  const handleSuccessReabastecer = () => {
    setTargetProduct(null);
    fetchAlertas();
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
              isVendedor={isVendedor}
            />
          ))}
        </div>
      )}

      {targetProduct && !isVendedor && (
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
  isVendedor,
}: {
  product: ProductoAlerta;
  onReabastecer: () => void;
  isVendedor: boolean;
}) {
  const isCritico = product.stock_actual <= 2;

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>{product.nombre}</h2>
      
      {/* Stock info sin recuadros */}
      <div style={styles.stockContainer}>
        <div style={styles.stockItem}>
          <div style={styles.stockLabel}>Stock Actual:</div>
          <div style={{
            ...styles.stockValue,
            color: isCritico ? "#c0392b" : "#a37b0a"
          }}>
            {product.stock_actual}
          </div>
        </div>
        <div style={styles.stockItem}>
          <div style={styles.stockLabel}>Stock Mínimo:</div>
          <div style={styles.stockValue}>{product.stock_minimo}</div>
        </div>
      </div>

      {/* Tag sin recuadro, solo texto coloreado */}
      <div style={{
        ...styles.tagText,
        color: isCritico ? "#c0392b" : "#a37b0a"
      }}>
        {isCritico ? "Crítico" : "Advertencia"}
      </div>

      <button 
        onClick={onReabastecer} 
        disabled={isVendedor}
        style={{
          ...styles.btnReabastecer,
          opacity: isVendedor ? 0.5 : 1,
          cursor: isVendedor ? "not-allowed" : "pointer",
          background: isVendedor ? "#ccc" : brandColor,
        }}
        title={isVendedor ? "Solo administradores pueden reabastecer" : "Reabastecer producto"}
      >
        {isVendedor ? "🔒 Restringido" : "Reabastecer"}
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
      onSuccess();
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
  h1: { 
    fontSize: 30, 
    margin: "8px 0 18px 4px",
    fontWeight: 700,
  },
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
    transition: "all 0.2s ease",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 700,
    margin: "0 0 16px 0",
    color: "#222",
  },
  stockContainer: {
    display: "flex",
    gap: 24,
    marginBottom: 12,
  },
  stockItem: {
    display: "flex",
    alignItems: "baseline",
    gap: 6,
  },
  stockLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: 400,
  },
  stockValue: {
    fontSize: 18,
    fontWeight: 800,
    color: "#222",
  },
  tagText: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 16,
    display: "block",
  },
  btnReabastecer: {
    width: "100%",
    border: "none",
    background: brandColor,
    color: "#fff",
    padding: "12px 14px",
    borderRadius: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 15,
    transition: "all 0.2s ease",
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