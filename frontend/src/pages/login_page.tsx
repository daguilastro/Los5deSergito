import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

const CSRF_URL = "/api/csrf/";
const LOGIN_URL = "/api/login-view/";

// Leer cookie 'csrftoken' (ajusta si usas otro nombre)
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()!.split(";").shift() || null;
  return null;
}

async function fetchCsrfOnce() {
  const res = await apiFetch(CSRF_URL, null, "GET");
  if (!res.ok) throw new Error(`CSRF failed: ${res.status}`);
}

export default function LoginPage() {
  const [csrfReady, setCsrfReady] = useState(false);
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pedir CSRF al montar
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await fetchCsrfOnce();
        if (mounted) setCsrfReady(true);
      } catch {
        if (mounted) setError("No se pudo inicializar la verificación (CSRF).");
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!csrfReady) {
      setError("Inicializando verificación… inténtalo en un momento.");
      return;
    }
    if (!user || !password) {
      setError("Por favor ingresa usuario y contraseña.");
      return;
    }

    setLoading(true);
    try {
      const csrftoken = getCookie("csrftoken");
      const headers: Record<string, string> = {};
      if (csrftoken) headers["X-CSRFToken"] = csrftoken;

      const res = await apiFetch(
        LOGIN_URL,
        { username: user.trim(), password },
        "POST",
        headers
      );

      if (res.ok) {
        // Redirigir al panel principal
        window.location.href = "/panel_principal";
        return;
      }

      if (res.status === 400 || res.status === 401) {
        try {
          const data = await res.json();
          setError(typeof data?.detail === "string" ? data.detail : "Credenciales inválidas.");
        } catch {
          setError("Credenciales inválidas.");
        }
      } else if (res.status === 403) {
        setError("Error de verificación (CSRF). Refresca la página.");
      } else {
        setError(`Error inesperado (${res.status}).`);
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        /* 100% del viewport: usar dvh para móviles + fallback vh */
        width: "100vw",
        height: "100dvh",
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#fcf4ef",
        padding: 16, // respiración en pantallas chicas
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "min(460px, calc(100vw - 32px))",
          background: "#fff",
          borderRadius: 16,
          padding: "2rem",
          boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 30, color: "#d86f3a", fontWeight: 800, textAlign: "center" }}>
          Masacotta Desk
        </h1>
        <p style={{ marginTop: 8, color: "#6b6b6b", fontSize: 12, textAlign: "center" }}>
          Acceso local — Solo para personal autorizado
        </p>

        {!csrfReady && !error && (
          <div style={{ marginTop: 16, fontSize: 14, color: "#555", textAlign: "center" }}>
            Inicializando verificación…
          </div>
        )}

        <div style={{ marginTop: 22, opacity: csrfReady ? 1 : 0.6 }}>
          <label style={{ display: "block", fontSize: 12, color: "#444", marginBottom: 6 }}>
            Usuario
          </label>
          <input
            type="text"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="Ingrese su usuario"
            disabled={!csrfReady || loading}
            style={inputStyle}
          />
        </div>

        <div style={{ marginTop: 14, opacity: csrfReady ? 1 : 0.6 }}>
          <label style={{ display: "block", fontSize: 12, color: "#444", marginBottom: 6 }}>
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingrese su contraseña"
            disabled={!csrfReady || loading}
            style={inputStyle}
          />
        </div>

        {error && (
          <div style={{ marginTop: 12, color: "#b33", fontSize: 13 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!csrfReady || loading}
          style={{
            width: "100%",
            marginTop: 18,
            padding: "12px 14px",
            borderRadius: 12,
            border: "none",
            background: "#d86f3a",
            color: "#fff",
            fontWeight: 700,
            cursor: csrfReady && !loading ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "Enviando..." : "Iniciar Sesión"}
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #e7e7e7",
  outline: "none",
  background: "#fff",
  color: "#222",      
  caretColor: "#222",  
};