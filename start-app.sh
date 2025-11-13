#!/usr/bin/env bash
# start-app.sh - preparar y arrancar backend (Django) en background y frontend (Vite) en background (dev).
# Coloca este script en la raíz del repo y ejecútalo desde ahí: ./start-app.sh
# Usa rutas relativas para que funcione en distintos equipos.
set -euo pipefail

# --- rutas ---
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
FRONTEND_DIR="$REPO_ROOT/frontend"

VENV_DIR="$BACKEND_DIR/.venv"
DB_PATH="$BACKEND_DIR/db.sqlite3"

BACK_LOG="$BACKEND_DIR/django.log"
BACK_PID="$BACKEND_DIR/django.pid"

FRONT_LOG="$FRONTEND_DIR/dev.log"
FRONT_PID="$FRONTEND_DIR/dev.pid"

# Buscar create.sql en backend (profundidad hasta 4)
CREATE_SQL="$(find "$BACKEND_DIR" -maxdepth 4 -type f -name 'create.sql' -print -quit || true)"

# --- Utilidades / comprobar binarios ---
SYSTEM_PYTHON="$(command -v python3 || command -v python || true)"
NPM_CMD="$(command -v npm || true)"

if [ -z "$SYSTEM_PYTHON" ]; then
  echo "ERROR: python no encontrado en PATH." >&2
  exit 1
fi

# --- preparar virtualenv ---
if [ ! -d "$VENV_DIR" ]; then
  echo "Creando virtualenv en $VENV_DIR ..."
  "$SYSTEM_PYTHON" -m venv "$VENV_DIR"
fi

PYTHON="$VENV_DIR/bin/python"
PIP="$VENV_DIR/bin/pip"

if [ ! -x "$PYTHON" ]; then
  echo "ERROR: python del virtualenv no encontrado en $PYTHON" >&2
  exit 1
fi

# Instalar dependencias de backend si existe requirements.txt
if [ -f "$BACKEND_DIR/requirements.txt" ]; then
  echo "Instalando dependencias Python..."
  "$PIP" install --upgrade pip >/dev/null
  "$PIP" install -r "$BACKEND_DIR/requirements.txt"
else
  echo "Aviso: backend/requirements.txt no encontrado. Saltando pip install."
fi

# --- crear DB si falta ---
if [ ! -f "$DB_PATH" ]; then
  echo "db.sqlite3 no encontrada. Intentando crear desde create.sql si existe..."
  if [ -n "$CREATE_SQL" ]; then
    echo "create.sql encontrado en: $CREATE_SQL"
    if command -v sqlite3 >/dev/null 2>&1; then
      echo "Usando sqlite3 para crear la DB..."
      sqlite3 "$DB_PATH" < "$CREATE_SQL"
      echo "DB creada con sqlite3."
    else
      echo "sqlite3 no disponible. Usando módulo sqlite3 de Python..."
      "$PYTHON" - <<PYCODE
import sqlite3, pathlib
sql_path = pathlib.Path(r"$CREATE_SQL")
db_path = pathlib.Path(r"$DB_PATH")
sql_text = sql_path.read_text()
conn = sqlite3.connect(str(db_path))
cur = conn.cursor()
cur.executescript(sql_text)
conn.commit()
conn.close()
print("DB creada vía módulo sqlite3 de Python.")
PYCODE
    fi
  else
    echo "create.sql no encontrado. Se creará la DB con migrate."
  fi
else
  echo "db.sqlite3 ya existe. Saltando creación."
fi

# --- migraciones ---
echo "Ejecutando migraciones de Django..."
cd "$BACKEND_DIR"
"$PYTHON" manage.py migrate --noinput
"$PYTHON" manage.py seed_users
# --- arrancar backend en background ---
if [ -f "$BACK_PID" ]; then
  OLD_PID="$(cat "$BACK_PID" || true)"
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" >/dev/null 2>&1; then
    echo "Django ya se está ejecutando con PID $OLD_PID. Saltando arranque."
  else
    echo "PID file encontrado pero proceso no existe. Eliminando PID viejo."
    rm -f "$BACK_PID"
  fi
fi

if [ ! -f "$BACK_PID" ]; then
  echo "Iniciando Django en background (127.0.0.1:8000) ..."
  nohup "$PYTHON" manage.py runserver 127.0.0.1:8000 > "$BACK_LOG" 2>&1 &
  BACK_SERV_PID=$!
  # intentar disown si está disponible
  if command -v disown >/dev/null 2>&1; then disown "$BACK_SERV_PID" || true; fi
  echo "$BACK_SERV_PID" > "$BACK_PID"
  echo "Django iniciado (PID $BACK_SERV_PID). Logs: $BACK_LOG"
fi

# --- preparar e iniciar frontend en background (dev) ---
if [ -f "$FRONTEND_DIR/package.json" ]; then
  if [ -z "$NPM_CMD" ]; then
    echo "Aviso: npm no encontrado en PATH. No se puede iniciar frontend dev."
  else
    # instalar deps si es necesario (idempotente)
    echo "Instalando dependencias frontend (si aplica)..."
    (cd "$FRONTEND_DIR" && npm install)

    # comprobar si ya hay frontend en ejecución por PID file
    if [ -f "$FRONT_PID" ]; then
      OLD_FPID="$(cat "$FRONT_PID" || true)"
      if [ -n "$OLD_FPID" ] && kill -0 "$OLD_FPID" >/dev/null 2>&1; then
        echo "Frontend dev ya se está ejecutando con PID $OLD_FPID. Saltando arranque."
      else
        echo "PID file frontend encontrado pero proceso no existe. Eliminando PID viejo."
        rm -f "$FRONT_PID"
      fi
    fi

    if [ ! -f "$FRONT_PID" ]; then
      echo "Iniciando frontend (npm run dev) en background ..."
      # arrancar desde la carpeta frontend para que npm use correctamente el contexto
      (cd "$FRONTEND_DIR" && nohup npm run dev > "$FRONT_LOG" 2>&1 & echo $! > "$FRONT_PID")
      FRONT_SERV_PID="$(cat "$FRONT_PID" || true)"
      # intentar disown
      if command -v disown >/dev/null 2>&1; then disown "$FRONT_SERV_PID" || true; fi
      echo "Frontend dev iniciado (PID $FRONT_SERV_PID). Logs: $FRONT_LOG"
    fi
  fi
else
  echo "No se encontró frontend/package.json. Saltando pasos de frontend."
fi

echo
echo "Hecho."
echo "Backend PID: $(cat "$BACK_PID" 2>/dev/null || echo 'n/a')"
echo "Frontend PID: $(cat "$FRONT_PID" 2>/dev/null || echo 'n/a')"
echo "Logs: $BACK_LOG , $FRONT_LOG"
echo "Para detener backend: kill $(cat "$BACK_PID" 2>/dev/null || echo '<pid>')"
echo "Para detener frontend: kill $(cat "$FRONT_PID" 2>/dev/null || echo '<pid>')"
exit 0