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


class Alumno(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    dni: str = Field(index=True, unique=True, max_length=20)
    nombre: str = Field(max_length=120)
    curso: str = Field(max_length=60)


class Herramienta(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str = Field(max_length=120)
    categoria: str = Field(default="General", max_length=60)
    disponible: bool = Field(default=True)


class Pedido(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    alumno_id: int = Field(foreign_key="alumno.id")
    fecha_solicitud: datetime = Field(default_factory=datetime.now)
    fecha_entrega: Optional[datetime] = None
    fecha_devolucion: Optional[datetime] = None
    estado: EstadoPedido = Field(default=EstadoPedido.PENDIENTE)
    detalle_items: List[dict] = Field(default_factory=list, sa_column=Column(MySQLJSON))
    notas: Optional[str] = Field(default=None, max_length=500)

    def items(self) -> List[dict]:
        if isinstance(self.detalle_items, str):
            import json
            try:
                return json.loads(self.detalle_items)
            except Exception:
                return []
        return self.detalle_items or []
