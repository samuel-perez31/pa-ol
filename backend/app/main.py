from datetime import datetime, date
from typing import List, Optional
from pathlib import Path

from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
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
        # id de pestaña -> ws. Si una pestaña se reconecta, se cierra la anterior
        # para que una sola pestaña nunca tenga varias conexiones vivas.
        self.sesiones: dict = {}

    async def connect(self, ws: WebSocket, sesion: str = None):
        await ws.accept()
        self.active.append(ws)
        if sesion:
            anterior = self.sesiones.get(sesion)
            if anterior is not None and anterior is not ws:
                if anterior in self.active:
                    self.active.remove(anterior)
                try:
                    await anterior.close()
                except Exception:
                    pass
            self.sesiones[sesion] = ws

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)
        for k, v in list(self.sesiones.items()):
            if v is ws:
                self.sesiones.pop(k, None)

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


class ItemDevueltoIn(BaseModel):
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
    items = p.items()
    items_devueltos = p.items_devueltos_list()
    
    # Calcular estado de devolución por item
    items_con_estado = []
    for item in items:
        devuelto = next((d for d in items_devueltos if d.get("nombre") == item["nombre"]), None)
        items_con_estado.append({
            **item,
            "devuelto": bool(devuelto),
            "cantidad_devuelta": devuelto.get("cantidad", 0) if devuelto else 0
        })
    
    return {
        "id": p.id,
        "alumno": alumno.nombre if alumno else "?",
        "dni": alumno.dni if alumno else "",
        "curso": alumno.curso if alumno else "",
        "estado": p.estado.value if isinstance(p.estado, EstadoPedido) else p.estado,
        "items": items_con_estado,
        "notas": p.notas,
        "fecha_hora_solicitud": p.fecha_solicitud.strftime("%H:%M") if p.fecha_solicitud else None,
        "fecha_hora_entrega": p.fecha_entrega.strftime("%H:%M") if p.fecha_entrega else None,
        "fecha_hora_devolucion": p.fecha_devolucion.strftime("%H:%M") if p.fecha_devolucion else None,
        # Fechas completas en ISO (para filtros por día y contadores "hoy")
        "fecha_solicitud": p.fecha_solicitud.isoformat() if p.fecha_solicitud else None,
        "fecha_entrega": p.fecha_entrega.isoformat() if p.fecha_entrega else None,
        "fecha_devolucion": p.fecha_devolucion.isoformat() if p.fecha_devolucion else None,
    }


def calcular_stock_disponible(herramienta_id: int, session: Session) -> int:
    """Calcula el stock disponible de una herramienta (total - prestados - pendientes)."""
    herramienta = session.get(Herramienta, herramienta_id)
    if not herramienta:
        return 0
    
    # Contar cuántas unidades están prestadas (estado PRESTADO)
    prestados = 0
    pedidos_prestados = session.exec(select(Pedido).where(Pedido.estado == EstadoPedido.PRESTADO)).all()
    for p in pedidos_prestados:
        for item in p.items():
            # Buscar la herramienta por nombre para obtener su ID
            h = session.exec(select(Herramienta).where(Herramienta.nombre == item["nombre"])).first()
            if h and h.id == herramienta_id:
                prestados += item["cantidad"]
    
    # Contar cuántas unidades están en pedidos pendientes (estado PENDIENTE)
    # Prioridad para quien pidió primero
    pendientes = 0
    pedidos_pendientes = session.exec(select(Pedido).where(Pedido.estado == EstadoPedido.PENDIENTE)).all()
    for p in pedidos_pendientes:
        for item in p.items():
            h = session.exec(select(Herramienta).where(Herramienta.nombre == item["nombre"])).first()
            if h and h.id == herramienta_id:
                pendientes += item["cantidad"]
    
    return max(0, herramienta.cantidad - prestados - pendientes)


def validar_stock_pedido(items: List[ItemIn], session: Session):
    """Valida que haya stock suficiente para todos los items del pedido."""
    for item in items:
        herramienta = session.exec(select(Herramienta).where(Herramienta.nombre == item.nombre)).first()
        if not herramienta:
            raise HTTPException(400, f"Herramienta '{item.nombre}' no encontrada")
        
        if item.cantidad > herramienta.cantidad:
            raise HTTPException(400, f"Stock insuficiente para '{item.nombre}': solo hay {herramienta.cantidad} unidad(es) en total")
        
        disponible = calcular_stock_disponible(herramienta.id, session)
        if item.cantidad > disponible:
            raise HTTPException(400, "Material no disponible en stock")


@app.get("/api/herramientas")
def listar_herramientas(session: Session = Depends(get_session)):
    herramientas = session.exec(select(Herramienta)).all()
    result = []
    for h in herramientas:
        disponible = calcular_stock_disponible(h.id, session)
        result.append({
            "id": h.id,
            "nombre": h.nombre,
            "categoria": h.categoria,
            "cantidad": h.cantidad,
            "disponible": disponible,
        })
    return result


@app.post("/api/pedidos")
async def crear_pedido(data: PedidoIn, session: Session = Depends(get_session)):
    # Validar stock antes de crear el pedido
    validar_stock_pedido(data.items, session)
    
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
    await manager.broadcast("nuevo_pedido")
    return pedido_to_dict(pedido, session)


@app.get("/api/pedidos")
def listar_pedidos(estado: Optional[str] = None, q: Optional[str] = None, fecha: Optional[str] = None, session: Session = Depends(get_session)):
    # Si no se pasa fecha, no filtrar por fecha (devuelve todos los históricos)
    fecha_filtro = date.fromisoformat(fecha) if fecha else None
    
    pedidos = session.exec(select(Pedido)).all()
    result = []
    for p in pedidos:
        # Si hay filtro de fecha, aplicar filtrado; si no, traer todos
        if fecha_filtro and p.fecha_solicitud and p.fecha_solicitud.date() != fecha_filtro:
            continue
        est = p.estado.value if isinstance(p.estado, EstadoPedido) else p.estado
        if estado and est != estado:
            continue
        d = pedido_to_dict(p, session)
        if q:
            ql = q.lower()
            # Buscar en alumno, DNI, o en los nombres de las herramientas
            match_alumno = ql in d["alumno"].lower()
            match_dni = ql in d["dni"]
            match_herramienta = any(ql in item["nombre"].lower() for item in d["items"])
            if not (match_alumno or match_dni or match_herramienta):
                continue
        result.append(d)
    result.sort(key=lambda d: d["id"], reverse=True)
    return result


@app.get("/api/pedidos/ids")
def listar_ids_estados(session: Session = Depends(get_session)):
    """Lista liviana (id + estado) de todos los pedidos.
    Sirve para detectar cambios reales y disparar el sonido sólo cuando
    entra un pedido nuevo o se procesa uno."""
    filas = session.exec(select(Pedido.id, Pedido.estado)).all()
    return [
        {"id": f[0], "estado": f[1].value if isinstance(f[1], EstadoPedido) else f[1]}
        for f in filas
    ]


@app.get("/api/pedidos/fechas")
def listar_fechas_pedidos(session: Session = Depends(get_session)):
    """Devuelve lista de fechas que tienen pedidos, ordenadas descendente."""
    pedidos = session.exec(select(Pedido)).all()
    fechas = set()
    for p in pedidos:
        if p.fecha_solicitud:
            fechas.add(p.fecha_solicitud.date().isoformat())
    return sorted(list(fechas), reverse=True)


@app.post("/api/pedidos/{pedido_id}/pasar-a-taller")
async def pasar_a_taller(pedido_id: int, session: Session = Depends(get_session)):
    """Pasa un pedido confirmado desde 'Pendientes' a 'En taller' para que empiecen a tachar/devolver."""
    p = session.get(Pedido, pedido_id)
    if not p:
        raise HTTPException(404, "Pedido no encontrado")
    if p.estado != EstadoPedido.PRESTADO:
        raise HTTPException(400, "El pedido debe estar en PRESTADO para pasar a taller")
    # Marcamos que ya pasó a taller (se usa para separar las secciones)
    if not p.notas or "[EN_TALLER]" not in p.notas:
        p.notas = (p.notas + " " if p.notas else "") + "[EN_TALLER]"
    session.add(p)
    session.commit()
    await manager.broadcast("procesado")
    return pedido_to_dict(p, session)


@app.post("/api/pedidos/{pedido_id}/entregar")
async def entregar(pedido_id: int, session: Session = Depends(get_session)):
    p = session.get(Pedido, pedido_id)
    if not p:
        raise HTTPException(404, "Pedido no encontrado")
    p.estado = EstadoPedido.PRESTADO
    p.fecha_entrega = datetime.now()
    session.add(p)
    session.commit()
    await manager.broadcast("procesado")
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
    await manager.broadcast("procesado")
    return pedido_to_dict(p, session)


@app.post("/api/pedidos/{pedido_id}/toggle-item")
async def toggle_item_devuelto(pedido_id: int, data: ItemDevueltoIn, session: Session = Depends(get_session)):
    """Marca/desmarca un item como devuelto (para tachar items individualmente)."""
    p = session.get(Pedido, pedido_id)
    if not p:
        raise HTTPException(404, "Pedido no encontrado")
    
    items_devueltos = p.items_devueltos_list()
    item_existente = next((i for i in items_devueltos if i.get("nombre") == data.nombre), None)
    
    if item_existente:
        # Si ya existe, lo quitamos (destachar)
        items_devueltos = [i for i in items_devueltos if i.get("nombre") != data.nombre]
    else:
        # Si no existe, lo agregamos (tachar)
        items_devueltos.append({"nombre": data.nombre, "cantidad": data.cantidad})
    
    # Forzar actualización del campo JSON
    from sqlalchemy.orm.attributes import flag_modified
    p.items_devueltos = items_devueltos
    flag_modified(p, "items_devueltos")
    session.add(p)
    session.commit()
    session.refresh(p)
    await manager.broadcast("items")
    return pedido_to_dict(p, session)


@app.post("/api/pedidos/{pedido_id}/cargar-devolucion")
async def cargar_devolucion(pedido_id: int, session: Session = Depends(get_session)):
    """Procesa la devolución completa/parcial/ninguna y actualiza stock."""
    p = session.get(Pedido, pedido_id)
    if not p:
        raise HTTPException(404, "Pedido no encontrado")
    
    items_originales = p.items()
    items_devueltos = p.items_devueltos_list()
    
    # Contar items devueltos
    total_items = len(items_originales)
    items_devueltos_count = len(items_devueltos)
    
    # Determinar tipo de devolución
    if items_devueltos_count == 0:
        tipo_devolucion = "ninguno"
        color = "rojo"
        emoji = "🔴"
    elif items_devueltos_count == total_items:
        tipo_devolucion = "completa"
        color = "verde"
        emoji = "🟢"
    else:
        tipo_devolucion = "parcial"
        color = "amarillo"
        emoji = "🟡"
    
    # Devolver al stock SOLO los items marcados como devueltos
    for item_devuelto in items_devueltos:
        herramienta = session.exec(select(Herramienta).where(Herramienta.nombre == item_devuelto["nombre"])).first()
        if herramienta:
            herramienta.cantidad += item_devuelto.get("cantidad", 1)
            session.add(herramienta)
    
    # TODAS las devoluciones (completa, parcial, ninguna) pasan a DEVUELTO
    # Los items no devueltos quedan marcados como "no devueltos" en la lista
    p.estado = EstadoPedido.DEVUELTO
    p.fecha_devolucion = datetime.now()
    
    p.notas = (p.notas or "") + f"\n[Devolución {tipo_devolucion.upper()} {emoji}]"
    session.add(p)
    session.commit()
    await manager.broadcast("procesado")
    
    return {
        **pedido_to_dict(p, session),
        "tipo_devolucion": tipo_devolucion,
        "color": color,
        "emoji": emoji,
        "items_devueltos": items_devueltos_count,
        "total_items": total_items
    }


@app.get("/api/ws-debug")
def ws_debug():
    """Cuántas conexiones WebSocket hay abiertas ahora (diagnóstico)."""
    return {"conexiones_ws": len(manager.active), "sesiones": len(manager.sesiones)}


@app.get("/api/version")
def version_app():
    """Versión del frontend servido. El navegador la consulta y se recarga solo
    si cambió el bundle (evita que quede corriendo código viejo)."""
    carpeta = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist" / "assets"
    nombres = []
    try:
        for f in carpeta.iterdir():
            if f.suffix == ".js":
                nombres.append(f.name)
    except OSError:
        pass
    return JSONResponse(
        {"version": max(nombres) if nombres else ""},
        headers={"Cache-Control": "no-store"},
    )


@app.websocket("/ws/tablero")
async def ws_tablero(ws: WebSocket):
    sesion = ws.query_params.get("s")
    await manager.connect(ws, sesion)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)


# Servir frontend React (build de Vite) - AL FINAL para no interceptar API/WS
FRONTEND_DIR = Path(__file__).parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIR.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Para rutas de la API, devolver 404 y dejar que FastAPI maneje
        if full_path.startswith("api/") or full_path.startswith("ws/"):
            raise HTTPException(404, "Not found")
        # Servir index.html para todas las demás rutas (SPA routing)
        index_file = FRONTEND_DIR / "index.html"
        if index_file.exists():
            # Sin caché: el navegador siempre debe tomar el bundle nuevo
            return FileResponse(
                index_file,
                headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
            )
        raise HTTPException(404, "Frontend no construido")
