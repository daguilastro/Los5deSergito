// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Layout compartido (solo para páginas internas)
import MainLayout from "./components/main_layout";
import PanelPrincipal from "./pages/panel_principal";
import Inventario from "./pages/inventario";
import Ventas from "./pages/ventas";
import Alertas from "./pages/alertas";

// Páginas
import LoginPage from "./pages/login_page";
import Logout from "./pages/logout";

export default function App() {
  const user = { name: "Admin", role: "Administrador" }; // opcional

  return (
    <BrowserRouter>
      <Routes>
        {/* Base y /login muestran el login (sin layout) */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/login_page" element={<LoginPage />} />

                {/* Rutas internas con layout fijo (sidebar + topbar) */}
        <Route element={<MainLayout user={user} />}>
          <Route path="/panel_principal" element={<PanelPrincipal />} />
          <Route path="/inventario"       element={<Inventario />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/alertas" element={<Alertas />} />
          <Route path="/logout" element={<Logout />} />
        </Route>
          
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
