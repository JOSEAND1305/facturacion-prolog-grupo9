:- ensure_loaded(facturacion_motor).

ventas_totales(Ventas, IVAPorPagar) :-
    findall(IVA-Total,
        evaluar_factura(_, emitida, _, IVA, Total, []),
        Importes),
    pairs_keys_values(Importes, Impuestos, Totales),
    sum_list(Totales, Ventas),
    sum_list(Impuestos, IVAPorPagar).

unidades_vendidas(Codigo, Unidades) :-
    setof(Item, Id^Cantidad^linea(Id, Item, Cantidad), Codigos),
    member(Codigo, Codigos),
    findall(Cantidad,
        ( evaluar_factura(Id, emitida, _, _, _, []),
          linea(Id, Codigo, Cantidad)
        ),
        Cantidades),
    sum_list(Cantidades, Unidades),
    Unidades > 0.

producto_mas_vendido(Codigo, Unidades) :-
    findall(Cantidad-Item, unidades_vendidas(Item, Cantidad), Ventas),
    pairs_keys(Ventas, Cantidades),
    max_list(Cantidades, Unidades),
    member(Unidades-Codigo, Ventas).

siguiente_consecutivo(Siguiente) :-
    findall(Id, factura(Id, _, _), Ids),
    max_list([0|Ids], Ultimo),
    Siguiente is Ultimo + 1.