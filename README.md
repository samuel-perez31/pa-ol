# Pañol - Gestión Ágil de Préstamos

Sistema web rápido para la gestión del pañol de una escuela técnica: los profesores solicitan material desde su celular (vista móvil con QR en la ventanilla) y la pañolera gestiona entregas, devoluciones y cuentas desde un tablero en tiempo real en su PC.

## Usuarios y roles

Hay tres roles:

- **Pañolera**: entra al tablero (`/tablero`) y administra las cuentas de profesores (`/usuarios`). No puede pedir material.
- **Profesor**: solo puede entrar a la pantalla de solicitud (`/solicitar`). Al pedir, el nombre sale de su cuenta y el profesor elige curso y división.
- **Administrador**: puede usar todas las funciones (tablero, usuarios y solicitud de material).

La primera vez que arranca la app se crea automáticamente la cuenta de la pañolera:

- Usuario: `panolera`
- Contraseña: `panol2026`

También se crea una cuenta de administrador con acceso a todas las funciones:

- Usuario: `admin`
- Contraseña: `123456`

> Cambiá esas contraseñas desde **Usuarios → Mi contraseña** apenas empieces a usar el sistema.

Se pueden cambiar las cuentas iniciales antes del primer arranque con estas variables en `backend/.env`:

```env
PANOLERA_USUARIO=panolera
PANOLERA_PASSWORD=panol2026
PANOLERA_NOMBRE=Pañolera

ADMIN_USUARIO=admin
ADMIN_PASSWORD=123456
ADMIN_NOMBRE=Administrador
```

## Estructura

```
pa-ol/
├── README.md
├── MAPA-DE-LA-PAGINA.md
├── excel/                     # inventario que se carga la primera vez
├── backend/
│   ├── .env                   # credenciales de MySQL/MariaDB
│   ├── requirements.txt
│   └── app/
│       ├── main.py            # FastAPI: auth, roles, pedidos y WebSocket
│       ├── auth.py            # hash de contraseñas y tokens
│       ├── database.py        # conexión, migraciones y cuenta inicial
│       └── models.py          # Usuario, Sesion, Alumno, Herramienta, Pedido, Notificacion
└── frontend/
    ├── index.html
    └── src/
        ├── App.jsx            # rutas y barra según el rol
        ├── auth.jsx           # sesión en el navegador
        ├── api.js             # API, token y WebSocket autenticado
        ├── pages/             # Login, Solicitar, Tablero, Usuarios
        └── components/
```

## Instalación

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux/Mac
pip install -r backend/requirements.txt
```

Para compilar el frontend:

```bash
cd frontend
npm install
npm run build
```

## Ejecución

**Opción A: Desde la raíz del proyecto**
```bash
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

**Opción B: Desde el directorio backend**
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Login: http://localhost:8000/
- Vista profesor: http://localhost:8000/solicitar
- Tablero pañolera: http://localhost:8000/tablero
- Administración de usuarios: http://localhost:8000/usuarios
- Desde el celular (misma red WiFi): http://IP-DE-LA-PC:8000/solicitar

La base MySQL/MariaDB (`panol_db` por defecto), las tablas nuevas, la cuenta inicial de la pañolera y las herramientas del Excel se crean solas al primer arranque. El QR de la ventanilla simplemente apunta a la URL de `/solicitar`.

## Funcionamiento

- La pañolera crea la cuenta del profesor desde **Usuarios** y le entrega usuario y contraseña.
- El profesor inicia sesión, elige curso/división, toca +/- en las herramientas y envía.
- El pedido aparece al instante en el tablero de la pañolera (WebSocket + beep) en "Pendientes de Entrega".
- Un clic en **Confirmar Entrega** → pasa a "Pendientes" (confirmado para pasar a buscar) y le avisa al profesor que ya puede retirarlo.
- En ese mismo momento, al profesor le llega un aviso de **"Pedido listo para retirar"** en `/solicitar`, con el detalle del pedido, sonido y un botón para confirmar que ya lo retiró. El aviso queda guardado hasta que lo marque como leído, así lo ve aunque no estuviera conectado.
- Si el profesor toca **🔔 Activar avisos**, también recibe una notificación del navegador (si el navegador la permite; en celulares suele requerir HTTPS o abrir la app desde `localhost`).
- Un clic en **✅ Entregado** → el pedido pasa a "En Taller / Prestados" con hora de salida.
- Un clic en **Marcar como Devuelto** → pasa a "Devueltos Hoy" con hora de retorno.
- Buscador por profesor/usuario/herramienta filtra en todas las columnas.

Los pedidos históricos de la versión anterior (cargados con DNI) se siguen viendo normalmente en el tablero y el historial.
