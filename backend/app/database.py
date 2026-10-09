import os
import glob
from urllib.parse import quote_plus

import openpyxl
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlmodel import SQLModel, Session, select

from .models import Herramienta

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


def init_db():
    with server_engine.connect() as conn:
        conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
        conn.commit()
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        if not session.exec(select(Herramienta)).first():
            for nombre, categoria in leer_inventario_excel():
                session.add(Herramienta(nombre=nombre, categoria=categoria, cantidad=1, disponible=True))
            session.commit()


def get_session():
    with Session(engine) as session:
        yield session
