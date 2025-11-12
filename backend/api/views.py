from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.db import transaction
from django.views.decorators.http import require_POST, require_GET
from django.views.decorators.csrf import csrf_exempt, csrf_protect, ensure_csrf_cookie
from django.contrib.auth.hashers import make_password, check_password
import json
from datetime import date
from decimal import Decimal, InvalidOperation
from django.db.models import Sum, F
import random

from .models import (
    Detalleventa,
    Movimientoinventario,
    Venta,
    Producto,
    Usuario,
)


def require_session(view):
    def wrapper(request, *a, **kw):
        if not request.session.get("uid"):
            return JsonResponse({"detail": "no autenticado"}, status=401)
        return view(request, *a, **kw)
    return wrapper


def ping(request):
    return JsonResponse({"ok": True, "app": "api"})


def csrf_token(request):
    get_token(request)
    return JsonResponse({"csrf": "ok"})


def _money_str(value) -> str:
    """Devuelve un string con 2 decimales (p.ej. '12.50')."""
    d = value if isinstance(value, Decimal) else Decimal(str(value))
    return f"{d.quantize(Decimal('0.01'))}"


@require_session
@require_GET
def productos_list(request):
    rows = list(
        Producto.objects.values(
            "id", "nombre", "precio_unitario", "stock_actual", "stock_minimo"
        ).order_by("id")
    )
    return JsonResponse({"items": rows, "count": len(rows)}, safe=False)


@require_POST
@csrf_protect
def ventas_create(request):
    """
    JSON esperado:
    {
      "fecha": "YYYY-MM-DD" (opcional; hoy por defecto),
      "cliente": "Nombre"   (opcional),
      "items": [
        {"producto_id": 5, "cantidad": 3},
        {"producto_id": 7, "cantidad": 1}
      ]
    }
    """
    data = json.loads(request.body or b"{}")
    items = data.get("items") or []
    if not isinstance(items, list) or not items:
        return JsonResponse({"detail": "items requeridos"}, status=400)

    fecha_txt = (data.get("fecha") or date.today().isoformat()).strip()
    cliente = (data.get("cliente") or "").strip()

    # Tomamos el usuario autenticado (si lo guardaste en sesión)
    creator = None
    uid = request.session.get("uid")
    if uid:
        creator = Usuario.objects.filter(pk=uid).first()
    if creator is None:
        # fallback para entorno de pruebas
        creator = Usuario.objects.first()

    # Normaliza items y valida cantidades
    norm_items = []
    for it in items:
        try:
            pid = int(it.get("producto_id"))
            qty = int(it.get("cantidad"))
        except (TypeError, ValueError):
            return JsonResponse({"detail": "producto_id y cantidad deben ser enteros"}, status=400)
        if qty <= 0:
            return JsonResponse({"detail": "cantidad debe ser > 0"}, status=400)
        norm_items.append((pid, qty))

    # 1) Pre-validación de stock (antes de abrir transacción, solo para mensajes)
    faltantes = []
    for pid, qty in norm_items:
        p = Producto.objects.filter(pk=pid).only(
            "id", "nombre", "stock_actual").first()
        if not p:
            return JsonResponse({"detail": f"producto_id {pid} no existe"}, status=404)
        disp = p.stock_actual or 0
        if qty > disp:
            faltantes.append(
                {"producto_id": pid, "nombre": p.nombre, "disponible": disp, "solicitado": qty})
    if faltantes:
        return JsonResponse({"detail": "stock insuficiente", "items": faltantes}, status=400)

    # 2) Crear la venta y sus efectos (TODO atómico)
    with transaction.atomic():
        v = Venta.objects.create(
            fecha=fecha_txt,
            total="0.00",
            nombre_comprador=cliente,
            created_by=creator,
        )

        total = Decimal("0")
        resumen_items = []

        for pid, qty in norm_items:
            # Bloquea la fila para evitar condiciones de carrera
            p = Producto.objects.select_for_update().get(pk=pid)

            disp = p.stock_actual or 0
            if qty > disp:
                # Doble chequeo dentro de la transacción
                raise transaction.TransactionManagementError(
                    "Stock cambió; intenta de nuevo.")

            precio_unit = _to_decimal(p.precio_unitario)
            subtotal = precio_unit * qty

            Detalleventa.objects.create(
                venta=v,
                producto=p,
                cantidad=qty,
                precio_unitario=_money_str(precio_unit),  # TEXT en tu esquema
                subtotal=_money_str(subtotal),
            )

            # Descontar inventario
            p.stock_actual = disp - qty
            p.save(update_fields=["stock_actual"])

            # Movimiento OUT
            Movimientoinventario.objects.create(
                producto=p,
                tipo="OUT",
                cantidad=qty,
                fecha=fecha_txt,
                motivo="venta",
                ref_venta=v,
                created_by=creator,
            )

            total += subtotal
            resumen_items.append({
                "producto_id": p.id,
                "nombre": p.nombre,
                "cantidad": qty,
                "precio_unitario": _money_str(precio_unit),
                "subtotal": _money_str(subtotal),
            })

        v.total = _money_str(total)
        v.save(update_fields=["total"])

    return JsonResponse({
        "ok": True,
        "venta": {
            "id": v.id,
            "fecha": v.fecha,
            "cliente": v.nombre_comprador,
            "total": v.total,
            "items": resumen_items
        }
    }, status=201)


@require_POST
@csrf_protect
def inventario_add(request):
    data = json.loads(request.body or b"{}")
    producto_id = data.get("producto_id")
    nombre = (data.get("nombre") or "").strip()
    cantidad = data.get("cantidad")
    motivo = (data.get("motivo") or "reabastecimiento").strip()
    fecha_txt = (data.get("fecha") or date.today().isoformat()).strip()

    if producto_id is None and not nombre:
        return JsonResponse({"detail": "envía producto_id o nombre"}, status=400)
    try:
        if producto_id is not None:
            producto = get_object_or_404(Producto, pk=int(producto_id))
        else:
            producto = get_object_or_404(Producto, nombre=nombre)
    except (TypeError, ValueError):
        return JsonResponse({"detail": "producto_id inválido"}, status=400)

    try:
        cantidad = int(cantidad)
    except (TypeError, ValueError):
        return JsonResponse({"detail": "cantidad debe ser entero"}, status=400)
    if cantidad <= 0:
        return JsonResponse({"detail": "cantidad debe ser > 0"}, status=400)

    created_by = None
    uid = request.session.get("uid")
    if uid:
        created_by = Usuario.objects.filter(pk=uid).first()

    with transaction.atomic():
        p = Producto.objects.select_for_update().get(pk=producto.pk)
        p.stock_actual = (p.stock_actual or 0) + cantidad
        p.save(update_fields=["stock_actual"])

        Movimientoinventario.objects.create(
            producto=p,
            tipo="IN",
            cantidad=cantidad,
            fecha=fecha_txt,
            motivo=motivo,
            ref_venta=None,
            created_by=created_by,
        )

    return JsonResponse({
        "ok": True,
        "producto": {
            "id": p.id,
            "nombre": p.nombre,
            "precio_unitario": p.precio_unitario,
            "stock_actual": p.stock_actual,
            "stock_minimo": p.stock_minimo,
        }
    }, status=201)


@csrf_exempt
@require_POST
def reset_data(request):
    with transaction.atomic():
        Detalleventa.objects.all().delete()
        Movimientoinventario.objects.all().delete()
        Venta.objects.all().delete()
        Producto.objects.all().delete()
        Usuario.objects.all().delete()
    return JsonResponse({"ok": True})

@require_session
@require_POST
@csrf_protect
def producto_update(request):
    """
    Edita un producto existente y (opcionalmente) ajusta su stock.

    JSON esperado (todos opcionales salvo id):
    {
      "id": 123,                          # requerido
      "nombre": "Nuevo nombre",           # opcional (renombrar)
      "precio_unitario": 18500.0,         # opcional (>= 0)  -> se guarda como TEXT con 2 decimales
      "stock_minimo": 10,                 # opcional (entero >= 0)
      "descripcion": "texto...",          # opcional, se guarda como motivo del movimiento si hay delta_stock
      "delta_stock": -3,                  # opcional (entero; puede ser negativo/positivo)
      "motivo": "ajuste manual",          # opcional (si no hay descripcion, se usa como motivo del movimiento)
      "fecha": "YYYY-MM-DD"               # opcional (por defecto: hoy)
    }
    """
    try:
        data = json.loads(request.body or b"{}")
    except Exception:
        return JsonResponse({"detail": "JSON inválido"}, status=400)

    # --- id del producto ---
    try:
        pid = int(data.get("id"))
    except (TypeError, ValueError):
        return JsonResponse({"detail": "id requerido y debe ser entero"}, status=400)

    # Campos opcionales
    nombre      = (data.get("nombre") or "").strip()
    descripcion = (data.get("descripcion") or "").strip()
    motivo      = (data.get("motivo") or "").strip()
    fecha_txt   = (data.get("fecha") or date.today().isoformat()).strip()

    precio_raw    = data.get("precio_unitario", None)
    stock_min_raw = data.get("stock_minimo", None)
    delta_raw     = data.get("delta_stock", None)

    # Validaciones básicas
    if precio_raw is not None:
        try:
            precio_val = _to_decimal(precio_raw)
            if precio_val < 0:
                return JsonResponse({"detail": "precio_unitario debe ser ≥ 0"}, status=400)
        except Exception:
            return JsonResponse({"detail": "precio_unitario inválido"}, status=400)
    else:
        precio_val = None

    if stock_min_raw is not None:
        try:
            stock_min_val = int(stock_min_raw)
            if stock_min_val < 0:
                return JsonResponse({"detail": "stock_minimo debe ser ≥ 0"}, status=400)
        except (TypeError, ValueError):
            return JsonResponse({"detail": "stock_minimo debe ser entero"}, status=400)
    else:
        stock_min_val = None

    if delta_raw is not None:
        try:
            delta_val = int(delta_raw)
        except (TypeError, ValueError):
            return JsonResponse({"detail": "delta_stock debe ser entero"}, status=400)
    else:
        delta_val = 0

    # Usuario que realiza el cambio (si está en sesión)
    created_by = None
    uid = request.session.get("uid")
    if uid:
        created_by = Usuario.objects.filter(pk=uid).first()

    # --- Actualización atómica ---
    with transaction.atomic():
        p = Producto.objects.select_for_update().filter(pk=pid).first()
        if not p:
            return JsonResponse({"detail": "producto no existe"}, status=404)

        # Renombrar
        if nombre:
            p.nombre = nombre

        # Campos numéricos
        if precio_val is not None:
            # tu esquema lo guarda como TEXT con 2 decimales
            p.precio_unitario = _money_str(precio_val)
        if stock_min_val is not None:
            p.stock_minimo = stock_min_val

        # Ajuste de stock (puede ser 0 / positivo / negativo)
        if delta_val != 0:
            nuevo_stock = (p.stock_actual or 0) + delta_val
            if nuevo_stock < 0:
                return JsonResponse(
                    {"detail": "stock insuficiente para el ajuste solicitado"},
                    status=400
                )

            p.stock_actual = nuevo_stock
            p.save(update_fields=["nombre", "precio_unitario", "stock_minimo", "stock_actual"])

            # La descripción va como motivo del movimiento (si viene).
            # Si no hay descripción, usamos motivo; y si tampoco, un texto por defecto según el signo.
            motivo_mov = descripcion or motivo or ("ajuste +" if delta_val > 0 else "ajuste -")

            Movimientoinventario.objects.create(
                producto=p,
                tipo="IN" if delta_val > 0 else "OUT",
                cantidad=abs(delta_val),
                fecha=fecha_txt,
                motivo=motivo_mov,
                ref_venta=None,
                created_by=created_by,
            )
        else:
            # Solo cambios de nombre / precio / stock mínimo
            p.save(update_fields=["nombre", "precio_unitario", "stock_minimo"])

    return JsonResponse({
        "ok": True,
        "producto": {
            "id": p.id,
            "nombre": p.nombre,
            "precio_unitario": p.precio_unitario,
            "stock_actual": p.stock_actual,
            "stock_minimo": p.stock_minimo,
            # ya NO devolvemos descripcion porque no existe en el modelo Producto
        }
    }, status=200)

@require_session
@require_POST
@csrf_protect
def producto_delete(request):
    """
    Elimina un producto por completo (si no tiene ventas asociadas).

    JSON esperado:
    {
      "id": 123           # requerido
      // "force": true    # opcional: si quieres permitir borrar incluso con relaciones (NO recomendado)
    }
    """
    # Parseo de JSON
    try:
        data = json.loads(request.body or b"{}")
    except Exception:
        return JsonResponse({"detail": "JSON inválido"}, status=400)

    # id del producto
    try:
        pid = int(data.get("id"))
    except (TypeError, ValueError):
        return JsonResponse({"detail": "id requerido y debe ser entero"}, status=400)

    force = bool(data.get("force", False))

    with transaction.atomic():
        # Bloqueo de fila para consistencia
        p = Producto.objects.select_for_update().filter(pk=pid).first()
        if not p:
            return JsonResponse({"detail": "producto no existe"}, status=404)

        # Verificar relaciones críticas (ventas)
        # Si existen detalles de venta, bloquear borrado por defecto.
        has_sales = Detalleventa.objects.filter(producto_id=p.id).exists()
        if has_sales and not force:
            return JsonResponse(
                {"detail": "No se puede eliminar: el producto tiene ventas asociadas."},
                status=409
            )

        # Si decides permitir force=True, primero elimina dependencias que no quieras conservar
        # (por ejemplo, movimientos de inventario) para evitar huérfanos si el FK no es CASCADE.
        # Si tus FKs ya están en CASCADE, esta eliminación explícita es opcional.
        Movimientoinventario.objects.filter(producto_id=p.id).delete()

        # Borrado del producto
        p.delete()

    return JsonResponse({"ok": True}, status=200)

@csrf_exempt
@require_POST
def seed_users(request):
    admin, _ = Usuario.objects.update_or_create(
        username="masacotta",
        defaults={
            "password_hash": make_password("admin"),
            "rol": "ADMIN",
        },
    )
    vendedor, _ = Usuario.objects.update_or_create(
        username="vendedor",
        defaults={
            "password_hash": make_password("caja"),
            "rol": "VENDEDOR",
        },
    )
    return JsonResponse(
        {"ok": True, "users": [
            {"id": admin.pk, "user": "masacotta", "rol": "ADMIN"},
            {"id": vendedor.pk, "user": "vendedor", "rol": "VENDEDOR"},
        ]},
        status=201
    )


@require_POST
@csrf_protect
def login_view(request):
    print("DEBUG csrftoken (cookie):", request.COOKIES.get("csrftoken"))
    print("DEBUG X-CSRFToken (header):", request.headers.get("X-CSRFToken"))
    print("DEBUG get_token(request):", get_token(request))
    data = json.loads(request.body or {})
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return JsonResponse({"detail":"credenciales inválidas"}, status=400)
    try:
        user = Usuario.objects.get(username=username)
    except Usuario.DoesNotExist:
        return JsonResponse({"detail":"credenciales inválidas"}, status=401)
    if not check_password(password, user.password_hash):
        return JsonResponse({"detail":"credenciales inválidas"}, status=401)
    
    request.session.cycle_key()
    request.session["uid"] = user.pk
    request.session["username"] = user.username
    request.session["rol"] = user.rol

    return JsonResponse({"ok": True, "user": {"id": user.pk, "username": user.username, "rol": user.rol}})


@require_session
@require_GET
def alertas_stock(request):
    rows = list(
        Producto.objects
        .filter(stock_actual__lt=F("stock_minimo"))
        .values("id", "nombre", "precio_unitario", "stock_actual", "stock_minimo")
        .order_by("stock_actual", "stock_minimo", "id")
    )
    return JsonResponse({"items": rows, "count": len(rows)}, status=200)


def whoami_view(request):
    uid = request.session.get("uid")
    if not uid:
        return JsonResponse({"detail": "no autenticado"}, status=401)
    return JsonResponse({
        "id": request.session["uid"],
        "username": request.session["username"],
        "rol": request.session["rol"],
    }, status=200)

@require_POST
@csrf_protect
@require_session
def logout_view(request):
    request.session.flush()
    return JsonResponse({"ok": True})

@require_session
@require_GET
def dashboard_summary(request):
    # 1) Ventas por mes (últimos 12; Venta.fecha es TextField 'YYYY-MM...'; total es TextField)
    ym_list = _last_12_ym()
    ventas_12 = []
    for ym, y, m in ym_list:
        totales = Venta.objects.filter(fecha__startswith=ym).values_list("total", flat=True)
        total_mes = sum(_to_decimal(v) for v in totales)
        ventas_12.append({"year": y, "month": m, "total": float(total_mes)})

    # 2) Ventas del mes actual y delta % vs mes anterior
    actual_total = ventas_12[-1]["total"] if ventas_12 else 0.0
    previo_total = ventas_12[-2]["total"] if len(ventas_12) >= 2 else 0.0
    delta_pct = None if previo_total == 0 else round(((actual_total - previo_total) / previo_total) * 100.0, 2)

    # 3) Inventario actual (unidades totales)
    inv_units = int(Producto.objects.aggregate(s=Sum("stock_actual"))["s"] or 0)

    # 4) Top-5 productos más vendidos del mes actual (por cantidad)
    ym_actual = ym_list[-1][0]  # 'YYYY-MM'
    top = (
        Detalleventa.objects
        .filter(venta__fecha__startswith=ym_actual)
        .values("producto__nombre")
        .annotate(unidades=Sum("cantidad"))
        .order_by("-unidades")[:5]
    )
    top5 = [{"producto": r["producto__nombre"], "unidades": r["unidades"] or 0} for r in top]

    return JsonResponse({
        "period": {"year": ym_list[-1][1], "month": ym_list[-1][2]},
        "ventas_mes": {"value": actual_total, "delta_pct_vs_prev": delta_pct},
        "inventario": {"units": inv_units},
        "ventas_por_mes": ventas_12,
        "top_productos_mes": top5
    }, status=200)

def _last_12_ym():
    # Lista de ('YYYY-MM', year, month) últimos 12 meses (incluye el actual)
    today = date.today().replace(day=1)
    y, m = today.year, today.month
    out = []
    for _ in range(12):
        out.append((f"{y:04d}-{m:02d}", y, m))
        m -= 1
        if m == 0:
            m, y = 12, y - 1
    return list(reversed(out))

def _to_decimal(x):
    if x is None:
        return Decimal("0")
    try:
        return Decimal(str(x).strip().replace(",", ""))
    except InvalidOperation:
        return Decimal("0")

def _rand_day_iso(y, m):
    # día 1..28 para evitar fin de mes
    d = random.randint(1, 28)
    return f"{y:04d}-{m:02d}-{d:02d}"

def _money(x: Decimal) -> str:
    return f"{x:.2f}"

@require_POST
def seed_demo_data(request):
    """
    - 30 productos
    - Ventas altas durante 24 meses (limitadas por stock disponible)
    - Reabastecimiento mensual para evitar stocks en cero
    - Fuerza algunos productos en alerta al final
    """
    random.seed(42)

    creator = Usuario.objects.filter().first()
    if not creator:
        return JsonResponse({"detail": "Se requiere al menos un Usuario existente"}, status=400)

    # ---------- 1) Catálogo: 30 productos ----------
    base_names = [
        "Taza Cerámica", "Plato Postre", "Bol Sopa", "Vaso Vidrio", "Cuchara Madera",
        "Tetero Pequeño", "Jarra Grande", "Maceta Decorativa", "Cuenco Artesanal",
        "Bandeja Recta", "Café Molido 250g", "Té Hierbas 100g", "Miel Artesanal 300g",
        "Sal Marina 500g", "Panela 500g", "Vela Aromática", "Cuaderno A5",
        "Bolígrafo Negro", "Llavero Cuero", "Portavasos"
    ]
    productos = list(Producto.objects.all())
    existentes = {p.nombre for p in productos}
    idx = 1
    while len(productos) < 30:
        name = base_names[(idx - 1) % len(base_names)] + f" #{idx}"
        if name not in existentes:
            precio = Decimal(random.randrange(1000, 9000)) / Decimal(100)  # 10.00–90.00
            p = Producto.objects.create(
                nombre=name,
                precio_unitario=_money(precio),           # TEXT
                stock_actual=random.randint(180, 420),    # stock inicial alto
                stock_minimo=random.randint(5, 25),
            )
            productos.append(p)
            existentes.add(name)
        idx += 1
    productos = list(Producto.objects.all()[:30])

    # ---------- 2) Ventas + Reabastecimiento mensual ----------
    created_ventas = 0
    created_detalles = 0
    created_movs = 0

    with transaction.atomic():
        y, m = date.today().year, date.today().month
        for _mes in range(24):
            # 18–36 ventas por mes
            n_ventas = random.randint(18, 36)
            for _ in range(n_ventas):
                f = _rand_day_iso(y, m)
                k = random.randint(2, 6)                  # 2–6 renglones por venta
                lineas = random.sample(productos, k)

                total = Decimal("0")
                v = Venta.objects.create(
                    fecha=f,
                    total="0.00",
                    nombre_comprador="",
                    created_by=creator,
                )
                created_ventas += 1

                for prod in lineas:
                    # cantidad solicitada
                    qty_req = random.randint(1, 10)

                    # limitar por stock disponible
                    prod.refresh_from_db(fields=["stock_actual"])
                    disp = prod.stock_actual or 0
                    if disp <= 0:
                        continue  # sin stock, saltar línea
                    qty = min(qty_req, disp)

                    pu = Decimal(str(prod.precio_unitario))
                    sub = pu * qty

                    Detalleventa.objects.create(
                        venta=v,
                        producto=prod,
                        cantidad=qty,
                        precio_unitario=_money(pu),
                        subtotal=_money(sub),
                    )

                    # Descuenta stock
                    prod.stock_actual = disp - qty
                    prod.save(update_fields=["stock_actual"])

                    # Movimiento OUT
                    Movimientoinventario.objects.create(
                        producto=prod,
                        tipo="OUT",
                        cantidad=qty,
                        fecha=f,
                        motivo="venta",
                        ref_venta=v,
                        created_by=creator,
                    )

                    total += sub
                    created_detalles += 1
                    created_movs += 1

                v.total = _money(total)
                v.save(update_fields=["total"])

            # ---- Reabastecimiento al cierre de cada mes ----
            # Reabastece ~60% de productos con 40–160 uds
            reab = random.sample(productos, k=max(1, int(len(productos) * 0.6)))
            f_restock = _rand_day_iso(y, m)
            for prod in reab:
                add = random.randint(40, 160)
                prod.refresh_from_db(fields=["stock_actual"])
                prod.stock_actual = (prod.stock_actual or 0) + add
                prod.save(update_fields=["stock_actual"])
                Movimientoinventario.objects.create(
                    producto=prod,
                    tipo="IN",
                    cantidad=add,
                    fecha=f_restock,
                    motivo="reabastecimiento",
                    ref_venta=None,
                    created_by=creator,
                )
                created_movs += 1

            # retroceder un mes
            m -= 1
            if m == 0:
                m = 12
                y -= 1

        # ---------- 3) Forzar algunos en alerta ----------
        hoy = date.today().isoformat()
        for prod in random.sample(productos, k=min(6, len(productos))):
            target = max(0, prod.stock_minimo - random.randint(1, 3))  # debajo del mínimo
            prod.refresh_from_db(fields=["stock_actual"])
            if prod.stock_actual > target:
                extra_out = prod.stock_actual - target
                prod.stock_actual = target
                prod.save(update_fields=["stock_actual"])
                Movimientoinventario.objects.create(
                    producto=prod,
                    tipo="OUT",
                    cantidad=extra_out,
                    fecha=hoy,
                    motivo="ajuste demo",
                    ref_venta=None,
                    created_by=creator,
                )
                created_movs += 1

    return JsonResponse({
        "ok": True,
        "productos_totales": Producto.objects.count(),
        "ventas_creadas": created_ventas,
        "detalles_creados": created_detalles,
        "movimientos_creados": created_movs,
        "meses_generados": 24,
        "productos_alerta": Producto.objects.filter(stock_actual__lt=0).count() + \
            sum(1 for p in Producto.objects.all()[:30] if (p.stock_actual or 0) < (p.stock_minimo or 0)),
    }, status=201)