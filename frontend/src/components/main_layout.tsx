// src/components/main_layout.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

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

/* ===== SVG Icons ===== */
const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
  </svg>
);

const InventoryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

const SalesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="9" cy="21" r="1"/>
    <circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);

const AlertIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

/* ===== Componente ===== */
export default function MainLayout({ user: propUser }: MainLayoutProps) {
  const location = useLocation();
  const initial = fromStoredUser() ?? fromPropUser(propUser) ?? { username: "—", rol: "—" };
  const [currentUser, setCurrentUser] = useState<AnyUser>(initial);

  useEffect(() => {
    const onStorage = () => {
      const su = fromStoredUser();
      if (su) setCurrentUser(su);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

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

  const isActive = (path: string) => location.pathname === path;

  const sidebarItemStyle = (path: string): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    borderRadius: 12,
    color: isActive(path) ? "#e27641" : "#333",
    backgroundColor: isActive(path) ? "rgba(226, 118, 65, 0.1)" : "transparent",
    textDecoration: "none",
    fontWeight: isActive(path) ? 600 : 400,
    transition: "all 0.2s ease",
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh", background: "#fafafa" }}>
      {/* Sidebar */}
      <aside
        style={{
          borderRight: "1px solid #eee",
          background: "#fdeee3",
          padding: "24px 16px",
        }}
      >
        {/* Logo MassacottaDesk */}
        <div 
          style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 12, 
            marginBottom: 32,
            transition: "opacity 0.2s ease",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#e27641",
              display: "grid",
              placeItems: "center",
              color: "#fff",
              fontWeight: 800,
              fontSize: 24,
              boxShadow: "0 4px 12px rgba(226, 118, 65, 0.3)",
            }}
          >
            ◈
          </div>
          <div>
            <div style={{ 
              fontSize: 24, 
              fontWeight: 800, 
              color: "#e27641",
              lineHeight: 1.2,
              letterSpacing: "-0.5px"
            }}>
              Masacotta
            </div>
            <div style={{ 
              fontSize: 24, 
              fontWeight: 800, 
              color: "#e27641",
              lineHeight: 1.2,
              letterSpacing: "-0.5px"
            }}>
              Desk
            </div>
          </div>
        </div>

        <nav style={{ display: "grid", gap: 4 }}>
          <Link 
            to="/panel_principal" 
            style={sidebarItemStyle("/panel_principal")}
            onMouseEnter={(e) => {
              if (!isActive("/panel_principal")) {
                e.currentTarget.style.backgroundColor = "rgba(226, 118, 65, 0.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive("/panel_principal")) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            <DashboardIcon />
            <span>Panel</span>
          </Link>
          
          <Link 
            to="/inventario" 
            style={sidebarItemStyle("/inventario")}
            onMouseEnter={(e) => {
              if (!isActive("/inventario")) {
                e.currentTarget.style.backgroundColor = "rgba(226, 118, 65, 0.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive("/inventario")) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            <InventoryIcon />
            <span>Inventario</span>
          </Link>
          
          <Link 
            to="/ventas" 
            style={sidebarItemStyle("/ventas")}
            onMouseEnter={(e) => {
              if (!isActive("/ventas")) {
                e.currentTarget.style.backgroundColor = "rgba(226, 118, 65, 0.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive("/ventas")) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            <SalesIcon />
            <span>Ventas</span>
          </Link>
          
          <Link 
            to="/alertas" 
            style={sidebarItemStyle("/alertas")}
            onMouseEnter={(e) => {
              if (!isActive("/alertas")) {
                e.currentTarget.style.backgroundColor = "rgba(226, 118, 65, 0.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive("/alertas")) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            <AlertIcon />
            <span>Alertas</span>
          </Link>
          
          <a 
            href="/logout" 
            style={{ 
              ...sidebarItemStyle("/logout"), 
              marginTop: 16,
              opacity: 0.7 
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(226, 118, 65, 0.05)";
              e.currentTarget.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.opacity = "0.7";
            }}
          >
            <LogoutIcon />
            <span>Cerrar Sesión</span>
          </a>
        </nav>
      </aside>

      {/* Panel derecho */}
      <section style={{ display: "grid", gridTemplateRows: "72px 1fr", minHeight: "100vh" }}>
        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 20,
            padding: "0 32px",
            background: "#fff",
            borderBottom: "1px solid #eee",
          }}
        >
          <div 
            style={{ 
              cursor: "pointer",
              color: "#666",
              transition: "color 0.2s ease"
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#e27641"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#666"}
          >
            <BellIcon />
          </div>

          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #f2f2f2 0%, #e8e8e8 100%)",
              display: "grid",
              placeItems: "center",
              fontWeight: 700,
              color: "#666",
              fontSize: 16,
            }}
            title={userName}
          >
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </div>
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{userName}</div>
            <div style={{ fontSize: 12, color: "#777" }}>{userRole}</div>
          </div>
        </header>

        {/* Contenido */}
        <main style={{ padding: 24, overflow: "auto" }}>
          <Outlet />
        </main>
      </section>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}