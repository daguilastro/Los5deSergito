# Masacotta Desk
Sistema local de inventario y ventas para microempresas cerámicas.

## 🚀 Objetivo
Facilitar la gestión de stock, ventas y clientes mediante una aplicación local
desarrollada en Python/Django y base de datos SQLite.

## 🧩 Estructura del proyecto
(app/ui, app/logic, app/db, data, docs...)

## ⚙️ Instalación
1. Clonar el repositorio.
2. Crear entorno virtual y activar.
3. `pip install -r requirements.txt`
4. Ejecutar migraciones (`python manage.py migrate`)
5. Correr servidor local (`python manage.py runserver`)

## 👥 Equipo
- Dev 1 — Inventario
- Dev 2 — Ventas
- Dev 3 — Usuarios
- Doc/QA — Documentación y UML

## 📸Organización de repositorio
MasacottaDesk/
│
├── app/
│   ├── ui/                     # vistas (templates Django)
│   │   ├── productos.html
│   │   ├── ventas.html
│   │   ├── clientes.html
│   │   ├── alertas.html
│   │   └── base.html
│   │
│   ├── logic/                  # lógica y servicios
│   │   ├── inventory_service.py
│   │   ├── sales_service.py
│   │   ├── alert_service.py
│   │   └── pdf_service.py
│   │
│   ├── db/                     # base de datos y modelos
│   │   ├── models.py
│   │   └── conexion.py
│   │
│   ├── tests/                  # pruebas unitarias
│   │   ├── test_inventory.py
│   │   ├── test_sales.py
│   │   └── test_alerts.py
│   │
│   └── utils/                  # funciones de apoyo
│       ├── validators.py
│       └── backup.py
│
├── data/
│   ├── masacotta.db            # base de datos SQLite local
│   └── seeds.sql               # datos de prueba (50 registros)
│
├── docs/
│   ├── uml/                    # diagramas
│   ├── erd/                    # modelo de datos
│   └── evidencias/             # capturas
│
├── manage.py                   # ejecución Django
├── requirements.txt
├── README.md                   # documentación del proyecto
└── LICENSE (opcional)


