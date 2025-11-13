# Proyecto — Asignatura Sistemas de Información  
**Universidad Nacional de Colombia** 🎓

Repositorio del proyecto académico desarrollado para la asignatura **Sistemas de Información**.  
Aquí se reúne el código fuente del sistema, junto con las entregas y artefactos técnicos principales del curso.

## Integrantes del equipo

- Jenny Catherine Herrera  
- Frank Kenner Olmos Prada  
- Daniel Aguilar Castro  
- Eduar Méndez  

---

# Masacotta Desk

**Masacotta Desk** es un sistema local de inventario y ventas para el taller de cerámica **Masacotta**, una microempresa artesanal.  
El objetivo es ofrecer una herramienta sencilla y enfocada en:

- Controlar el **inventario** de productos cerámicos.  
- Registrar **ventas** y sus detalles.  
- Generar **alertas** cuando el stock de un producto está por debajo del mínimo.  
- Mostrar un **panel de indicadores** básicos (ventas recientes, unidades en inventario, productos más vendidos, etc.).

El proyecto está pensado para ejecutarse **en un solo equipo local**, sin depender de servicios externos ni de conexión a internet.

---

## Tecnologías utilizadas

**Backend**

- [Django 5](https://www.djangoproject.com/) (Python)
- Base de datos **SQLite**, creada a partir del script `backend/create.sql`
- Librerías adicionales:
  - `reportlab` (generación de reportes PDF)
  - `pillow` (imágenes, soporte general)
  
**Frontend**

- [React](https://react.dev/) + [Vite](https://vite.dev/)  
- Lenguaje: **TypeScript**  
- Cliente SPA que consume las APIs del backend vía proxy (`/api` → `http://localhost:8000`).

---

## Funcionalidades principales

- **Autenticación básica**
  - Inicio de sesión con usuarios almacenados en la tabla `Usuario`.
  - Perfiles de usuario con rol (`ADMIN`, `VENDEDOR`).

- **Gestión de productos**
  - Listado de productos con nombre, precio, stock actual y stock mínimo.
  - Registro y actualización de productos.
  - Eliminación de productos (cuando aplica).

- **Control de inventario**
  - Actualización de existencias a partir de las ventas.
  - Mantiene la integridad de los datos mediante claves foráneas y restricciones de la BD.

- **Registro de ventas**
  - Creación de ventas con:
    - Fecha (por defecto, el día actual).
    - Cliente (opcional).
    - Detalle de productos, cantidades y subtotales.
  - Validación para evitar vender más unidades de las que hay en inventario.

- **Alertas de stock**
  - Listado de productos con **stock por debajo del mínimo**.
  - Pensado para apoyar la toma de decisiones de reposición.

- **Dashboard / Panel principal**
  - Resumen de ventas del mes.
  - Evolución de ventas por mes.
  - Top de productos más vendidos.
  - Resumen de unidades totales en inventario.

---

## Estructura del repositorio

```text
Los5deSergito/
├── backend/
│   ├── core/               # Proyecto Django
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── api/                # Aplicación con las vistas y modelos del dominio
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── management/     # Comandos de gestión (seed de usuarios)
│   ├── create.sql          # Script de creación de tablas en SQLite
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/          # Vistas: login, panel, inventario, ventas, alertas
│   │   ├── components/
│   │   └── lib/            # Cliente API (fetch)
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts      # Proxy /api → backend Django
└── readme.md               # Este archivo
