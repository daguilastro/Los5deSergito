// src/pages/logout.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

function getCookie(name: string) {
  const m = document.cookie.match(
    new RegExp(
      "(^|; )" + name.replace(/([$?*|{}\(\)\[\]\\\/\+^])/g, "\\$1") + "=([^;]*)"
    )
  );
  return m ? decodeURIComponent(m[2]) : "";
}

const LogoutIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const LOGOUT_URL = "/api/logout/";

export default function Logout() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    let mounted = true;

    async function performLogout() {
      try {
        const csrf = getCookie("csrftoken");
        const res = await apiFetch(LOGOUT_URL, {}, "POST", {
          "X-CSRFToken": csrf,
          "Content-Type": "application/json",
        });

        if (!mounted) return;

        if (res.ok) {
          // Limpiar storage local
          sessionStorage.removeItem("user");
          localStorage.removeItem("user");
          
          setStatus("success");
          
          // Redirigir al login después de 1.5 segundos
          setTimeout(() => {
            if (mounted) {
              navigate("/", { replace: true });
            }
          }, 1500);
        } else {
          setStatus("error");
          // Incluso si hay error, redirigir después de 2 segundos
          setTimeout(() => {
            if (mounted) {
              navigate("/", { replace: true });
            }
          }, 2000);
        }
      } catch (error) {
        if (!mounted) return;
        setStatus("error");
        // En caso de error de red, también redirigir
        setTimeout(() => {
          if (mounted) {
            navigate("/", { replace: true });
          }
        }, 2000);
      }
    }

    performLogout();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <div style={styles.container}>
      <div style={{...styles.card, animation: "fadeIn 0.4s ease"}}>
        <div style={{
          ...styles.iconContainer,
          animation: status === "loading" ? "spin 2s linear infinite" : "none"
        }}>
          <LogoutIcon />
        </div>
        
        <h1 style={styles.title}>
          {status === "loading" && "Cerrando sesión..."}
          {status === "success" && "¡Hasta pronto!"}
          {status === "error" && "Sesión cerrada"}
        </h1>
        
        <p style={styles.message}>
          {status === "loading" && "Estamos cerrando tu sesión de forma segura."}
          {status === "success" && "Tu sesión se ha cerrado correctamente."}
          {status === "error" && "Hubo un problema, pero tu sesión se cerró localmente."}
        </p>

        {status !== "loading" && (
          <div style={styles.redirectMessage}>
            Redirigiendo al inicio de sesión...
          </div>
        )}

        {/* Barra de progreso */}
        {status === "loading" && (
          <div style={styles.progressBar}>
            <div style={{...styles.progressFill, animation: "progress 1.5s ease-in-out"}} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg, #fdeee3 0%, #f9f2ef 100%)",
    padding: 20,
  },
  card: {
    background: "#fff",
    borderRadius: 20,
    padding: 48,
    boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
    textAlign: "center",
    maxWidth: 420,
    width: "100%",
  },
  iconContainer: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 96,
    height: 96,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #fde1d5 0%, #fceee5 100%)",
    color: "#e27641",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 800,
    margin: "0 0 12px 0",
    color: "#222",
  },
  message: {
    fontSize: 15,
    color: "#666",
    lineHeight: 1.6,
    margin: "0 0 20px 0",
  },
  redirectMessage: {
    fontSize: 13,
    color: "#e27641",
    fontWeight: 600,
    marginTop: 16,
  },
  progressBar: {
    width: "100%",
    height: 4,
    background: "#f0f0f0",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 24,
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #e27641 0%, #d66535 100%)",
    borderRadius: 2,
  },
};