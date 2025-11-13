# Proyecto — Asignatura Sistemas de Información  
**Universidad Nacional de Colombia** 🎓

Este repositorio reúne el desarrollo completo del proyecto académico para la asignatura **Sistemas de Información**, incluyendo análisis, documentación, diseño y construcción del sistema asignado. Aquí se organizan las diferentes entregas, avances y artefactos técnicos del curso 📁.

## Integrantes del equipo
- Jenny Catherine Herrera  
- Frank Kenner Olmos Prada  
- Daniel Aguilar Castro  
- Eduar Mendez  

---

# Masacotta Desk
Sistema local de inventario y ventas para microempresas cerámicas.

## Objetivo
Facilitar la gestión de stock, ventas y clientes mediante una aplicación local desarrollada en Python/Django (SQLite) y frontend en React + TypeScript.

---

## Estructura principal
- `backend/`  
  - `manage.py`  
  - `backend/` (settings, wsgi, etc.)  
  - `api/` (controladores y rutas: `views.py`, `urls.py`, modelos, etc.)  
  - `create.sql` (script SQL con la estructura y datos iniciales para la base de datos SQLite)  
  - `requirements.txt` (dependencias Python)
- `frontend/`  
  - `src/`  
    - `pages/` (páginas React principales)
  - `package.json`  
  - `vite.config.ts`  
  - `dist/` (generado por `npm run build`)  

---

## Archivos importantes
- `backend/manage.py`  
- `backend/backend/settings.py`  
- `backend/api/views.py`  
- `backend/api/urls.py`  
- `backend/create.sql`  
- `backend/requirements.txt`  
- `frontend/src/pages/*`  
- `frontend/vite.config.ts`  

---

## Requisitos mínimos
- Node.js (>=16) y npm o yarn  
- Python 3.10+ y pip  
- SQLite (incluido con Python)  

---

## Ejecutar en desarrollo 

1) Preparar entorno Python y dependencias
```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows PowerShell: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2) Crear la base de datos SQLite a partir del script SQL
```bash
# Desde la raíz del repositorio:
sqlite3 backend/db.sqlite3 < backend/create.sql
```

3) Aplicar migraciones de Django
```bash
cd backend
python manage.py migrate
```

4) Iniciar backend (desarrollo)
```bash
python manage.py runserver 8000
```
El backend quedará escuchando en `http://127.0.0.1:8000`.

5) Iniciar frontend en modo desarrollo (hot-reload)
```bash
cd frontend
npm install
npm run dev
```
El servidor de Vite arranca con hot-reload; la salida indicará la URL (por ejemplo `http://localhost:5173`). El proxy hacia `/api/` está configurado en `vite.config.ts` para apuntar al backend de desarrollo.

---

## Ejecutar para demo / producción local
1. Construir frontend:
```bash
cd frontend
npm install
npm run build
# se genera la carpeta dist/
```
2. Mantener Django corriendo en `127.0.0.1:8000`.
3. Usar Nginx para servir `dist/` y para redirigir/proxy las llamadas a `/api/` hacia el backend Django en `127.0.0.1:8000`.

---

## Comandos útiles
- Backend:
  - `python manage.py migrate`
  - `python manage.py runserver 8000`
  - `python manage.py createsuperuser`
- Frontend:
  - `npm install`
  - `npm run dev`
  - `npm run build`
- Nginx (cuando se utilice para servir `dist/`):
  - `sudo nginx -t`
  - `sudo systemctl restart nginx`

---

## Debug rápido
- Verificar backend:
```bash
curl http://127.0.0.1:8000/api/ping/
```
- Verificar que `frontend/dist` existe después de `npm run build`.
- Si Nginx devuelve 500 o 502, revisar logs del sistema y permisos de lectura sobre `dist/`, y comprobar que Django está escuchando en `127.0.0.1:8000`.

## Organización visual del repositorio
```bash
MasacottaDesk/
├── backend/
│   ├── manage.py
│   ├── backend/
│   │   ├── settings.py
│   │   └── wsgi.py
│   ├── api/
│   │   ├── views.py
│   │   └── urls.py
│   └── create.sql
├── frontend/
│   ├── src/
│   │   └── pages/
│   ├── package.json
│   └── dist/
├── requirements.txt
└── README.md
```
