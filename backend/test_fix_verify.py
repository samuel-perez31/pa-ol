from sqlmodel import select
from app.database import engine, Session
from app.models import Pedido, Alumno, EstadoPedido
from datetime import date

with Session(engine) as session:
    pedidos = session.exec(select(Pedido)).all()
    print(f'Total pedidos en DB: {len(pedidos)}')
    for p in pedidos:
        print(f'  {p.id}: estado={p.estado}')

    # NEW behavior: no fecha filter -> return all
    print('\n=== NUEVO COMPORTAMIENTO (sin filtro fecha) ===')
    all_pedidos = session.exec(select(Pedido)).all()
    print(f'All pedidos retornados: {len(all_pedidos)}')
    for p in all_pedidos:
        est = p.estado.value if hasattr(p.estado, 'value') else p.estado
        print(f'  {p.id}: {est}')

    # Filter to DEVUELTO (what historial tab does)
    print('\n=== Filtrando a DEVUELTO (como hace el historial) ===')
    pedidos_devueltos = [p for p in all_pedidos if (p.estado.value if hasattr(p.estado, 'value') else p.estado) == 'DEVUELTO']
    print(f'Pedidos DEVUELTO: {len(pedidos_devueltos)}')
    for d in pedidos_devueltos:
        print(f'  {d.id}: Pedido DEVUELTO - se mostrará en la pestaña de Historial')

    # OLD behavior: fecha_filtro = today
    print(f'\n=== COMPORTAMIENTO ANTERIOR (fecha_filtro = hoy = {date.today()}) ===')
    pedidos_viejos = session.exec(select(Pedido)).all()
    result_viejos = []
    for p in pedidos_viejos:
        if date.today() and p.fecha_solicitud and p.fecha_solicitud.date() != date.today():
            continue
        est = p.estado.value if hasattr(p.estado, 'value') else p.estado
        result_viejos.append({'id': p.id, 'estado': est})
    print(f'Pedidos con filtro de hoy: {len(result_viejos)}')
    for r in result_viejos:
        print(f'  {r["id"]}: {r["estado"]}')