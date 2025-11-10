# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class Usuario(models.Model):
    username = models.TextField(unique=True)
    password_hash = models.TextField()
    rol = models.TextField()

    class Meta:
        db_table = 'Usuario'


class Producto(models.Model):
    nombre = models.TextField(unique=True)
    precio_unitario = models.TextField()  # This field type is a guess.
    stock_actual = models.IntegerField()
    stock_minimo = models.IntegerField()

    class Meta:
        db_table = 'Producto'


class Venta(models.Model):
    fecha = models.TextField()
    total = models.TextField()  # This field type is a guess.
    nombre_comprador = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(Usuario, models.DO_NOTHING, db_column='created_by')

    class Meta:
        db_table = 'Venta'


class Detalleventa(models.Model):
    venta = models.ForeignKey(Venta, models.DO_NOTHING)
    producto = models.ForeignKey(Producto, models.DO_NOTHING)
    cantidad = models.IntegerField()
    precio_unitario = models.TextField()  # This field type is a guess.
    subtotal = models.TextField()  # This field type is a guess.

    class Meta:
        db_table = 'DetalleVenta'


class Movimientoinventario(models.Model):
    producto = models.ForeignKey(Producto, models.DO_NOTHING)
    tipo = models.TextField()
    cantidad = models.IntegerField()
    fecha = models.TextField()
    motivo = models.TextField(blank=True, null=True)
    ref_venta = models.ForeignKey(Venta, models.DO_NOTHING, blank=True, null=True)
    created_by = models.ForeignKey(Usuario, models.DO_NOTHING, db_column='created_by')

    class Meta:
        db_table = 'MovimientoInventario'
