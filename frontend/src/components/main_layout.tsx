import React from "react";
import { Link, Outlet } from "react-router-dom";

type User = { name: string; role: string; avatarUrl?: string };

type Props = {
  user?: User; // opcional: puedes pasar los datos reales luego
  title?: string; // opcional: si quieres mostrar un título arriba del contenido
};

export default function MainLayout({ user, title }: Props) {
  const u: User = user ?? { name: "Admin", role: "Administrador" };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr",
        minHeight: "100vh",
        background: "#f7f7f8",
      }}
    >
      {/* Sidebar fija */}
      <aside
        style={{ background: "#fdeee6", borderRight: "1px solid #f1d9cd" }}
      >
        {/* Marca */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "18px 16px",
            borderBottom: "1px solid #f1d9cd",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#f2b391",
              display: "grid",
              placeItems: "center",
              fontWeight: 700,
            }}
          >
            ◈
          </div>
          <div
            style={{
              fontWeight: 800,
              color: "#e27641",
              fontSize: 22,
              lineHeight: 1,
            }}
          >
            Masacotta
            <br />
            Desk
          </div>
        </div>

        {/* Navegación */}
        <nav style={{ padding: 12, display: "grid", gap: 6 }}>
          <Link to="/panel_principal" style={navItemStyle}>
            ▦ <span style={{ marginLeft: 10 }}>Panel</span>
          </Link>
          <Link to="/inventario" style={navItemStyle}>
            📦 <span style={{ marginLeft: 10 }}>Inventario</span>
          </Link>
          <Link to="/ventas" style={navItemStyle}>
            🛒 <span style={{ marginLeft: 10 }}>Ventas</span>
          </Link>
          <Link to="/alertas" style={navItemStyle}>
            ⓘ <span style={{ marginLeft: 10 }}>Alertas</span>
          </Link>
          <Link to="/logout" style={navItemStyle}>
            ↩ <span style={{ marginLeft: 10 }}>Cerrar Sesión</span>
          </Link>
        </nav>
      </aside>

      {/* Área derecha */}
      <section style={{ display: "grid", gridTemplateRows: "64px 1fr" }}>
        {/* Topbar fija */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 12,
            padding: "0 18px",
            background: "#fff",
            borderBottom: "1px solid #eee",
          }}
        >
          <span title="Notificaciones" style={{ fontSize: 20, opacity: 0.7 }}>
            🔔
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src={u.avatarUrl || "https://placehold.co/40x40?text=U"}
              alt="avatar"
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
            <div style={{ lineHeight: 1 }}>
              <div style={{ fontWeight: 700 }}>{u.name}</div>
              <div style={{ fontSize: 12, color: "#777" }}>{u.role}</div>
            </div>
          </div>
        </header>

        {/* Contenido variable (ruta hija activa) */}
        <main style={{ padding: 24, background: "#f7f7f8" }}>
          {title ? (
            <h1
              style={{
                margin: "8px 0 18px 4px",
                fontSize: 28,
                color: "#1e1e1e",
              }}
            >
              {title}
            </h1>
          ) : null}

          <div
            style={{
              padding: 8,
              minHeight: "calc(100vh - 64px - 24px - 18px)",
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
            }} // ← aquí van dos llaves de cierre
          >
            <Outlet />
          </div>
        </main>
      </section>
    </div>
  );
}

const navItemStyle: React.CSSProperties = {
  textDecoration: "none",
  color: "#333",
  padding: "12px 14px",
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  border: "1px solid transparent",
  background: "transparent",
  transition: "background .15s",
};
