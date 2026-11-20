:- ensure_loaded(facturacion_reportes).

:- begin_tests(facturacion).

test(precio_producto) :-
    findall(Precio, precio_item(p2, Precio), [450000]).

test(precio_kit) :-
    findall(Precio, precio_item(k1, Precio), [Resultado]),
    assertion(Resultado =:= 452675).

test(precio_kit_anidado) :-
    findall(Precio, precio_item(k2, Precio), [Resultado]),
    assertion(abs(Resultado - 453791.25) < 0.000001).

test(sin_descuento_por_volumen) :-
    findall(D, descuento_volumen(9, D), [0]).

test(descuento_desde_10_unidades) :-
    findall(D, descuento_volumen(10, D), [5]).

test(descuento_desde_50_unidades) :-
    findall(D, descuento_volumen(50, D), [10]).

test(linea_canasta) :-
    findall(Base-IVA, calcular_linea(c2, p1, 10, Base, IVA),
        [11400-114]).

test(linea_con_ambos_descuentos) :-
    findall(Base-IVA, calcular_linea(c1, p4, 12, Base, IVA),
        [87210-11337]).

test(linea_cliente_exonerado) :-
    findall(Base-IVA, calcular_linea(c3, p7, 10, Base, IVA),
        [162450-0]).

test(factura_2_emitida) :-
    evaluar_factura(2, emitida, 26400, 174, 26574, []).

test(factura_3_emitida) :-
    evaluar_factura(3, emitida, 589950, 0, 589950, []).

test(factura_4_rechazada_por_credito) :-
    evaluar_factura(4, rechazada, 0, 0, 0, [credito_no_permitido]).

test(factura_5_rechazada_por_stock) :-
    evaluar_factura(5, rechazada, 0, 0, 0, [sin_stock(p2, 20, 15)]).

test(ventas_e_iva_de_facturas_emitidas) :-
    findall(Ventas-IVA, ventas_totales(Ventas, IVA), [2168152-178680]).

test(unidades_excluyen_factura_rechazada) :-
    findall(Unidades, unidades_vendidas(p2, Unidades), [3]).

test(producto_mas_vendido) :-
    findall(Codigo-Unidades, producto_mas_vendido(Codigo, Unidades),
        [p4-12]).

test(siguiente_consecutivo) :-
    siguiente_consecutivo(7).

:- end_tests(facturacion).