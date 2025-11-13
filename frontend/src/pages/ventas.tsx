// frontend/src/pages/ventas.tsx
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

/* ======================= Tipos ======================= */
// Tipo basado en la respuesta de /api/productos/ y usado en inventario.tsx
type Producto = {
  id: number;
  nombre: string;
  precio_unitario: number; // En el backend es TEXT, pero lo recibimos como número
  stock_actual: number;
  // stock_minimo no es necesario aquí, pero sí stock_actual
};

// Tipo para nuestro estado de carrito
type CartItem = {
  producto: Producto;
  cantidad: number;
};

type ListResp = { items: Producto[]; count: number };

/* ======================= Endpoints ======================= */
const LIST_URL = "/api/productos/"; //
const CREATE_URL = "/api/ventas/create/"; //

/* ======================= Helpers (de inventario.tsx) ======================= */
const money = (v: number | string) => {
  const num = typeof v === "string" ? parseFloat(v) : v;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0, // Ajusta si necesitas decimales
  }).format(num ?? 0);
};

function getCookie(name: string) {
  const m = document.cookie.match(
    new RegExp(
      "(^|; )" + name.replace(/([$?*|{}\(\)\[\]\\\/\+^])/g, "\\$1") + "=([^;]*)"
    )
  );
  return m ? decodeURIComponent(m[2]) : "";
}

/* ======================= Componente Principal ======================= */
export default function Ventas() {
  // Estado para la lista maestra de productos
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estado para la UI
  const [q, setQ] = useState(""); // Búsqueda
  const [cliente, setCliente] = useState(""); // Campo opcional de cliente
  const [cart, setCart] = useState<CartItem[]>([]); // Carrito

  // Estado para la API de envío
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  // Cargar todos los productos al montar
  async function fetchProducts() {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await apiFetch(LIST_URL, null, "GET");
      if (!res.ok) throw new Error("No se pudo cargar la lista de productos.");
      const data = (await res.json()) as ListResp;
      setProductos(data.items || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Error de red.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  // Productos filtrados por búsqueda
  const filteredProductos = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return productos;
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(term) || String(p.id).includes(term)
    );
  }, [q, productos]);

  // Resumen del carrito (total y subtotales)
  const resumen = useMemo(() => {
    let total = 0;
    const itemsConSubtotal = cart.map((item) => {
      const subtotal = item.producto.precio_unitario * item.cantidad;
      total += subtotal;
      return { ...item, subtotal };
    });
    return { items: itemsConSubtotal, total };
  }, [cart]);

  /* --- Handlers del Carrito --- */

  const handleAddToCart = (p: Producto) => {
    setSubmitStatus(null); // Limpiar mensajes
    const existing = cart.find((item) => item.producto.id === p.id);

    if (existing) {
      // Si ya existe, incrementa la cantidad (si hay stock)
      const newQty = existing.cantidad + 1;
      if (newQty > p.stock_actual) {
        alert(
          `Stock máximo alcanzado para ${p.nombre} (${p.stock_actual} unidades)`
        );
        return;
      }
      setCart(
        cart.map((item) =>
          item.producto.id === p.id ? { ...item, cantidad: newQty } : item
        )
      );
    } else {
      // Si es nuevo, agrégalo con cantidad 1
      if (1 > p.stock_actual) {
        alert(`No hay stock disponible para ${p.nombre}`);
        return;
      }
      setCart([...cart, { producto: p, cantidad: 1 }]);
    }
  };

  const handleUpdateQty = (productId: number, newQty: number) => {
    setSubmitStatus(null); // Limpiar mensajes

    // Si la cantidad es 0 o menos, elimina el item
    if (newQty <= 0) {
      setCart(cart.filter((item) => item.producto.id !== productId));
      return;
    }

    // Valida stock
    const item = cart.find((i) => i.producto.id === productId);
    if (item && newQty > item.producto.stock_actual) {
      alert(
        `Stock máximo alcanzado para ${item.producto.nombre} (${item.producto.stock_actual} unidades)`
      );
      setCart(
        cart.map((i) =>
          i.producto.id === productId
            ? { ...i, cantidad: item.producto.stock_actual }
            : i
        )
      );
      return;
    }

    // Actualiza cantidad
    setCart(
      cart.map((item) =>
        item.producto.id === productId ? { ...item, cantidad: newQty } : item
      )
    );
  };

  const handleCancel = () => {
    setCart([]);
    setCliente("");
    setSubmitStatus(null);
  };

  /* --- Handler de Envío --- */

  const handleSubmitVenta = async () => {
    if (cart.length === 0) return;

    setIsSubmitting(true);
    setSubmitStatus(null);
    const csrf = getCookie("csrftoken");

    const payload = {
      cliente: cliente.trim() || null, // RF-05: Cliente opcional
      items: cart.map((item) => ({
        producto_id: item.producto.id,
        cantidad: item.cantidad,
      })),
    };

    try {
      const res = await apiFetch(CREATE_URL, payload, "POST", {
        "X-CSRFToken": csrf,
        "Content-Type": "application/json",
      });

      const data = await res.json();

      if (!res.ok) {
        // El backend nos avisa si falta stock
        const detail = data.detail || "No se pudo registrar la venta.";
        let itemsMsg = "";
        if (data.items) {
          itemsMsg = data.items
            .map(
              (it: any) =>
                `\n- ${it.nombre}: ${it.solicitado} pedidas, ${it.disponible} en stock.`
            )
            .join("");
        }
        throw new Error(detail + itemsMsg);
      }

      // ↓ Nuevo: descarga PDF si vino en la respuesta
      if (data?.invoice?.base64) {
        const mime = data.invoice.mime || "application/pdf";
        const filename =
          data.invoice.filename || `factura_${data?.venta?.id || ""}.pdf`;
        const a = document.createElement("a");
        a.href = `data:${mime};base64,${data.invoice.base64}`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }

      // ¡Éxito!
      setSubmitStatus({ ok: true, msg: `Venta #${data.venta.id} registrada.` });
      handleCancel(); // Limpiar el formulario
      fetchProducts(); // RF-08: Recargar productos para actualizar stock
    } catch (err: any) {
      setSubmitStatus({
        ok: false,
        msg: err.message || "Error de red al confirmar la venta.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* --- Render --- */

  if (loading) return <div style={{ padding: 16 }}>Cargando productos...</div>;
  if (errorMsg) return <div style={styles.errorBox}>{errorMsg}</div>;

  return (
    <div style={styles.pageContainer}>
      {/* Columna Izquierda: Productos Disponibles */}
      <div style={styles.columnLeft}>
        <h1 style={styles.h1}>Registrar Venta</h1>

        {/* Barra de Búsqueda */}
        <div style={styles.searchWrapper}>
          <span>🔎</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar producto..."
            style={styles.searchInput}
          />
        </div>

        {/* Encabezado Lista */}
        <div style={styles.productHeader}>
          <div>Producto</div>
          <div>Precio Unitario</div>
          <div>Acciones</div>
        </div>

        {/* Lista de Productos */}
        <div style={styles.productList}>
          {filteredProductos.map((p) => (
            <div key={p.id} style={styles.productRow}>
              <div style={styles.productName}>{p.nombre}</div>
              <div>{money(p.precio_unitario)}</div>
              <div>
                <button
                  onClick={() => handleAddToCart(p)}
                  disabled={p.stock_actual <= 0}
                  style={
                    p.stock_actual <= 0 ? styles.btnDisabled : styles.btnAgregar
                  }
                >
                  {p.stock_actual <= 0 ? "Sin Stock" : "Agregar"}
                </button>
              </div>
            </div>
          ))}
          {filteredProductos.length === 0 && (
            <div style={styles.emptyText}>No hay productos que coincidan.</div>
          )}
        </div>
      </div>

      {/* Columna Derecha: Resumen de Venta */}
      <div style={styles.columnRight}>
        <h2 style={styles.h2}>Resumen de Venta</h2>
        <div style={styles.dateText}>
          {new Date().toLocaleDateString("es-ES", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })}
        </div>

        {/* Cliente Opcional */}
        <label style={styles.field}>
          <span>Cliente</span>
          <input
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            style={styles.inputStyle}
            placeholder="(Opcional)"
          />
        </label>

        {/* Carrito */}
        <div style={styles.cartContainer}>
          <div style={styles.cartHeader}>
            <div>Producto</div>
            <div>Cantidad</div>
            <div>Subtotal</div>
          </div>
          <div style={styles.cartItems}>
            {resumen.items.length === 0 && (
              <div style={styles.emptyText}>
                No hay productos en el resumen.
              </div>
            )}
            {resumen.items.map((item) => (
              <CartItemRow
                key={item.producto.id}
                item={item}
                onUpdateQty={handleUpdateQty}
              />
            ))}
          </div>
        </div>

        {/* Total */}
        <div style={styles.totalRow}>
          <span>Total:</span>
          <span>{money(resumen.total)}</span>
        </div>

        {/* Mensaje de estado (éxito o error) */}
        {submitStatus && (
          <div style={submitStatus.ok ? styles.successBox : styles.errorBox}>
            {submitStatus.msg}
          </div>
        )}

        {/* Acciones */}
        <div style={styles.actionsFooter}>
          <button
            onClick={handleCancel}
            style={styles.btnSecondary}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmitVenta}
            style={
              isSubmitting || cart.length === 0
                ? styles.btnDisabled
                : styles.btnPrimary
            }
            disabled={isSubmitting || cart.length === 0}
          >
            {isSubmitting ? "Confirmando..." : "Confirmar Venta"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ======================= Componente Fila del Carrito ======================= */
function CartItemRow({
  item,
  onUpdateQty,
}: {
  item: CartItem & { subtotal: number };
  onUpdateQty: (id: number, qty: number) => void;
}) {
  const p = item.producto;

  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "") {
      onUpdateQty(p.id, 0); // O manejar como 1
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0) {
      onUpdateQty(p.id, num);
    }
  };

  return (
    <div style={styles.cartRow}>
      <div style={styles.cartRowName}>{p.nombre}</div>
      <div style={styles.cartRowQty}>
        <button
          onClick={() => onUpdateQty(p.id, item.cantidad - 1)}
          style={styles.btnQty}
        >
          -
        </button>
        <input
          type="number"
          value={item.cantidad}
          onChange={handleQtyChange}
          style={styles.inputQty}
        />
        <button
          onClick={() => onUpdateQty(p.id, item.cantidad + 1)}
          style={styles.btnQty}
        >
          +
        </button>
      </div>
      <div style={styles.cartRowSubtotal}>{money(item.subtotal)}</div>
    </div>
  );
}

/* ======================= Estilos (Basados en Mockup) ======================= */
// Agrupamos los estilos para mantener el JSX limpio
const brandColor = "#e27641";

const styles: Record<string, React.CSSProperties> = {
  pageContainer: {
    padding: 16,
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: 24,
  },
  columnLeft: {
    background: "#fff",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
  },
  columnRight: {
    background: "#fff",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
  },
  h1: { fontSize: 30, margin: "0 0 18px 0" },
  h2: { fontSize: 22, margin: "0 0 8px 0" },
  dateText: { fontSize: 14, color: "#666", marginBottom: 16 },
  searchWrapper: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#f9efec",
    borderRadius: 12,
    padding: "10px 12px",
    marginBottom: 14,
  },
  searchInput: {
    border: "none",
    outline: "none",
    background: "transparent",
    width: "100%",
    fontSize: 14,
  },
  productHeader: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    gap: 12,
    padding: "10px 12px",
    color: "#6b6b6b",
    fontWeight: 700,
    fontSize: 14,
    borderBottom: "1px solid #f0f0f0",
  },
  productList: {
    maxHeight: "calc(100vh - 320px)",
    overflowY: "auto",
  },
  productRow: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    gap: 12,
    padding: "14px 12px",
    borderBottom: "1px solid #f0f0f0",
    alignItems: "center",
  },
  productName: { fontWeight: 600 },
  btnAgregar: {
    border: "none",
    background: brandColor,
    color: "#fff",
    padding: "8px 12px",
    borderRadius: 8,
    fontWeight: 700,
    cursor: "pointer",
  },
  btnDisabled: {
    border: "none",
    background: "#ccc",
    color: "#888",
    padding: "8px 12px",
    borderRadius: 8,
    fontWeight: 700,
    cursor: "not-allowed",
  },
  emptyText: { padding: 18, color: "#888", textAlign: "center" },
  field: {
    display: "grid",
    gap: 6,
    marginBottom: 16,
  },
  inputStyle: {
    borderRadius: 12,
    border: "1px solid #e6e6e6",
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    background: "#fff",
  },
  cartContainer: {
    border: "1px solid #f0f0f0",
    borderRadius: 12,
    marginTop: 16,
  },
  cartHeader: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    gap: 8,
    padding: "10px 12px",
    color: "#6b6b6b",
    fontWeight: 700,
    fontSize: 13,
    background: "#fafafa",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cartItems: {
    maxHeight: "calc(100vh - 500px)",
    overflowY: "auto",
  },
  cartRow: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    gap: 8,
    padding: "12px",
    borderBottom: "1px solid #f0f0f0",
    alignItems: "center",
  },
  cartRowName: { fontSize: 14, fontWeight: 500 },
  cartRowQty: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  inputQty: {
    width: 40,
    textAlign: "center",
    border: "1px solid #ddd",
    borderRadius: 6,
    padding: "4px 2px",
    margin: "0 4px",
    fontSize: 14,
  },
  btnQty: {
    border: "1px solid #ccc",
    background: "#f0f0f0", // Color del botón "Cancelar"
    color: "#333",
    width: 28, // Un poco más grande
    height: 28, // Un poco más grande
    borderRadius: 8, // Bordes más suaves
    cursor: "pointer",
    fontSize: 16, // Símbolo más grande
    fontWeight: 600,
    padding: 0, // Clave para centrar el símbolo
  },
  cartRowSubtotal: {
    fontSize: 14,
    fontWeight: 600,
    textAlign: "right",
    paddingRight: 4,
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 22,
    fontWeight: 800,
    padding: "16px 8px 12px 8px",
    borderTop: "2px solid #222",
    marginTop: 8,
  },
  actionsFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 16,
  },
  btnPrimary: {
    border: "none",
    background: brandColor,
    color: "#fff",
    padding: "12px 18px",
    borderRadius: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  btnSecondary: {
    border: "1px solid #ccc",
    background: "#f0f0f0",
    color: "#333",
    padding: "12px 18px",
    borderRadius: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  errorBox: {
    padding: 10,
    borderRadius: 10,
    background: "#fdeaea",
    color: "#b01010",
    marginTop: 12,
    whiteSpace: "pre-wrap", // Para mostrar saltos de línea en errores de stock
  },
  successBox: {
    padding: 10,
    borderRadius: 10,
    background: "#e7f7ec",
    color: "#1f8a36",
    marginTop: 12,
  },
};
