from django.urls import path
from .views import (
    ping,
    csrf_token,
    reset_data,
    seed_users,
    whoami_view,
    login_view,
    logout_view,
    dashboard_summary,
    seed_demo_data,
    productos_list,
    inventario_add,
    alertas_stock,
    ventas_create,
    producto_update,
    producto_delete,
)

urlpatterns = [
    path("ping/", ping), # GET
    path("csrf/", csrf_token),  # GET --Conseguir token csrf--
    path("dev/reset-data/", reset_data), # POST --Borrar todos los datos de la base de datos--
    path("dev/seed-users/", seed_users), # POST --Crear dos usuarios únicos--
    path("whoami/", whoami_view),  # GET --Retorna usuario(debug)--
    path("login-view/", login_view), # POST --Logea al usuario (le asigna una session id)--
    path("logout/", logout_view), # POST --Elimina la session id del server--
    path("dashboard/summary/", dashboard_summary),  # GET --Información de la página principal--
    path("dev/seed-demo-data/", seed_demo_data),  # POST --Crea datos de prueba--
    path("productos/", productos_list), # GET --Retorna todos los productos para la pestaña de inventario--
    path("productos/add/", inventario_add), # POST --Añade al inventario una cantidad de un producto o de un productId--
    path("inventario/alertas/", alertas_stock),  # GET --Retorna los productos que están en alerta por stock bajo--
    path("ventas/create/", ventas_create),  # POST --Crea una nueva venta, o sea, descuenta del inventario TODO:HACER QUE HAGA UNA FACTURA--
    path("productos/update/", producto_update), # POST
    path("productos/delete/", producto_delete), # POST
]
