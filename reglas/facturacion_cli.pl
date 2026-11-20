:- use_module(library(http/json)).
:- ensure_loaded(facturacion_motor).
:- initialization(main, main).

main([IdTexto]) :-
    atom_number(IdTexto, Id),
    evaluar_factura(Id, Estado, Subtotal, IVA, Total, Errores),
    maplist(term_string, Errores, ErroresTexto),
    json_write_dict(current_output, _{
        estado: Estado,
        subtotal: Subtotal,
        iva: IVA,
        total: Total,
        errores: ErroresTexto
    }),
    nl.