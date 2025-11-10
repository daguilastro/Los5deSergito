-- Masacotta Desk - Script de creación (SQLite)
PRAGMA foreign_keys = ON;

-- 1) Usuario
CREATE TABLE Usuario (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  username       TEXT    NOT NULL UNIQUE,
  password_hash  TEXT    NOT NULL,
  rol            TEXT    NOT NULL
    CHECK (rol IN ('ADMIN','VENDEDOR'))
);

-- 2) Producto
CREATE TABLE Producto (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre           TEXT    NOT NULL UNIQUE,
  precio_unitario  NUMERIC NOT NULL CHECK (precio_unitario >= 0),
  stock_actual     INTEGER NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
  stock_minimo     INTEGER NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0)
);

-- 3) Venta (encabezado)
CREATE TABLE Venta (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha            TEXT    NOT NULL DEFAULT (datetime('now')), -- ISO-8601
  total            NUMERIC NOT NULL CHECK (total >= 0),
  nombre_comprador TEXT,
  created_by       INTEGER NOT NULL,
  FOREIGN KEY (created_by) REFERENCES Usuario(id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

-- 4) DetalleVenta (líneas de la venta)
CREATE TABLE DetalleVenta (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id         INTEGER NOT NULL,
  producto_id      INTEGER NOT NULL,
  cantidad         INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario  NUMERIC NOT NULL,
  subtotal         NUMERIC NOT NULL,
  FOREIGN KEY (venta_id)    REFERENCES Venta(id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (producto_id) REFERENCES Producto(id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

-- 5) MovimientoInventario (entradas/salidas)
CREATE TABLE MovimientoInventario (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id   INTEGER NOT NULL,
  tipo          TEXT    NOT NULL CHECK (tipo IN ('IN','OUT')),
  cantidad      INTEGER NOT NULL CHECK (cantidad > 0),
  fecha         TEXT    NOT NULL DEFAULT (datetime('now')), -- ISO-8601
  motivo        TEXT,                 -- obligatorio si es manual (ver CHECK condicional)
  ref_venta_id  INTEGER,              -- null si es manual; no null si proviene de venta
  created_by    INTEGER NOT NULL,
  FOREIGN KEY (producto_id)  REFERENCES Producto(id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (ref_venta_id) REFERENCES Venta(id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (created_by)   REFERENCES Usuario(id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  -- Reglas condicionales:
  -- 1) Si hay venta asociada => debe ser OUT.
  CHECK (ref_venta_id IS NULL OR tipo = 'OUT'),
  -- 2) Si es manual (sin venta) => motivo NO nulo y tipo puede ser IN u OUT.
  CHECK ((ref_venta_id IS NOT NULL) OR (motivo IS NOT NULL))
);

-- Índices para performance y búsqueda
CREATE INDEX idx_producto_nombre       ON Producto(nombre);
CREATE INDEX idx_detalle_venta_id      ON DetalleVenta(venta_id);
CREATE INDEX idx_detalle_producto_id   ON DetalleVenta(producto_id);
CREATE INDEX idx_mov_prod              ON MovimientoInventario(producto_id);
CREATE INDEX idx_mov_tipo              ON MovimientoInventario(tipo);
CREATE INDEX idx_mov_ref_venta         ON MovimientoInventario(ref_venta_id);
CREATE INDEX idx_venta_created_by      ON Venta(created_by);
CREATE INDEX idx_venta_fecha           ON Venta(fecha);

