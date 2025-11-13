// src/pages/inventario.tsx
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

// Helper para leer al usuario guardado por el login
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
type Producto = {
  id: number;
  nombre: string;
  precio_unitario: number;
  stock_actual: number;
  stock_minimo: number;
  descripcion?: string | null;
};

type ListResp = { items: Producto[]; count: number };

/* ======================= Endpoints ======================= */
const LIST_URL = "/api/productos/";
const CREATE_URL = "/api/productos/add/";
const UPDATE_URL = "/api/productos/update/";
const DELETE_URL = "/api/productos/delete/";

/* ======================= Helpers ======================= */
const money = (v: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" }).format(
    v ?? 0
  );

function getCookie(name: string) {
  const m = document.cookie.match(
    new RegExp(
      "(^|; )" + name.replace(/([$?*|{}\(\)\[\]\\\/\+^])/g, "\\$1") + "=([^;]*)"
    )
  );
  return m ? decodeURIComponent(m[2]) : "";
}

/* ======================= SVG Icons ======================= */
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

/* ======================= Página ======================= */
export default function Inventario() {
  const [items, setItems] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<Producto | null>(null);
  const currentUser = getCurrentUser();
  const isVendedor = (currentUser?.rol || "").toLowerCase() === "vendedor";

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await apiFetch(LIST_URL, null, "GET");
        if (!alive) return;
        if (!res.ok) throw new Error();
        const data = (await res.json()) as ListResp;
        setItems(data.items || []);
      } catch {
        if (alive) setErrorMsg("No se pudo cargar el inventario.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (p) =>
        String(p.id).includes(term) || p.nombre.toLowerCase().includes(term)
    );
  }, [q, items]);

  const upsert = (p: Producto) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.id === p.id);
      if (i >= 0) {
        const next = prev.slice();
        next[i] = p;
        return next;
      }
      return [p, ...prev];
    });
  };

  const removeById = (id: number) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  };

  if (loading) return <div style={{ padding: 16 }}>Cargando inventario…</div>;
  if (errorMsg)
    return (
      <div
        style={{
          padding: 16,
          color: "#b01010",
          background: "#fdeaea",
          borderRadius: 10,
        }}
      >
        {errorMsg}
      </div>
    );

  return (
    <div style={{ padding: 16, animation: "fadeIn 0.4s ease" }}>
      <h1 style={{ fontSize: 30, margin: "8px 0 18px 4px", fontWeight: 700 }}>
        Inventario de Productos
      </h1>

      {/* barra superior */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#fff",
              border: "1px solid #e6e6e6",
              borderRadius: 12,
              padding: "10px 14px",
              width: "100%",
              transition: "border-color 0.2s ease",
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = "#e27641"}
            onBlur={(e) => e.currentTarget.style.borderColor = "#e6e6e6"}
          >
            <SearchIcon />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar producto…"
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                width: "100%",
                fontSize: 14,
              }}
            />
          </div>
        </div>

        <button
          onClick={() => {
            if (!isVendedor) setOpenAdd(true);
          }}
          disabled={isVendedor}
          title={
            isVendedor ? "Solo lectura para vendedores" : "Agregar Producto"
          }
          style={{
            background: isVendedor ? "#ccc" : "#e27641",
            color: "#fff",
            border: "none",
            padding: "10px 18px",
            borderRadius: 12,
            fontWeight: 700,
            cursor: isVendedor ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "all 0.2s ease",
            boxShadow: isVendedor ? "none" : "0 4px 12px rgba(226, 118, 65, 0.2)",
          }}
          onMouseEnter={(e) => {
            if (!isVendedor) {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(226, 118, 65, 0.3)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isVendedor) {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(226, 118, 65, 0.2)";
            }
          }}
        >
          <PlusIcon />
          Agregar Producto
        </button>
      </div>

      {/* tabla */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr 160px 120px 120px 120px",
            padding: "16px 18px",
            color: "#6b6b6b",
            fontWeight: 700,
            background: "#fafafa",
            fontSize: 13,
          }}
        >
          <div>ID</div>
          <div>Nombre</div>
          <div>Precio Unitario</div>
          <div>Stock Actual</div>
          <div>Stock Mínimo</div>
          <div>Acciones</div>
        </div>
        <div>
          {filtered.map((p, idx) => (
            <div
              key={p.id}
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr 160px 120px 120px 120px",
                padding: "16px 18px",
                borderTop: "1px solid #f0f0f0",
                alignItems: "center",
                transition: "background 0.2s ease",
                animation: `slideIn 0.3s ease ${idx * 0.03}s backwards`,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#fafafa"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ fontWeight: 700, color: "#666" }}>
                {String(p.id).padStart(6, "0")}
              </div>
              <div style={{ fontWeight: 500 }}>{p.nombre}</div>
              <div>{money(p.precio_unitario)}</div>
              <div
                style={{
                  fontWeight: 700,
                  color:
                    p.stock_actual < p.stock_minimo ? "#c0392b" : "#1f8a36",
                }}
              >
                {p.stock_actual}
                {p.stock_actual < p.stock_minimo ? " ⚠" : ""}
              </div>
              <div>{p.stock_minimo}</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  title={isVendedor ? "Solo lectura para vendedores" : "Editar"}
                  style={{
                    ...iconBtn,
                    opacity: isVendedor ? 0.4 : 1,
                    cursor: isVendedor ? "not-allowed" : "pointer",
                  }}
                  disabled={isVendedor}
                  onClick={() => {
                    if (!isVendedor) setEditTarget(p);
                  }}
                  onMouseEnter={(e) => {
                    if (!isVendedor) {
                      e.currentTarget.style.background = "#f0f0f0";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <EditIcon />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 18, color: "#888", textAlign: "center" }}>
              No hay resultados.
            </div>
          )}
        </div>
      </div>

      {openAdd && (
        <AddProductModal
          onClose={() => setOpenAdd(false)}
          onSuccess={(p) => {
            upsert(p);
            setOpenAdd(false);
          }}
        />
      )}

      {editTarget && (
        <EditProductModal
          product={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={(p) => {
            upsert(p);
            setEditTarget(null);
          }}
          onDeleted={() => {
            removeById(editTarget.id);
            setEditTarget(null);
          }}
        />
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

/* ======================= Modal: Agregar ======================= */
function AddProductModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (p: Producto) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [cantidadIni, setCantidadIni] = useState("0");
  const [descripcion, setDescripcion] = useState("");
  const [stockMinimo, setStockMinimo] = useState("0");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    setMsg(null);

    const cant = Number(cantidadIni);
    const min = Number(stockMinimo);

    if (!nombre.trim()) {
      setMsg("Escribe un nombre.");
      return;
    }
    if (!Number.isInteger(cant) || cant < 0) {
      setMsg("Cantidad inicial debe ser entero ≥ 0.");
      return;
    }
    if (!Number.isInteger(min) || min < 0) {
      setMsg("Stock mínimo debe ser entero ≥ 0.");
      return;
    }

    const payload = {
      nombre: nombre.trim(),
      cantidad_inicial: cant,
      descripcion: descripcion.trim() || null,
      stock_minimo: min,
    };

    const csrf = getCookie("csrftoken");
    try {
      setBusy(true);
      const res = await apiFetch(CREATE_URL, payload, "POST", {
        "X-CSRFToken": csrf,
        "Content-Type": "application/json",
      });
      if (!res.ok) {
        setMsg((await res.text()) || "No se pudo crear el producto.");
        return;
      }
      const data = (await res.json()) as { ok: true; producto: Producto };
      onSuccess(data.producto);
    } catch {
      setMsg("Error de red.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={modalBackdrop}>
      <div style={{...modalCard, animation: "modalSlideIn 0.3s ease"}}>
        <Header title="Agregar Producto" onClose={onClose} />
        <div style={{ color: "#666", marginBottom: 12 }}>
          Crea un producto con su stock inicial.
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <Field label="Nombre">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              style={inputStyle}
              placeholder="Ej. Taza de Café Rústica"
            />
          </Field>

          <Field label="Cantidad inicial">
            <input
              value={cantidadIni}
              onChange={(e) => setCantidadIni(e.target.value)}
              type="number"
              min={0}
              step={1}
              style={inputStyle}
            />
          </Field>

          <Field label="Descripción">
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </Field>

          <Field label="Stock mínimo">
            <input
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
              type="number"
              min={0}
              step={1}
              style={inputStyle}
            />
          </Field>
        </div>

        {msg && <Alert>{msg}</Alert>}

        <Footer
          busy={busy}
          onClose={onClose}
          onSubmit={submit}
          submitText="Crear"
        />
      </div>
      <style>{`
        @keyframes modalSlideIn {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ======================= Modal: Editar (con ficha) ======================= */
function EditProductModal({
  product,
  onClose,
  onUpdated,
  onDeleted,
}: {
  product: Producto;
  onClose: () => void;
  onUpdated: (p: Producto) => void;
  onDeleted: () => void;
}) {
  const [deltaStock, setDeltaStock] = useState("0");
  const [precio, setPrecio] = useState(String(product.precio_unitario ?? 0));
  const [stockMin, setStockMin] = useState(String(product.stock_minimo ?? 0));
  const [descripcion, setDescripcion] = useState(product.descripcion ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  async function submitUpdate() {
    setMsg(null);

    const delta = Number(deltaStock || "0");
    const precioN = Number(precio || "0");
    const minN = Number(stockMin || "0");

    if (!Number.isInteger(delta)) {
      setMsg("Ajuste de stock debe ser entero (puede ser negativo).");
      return;
    }
    if (isNaN(precioN) || precioN < 0) {
      setMsg("Precio inválido.");
      return;
    }
    if (!Number.isInteger(minN) || minN < 0) {
      setMsg("Stock mínimo debe ser entero ≥ 0.");
      return;
    }

    const payload = {
      id: product.id,
      delta_stock: delta,
      precio_unitario: precioN,
      stock_minimo: minN,
      descripcion: (descripcion ?? "").trim() || null,
    };

    const csrf = getCookie("csrftoken");
    try {
      setBusy(true);
      const res = await apiFetch(UPDATE_URL, payload, "POST", {
        "X-CSRFToken": csrf,
        "Content-Type": "application/json",
      });
      if (!res.ok) {
        setMsg((await res.text()) || "No se pudo actualizar.");
        return;
      }
      const data = (await res.json()) as { ok: true; producto: Producto };
      onUpdated(data.producto);
    } catch {
      setMsg("Error de red.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    setAsking(false);
    const csrf = getCookie("csrftoken");
    try {
      setBusy(true);
      const res = await apiFetch(DELETE_URL, { id: product.id }, "POST", {
        "X-CSRFToken": csrf,
        "Content-Type": "application/json",
      });
      if (!res.ok) {
        setMsg((await res.text()) || "No se pudo eliminar.");
        return;
      }
      onDeleted();
    } catch {
      setMsg("Error de red.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={modalBackdrop}>
      <div style={{...modalCard, animation: "modalSlideIn 0.3s ease"}}>
        <Header title={`Editar • ${product.nombre}`} onClose={onClose} />

        {/* Ficha con valores actuales */}
        <div
          style={{
            display: "grid",
            gap: 10,
            background: "linear-gradient(135deg, #f9f2ef 0%, #fef6f2 100%)",
            border: "1px solid #f1d9cd",
            borderRadius: 14,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "center",
            }}
          >
            <div style={{ fontWeight: 800, color: "#e27641", fontSize: 16 }}>
              {product.nombre}
            </div>
            <span
              style={{
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 20,
                background:
                  product.stock_actual < product.stock_minimo
                    ? "#fdeaea"
                    : "#e7f7ec",
                color:
                  product.stock_actual < product.stock_minimo
                    ? "#a61d24"
                    : "#1f8a36",
                border: `1px solid ${
                  product.stock_actual < product.stock_minimo
                    ? "#f5c2c7"
                    : "#b7e2c3"
                }`,
                fontWeight: 600,
              }}
            >
              {product.stock_actual < product.stock_minimo
                ? "Bajo stock"
                : "Stock OK"}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
            }}
          >
            <StatChip
              label="Stock actual"
              value={String(product.stock_actual)}
            />
            <StatChip
              label="Precio"
              value={money(product.precio_unitario ?? 0)}
            />
            <StatChip
              label="Stock mínimo"
              value={String(product.stock_minimo)}
            />
          </div>

          {(product.descripcion ?? "").trim() ? (
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 10,
                border: "1px solid #f1d9cd",
                color: "#654c43",
                fontSize: 13,
              }}
            >
              {product.descripcion}
            </div>
          ) : null}
        </div>

        <div style={{ color: "#666", marginBottom: 12, fontSize: 14 }}>
          Ajusta stock, precio y mínimos. Para retirar unidades, usa un valor
          negativo en "Ajuste de stock".
        </div>

        {/* Formulario */}
        <div style={{ display: "grid", gap: 12 }}>
          <Field label="Ajuste de stock (puede ser negativo)">
            <input
              value={deltaStock}
              onChange={(e) => setDeltaStock(e.target.value)}
              type="number"
              step={1}
              style={inputStyle}
            />
          </Field>

          <Field label="Precio unitario">
            <input
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              type="number"
              min={0}
              step="0.01"
              style={inputStyle}
            />
          </Field>

          <Field label="Stock mínimo">
            <input
              value={stockMin}
              onChange={(e) => setStockMin(e.target.value)}
              type="number"
              min={0}
              step={1}
              style={inputStyle}
            />
          </Field>

          <Field label="Descripción">
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </Field>
        </div>

        {msg && <Alert>{msg}</Alert>}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 16,
            gap: 10,
          }}
        >
          <button
            onClick={() => setAsking(true)}
            style={{ ...btn, background: "#f8d7da", color: "#8a1c1c" }}
            disabled={busy}
          >
            Eliminar
          </button>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onClose}
              style={{ ...btn, background: "#f0f0f0" }}
              disabled={busy}
            >
              Cancelar
            </button>
            <button
              onClick={submitUpdate}
              style={{ ...btn, background: "#e27641", color: "#fff" }}
              disabled={busy}
            >
              {busy ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>

        {/* Confirmación de borrado */}
        {asking && (
          <div style={confirmWrap}>
            <div style={{...confirmCard, animation: "modalSlideIn 0.2s ease"}}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>
                ¿Eliminar este producto?
              </div>
              <div style={{ fontSize: 14, color: "#555", marginBottom: 12 }}>
                Esta acción no se puede deshacer.
              </div>
              <div
                style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
              >
                <button
                  onClick={() => setAsking(false)}
                  style={{ ...btn, background: "#f0f0f0" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  style={{ ...btn, background: "#c0392b", color: "#fff" }}
                  disabled={busy}
                >
                  {busy ? "Eliminando…" : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes modalSlideIn {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ======================= UI helpers ======================= */
function Header({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
      }}
    >
      <h2 style={{ margin: 0, fontWeight: 700 }}>{title}</h2>
      <button onClick={onClose} style={iconBtn}>
        ✕
      </button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, color: "#555", fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 12,
        color: "#b01010",
        background: "#fdeaea",
        padding: 12,
        borderRadius: 10,
        fontSize: 14,
        animation: "shake 0.3s ease",
      }}
    >
      {children}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: "10px 12px",
        border: "1px solid #f1d9cd",
        display: "grid",
        gap: 4,
      }}
    >
      <div style={{ fontSize: 11, color: "#8b6f65", fontWeight: 500 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 15 }}>{value}</div>
    </div>
  );
}

function Footer({
  busy,
  onClose,
  onSubmit,
  submitText = "Guardar",
}: {
  busy: boolean;
  onClose: () => void;
  onSubmit: () => void;
  submitText?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 10,
        marginTop: 16,
      }}
    >
      <button
        onClick={onClose}
        style={{ ...btn, background: "#f0f0f0" }}
        disabled={busy}
      >
        Cancelar
      </button>
      <button
        onClick={onSubmit}
        style={{ ...btn, background: "#e27641", color: "#fff" }}
        disabled={busy}
      >
        {busy ? "Guardando…" : submitText}
      </button>
    </div>
  );
}

/* ======================= Estilos inline ======================= */
const iconBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  padding: 6,
  cursor: "pointer",
  fontSize: 16,
  borderRadius: 8,
  transition: "background 0.2s ease",
};

const inputStyle: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid #e6e6e6",
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  background: "#fff",
  transition: "border-color 0.2s ease",
};

const btn: React.CSSProperties = {
  border: "none",
  borderRadius: 12,
  padding: "10px 16px",
  fontWeight: 700,
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const modalBackdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "grid",
  placeItems: "center",
  zIndex: 1000,
  backdropFilter: "blur(2px)",
};

const modalCard: React.CSSProperties = {
  width: 500,
  maxWidth: "92vw",
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
  padding: 20,
};

const confirmWrap: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "grid",
  placeItems: "center",
  background: "rgba(0,0,0,0.4)",
  zIndex: 1100,
  backdropFilter: "blur(2px)",
};

const confirmCard: React.CSSProperties = {
  background: "#fff",
  borderRadius: 14,
  padding: 18,
  width: 360,
  maxWidth: "92vw",
  boxShadow: "0 15px 40px rgba(0,0,0,0.3)",
};