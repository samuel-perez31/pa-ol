import sys
sys.path.insert(0, '.')
from app.database import init_db, get_session
from app.models import Pedido, EstadoPedido, Alumno, Herramienta
from sqlmodel import select

init_db()

session = get_session()
all_pedidos = session.exec(select(Pedido)).all()
print(f'Total pedidos en DB: {len(all_pedidos)}')
for p in all_pedidos:
    print(f'  Pedido {p.id}: estado={p.estado}, alumno={p.alumno.nombre if p.alumno else "??"}, items_devueltos={p.items_devueltos}')
session.close()