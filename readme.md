# Proyecto — Asignatura Sistemas de Información  
**Universidad Nacional de Colombia** 🎓

Este repositorio reúne el desarrollo completo del proyecto académico para la asignatura **Sistemas de Información**, incluyendo análisis, documentación, diseño y construcción del sistema asignado. Aquí se organizan las diferentes entregas, avances y artefactos técnicos del curso 📁.

## Integrantes del equipo
- Jenny Catherine Herrera  
- Frank Kenner Olmos Prada  
- Daniel Aguilar Castro  
- Eduar Mendez  

El repositorio sirve como espacio central para la colaboración del equipo y el seguimiento del progreso del proyecto ✅.

## Estructura del repositorio  
Los entregables de la materia se gestionan mediante **ramas**. Hasta el momento están disponibles:
- `entregable_1`  
- `entregable_2`  
- `MasacottaDesk` (proyecto)
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
```bash
MasacottaDesk/
├── app/
│   ├── ui/                     # Vistas (templates Django)
│   │   ├── productos.html
│   │   ├── ventas.html
│   │   ├── clientes.html
│   │   ├── alertas.html
│   │   └── base.html
│   │
│   ├── logic/                  # Lógica y servicios
│   │   ├── inventory_service.py
│   │   ├── sales_service.py
│   │   ├── alert_service.py
│   │   └── pdf_service.py
│   │
│   ├── db/                     # Base de datos y modelos
│   │   ├── models.py
│   │   └── conexion.py
│   │
│   ├── tests/                  # Pruebas unitarias
│   │   ├── test_inventory.py
│   │   ├── test_sales.py
│   │   └── test_alerts.py
│   │
│   └── utils/                  # Funciones de apoyo
│       ├── validators.py
│       └── backup.py
│
├── data/
│   ├── masacotta.db            # Base de datos SQLite local
│   └── seeds.sql               # Datos de prueba (50 registros)
│
├── docs/
│   ├── uml/                    # Diagramas UML
│   ├── erd/                    # Modelo de datos
│   └── evidencias/             # Capturas y evidencias
│
├── manage.py                   # Ejecución Django
├── requirements.txt
├── README.md                   # Documentación del proyecto
└── LICENSE                     # (Opcional)

