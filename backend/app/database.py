import os
import glob
from urllib.parse import quote_plus

import openpyxl
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlmodel import SQLModel, Session, select

from .auth import hash_password
from .models import Herramienta, RolUsuario, Usuario

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "panol_db")

server_url = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/?charset=utf8mb4"
server_engine = create_engine(server_url)

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

EXCEL_GLOB = os.path.join(os.path.dirname(__file__), "..", "..", "excel", "*.xlsx")


def leer_inventario_excel():
    items = []
    archivos = glob.glob(EXCEL_GLOB)
    if not archivos:
        return items
    wb = openpyxl.load_workbook(archivos[0], data_only=True)
    for ws in wb.worksheets:
        for i, row in enumerate(ws.iter_rows(values_only=True)):
            if i < 3:
                continue
            nombre = row[0]
            if isinstance(nombre, str) and nombre.strip():
                items.append((nombre.strip(), ws.title.strip()))
    return items


def _agregar_columna_si_falta(tabla: str, columna: str, definicion: str):
    """Migración mínima para bases que ya existían antes del sistema de usuarios."""
    inspector = inspect(engine)
    if tabla not in inspector.get_table_names():
        return
    columnas = {c["name"] for c in inspector.get_columns(tabla)}
    if columna not in columnas:
        with engine.begin() as conn:
            conn.execute(text(f"ALTER TABLE `{tabla}` ADD COLUMN `{columna}` {definicion}"))


def _migrar_tabla_pedidos():
    _agregar_columna_si_falta("pedido", "usuario_id", "INT NULL")
    _agregar_columna_si_falta("pedido", "curso", "VARCHAR(60) NULL")
    # Antes alumno_id era obligatorio. Ahora los pedidos nuevos se guardan
    # contra un usuario (profesor), así que debe aceptar NULL.
    try:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE `pedido` MODIFY COLUMN `alumno_id` INT NULL"))
    except Exception:
        pass


def _crear_usuario_inicial():
    """Crea la cuenta de la pañolera la primera vez que arranca la app."""
    with Session(engine) as session:
        if session.exec(select(Usuario)).first():
            return
        usuario = os.getenv("PANOLERA_USUARIO", "panolera").strip().lower()
        password = os.getenv("PANOLERA_PASSWORD", "panol2026")
        session.add(
            Usuario(
                usuario=usuario,
                nombre=os.getenv("PANOLERA_NOMBRE", "Pañolera"),
                password_hash=hash_password(password),
                rol=RolUsuario.PANOLERA,
                activo=True,
            )
        )
        session.commit()


def init_db():
    with server_engine.connect() as conn:
        conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
        conn.commit()
    # NO borrar tablas existentes: create_all solo crea las que faltan.
    # (Antes se hacía drop_all en cada arranque y se perdían los datos.)
    SQLModel.metadata.create_all(engine)
    _migrar_tabla_pedidos()
    _crear_usuario_inicial()
    with Session(engine) as session:
        if not session.exec(select(Herramienta)).first():
            for nombre, categoria in leer_inventario_excel():
                session.add(Herramienta(nombre=nombre, categoria=categoria, cantidad=1, disponible=True))
            session.commit()


def get_session():
    with Session(engine) as session:
        yield session
