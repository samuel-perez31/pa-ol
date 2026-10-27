from app.database import init_db, engine, Session
from app.models import Pedido, Alumno, EstadoPedido
from sqlmodel import select

# Init DB (creates tables, drops old ones)
init_db()

# Add test data
with Session(engine) as session:
    a1 = Alumno(dni="12345678A", nombre="Juan Pérez", curso="1º A")
    a2 = Alumno(dni="87654321B", nombre="María García", curso="2º B")
    session.add_all([a1, a2])
    session.commit()
    
    p1 = Pedido(alumno_id=a1.id, estado=EstadoPedido.PENDIENTE, notas="Pedido 1 pendiente")
    p2 = Pedido(alumno_id=a2.id, estado=EstadoPedido.PRESTADO, notas="Pedido 2 prestado")
    p3 = Pedido(alumno_id=a1.id, estado=EstadoPedido.DEVUELTO, notas="Pedido 3 devuelto")
    session.add_all([p1, p2, p3])
    session.commit()
    
    # Verify data
    all_pedidos = session.exec(select(Pedido)).all()
    print(f'Total pedidos en DB: {len(all_pedidos)}')
    for p in all_pedidos:
        print(f'  {p.id}: estado={p.estado}')
    
    # Test NEW behavior: no fecha filter -> return all
    print('\n=== NEW BEHAVIOR: No fecha filter (fecha_filtro=None) ===')
    pedidos = session.exec(select(Pedido)).all()
    print(f'All pedidos returned: {len(pedidos)}')
    for p in pedidos:
        est = p.estado.value if hasattr(p.estado, 'value') else p.estado
        print(f'  {p.id}: {est}')
    
    # Filter to DEVUELTO (what historial does)
    print('\n=== Filtering to DEVUELTO (historial) ===')
    pedidos_devueltos = [p for p in pedidos if (p.estado.value if hasattr(p.estado, 'value') else p.estado) == 'DEVUELTO']
    print(f'Pedidos DEVUELTO: {len(pedidos_devueltos)}')
    for d in pedidos_devueltos:
        print(f'  {d.id}: Will show card in historial tab')
    
    # Test OLD behavior for comparison: fecha_filtro = date.today()
    print('\n=== OLD behavior: fecha_filtro = date.today() ===')
    from datetime import date
    fecha_filtro = date.today()
    pedidos_viejos = session.exec(select(Pedido)).all()
    result_viejos = []
    for p in pedidos_viejos:
        if fecha_filtro and p.fecha_solicitud and p.fecha_solicitud.date() != fecha_filtro:
            continue
        est = p.estado.value if hasattr(p.estado, 'value') else p.estado
        result_viejos.append({"id": p.id, "estado": est})
    print(f'Pedidos with today filter: {len(result_viejos)}')
    for r in result_viejos:
        print(f'  {r["id"]}: {r["estado"]}')