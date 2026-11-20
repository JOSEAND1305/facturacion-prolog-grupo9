:- ensure_loaded(facturacion_precios).

% Un producto consume una unidad de sí mismo.
% Un kit consume una unidad de cada componente, incluso si contiene otro kit.
componente_stock(Codigo, Codigo) :-
    producto(Codigo, _, _, _, _).
componente_stock(Codigo, Producto) :-
    kit(Codigo, Componentes),
    member(Componente, Componentes),
    componente_stock(Componente, Producto).

cantidad_requerida(Id, Producto, Requerida) :-
    findall(Cantidad,
        ( linea(Id, Codigo, Cantidad),
          Cantidad > 0,
          componente_stock(Codigo, Producto)
        ),
        Cantidades),
    sum_list(Cantidades, Requerida).

error_factura(Id, sin_lineas) :-
    \+ linea(Id, _, _).

error_factura(Id, cantidad_invalida(Codigo, Cantidad)) :-
    linea(Id, Codigo, Cantidad),
    Cantidad =< 0.

error_factura(Id, sin_stock(Producto, Requerida, Disponible)) :-
    producto(Producto, _, _, _, Disponible),
    cantidad_requerida(Id, Producto, Requerida),
    Requerida > Disponible.

error_factura(Id, credito_no_permitido) :-
    factura(Id, Cliente, credito),
    cliente(Cliente, _, Tipo, Nivel),
    ( Tipo == consumidor_final -> true ; Nivel == regular ).

evaluar_factura(Id, Estado, Subtotal, IVA, Total, Errores) :-
    factura(Id, Cliente, _),
    findall(Error, error_factura(Id, Error), Errores),
    ( Errores == [] ->
        Estado = emitida,
        findall(Base-Impuesto,
            ( linea(Id, Codigo, Cantidad),
              calcular_linea(Cliente, Codigo, Cantidad, Base, Impuesto)
            ),
            Importes),
        pairs_keys_values(Importes, Bases, Impuestos),
        sum_list(Bases, Subtotal),
        sum_list(Impuestos, IVA),
        Total is Subtotal + IVA
    ;
        Estado = rechazada,
        Subtotal = 0,
        IVA = 0,
        Total = 0
    ).