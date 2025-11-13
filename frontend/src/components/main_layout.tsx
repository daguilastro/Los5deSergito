// src/components/main_layout.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, Outlet } from "react-router-dom";

/* ===== Tipos y utilidades ===== */
type PropUser = { name?: string; role?: string }; // lo que te pasa App.tsx
type StoredUser = { id?: number; username?: string; rol?: string }; // lo que guarda el login

type AnyUser = {
  username: string; // nombre a mostrar
  rol: string;      // rol a mostrar
};

function fromPropUser(u?: PropUser | null): AnyUser | null {
  if (!u) return null;
  const username = (u.name || "").trim();
  const rol = (u.role || "").trim();
  if (!username && !rol) return null;
  return {
    username: username || "—",
    rol: rol || "—",
  };
}

function fromStoredUser(): AnyUser | null {
  try {
    const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (!raw) return null;
    const parsed: StoredUser = JSON.parse(raw);
    const username = (parsed.username || "").trim();
    const rol = (parsed.rol || "").trim();
    if (!username && !rol) return null;
    return {
      username: username || "—",
      rol: rol || "—",
    };
  } catch {
    return null;
  }
}

function roleLabel(rol?: string) {
  const r = (rol || "").toLowerCase();
  if (r === "admin" || r === "administrador") return "Administrador";
  if (r === "vendedor") return "Vendedor";
  return r ? r.charAt(0).toUpperCase() + r.slice(1) : "—";
}

/* ===== Props ===== */
interface MainLayoutProps {
  /** Opcional: para compatibilidad con App.tsx que pasa user={ {name, role} } */
  user?: PropUser;
}

/* ===== Componente ===== */
export default function MainLayout({ user: propUser }: MainLayoutProps) {
  // Prioridad: 1) session/localStorage (login real), 2) prop user (mock de App.tsx)
  const initial = fromStoredUser() ?? fromPropUser(propUser) ?? { username: "—", rol: "—" };
  const [currentUser, setCurrentUser] = useState<AnyUser>(initial);

  // Refresca si cambia el storage (login/logout en otra pestaña)
  useEffect(() => {
    const onStorage = () => {
      const su = fromStoredUser();
      if (su) setCurrentUser(su);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Si cambian las props y no hay usuario en storage, úsalo
  useEffect(() => {
    const su = fromStoredUser();
    if (!su) {
      const pu = fromPropUser(propUser);
      if (pu) setCurrentUser(pu);
    } else {
      setCurrentUser(su);
    }
  }, [propUser]);

  const userName = useMemo(() => currentUser.username || "—", [currentUser]);
  const userRole = useMemo(() => roleLabel(currentUser.rol), [currentUser]);

  const sidebarItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 14px",
    borderRadius: 12,
    color: "#333",
    textDecoration: "none",
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh", background: "#fafafa" }}>
      {/* Sidebar */}
      <aside
        style={{
          borderRight: "1px solid #eee",
          background: "#fdeee3",
          padding: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#e27641",
              display: "grid",
              placeItems: "center",
              color: "#fff",
              fontWeight: 800,
            }}
          >
            ◈
          </div>
        </div>

        <nav style={{ display: "grid", gap: 6 }}>
          <Link to="/panel_principal" style={sidebarItemStyle}>Panel</Link>
          <Link to="/inventario" style={sidebarItemStyle}>Inventario</Link>
          <Link to="/ventas" style={sidebarItemStyle}>Ventas</Link>
          <Link to="/alertas" style={sidebarItemStyle}>Alertas</Link>
          <a href="/logout" style={{ ...sidebarItemStyle, opacity: 0.8 }}>Cerrar Sesión</a>
        </nav>
      </aside>

      {/* Panel derecho */}
      <section style={{ display: "grid", gridTemplateRows: "64px 1fr", minHeight: "100vh" }}>
        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 14,
            padding: "0 20px",
            background: "#fff",
            borderBottom: "1px solid #eee",
          }}
        >
          <span role="img" aria-label="notificaciones">🔔</span>

          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#f2f2f2",
              display: "grid",
              placeItems: "center",
              fontWeight: 700,
              color: "#666",
            }}
            title={userName}
          >
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </div>
          <div style={{ lineHeight: 1.2, marginRight: 6 }}>
            <div style={{ fontWeight: 700 }}>{userName}</div>
            <div style={{ fontSize: 12, color: "#777" }}>{userRole}</div>
          </div>
        </header>

        {/* Contenido */}
        <main style={{ padding: 24 }}>
          <Outlet />
        </main>
      </section>
    </div>
    
  );
}
