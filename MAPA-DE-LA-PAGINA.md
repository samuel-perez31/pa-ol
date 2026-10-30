# Mapa de la página — Pañol

> **Archivo de solo lectura.** Es una guía para ubicar cada cosa y hacer cambios a mano.
> No forma parte del código de la app: no se importa desde ningún lado.
>
> Raíz del proyecto: `C:\Users\Lenovo76\Documents\pa-ol\`
> Las rutas de abajo son relativas a esa carpeta.
> Los números de línea son los de esta versión; si editás algo y se corren, guiate por el
> **texto exacto** que figura al lado de cada número.

**Índice**

1. Estructura general
2. Dónde se cambian los colores
3. Barra superior
4. Página "Solicitar"
5. Página "Tablero"
6. Tarjetas de pedido
7. Post-its de "Pendientes"
8. Carpeta "Devueltos hoy"
9. Textos de los títulos (resumen)
10. Datos (de dónde sale lo que se ve)
11. Qué hacer después de editar
12. Atajos para cambios comunes

---

## 1. Estructura general

| Qué | Archivo | Notas |
|---|---|---|
| Punto de entrada | `frontend/src/main.jsx` | monta `<App />` |
| Rutas y barra superior | `frontend/src/App.jsx` | `/solicitar` y `/tablero` |
| Página de solicitud | `frontend/src/pages/Solicitar.jsx` | celular / alumno |
| Página del tablero | `frontend/src/pages/Tablero.jsx` | pantalla grande |
| Libro de Pedidos | `frontend/src/components/LibroPedidos.jsx` | vista Pedidos: libro abierto con dos ganchos |
| Entradas manuscritas | `frontend/src/components/PedidoManuscrito.jsx` | pedidos escritos a mano dentro del libro |
| Configuración de colores y `<body>` | `frontend/index.html` | Tailwind por CDN |
| Backend + API + estáticos | `backend/app/main.py` | sirve `frontend/dist` |
| Conexión a MySQL | `backend/app/database.py` + `backend/.env` | credenciales en `.env` |
| Build publicado | `frontend/dist/` | **no editar a mano**, se regenera |

Rutas en el navegador (definidas en `frontend/src/App.jsx`, líneas 39–42):

- `/solicitar` → `Solicitar.jsx`
- `/tablero` → `Tablero.jsx`
- `/` redirige a `/tablero`

---

## 2. Dónde se cambian los colores

### 2.1 Paleta global (lo primero que hay que tocar)

Archivo: **`frontend/index.html`**, dentro de `tailwind.config` (líneas 11–69).

| Línea | Nombre en el código | Hex | Para qué se usa |
|---|---|---|---|
| 17 | `tinta` | `#071628` | azul prusiano: **todas las letras** |
| 19 | `papel` | `#F3F0E8` | blanco cálido: **fondo de página**, hojas y texto sobre verde |
| 20 | `papel2` | `#DBD3B7` | Quill: tarjetas, paneles, inputs |
| 22 | `carpeta` | `#BBB88C` | Baby Bok Choy: **carpetas** |
| 23 | `verde` | `#637758` | Wild Axolotl: botones, bordes |
| 24 | `verdeoscuro` | `#3E583F` | Okroshka: botones principales, menú activo |
| 27 | `rojo` | `#840D27` | Sweet Cherry: bordes/detalles |
| 28 | `rojo2` | `#AC303C` | Planet Fever: bordes/detalles |
| 29 | `salmon` | `#C85956` | Dark Salmon |
| 30 | `coral` | `#E38E38` | Coral Haze |

También hay alias viejos (`milpa`, `freshmint`, `opulent`, `glendale`, `tandoori`, `rare`,
`neutral50…900`) en las líneas 33–65. **No hacen falta para cambios nuevos**, pero si cambiás
un color de la paleta conviene actualizar también estos alias, porque muchos componentes los
usan a través de un objeto `const C = { ... }` al principio de cada archivo.

Fondo de página: **`frontend/index.html`, línea 72**

```html
<body class="bg-papel text-tinta">
```

Ese `bg-papel` es el fondo real de todas las pantallas. El tablero además repite
`bg-papel` en su contenedor (`Tablero.jsx`, línea 977).

### 2.2 Objetos `const C` repetidos en componentes

Cada uno de estos archivos define su propia copia de la paleta al principio. Si cambiás un
color "de marca", cambialo acá **además** de `index.html`:

| Archivo | Líneas |
|---|---|
| `frontend/src/pages/Solicitar.jsx` | 6–23 |
| `frontend/src/pages/Tablero.jsx` | 33–49 (hoy no se usa, es resto viejo) |
| `frontend/src/components/TarjetaPedido.jsx` | 4–17 |
| `frontend/src/components/SelectorHerramientas.jsx` | 4–16 |
| `frontend/src/components/PostItPedido.jsx` | 3–7 |
| `frontend/src/components/FormularioAlumno.jsx` | 3–7 |
| `frontend/src/components/ItemHerramienta.jsx` | 3–8 |
| `frontend/src/components/BarraFiltros.jsx` | 3 |
| `frontend/src/components/TableroKanban.jsx` | 4–12 |

### 2.3 Colores escritos "a mano" (hex sueltos)

Estos no pasan por la paleta y hay que editarlos en el lugar:

| Qué | Archivo | Línea |
|---|---|---|
| Colores de los post-its de devueltos | `frontend/src/components/CarpetaDevueltos.jsx` | 6 |
| Fondo de la ficha de archivo | idem | 115 |
| Degradé de la tarjeta suelta | idem | 170–173 |
| Lomo rojo de las dos tarjetas | idem | 184 y 252 |
| Filete rojo interior de la tarjeta | idem | 182 |
| Fondo de la carpeta grande | idem | 324 |
| Hoja de archivos (fondo) | idem | 336 |
| Pestaña/bandeja de la ranura | idem | 376–377 |
| Colores de los post-its de "Pendientes" | `frontend/src/components/PostItPedido.jsx` | 17–23 |
| Chinchetas (degradés rojos) | idem | 57–70 |
| Botón "Entregado" del post-it | idem | 123 |
| Portada de las carpetas del historial | `frontend/src/pages/Tablero.jsx` | 537–540 |
| Pestaña abierta de la carpeta (roja) | idem | 549–553 |
| Tapa delantera de la carpeta | idem | 609 |

---

## 3. Barra superior (aparece en todas las páginas)

Archivo: **`frontend/src/App.jsx`**, línea 35.

```
<nav className="bg-papel2 text-tinta border-b-2 border-rojo2 ...">
  📱 Solicitar   → línea 36
  📋 Tablero     → línea 37
</nav>
```

- Fondo: `bg-papel2` → línea 35.
- Filete rojo inferior: `border-b-2 border-rojo2` → línea 35.
- Texto: `text-tinta` → línea 35.

---

## 4. Página "Solicitar" (celular)

Archivo: **`frontend/src/pages/Solicitar.jsx`** (`return` en la línea 77).

| Qué | Línea | Texto / clase |
|---|---|---|
| Título de la página | 79 | `🔧 Solicitar Material` |
| Formulario del alumno | 80 | `<FormularioAlumno />` |
| Subtítulo "Herramientas" | 81 | `Herramientas` |
| Buscador y selector | 82 | `<SelectorHerramientas />` |
| Rótulo de insumos | 83 | `Otros materiales / Insumos` |
| Caja de texto libre | 84–85 | placeholder `Ej: 2m de cable 1.5...` |
| Botón enviar | 86–88 | `📦 Solicitar Material` |
| Mensaje de éxito/error | 90 | usa `msg.clase` (líneas 40, 43, 59, 69, 73) |
| Cartel "sin stock" | 92–104 | fondo del modal en 93, caja en 94 |
| Título del cartel | 96 | `Material no disponible` |
| Texto del cartel | 97–98 | `El material no está en stock` / `Ya fue solicitado…` |
| Botón "Entendido" | 99–101 | |

### 4.1 Formulario del alumno

Archivo: **`frontend/src/components/FormularioAlumno.jsx`**

| Qué | Línea |
|---|---|
| Fondo de la tarjeta (`bg-papel2`) | 43 |
| Estilo de los inputs | 39 (`inputClass`) |
| Estilo de los rótulos | 40 (`labelClass`) |
| Rótulo DNI + input | 44–45 |
| Rótulo Nombre + input | 46–47 |
| Rótulo Curso + select | 50–54 |
| Rótulo División + select | 57–61 |

### 4.2 Selector de herramientas

Archivo: **`frontend/src/components/SelectorHerramientas.jsx`**

| Qué | Línea |
|---|---|
| Buscador | 90–92 (placeholder en 91) |
| Lista de resultados | 95–117 |
| "Disponibles: …" | 104 |
| Botón "+ Agregar" / "Sin stock" | 106–109 |
| Mensaje "Sin coincidencias" | 113–115 |
| Título "Herramientas seleccionadas" | 121 |
| Lista de seleccionadas | 123–143 |
| Botones − / + / ✕ | 134, 136–137, 138 |
| Mensaje "Todavía no agregaste…" | 145 |

### 4.3 Piezas auxiliares (hoy no se muestran)

- `frontend/src/components/ItemHerramienta.jsx`: tarjeta chica con − / +. **No está montada en ninguna página.**
- `frontend/src/components/BarraFiltros.jsx`: input de búsqueda. **No está montado.**
- `frontend/src/components/TableroKanban.jsx`: tablero en tres columnas. **No está montado.**

---

## 5. Página "Tablero" (pantalla grande)

Archivo: **`frontend/src/pages/Tablero.jsx`** (1.040 líneas).

### 5.1 Cabecera

| Qué | Línea |
|---|---|
| Contenedor de la página (`min-h-screen bg-papel`) | 977 |
| `<header>` fijo arriba | 979 |
| Título "Sistema Pañol" | 982 |
| Subtítulo "• Panel de control" | 983 |
| Buscador del encabezado | 990–991 |
| Botón de filtro (embudo) | 993–997 |

### 5.2 Menú lateral

| Qué | Línea |
|---|---|
| Definición de los ítems | 951–958 |
| Render del menú | 1009–1028 |
| Ítem activo (verde oscuro + texto claro) | 1014 |
| Punto claro del ítem activo | 1019 |
| Título "Menú" | 1008 |

Los ítems y sus etiquetas están en las líneas 952–957:

```
🏠 Inicio · 📦 Pedidos · ⏳ Pendientes · 🔧 En taller · ↩️ Devueltos hoy · 📚 Historial
```

> Ojo: los números de "Devueltos hoy" (3) y "Historial" (4) están fijos en las líneas 956–957.

### 5.3 Vistas (el contenido cambia sin recargar)

El estado de la vista está en la línea 134 (`vista`). El render general empieza en la 725.

| Vista | Líneas | Título que se muestra | Componente que usa |
|---|---|---|---|
| Inicio | 686–723 | `📅 Hoy · <fecha>` (699) y `📚 Historial de hoy` (714–715) | contadores + carpetas del historial |
| Pedidos | 760–763 | `Pedidos` (`LibroPedidos.jsx` 97) | `LibroPedidos` + `PedidoManuscrito` |
| Pendientes | 765–783 | `⏳ Pendientes` (767) | `PostItPedido` |
| En taller | 785–793 | `🔨 En taller / Prestados` (787) | `TarjetaPedido` |
| Devueltos hoy | 795–802 | `✅ Devueltos hoy` (797) | `CarpetaDevueltos` (799) |
| Historial | 804–939 | `📚 Historial General` (806) | carpetas por alumno |

Subtítulos y contadores:

- "Inicio": contadores en 688–694, tarjetas en 701–708.
- "Pedidos": título y contador dentro del libro (`LibroPedidos.jsx` 97–103); entradas manuscritas (`PedidoManuscrito.jsx`) repartidas entre las dos páginas.
- "Pendientes": subtítulo en 773, grilla en 774–786.
- "En taller": subtítulo en 793, listado en 794–796.
- "Devueltos hoy": sin subtítulo, solo la carpeta.
- "Historial": subtítulo en 812–816.

### 5.4 Filtros del Historial

| Qué | Línea |
|---|---|
| Buscador (placeholder en 826) | 824–830 |
| Botón "Filtrar por fecha" | 835–845 |
| Calendario desplegable | 855–929 |
| Atajos "Hoy / 7 días / 30 días / Este mes / Todo" | 915–919 |

### 5.5 Carpetas del historial (una por alumno)

| Qué | Línea |
|---|---|
| Agrupación por alumno | 481–493 |
| Pila de carpetas | 497–635 |
| Fondo/degradé de la carpeta | 537–540 |
| Pestaña con nombre y DNI | 545–568 |
| Contador de devoluciones | 559–567 |
| Hojas que se despliegan al abrir | 571–603 |
| Tapa delantera con corte diagonal | 605–614 |
| Texto de la tapa ("N devoluciones · última…") | 616–628 |
| Texto "▲ cerrar" / "▼ abrir" | 627 |

### 5.6 Modal "Portfolio del día"

| Qué | Línea |
|---|---|
| Función | 637–683 |
| Fondo oscuro | 645 |
| Caja del modal | 646 |
| Título `📂 <nombre>` | 648 |
| "Pedidos de la jornada" | 657 |
| Botones "Volver" / "Historial" | 673–674 |

---

## 6. Tarjetas de pedido (En taller)

Archivo: **`frontend/src/components/TarjetaPedido.jsx`**

| Qué | Línea |
|---|---|
| Paleta local | 4–17 |
| Color del borde según estado | 33 |
| Colores según 🟢 / 🟡 / 🔴 | 36–40 |
| Tarjeta completa (fondo `bg-papel2`) | 83 |
| "Pedido" | 87 |
| Fecha + curso | 88–90 |
| Alumno + DNI + hora | 91–93 |
| Notas (sin `[EN_TALLER]`) | 94–99 |
| Lista de herramientas | 103–118 |
| Botón tachar/devuelto | 106–112 |
| Botón "✔ Confirmar pedido / Confirmar Entrega" | 121–125 |
| Botón "✅ Entregado" (Pendientes) | 127–131 |
| Botón "↩ Marcar como Devuelto (Completo)" | 133–137 |
| Botón "📦 Cargar Devolución" | 138–144 |

> La vista Pedidos ya no usa esta tarjeta: el libro muestra entradas manuscritas
> (`PedidoManuscrito.jsx`). Las tarjetas quedan para "En taller".

## 6.1 Entradas manuscritas del libro de Pedidos

Archivo: **`frontend/src/components/PedidoManuscrito.jsx`**

| Qué | Línea |
|---|---|
| Fecha `DD/MM/AAAA` | 4–10 |
| Inclinaciones de cada entrada | 14 |
| "Pedido N" (Caveat) | 25–30 |
| Alumno | 33–35 |
| DNI + curso | 36–38 |
| Lista de materiales | 40–49 |
| Nota (sin `[EN_TALLER]`) | 51–55 |
| Botón "✓ confirmar pedido" | 57–77 |
| Separador ondulado | 79–83 |

> Cada entrada se gira apenas (`ROTACIONES`) para que no quede todo perfectamente alineado.
> El botón de confirmar es texto manuscrito con un check y una línea ondulada, no un botón
> rectangular.

---

## 7. Post-its de "Pendientes"

Archivo: **`frontend/src/components/PostItPedido.jsx`**

| Qué | Línea |
|---|---|
| Paleta local | 3–7 |
| Colores de los papelitos | 17–23 |
| Texturas (puntitos / rayitas) | 25–29 |
| Chincheta (SVG) | 43–73 |
| Cabeza y cuerpo de la chincheta | 46–55 |
| Degradés rojos | 57–70 |
| Papelito (fondo, sombra, doblez) | 76–99 |
| "Pedido #N" | 102 |
| Fecha + curso | 103–105 |
| Alumno + DNI + hora | 106–108 |
| Notas | 109–111 |
| Lista de herramientas | 112–119 |
| Botón "✅ Entregado" / "Confirmar" | 121–126 |

El texto del botón se pasa desde `Tablero.jsx`, línea 782 (`label="✅ Entregado"`).

---

## 8. Carpeta "Devueltos hoy"

Archivo: **`frontend/src/components/CarpetaDevueltos.jsx`** (404 líneas).

### 8.1 Reparto de las devoluciones (lógica)

| Qué | Línea |
|---|---|
| Colores de los post-its de esta carpeta | 6 |
| Comentario con el criterio | 16–27 |
| "Largo" desde 4 ítems | 28 |
| "Largo" desde 5 unidades | 29 |
| Capacidad total (8 + 4 + 2 + 2 = 16) | 30 |
| Función que reparte | 36–103 |
| Ventana de las 16 más recientes | 42 |
| Tarjetas (2 + 2) | 62–71 |
| Hoja de archivos (8) | 73–74 |
| Post-its (4) | 76–80 |
| Relleno si falta lugar | 82–92 |

### 8.2 Piezas visuales

| Pieza | Líneas | Qué contiene |
|---|---|---|
| `FichaArchivo` | 112–131 | ficha amarilla sobre la hoja, nombre completo en línea propia |
| `PostItDevuelto` | 134–165 | papelito cuadrado con "~ devuelto ~", nombre completo sin truncar |
| `FONDO_TARJETA` | 170–173 | degradé de la tarjeta suelta |
| `TarjetaPresentacion` | 175–244 | tarjeta apaisada con dos columnas |
| `TarjetaHoja` | 248–314 | hoja con encabezado, regla roja y renglones |
| `Vacio` | 316–318 | guion central cuando no hay nada |
| `CarpetaDevueltos` (export) | 320–404 | carpeta completa |

### 8.3 Carpeta completa

| Qué | Línea |
|---|---|
| Contenedor verde de la carpeta | 324 |
| Etiqueta lateral "Archivo" | 326–330 |
| Mitad izquierda (hoja de archivos) | 333–352 |
| Hoja (fondo, borde, sombra, inclinación) | 336 |
| Título "Hoja de archivos" | 340 |
| Grilla de fichas | 343–347 |
| Mitad derecha | 355–390 |
| Bloque de post-its | 359–372 |
| Pestaña del bloque de post-its | 360–361 |
| Ranura con la hoja | 375–383 |
| Tarjeta suelta | 386–388 |
| Aviso "carpeta completa · N …" | 393–401 |

### 8.4 Textos fijos de las dos tarjetas

| Texto | Tarjeta suelta (`TarjetaPresentacion`) | Hoja (`TarjetaHoja`) |
|---|---|---|
| "Sistema Pañol" | 190 | 256 |
| "Herramientas · Taller" | 192 | 258 |
| "Área" | 222 | 291 |
| "Pañol" | 223 | 294 |
| "Registro" | 226 | 297 |
| "Préstamos y devoluciones" | 228 | 300 |
| "gracias" | 238 | 309 |
| "— archivo —" | 239 | 310 |

Otros textos:

| Texto | Archivo | Línea |
|---|---|---|
| "Pedido {id}" (ficha) | CarpetaDevueltos.jsx | 117 |
| Nombre del alumno (ficha) | idem | 118–120 |
| "+ N más" (ficha) | idem | 130 |
| "Pedido {id}" (post-it) | idem | 147 |
| "~ devuelto ~" | idem | 164 |
| "Pedido {id}" (tarjeta suelta) | idem | 205 |
| "Pedido {id}" (hoja) | idem | 278 |
| "carpeta completa · N devoluciones siguen en el historial" | idem | 397 |

### 8.5 Dónde se monta

- En "Devueltos hoy": `Tablero.jsx`, línea 804.
- En "Inicio" **no** se usa la carpeta: se usan las carpetas por alumno
  (`tarjetasHistorial`, `Tablero.jsx` 716–718).

---

## 9. Textos de los títulos (resumen rápido)

| Título | Archivo | Línea |
|---|---|---|
| "Sistema Pañol" (cabecera) | `Tablero.jsx` | 982 |
| "Panel de control" | idem | 983 |
| "Menú" | idem | 1008 |
| "📅 Hoy · …" | idem | 698 |
| "📚 Historial de hoy" | idem | 713–714 |
| "Pedidos" | `LibroPedidos.jsx` | 77 |
| "⏳ Pendientes" | idem | 772 |
| "🔨 En taller / Prestados" | idem | 792 |
| "✅ Devueltos hoy" | idem | 802 |
| "📚 Historial General" | idem | 811 |
| "🔧 Solicitar Material" | `Solicitar.jsx` | 79 |
| "Herramientas" | idem | 81 |
| "Otros materiales / Insumos" | idem | 83 |
| "Material no disponible" | idem | 96 |
| "Herramientas seleccionadas" | `SelectorHerramientas.jsx` | 121 |
| "Hoja de archivos" | `CarpetaDevueltos.jsx` | 340 |
| "Sistema Pañol" (tarjetas) | idem | 190 y 256 |
| "Herramientas · Taller" | idem | 192 y 258 |
| "gracias" / "— archivo —" | idem | 238–239 y 309–310 |

---

## 10. Datos (de dónde sale lo que se ve)

- El frontend pide todo a la API: `frontend/src/api.js` (líneas 1–10).
  Usa el mismo host, puerto `8000` (o `8001` si la página corre ahí).
- WebSocket del tablero: `frontend/src/api.js`, línea 10.
- Endpoints en `backend/app/main.py`:

| Endpoint | Línea |
|---|---|
| `GET /api/herramientas` | 165 |
| `POST /api/pedidos` | 181 |
| `GET /api/pedidos` | 207 |
| `GET /api/pedidos/ids` | 235 |
| `GET /api/pedidos/fechas` | 247 |
| `POST /api/pedidos/{id}/pasar-a-taller` | 258 |
| `POST /api/pedidos/{id}/entregar` | 275 |
| `POST /api/pedidos/{id}/devolver` | 288 |
| `POST /api/pedidos/{id}/toggle-item` | 301 |
| `POST /api/pedidos/{id}/cargar-devolucion` | 329 |
| `GET /api/version` | 390 |
| `WS /ws/tablero` | 408 |

- La app se sirve desde `frontend/dist` (montaje en `backend/app/main.py`, líneas 420–430).
- La base es MySQL; credenciales y nombre de la base están en `backend/.env`
  (leídas en `backend/app/database.py`, líneas 14–24).

Reglas de qué pedido aparece en cada lado (`Tablero.jsx`):

| Grupo | Línea |
|---|---|
| Pedidos (PENDIENTE) | 248 |
| Pendientes (PRESTADO sin `[EN_TALLER]`) | 246 |
| En taller (PRESTADO con `[EN_TALLER]`) | 249 |
| Devueltos hoy | 271 |
| Solicitados hoy | 274 |
| Historial total | 277 |

---

## 11. Qué hacer después de editar

1. Guardar el archivo `.jsx` / `.html`.
2. Compilar:

   ```powershell
   cd C:\Users\Lenovo76\Documents\pa-ol\frontend
   npm run build
   ```

3. Recargar la página con **Ctrl + F5**.
   El backend sirve `frontend/dist`; la app compara `/api/version` y se recarga sola si
   detecta un bundle nuevo.

**No edites** `frontend/dist/` a mano: cada `npm run build` lo borra y lo vuelve a generar.

---

## 12. Atajos para cambios comunes

| Quiero cambiar… | Dónde |
|---|---|
| Fondo de toda la página | `frontend/index.html` línea 79 (`bg-papel`) y `Tablero.jsx` línea 972 |
| Forma, tapa, páginas y ganchos del libro de Pedidos | `LibroPedidos.jsx` (todo el archivo) |
| Escritura (tipo, tamaño, giro) de los pedidos del libro | `PedidoManuscrito.jsx` (todo el archivo) |
| Tipografías manuscritas Caveat / Patrick Hand | `frontend/index.html` líneas 7–13 |
| Color de todas las letras | `frontend/index.html` línea 24 (`tinta`) + objetos `C` de la sección 2.2 |
| Fondo de las tarjetas | `TarjetaPedido.jsx` línea 83; `FormularioAlumno.jsx` 43; `SelectorHerramientas.jsx` 95 y 123 |
| Verde de las carpetas | `CarpetaDevueltos.jsx` 324 y 336; `index.html` línea 29 (`carpeta`) |
| Rojos de bordes | `CarpetaDevueltos.jsx` 182, 184, 252; `App.jsx` 35; `Tablero.jsx` 691–692 y 739 |
| Título de una zona del tablero | `Tablero.jsx` 699, 767, 787, 797 u 806; el del libro en `LibroPedidos.jsx` 97 |
| Textos de las tarjetas de la carpeta | `CarpetaDevueltos.jsx` 190–239 y 256–310 |
| Colores de los post-its | `CarpetaDevueltos.jsx` 6; `PostItPedido.jsx` 17–23 |
| Cuántos pedidos entran en la carpeta | `CarpetaDevueltos.jsx` 28–30 |
| Qué se considera pedido "largo" | `CarpetaDevueltos.jsx` 28–29 y 33–34 |
| Velocidad/estilo de la recarga automática | `App.jsx` 11–31 |
