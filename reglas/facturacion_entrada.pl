:- use_module(library(http/json)).
:- dynamic producto/5, kit/2, cliente/4, factura/3, linea/3.
:- ensure_loaded(facturacion_motor).
:- initialization(main, main).

main :-
    json_read_dict(current_input, Datos, [value_string_as(atom)]),
    limpiar_datos,
    maplist(cargar(producto), Datos.productos),
    maplist(cargar(kit), Datos.kits),
    cargar(cliente, Datos.cliente),
    cargar(factura, Datos.factura),
    maplist(cargar(linea), Datos.lineas),
    Datos.factura = [Id, _, _],
    evaluar_factura(Id, Estado, Subtotal, IVA, Total, Errores),
        ( Estado == emitida ->
        Datos.factura = [Id, ClienteId, _],
        maplist(detalle_de_entrada(ClienteId), Datos.lineas, Detalles),
        findall(
            _{codigo: Codigo, cantidad: Cantidad},
            ( producto(Codigo, _, _, _, _),
              cantidad_requerida(Id, Codigo, Cantidad),
              Cantidad > 0
            ),
            Consumos
        )
    ;
        Detalles = [],
        Consumos = []
    ),
    maplist(term_string, Errores, ErroresTexto),
    json_write_dict(current_output, _{
        estado: Estado,
        subtotal: Subtotal,
        iva: IVA,
        total: Total,
        errores: ErroresTexto,
        detalles: Detalles,
        consumos: Consumos
    }),
    nl.

limpiar_datos :-
    retractall(producto(_, _, _, _, _)),
    retractall(kit(_, _)),
    retractall(cliente(_, _, _, _)),
    retractall(factura(_, _, _)),
    retractall(linea(_, _, _)).

cargar(Predicado, Argumentos) :-
    Termino =.. [Predicado | Argumentos],
    assertz(Termino).

detalle_de_entrada(ClienteId, [_, Codigo, Cantidad], Detalle) :-
    detalle_linea(ClienteId, Codigo, Cantidad, Detalle).