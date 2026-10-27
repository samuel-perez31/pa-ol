from app.database import init_db, engine, Session
from app.models import Pedido, Alumno, Herramienta, EstadoPedido
from sqlmodel import select

# Init DB
init_db()

with Session(engine) as session:
    # Check current state
    alumno_count = len(session.exec(select(Alumno)).all())
    herramienta_count = len(session.exec(select(Herramienta)).all())
    pedido_count = len(session.exec(select(Pedido)).all())
    
    print(f'Alumnos: {alumno_count}, Herramientas: {herramienta_count}, Pedidos: {pedido_count}')
    
    # If no data, add some test data
    if pedido_count == 0:
        # Create some alumnos
        a1 = Alumno(dni="12345678A", nombre="Juan Pérez", curso="1º A")
        a2 = Alumno(dni="87654321B", nombre="María García", curso="2º B")
        session.add_all([a1, a2])
        
        # Create some herramientas (basic ones)
        h1 = Herramienta(nombre="Martillo", categoria="Ferretería", cantidad=5, disponible=True)
        h2 = Herramienta(nombre="Llave", categoria="Ferretería", cantidad=3, disponible=True)
        session.add_all([h1, h2])
        session.commit()
        
        # Create test pedidos with different states
        p1 = Pedido(alumno_id=a1.id, estado=EstadoPedido.PENDIENTE, notas="Pedido de prueba 1")
        p2 = Pedido(alumno_id=a2.id, estado=EstadoPedido.PRESTADO, notas="Pedido de prueba 2")
        p3 = Pedido(alumno_id=a1.id, estado=EstadoPedido.DEVUELTO, notas="Pedido de prueba devuelto")
        session.add_all([p1, p2, p3])
        session.commit()
        print("Test data created")
    else:
        # Show existing
        all_pedidos = session.exec(select(Pedido)).all()
        for p in all_pedidos:
            print(f'  {p.id}: {p.estado}')