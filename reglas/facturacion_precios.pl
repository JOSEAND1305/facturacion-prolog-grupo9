:- ensure_loaded(facturacion_datos).

precio_item(Codigo, Precio) :-
    producto(Codigo, _, _, Precio, _).

precio_item(Codigo, Precio) :-
    kit(Codigo, Componentes),
    maplist(precio_item, Componentes, Precios),
    sum_list(Precios, Suma),
    Precio is Suma * 0.95.

descuento_volumen(Cantidad, 10) :- Cantidad >= 50.
descuento_volumen(Cantidad, 5)  :- Cantidad >= 10, Cantidad < 50.
descuento_volumen(Cantidad, 0)  :- Cantidad < 10.

descuento_cliente(oro, 10).
descuento_cliente(plata, 5).
descuento_cliente(regular, 0).

tarifa_iva(general, 13).
tarifa_iva(medicamento, 2).
tarifa_iva(canasta, 1).
tarifa_iva(exento, 0).

categoria_item(Codigo, Categoria) :-
    producto(Codigo, _, Categoria, _, _).
categoria_item(Codigo, general) :-
    kit(Codigo, _).

iva_aplicable(exonerado, _, 0).
iva_aplicable(TipoCliente, Categoria, Tarifa) :-
    TipoCliente \= exonerado,
    tarifa_iva(Categoria, Tarifa).

calcular_linea(ClienteId, Codigo, Cantidad, Base, IVA) :-
    detalle_linea(ClienteId, Codigo, Cantidad, Detalle),
    Base = Detalle.base,
    IVA = Detalle.iva.

detalle_linea(ClienteId, Codigo, Cantidad, Detalle) :-
    cliente(ClienteId, _, TipoCliente, Nivel),
    precio_item(Codigo, Precio),
    categoria_item(Codigo, Categoria),
    descuento_volumen(Cantidad, DescuentoVolumen),
    descuento_cliente(Nivel, DescuentoCliente),
    iva_aplicable(TipoCliente, Categoria, Tarifa),
    Importe is Precio * Cantidad,
    ConDescuentoVolumen is Importe * (100 - DescuentoVolumen) / 100,
    BaseSinRedondear is ConDescuentoVolumen * (100 - DescuentoCliente) / 100,
    Subtotal is round(Importe),
    Base is round(BaseSinRedondear),
    Descuento is Subtotal - Base,
    IVA is round(BaseSinRedondear * Tarifa / 100),
    Total is Base + IVA,
    Detalle = _{
        precio_unitario: Precio,
        subtotal: Subtotal,
        descuento: Descuento,
        base: Base,
        iva: IVA,
        total: Total
    }.