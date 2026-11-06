import json
from datetime import datetime, date, timedelta
from typing import List, Optional
from pathlib import Path

from fastapi import FastAPI, Depends, Header, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from .auth import hash_password, token_nuevo, verificar_password
from .database import engine, init_db, get_session
from .models import (
    Alumno,
    EstadoPedido,
    Herramienta,
    Notificacion,
    Pedido,
    RolUsuario,
    Sesion,
    Usuario,
)

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


class NotificationManager:
    """Una lista de conexiones por profesor para avisos en vivo."""

    def __init__(self):
        self.por_usuario: dict = {}

    async def connect(self, ws: WebSocket, usuario_id: int):
        await ws.accept()
        self.por_usuario.setdefault(usuario_id, []).append(ws)

    def disconnect(self, ws: WebSocket, usuario_id: int):
        conexiones = self.por_usuario.get(usuario_id, [])
        if ws in conexiones:
            conexiones.remove(ws)
        if not conexiones:
            self.por_usuario.pop(usuario_id, None)

    async def enviar(self, usuario_id: int, payload: dict):
        for ws in list(self.por_usuario.get(usuario_id, [])):
            try:
                await ws.send_text(json.dumps(payload, default=str))
            except Exception:
                self.disconnect(ws, usuario_id)


noti_manager = NotificationManager()


class LoginIn(BaseModel):
    usuario: str
    password: str


class UsuarioIn(BaseModel):
    usuario: str
    nombre: str
    password: str
    rol: RolUsuario = RolUsuario.PROFESOR


class UsuarioUpdateIn(BaseModel):
    usuario: Optional[str] = None
    nombre: Optional[str] = None
    password: Optional[str] = None
    activo: Optional[bool] = None


class PasswordIn(BaseModel):
    actual: str
    nueva: str


class ItemIn(BaseModel):
    nombre: str
    cantidad: int


class ItemDevueltoIn(BaseModel):
    nombre: str
    cantidad: int


class PedidoIn(BaseModel):
    items: List[ItemIn]
    notas: Optional[str] = None
    curso: Optional[str] = None
    division: Optional[str] = None


# ---------- Sesiones y permisos ----------

def usuario_publico(u: Usuario) -> dict:
    return {
        "id": u.id,
        "usuario": u.usuario,
        "nombre": u.nombre,
        "rol": u.rol.value if isinstance(u.rol, RolUsuario) else u.rol,
        "activo": u.activo,
    }


def _usuario_por_token(token: Optional[str], session: Session) -> Usuario:
    if not token:
        raise HTTPException(401, "Sesión requerida")
    sesion = session.get(Sesion, token)
    if not sesion or sesion.expira < datetime.now():
        if sesion:
            session.delete(sesion)
            session.commit()
        raise HTTPException(401, "Sesión vencida")
    usuario = session.get(Usuario, sesion.usuario_id)
    if not usuario or not usuario.activo:
        raise HTTPException(401, "Usuario inactivo o inexistente")
    return usuario


def usuario_actual(
    authorization: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
) -> Usuario:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Sesión requerida")
    return _usuario_por_token(authorization.split(" ", 1)[1].strip(), session)


def solo_panolera(usuario: Usuario = Depends(usuario_actual)) -> Usuario:
    if usuario.rol not in (RolUsuario.PANOLERA, RolUsuario.ADMIN):
        raise HTTPException(403, "Solo la pañolera o un administrador puede hacer esto")
    return usuario


def solo_profesor(usuario: Usuario = Depends(usuario_actual)) -> Usuario:
    # El administrador también puede solicitar material (tiene todas las funciones).
    if usuario.rol not in (RolUsuario.PROFESOR, RolUsuario.ADMIN):
        raise HTTPException(403, "Solo los profesores pueden solicitar material")
    return usuario


def normalizar_usuario(valor: str) -> str:
    return (valor or "").strip().lower()


def validar_password(password: str):
    if len(password or "") < 6:
        raise HTTPException(400, "La contraseña debe tener al menos 6 caracteres")


def pedido_to_dict(p: Pedido, session: Session) -> dict:
    alumno = session.get(Alumno, p.alumno_id) if p.alumno_id else None
    usuario = session.get(Usuario, p.usuario_id) if p.usuario_id else None
    nombre = usuario.nombre if usuario else (alumno.nombre if alumno else "?")
    nombre_usuario = usuario.usuario if usuario else ""
    dni = alumno.dni if alumno else ""
    curso = p.curso or (alumno.curso if alumno else "")
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
        # "alumno" se mantiene por compatibilidad con los componentes que ya
        # mostraban el nombre; ahora contiene al profesor que hizo el pedido.
        "alumno": nombre,
        "profesor": nombre,
        "usuario": nombre_usuario,
        "dni": dni,
        "curso": curso,
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


def notificacion_to_dict(n: Notificacion, session: Session) -> dict:
    pedido = session.get(Pedido, n.pedido_id) if n.pedido_id else None
    return {
        "id": n.id,
        "tipo": n.tipo,
        "mensaje": n.mensaje,
        "leida": n.leida,
        "creada": n.creada.isoformat() if n.creada else None,
        "pedido_id": n.pedido_id,
        "items": pedido.items() if pedido else [],
        "curso": pedido.curso if pedido else None,
    }


def consumo_activo_por_nombre(session: Session) -> dict:
    """Unidades ya comprometidas (pendientes o prestadas), agrupadas por nombre.

    Se calcula una sola vez para no hacer una consulta por cada herramienta.
    """
    consumo = {}
    for p in session.exec(select(Pedido)).all():
        estado = p.estado.value if isinstance(p.estado, EstadoPedido) else p.estado
        if estado not in ("PENDIENTE", "PRESTADO"):
            continue
        for item in p.items():
            nombre = item.get("nombre")
            if not nombre:
                continue
            consumo[nombre] = consumo.get(nombre, 0) + int(item.get("cantidad") or 0)
    return consumo


def calcular_stock_disponible(herramienta_id: int, session: Session, consumo: dict = None) -> int:
    """Calcula el stock disponible de una herramienta (total - prestados - pendientes)."""
    herramienta = session.get(Herramienta, herramienta_id)
    if not herramienta:
        return 0
    if consumo is None:
        consumo = consumo_activo_por_nombre(session)
    return max(0, herramienta.cantidad - consumo.get(herramienta.nombre, 0))


def validar_stock_pedido(items: List[ItemIn], session: Session):
    """Valida que haya stock suficiente para todos los items del pedido."""
    consumo = consumo_activo_por_nombre(session)
    for item in items:
        herramienta = session.exec(select(Herramienta).where(Herramienta.nombre == item.nombre)).first()
        if not herramienta:
            raise HTTPException(400, f"Herramienta '{item.nombre}' no encontrada")
        
        if item.cantidad > herramienta.cantidad:
            raise HTTPException(400, f"Stock insuficiente para '{item.nombre}': solo hay {herramienta.cantidad} unidad(es) en total")
        
        disponible = max(0, herramienta.cantidad - consumo.get(herramienta.nombre, 0))
        if item.cantidad > disponible:
            raise HTTPException(400, "Material no disponible en stock")


@app.post("/api/auth/login")
def login(data: LoginIn, session: Session = Depends(get_session)):
    usuario = session.exec(
        select(Usuario).where(Usuario.usuario == normalizar_usuario(data.usuario))
    ).first()
    if not usuario or not usuario.activo or not verificar_password(data.password, usuario.password_hash):
        raise HTTPException(401, "Usuario o contraseña incorrectos")

    ahora = datetime.now()
    for vieja in session.exec(select(Sesion)).all():
        if vieja.expira < ahora:
            session.delete(vieja)

    token = token_nuevo()
    session.add(
        Sesion(token=token, usuario_id=usuario.id, expira=ahora + timedelta(days=7))
    )
    session.commit()
    return {"token": token, "usuario": usuario_publico(usuario)}


@app.get("/api/auth/me")
def mi_usuario(usuario: Usuario = Depends(usuario_actual)):
    return usuario_publico(usuario)


@app.post("/api/auth/logout")
def logout(
    authorization: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
):
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        sesion = session.get(Sesion, token)
        if sesion:
            session.delete(sesion)
            session.commit()
    return {"ok": True}


@app.post("/api/auth/password")
def cambiar_mi_password(
    data: PasswordIn,
    usuario: Usuario = Depends(usuario_actual),
    session: Session = Depends(get_session),
):
    if not verificar_password(data.actual, usuario.password_hash):
        raise HTTPException(400, "La contraseña actual no es correcta")
    validar_password(data.nueva)
    usuario.password_hash = hash_password(data.nueva)
    session.add(usuario)
    session.commit()
    return {"ok": True}


@app.get("/api/usuarios")
def listar_usuarios(
    _: Usuario = Depends(solo_panolera),
    session: Session = Depends(get_session),
):
    usuarios = session.exec(select(Usuario).order_by(Usuario.nombre)).all()
    return [usuario_publico(u) for u in usuarios]


@app.post("/api/usuarios")
def crear_usuario(
    data: UsuarioIn,
    _: Usuario = Depends(solo_panolera),
    session: Session = Depends(get_session),
):
    nombre_usuario = normalizar_usuario(data.usuario)
    if not nombre_usuario or not data.nombre.strip():
        raise HTTPException(400, "Completá usuario y nombre")
    validar_password(data.password)
    if session.exec(select(Usuario).where(Usuario.usuario == nombre_usuario)).first():
        raise HTTPException(400, "Ese usuario ya existe")

    usuario = Usuario(
        usuario=nombre_usuario,
        nombre=data.nombre.strip(),
        password_hash=hash_password(data.password),
        rol=data.rol,
        activo=True,
    )
    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return usuario_publico(usuario)


@app.patch("/api/usuarios/{usuario_id}")
def actualizar_usuario(
    usuario_id: int,
    data: UsuarioUpdateIn,
    actual: Usuario = Depends(solo_panolera),
    session: Session = Depends(get_session),
):
    usuario = session.get(Usuario, usuario_id)
    if not usuario:
        raise HTTPException(404, "Usuario no encontrado")

    if data.usuario is not None:
        nombre_usuario = normalizar_usuario(data.usuario)
        if not nombre_usuario:
            raise HTTPException(400, "El usuario no puede quedar vacío")
        repetido = session.exec(
            select(Usuario).where(Usuario.usuario == nombre_usuario)
        ).first()
        if repetido and repetido.id != usuario.id:
            raise HTTPException(400, "Ese usuario ya existe")
        usuario.usuario = nombre_usuario

    if data.nombre is not None:
        if not data.nombre.strip():
            raise HTTPException(400, "El nombre no puede quedar vacío")
        usuario.nombre = data.nombre.strip()

    if data.password is not None:
        validar_password(data.password)
        usuario.password_hash = hash_password(data.password)

    if data.activo is not None:
        if not data.activo and usuario.id == actual.id:
            raise HTTPException(400, "No podés desactivar tu propia cuenta")
        usuario.activo = data.activo

    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return usuario_publico(usuario)


@app.delete("/api/usuarios/{usuario_id}")
def desactivar_usuario(
    usuario_id: int,
    actual: Usuario = Depends(solo_panolera),
    session: Session = Depends(get_session),
):
    if usuario_id == actual.id:
        raise HTTPException(400, "No podés desactivar tu propia cuenta")
    usuario = session.get(Usuario, usuario_id)
    if not usuario:
        raise HTTPException(404, "Usuario no encontrado")
    usuario.activo = False
    session.add(usuario)
    session.commit()
    return {"ok": True}


@app.get("/api/herramientas")
def listar_herramientas(
    _: Usuario = Depends(usuario_actual),
    session: Session = Depends(get_session),
):
    herramientas = session.exec(select(Herramienta)).all()
    consumo = consumo_activo_por_nombre(session)
    result = []
    for h in herramientas:
        disponible = max(0, h.cantidad - consumo.get(h.nombre, 0))
        result.append({
            "id": h.id,
            "nombre": h.nombre,
            "categoria": h.categoria,
            "cantidad": h.cantidad,
            "disponible": disponible,
        })
    return result


@app.post("/api/pedidos")
async def crear_pedido(
    data: PedidoIn,
    profesor: Usuario = Depends(solo_profesor),
    session: Session = Depends(get_session),
):
    # Validar stock antes de crear el pedido
    validar_stock_pedido(data.items, session)

    curso = " ".join(
        parte for parte in [(data.curso or "").strip(), (data.division or "").strip()] if parte
    ) or None
    pedido = Pedido(usuario_id=profesor.id, curso=curso, notas=data.notas)
    pedido.detalle_items = [{"nombre": i.nombre, "cantidad": i.cantidad} for i in data.items]
    session.add(pedido)
    session.commit()
    session.refresh(pedido)
    await manager.broadcast("nuevo_pedido")
    return pedido_to_dict(pedido, session)


@app.get("/api/pedidos")
def listar_pedidos(
    estado: Optional[str] = None,
    q: Optional[str] = None,
    fecha: Optional[str] = None,
    _: Usuario = Depends(solo_panolera),
    session: Session = Depends(get_session),
):
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
            # Buscar en profesor, usuario, DNI (histórico), curso o herramientas
            match_profesor = ql in d["alumno"].lower()
            match_usuario = ql in d["usuario"].lower()
            match_dni = ql in d["dni"]
            match_curso = ql in (d["curso"] or "").lower()
            match_herramienta = any(ql in item["nombre"].lower() for item in d["items"])
            if not (match_profesor or match_usuario or match_dni or match_curso or match_herramienta):
                continue
        result.append(d)
    result.sort(key=lambda d: d["id"], reverse=True)
    return result


@app.get("/api/mis-notificaciones")
def mis_notificaciones(
    profesor: Usuario = Depends(solo_profesor),
    session: Session = Depends(get_session),
):
    """Avisos sin leer del profesor (por ejemplo, pedido listo para retirar)."""
    notificaciones = session.exec(
        select(Notificacion)
        .where(Notificacion.usuario_id == profesor.id, Notificacion.leida == False)  # noqa: E712
        .order_by(Notificacion.id.desc())
    ).all()
    return [notificacion_to_dict(n, session) for n in notificaciones]


@app.post("/api/notificaciones/{notificacion_id}/leer")
def leer_notificacion(
    notificacion_id: int,
    profesor: Usuario = Depends(solo_profesor),
    session: Session = Depends(get_session),
):
    notificacion = session.get(Notificacion, notificacion_id)
    if not notificacion or notificacion.usuario_id != profesor.id:
        raise HTTPException(404, "Notificación no encontrada")
    notificacion.leida = True
    session.add(notificacion)
    session.commit()
    return {"ok": True}


@app.post("/api/notificaciones/leer-todas")
def leer_todas_notificaciones(
    profesor: Usuario = Depends(solo_profesor),
    session: Session = Depends(get_session),
):
    notificaciones = session.exec(
        select(Notificacion).where(
            Notificacion.usuario_id == profesor.id,
            Notificacion.leida == False,  # noqa: E712
        )
    ).all()
    for notificacion in notificaciones:
        notificacion.leida = True
        session.add(notificacion)
    session.commit()
    return {"ok": True, "leidas": len(notificaciones)}


@app.get("/api/pedidos/ids")
def listar_ids_estados(
    _: Usuario = Depends(solo_panolera),
    session: Session = Depends(get_session),
):
    """Lista liviana (id + estado) de todos los pedidos.
    Sirve para detectar cambios reales y disparar el sonido sólo cuando
    entra un pedido nuevo o se procesa uno."""
    filas = session.exec(select(Pedido.id, Pedido.estado)).all()
    return [
        {"id": f[0], "estado": f[1].value if isinstance(f[1], EstadoPedido) else f[1]}
        for f in filas
    ]


@app.get("/api/pedidos/fechas")
def listar_fechas_pedidos(
    _: Usuario = Depends(solo_panolera),
    session: Session = Depends(get_session),
):
    """Devuelve lista de fechas que tienen pedidos, ordenadas descendente."""
    pedidos = session.exec(select(Pedido)).all()
    fechas = set()
    for p in pedidos:
        if p.fecha_solicitud:
            fechas.add(p.fecha_solicitud.date().isoformat())
    return sorted(list(fechas), reverse=True)


@app.post("/api/pedidos/{pedido_id}/pasar-a-taller")
async def pasar_a_taller(
    pedido_id: int,
    _: Usuario = Depends(solo_panolera),
    session: Session = Depends(get_session),
):
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
async def entregar(
    pedido_id: int,
    _: Usuario = Depends(solo_panolera),
    session: Session = Depends(get_session),
):
    p = session.get(Pedido, pedido_id)
    if not p:
        raise HTTPException(404, "Pedido no encontrado")

    estaba_pendiente = p.estado == EstadoPedido.PENDIENTE
    p.estado = EstadoPedido.PRESTADO
    p.fecha_entrega = datetime.now()
    session.add(p)
    session.commit()
    session.refresh(p)

    # Avisar al profesor (una sola vez) que puede pasar a retirar.
    if p.usuario_id and estaba_pendiente:
        notificacion = Notificacion(
            usuario_id=p.usuario_id,
            pedido_id=p.id,
            tipo="PEDIDO_LISTO",
            mensaje=f"Tu pedido #{p.id} está listo para retirar",
        )
        session.add(notificacion)
        session.commit()
        session.refresh(notificacion)
        await noti_manager.enviar(
            p.usuario_id, notificacion_to_dict(notificacion, session)
        )

    await manager.broadcast("procesado")
    return pedido_to_dict(p, session)


@app.post("/api/pedidos/{pedido_id}/devolver")
async def devolver(
    pedido_id: int,
    _: Usuario = Depends(solo_panolera),
    session: Session = Depends(get_session),
):
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
async def toggle_item_devuelto(
    pedido_id: int,
    data: ItemDevueltoIn,
    _: Usuario = Depends(solo_panolera),
    session: Session = Depends(get_session),
):
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
async def cargar_devolucion(
    pedido_id: int,
    _: Usuario = Depends(solo_panolera),
    session: Session = Depends(get_session),
):
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
    token = ws.query_params.get("token")
    with Session(engine) as session:
        try:
            usuario = _usuario_por_token(token, session)
            if usuario.rol not in (RolUsuario.PANOLERA, RolUsuario.ADMIN):
                raise HTTPException(403, "Solo la pañolera o un administrador puede ver el tablero")
        except HTTPException:
            await ws.close(code=1008)
            return

    sesion = ws.query_params.get("s")
    await manager.connect(ws, sesion)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)


@app.websocket("/ws/notificaciones")
async def ws_notificaciones(ws: WebSocket):
    """Canal en vivo para avisarle al profesor que su pedido está listo."""
    token = ws.query_params.get("token")
    with Session(engine) as session:
        try:
            usuario = _usuario_por_token(token, session)
            if usuario.rol not in (RolUsuario.PROFESOR, RolUsuario.ADMIN):
                raise HTTPException(403, "Solo los profesores reciben avisos")
        except HTTPException:
            await ws.close(code=1008)
            return

    await noti_manager.connect(ws, usuario.id)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        noti_manager.disconnect(ws, usuario.id)


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
