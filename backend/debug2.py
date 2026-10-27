from app.database import init_db, get_session
from app.models import Pedido
from sqlmodel import select

init_db()
gen = get_session()
session = next(gen)

pedidos = session.exec(select(Pedido)).all()
print(f'Pedidos: {len(pedidos)}')
for p in pedidos:
    print(f'  {p.id}: estado={p.estado}, alumno={p.alumno.nombre if p.alumno else "?"}')
session.close()