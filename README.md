# Pañol - Gestión Ágil de Préstamos

Sistema web rápido para la gestión del pañol de una escuela técnica: los alumnos solicitan material desde su celular (vista móvil con QR en la ventanilla) y la encargada gestiona entregas y devoluciones desde un tablero en tiempo real en su PC.

## Estructura

```
pa-ol/
├── requirements.txt
├── README.md
└── app/
    ├── __init__.py
    ├── main.py          # FastAPI: rutas REST, WebSocket, vistas
    ├── database.py      # Motor SQLite + seed de herramientas
    ├── models.py        # Modelos SQLModel (Alumno, Herramienta, Pedido)
    └── templates/
        ├── solicitar.html   # Vista alumno (mobile-first, localStorage)
        └── tablero.html     # Vista pañolera (tablero en vivo)
```

## Instalación

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux/Mac
pip install -r requirements.txt
```

## Ejecución

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Vista alumno: http://localhost:8000/solicitar
- Tablero pañolera: http://localhost:8000/tablero
- Desde el celular (misma red WiFi): http://IP-DE-LA-PC:8000/solicitar

La base SQLite (`paol.db`) y las herramientas por defecto se crean solas al primer arranque. El QR de la ventanilla simplemente apunta a la URL de `/solicitar`.

## Funcionamiento

- El alumno completa DNI/Nombre/Curso (queda en `localStorage`), toca +/- en las herramientas y envía.
- El pedido aparece al instante en el tablero (WebSocket + beep) en "Pendientes de Entrega".
- Un clic en **Confirmar Entrega** → pasa a "En Taller / Prestados" con hora de salida.
- Un clic en **Marcar como Devuelto** → pasa a "Devueltos Hoy" con hora de retorno.
- Buscador por apellido/DNI filtra en todas las columnas.
