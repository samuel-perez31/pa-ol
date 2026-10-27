from app.database import engine, Session
from app.models import SQLModel, Pedido
from sqlmodel import select

# Create tables
SQLModel.metadata.create_all(engine)
print('Tables created')

# Check what's there
with Session(engine) as session:
    # List all
    all_pedidos = session.exec(select(Pedido)).all()
    print(f'Total pedidos: {len(all_pedidos)}')
    for p in all_pedidos:
        print(f'  {p.id}: estado={p.estado}')