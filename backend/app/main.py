from datetime import datetime, date
from typing import List, Optional

from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlmodel import Session, select

from .database import init_db, get_session
from .models import Alumno, Herramienta, Pedido, EstadoPedido

app = FastAPI(title="Pañol - Gestión Ágil")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


class ConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, message: str = "update"):
        for ws in list(self.active):
            try:
                await ws.send_text(message)
            except Exception:
                self.disconnect(ws)


manager = ConnectionManager()


class ItemIn(BaseModel):
    nombre: str
    cantidad: int


class PedidoIn(BaseModel):
    dni: str
    nombre: str
    curso: str
    items: List[ItemIn]
    notas: Optional[str] = None


def pedido_to_dict(p: Pedido, session: Session) -> dict:
    alumno = session.get(Alumno, p.alumno_id)
    return {
        "id": p.id,
        "alumno": alumno.nombre if alumno else "?",
        "dni": alumno.dni if alumno else "",
        "curso": alumno.curso if alumno else "",
        "estado": p.estado.value if isinstance(p.estado, EstadoPedido) else p.estado,
        "items": p.items(),
        "notas": p.notas,
        "fecha_hora_solicitud": p.fecha_solicitud.strftime("%H:%M") if p.fecha_solicitud else None,
        "fecha_hora_entrega": p.fecha_entrega.strftime("%H:%M") if p.fecha_entrega else None,
        "fecha_hora_devolucion": p.fecha_devolucion.strftime("%H:%M") if p.fecha_devolucion else None,
    }


@app.get("/api/herramientas")
def listar_herramientas(session: Session = Depends(get_session)):
    return session.exec(select(Herramienta)).all()


@app.post("/api/pedidos")
async def crear_pedido(data: PedidoIn, session: Session = Depends(get_session)):
    alumno = session.exec(select(Alumno).where(Alumno.dni == data.dni)).first()
    if not alumno:
        alumno = Alumno(dni=data.dni, nombre=data.nombre, curso=data.curso)
        session.add(alumno)
        session.commit()
        session.refresh(alumno)
    else:
        alumno.nombre = data.nombre
        alumno.curso = data.curso
        session.add(alumno)
        session.commit()

    pedido = Pedido(alumno_id=alumno.id, notas=data.notas)
    pedido.detalle_items = [{"nombre": i.nombre, "cantidad": i.cantidad} for i in data.items]
    session.add(pedido)
    session.commit()
    session.refresh(pedido)
    await manager.broadcast("update")
    return pedido_to_dict(pedido, session)


@app.get("/api/pedidos")
def listar_pedidos(estado: Optional[str] = None, q: Optional[str] = None, session: Session = Depends(get_session)):
    hoy = date.today()
    pedidos = session.exec(select(Pedido)).all()
    result = []
    for p in pedidos:
        if p.fecha_solicitud and p.fecha_solicitud.date() != hoy:
            continue
        est = p.estado.value if isinstance(p.estado, EstadoPedido) else p.estado
        if estado and est != estado:
            continue
        d = pedido_to_dict(p, session)
        if q:
            ql = q.lower()
            if ql not in d["alumno"].lower() and ql not in d["dni"]:
                continue
        result.append(d)
    result.sort(key=lambda d: d["id"], reverse=True)
    return result


@app.post("/api/pedidos/{pedido_id}/entregar")
async def entregar(pedido_id: int, session: Session = Depends(get_session)):
    p = session.get(Pedido, pedido_id)
    if not p:
        raise HTTPException(404, "Pedido no encontrado")
    p.estado = EstadoPedido.PRESTADO
    p.fecha_entrega = datetime.now()
    session.add(p)
    session.commit()
    await manager.broadcast("update")
    return pedido_to_dict(p, session)


@app.post("/api/pedidos/{pedido_id}/devolver")
async def devolver(pedido_id: int, session: Session = Depends(get_session)):
    p = session.get(Pedido, pedido_id)
    if not p:
        raise HTTPException(404, "Pedido no encontrado")
    p.estado = EstadoPedido.DEVUELTO
    p.fecha_devolucion = datetime.now()
    session.add(p)
    session.commit()
    await manager.broadcast("update")
    return pedido_to_dict(p, session)


@app.websocket("/ws/tablero")
async def ws_tablero(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)
