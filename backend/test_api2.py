from sqlmodel import select
from app.database import engine, Session
from app.models import Pedido, Alumno, EstadoPedido

with Session(engine) as session:
    # Simulate the NEW behavior (my fix): no fecha filter -> return all
    pedidos = session.exec(select(Pedido)).all()
    
    print("=== API Response (simulating new behavior) ===")
    result = []
    for p in pedidos:
        # Fetch alumno info
        alumno = session.get(Alumno, p.alumno_id)
        est = p.estado.value if hasattr(p.estado, 'value') else p.estado
        result.append({
            "id": p.id,
            "alumno": alumno.nombre if alumno else "?",
            "dni": alumno.dni if alumno else "",
            "curso": alumno.curso if alumno else "",
            "estado": est,
            "items": p.items_devueltos_list() if hasattr(p, 'items_devueltos_list') else [],
        })
    
    print(f"Total pedidos: {len(result)}")
    for r in result:
        print(f"  {r['id']}: alumno={r['alumno']}, dni={r['dni']}, curso={r['curso']}, estado={r['estado']}")
    
    # Now filter to DEVUELTO like the frontend does
    pedidos_devueltos = [p for p in result if p['estado'] == 'DEVUELTO']
    print(f"\nPedidos DEVUELTO: {len(pedidos_devueltos)}")
    for d in pedidos_devueltos:
        print(f"  {d['id']}: items={d['items']}")