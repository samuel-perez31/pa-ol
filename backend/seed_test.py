from app.database import engine, Session
from app.models import SQLModel, Pedido, Alumno, Herramienta, EstadoPedido
from sqlmodel import select

# Create tables if not exist
SQLModel.metadata.create_all(engine)

# Add test data
with Session(engine) as session:
    # Check if alumnos exist
    alumnos = session.exec(select(Alumno)).all()
    print(f'Alumnos existentes: {len(alumnos)}')
    
    # Check if herramientas exist  
    herramientas = session.exec(select(Herramienta)).all()
    print(f'Herramientas existentes: {len(herramientas)}')
    
    # Create a test alumno
    alumno = Alumno(dni="12345678A", nombre="Juan Pérez", curso="1º A")
    session.add(alumno)
    session.commit()
    session.refresh(alumno)
    print(f'Alumno creado: {alumno.id}')
    
    # Create a test pedido devuelto
    pedido = Pedido(
        alumno_id=alumno.id, 
        estado=EstadoPedido.DEVUELTO,
        notas="Test pedido devuelto"
    )
    session.add(pedido)
    session.commit()
    session.refresh(pedido)
    
    # Verify
    all_pedidos = session.exec(select(Pedido)).all()
    print(f'Total pedidos después de insertar: {len(all_pedidos)}')
    for p in all_pedidos:
        print(f'  {p.id}: estado={p.estado}')