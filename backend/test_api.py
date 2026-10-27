from app.database import engine, Session
from app.models import SQLModel, Pedido, Alumno, Herramienta, EstadoPedido
from sqlmodel import select

SQLModel.metadata.create_all(engine)

# Add some test data - both DEVUELTO and other states
with Session(engine) as session:
    # Create a couple more alumnos
    alumno2 = Alumno(dni="87654321B", nombre="María García", curso="2º B")
    session.add(alumno2)
    session.commit()
    session.refresh(alumno2)
    
    # Create a pedido PENDIENTE
    pedido1 = Pedido(alumno_id=alumno2.id, estado=EstadoPedido.PENDIENTE, notas="Pedido pendiente")
    session.add(pedido1)
    
    # Create a pedido PRESTADO  
    pedido2 = Pedido(alumno_id=alumno2.id, estado=EstadoPedido.PRESTADO, notas="Pedido prestado")
    session.add(pedido2)
    
    # Create a pedido DEVUELTO (otro)
    pedido3 = Pedido(alumno_id=alumno2.id, estado=EstadoPedido.DEVUELTO, notas="Otro devuelto")
    session.add(pedido3)
    
    session.commit()
    
    # Now test the listar_pedidos logic
    # Old behavior: fecha_filtro = date.today() 
    # New behavior: fecha_filtro = None (when no fecha param)
    
    print("=== Testing new behavior (fecha_filtro = None) ===")
    fecha_filtro = None
    pedidos = session.exec(select(Pedido)).all()
    result = []
    for p in pedidos:
        if fecha_filtro and p.fecha_solicitud and p.fecha_solicitud.date() != fecha_filtro:
            continue
        est = p.estado.value if hasattr(p.estado, 'value') else p.estado
        result.append({"id": p.id, "estado": est})
    print(f'Pedidos retornados (sin filtro fecha): {len(result)}')
    for r in result:
        print(f'  {r}')
    
    print("\n=== Testing with fecha filter ===")
    fecha_filtro = "2026-01-01"  # hypothetical date
    pedidos = session.exec(select(Pedido)).all()
    result = []
    for p in pedidos:
        if fecha_filtro and p.fecha_solicitud and p.fecha_solicitud.date() != fecha_filtro:
            continue
        est = p.estado.value if hasattr(p.estado, 'value') else p.estado
        result.append({"id": p.id, "estado": est})
    print(f'Pedidos retornados (con filtro fecha={fecha_filtro}): {len(result)}')
    for r in result:
        print(f'  {r}')