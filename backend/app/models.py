from datetime import datetime
from enum import Enum
from typing import Optional, List

from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.dialects.mysql import JSON as MySQLJSON


class EstadoPedido(str, Enum):
    PENDIENTE = "PENDIENTE"
    PRESTADO = "PRESTADO"
    DEVUELTO = "DEVUELTO"


class RolUsuario(str, Enum):
    PANOLERA = "PANOLERA"
    PROFESOR = "PROFESOR"
    # El administrador puede usar todas las funciones del sistema:
    # tanto el tablero/cuentas como la solicitud de material.
    ADMIN = "ADMIN"


class Usuario(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    usuario: str = Field(index=True, unique=True, max_length=60)
    nombre: str = Field(max_length=120)
    password_hash: str = Field(max_length=255)
    rol: RolUsuario = Field(default=RolUsuario.PROFESOR)
    activo: bool = Field(default=True)
    creado: datetime = Field(default_factory=datetime.now)


class Sesion(SQLModel, table=True):
    token: str = Field(primary_key=True, max_length=128)
    usuario_id: int = Field(foreign_key="usuario.id")
    creada: datetime = Field(default_factory=datetime.now)
    expira: datetime


class Alumno(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    dni: str = Field(index=True, unique=True, max_length=20)
    nombre: str = Field(max_length=120)
    curso: str = Field(max_length=60)


class Herramienta(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=120)
    categoria: str = Field(default="General", max_length=60)
    cantidad: int = Field(default=1)
    disponible: bool = Field(default=True)


class Pedido(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    # Datos del sistema anterior (alumnos). Se mantienen para no perder el
    # historial ya cargado.
    alumno_id: Optional[int] = Field(default=None, foreign_key="alumno.id")
    # Nuevo sistema de usuarios: el pedido pertenece a un profesor.
    usuario_id: Optional[int] = Field(default=None, foreign_key="usuario.id")
    curso: Optional[str] = Field(default=None, max_length=60)
    fecha_solicitud: datetime = Field(default_factory=datetime.now)
    fecha_entrega: Optional[datetime] = None
    fecha_devolucion: Optional[datetime] = None
    estado: EstadoPedido = Field(default=EstadoPedido.PENDIENTE)
    detalle_items: List[dict] = Field(default_factory=list, sa_column=Column(MySQLJSON))
    items_devueltos: List[dict] = Field(default_factory=list, sa_column=Column(MySQLJSON))  # items marcados como devueltos
    notas: Optional[str] = Field(default=None, max_length=500)

    def items(self) -> List[dict]:
        if isinstance(self.detalle_items, str):
            import json
            try:
                return json.loads(self.detalle_items)
            except Exception:
                return []
        return self.detalle_items or []

    def items_devueltos_list(self) -> List[dict]:
        if isinstance(self.items_devueltos, str):
            import json
            try:
                return json.loads(self.items_devueltos)
            except Exception:
                return []
        return self.items_devueltos or []


class Notificacion(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuario.id", index=True)
    pedido_id: Optional[int] = Field(default=None, foreign_key="pedido.id")
    tipo: str = Field(default="PEDIDO_LISTO", max_length=40)
    mensaje: str = Field(max_length=300)
    leida: bool = Field(default=False)
    creada: datetime = Field(default_factory=datetime.now)
