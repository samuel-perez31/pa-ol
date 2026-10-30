import React, { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { API, WS_URL } from '../api.js'
import TarjetaPedido from '../components/TarjetaPedido.jsx'
import LibroPedidos from '../components/LibroPedidos.jsx'
import CarpetaDevueltos from '../components/CarpetaDevueltos.jsx'
import PostItPedido from '../components/PostItPedido.jsx'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS_SEMANA = ['LU', 'MA', 'MI', 'JU', 'VI', 'SÁ', 'DO']

// ---------- Helpers de fecha (fuera del componente) ----------
const isoDe = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const isoHoy = () => isoDe(new Date())
const isoHaceDias = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return isoDe(d) }
const isoInicioMes = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01` }
const fmtCorta = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }

// Id de la pestaña (sessionStorage): el servidor usa esto para mantener una
// sola conexión WebSocket por pestaña.
const idSesion = () => {
  try {
    let s = sessionStorage.getItem('paol_sesion')
    if (!s) {
      s = Math.random().toString(36).slice(2) + Date.now().toString(36)
      sessionStorage.setItem('paol_sesion', s)
    }
    return s
  } catch (e) {
    return Math.random().toString(36).slice(2)
  }
}

const C = {
  milpa: '#637758',
  freshmint: '#3E583F',
  opulent: '#071628',
  glendale: '#BBB88C',
  tandoori: '#AC303C',
  rare: '#840D27',
  neutral50: '#E5DCB7',
  neutral100: '#DBD3B7',
  neutral200: '#BBB88C',
  neutral300: '#637758',
  neutral400: '#071628',
  neutral500: '#071628',
  neutral600: '#071628',
  neutral700: '#071628',
  neutral900: '#071628',
}

export default function Tablero() {
  // ---- Sonido de notificación ------------------------------------------------
  // Un único AudioContext reutilizable (antes se creaba uno por beep y se
  // acumulaban) + un antirrebote global (localStorage): aunque lleguen mil
  // eventos juntos, o haya varias pestañas/conexiones abiertas, se escucha
  // UNA sola vez.
  const refAudio = useRef(null)
  const refUltimoBeep = useRef(0)

  const sonar = () => {
    try {
      const ahora = Date.now()
      if (ahora - refUltimoBeep.current < 1000) return   // antirrebote rápido
      // Antirrebote compartido entre pestañas/conexiones del mismo navegador
      let ultimo = 0
      try { ultimo = parseInt(localStorage.getItem('paol_ultimo_beep') || '0', 10) || 0 } catch (e) {}
      if (ahora - ultimo < 1500) return
      refUltimoBeep.current = ahora
      try { localStorage.setItem('paol_ultimo_beep', String(ahora)) } catch (e) {}

      if (!refAudio.current || refAudio.current.state === 'closed') {
        refAudio.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      const ctx = refAudio.current
      if (ctx.state === 'suspended') ctx.resume()

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 800
      gain.gain.value = 0.1
      osc.start()
      osc.stop(ctx.currentTime + 0.15)
    } catch (e) {}
  }
  const [pedidos, setPedidos] = useState([])
  const [q, setQ] = useState('')

  // ---- Detección de cambios reales para el sonido -------------------------
  // El sonido NO depende del evento del WebSocket: se compara el estado de
  // cada pedido con el snapshot anterior. Suena únicamente cuando:
  //   - entra un pedido nuevo  (aparece un id que no estaba)
  //   - se procesa un pedido   (cambia el estado: PENDIENTE/PRESTADO/DEVUELTO)
  // Tachar o destachar un material NO cambia el estado => no suena.
  const refSnapshot = useRef({})
  const refSnapshotListo = useRef(false)
  const refRevisando = useRef(false)

  const revisarSonido = async () => {
    if (refRevisando.current) return
    refRevisando.current = true
    try {
      const res = await fetch(`${API}/api/pedidos/ids`)
      if (!res.ok) return
      const lista = await res.json()
      const prev = refSnapshot.current
      const nuevo = {}
      let hayPedidoNuevo = false
      let hayProcesado = false
      for (const p of lista) {
        nuevo[p.id] = p.estado
        if (!(p.id in prev)) hayPedidoNuevo = true
        else if (prev[p.id] !== p.estado) hayProcesado = true
      }
      refSnapshot.current = nuevo
      if (refSnapshotListo.current && (hayPedidoNuevo || hayProcesado)) sonar()
      refSnapshotListo.current = true
    } catch (e) {
    } finally {
      refRevisando.current = false
    }
  }
  const [conectado, setConectado] = useState(false)
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null)
  const [fechasDisponibles, setFechasDisponibles] = useState([])
  const [dia, setDia] = useState('')
  const [mes, setMes] = useState('')
  const [anio, setAnio] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const vistaParam = searchParams.get('vista')
  const [vista, setVista] = useState(vistaParam || 'inicio')
  const [portfolioAbierto, setPortfolioAbierto] = useState(false)
  const [portfolios, setPortfolios] = useState([])
  const [portfolioSeleccionado, setPortfolioSeleccionado] = useState(null)
  const [anioCalendario, setAnioCalendario] = useState(2026)
  // Búsqueda para el panel de Historial (un solo campo que busca en todo)
  const [busquedaHistorial, setBusquedaHistorial] = useState('')
  // ====== CALENDARIO para filtrar el historial por fecha ======
  const [calAbierto, setCalAbierto] = useState(false)
  const [calAnio, setCalAnio] = useState(() => new Date().getFullYear())
  const [calMes, setCalMes] = useState(() => new Date().getMonth()) // 0-11
  const [modoFecha, setModoFecha] = useState('dia')                    // 'dia' | 'rango'
  const [rangoEnCurso, setRangoEnCurso] = useState(null)              // { inicio, fin } al elegir el 1er día
  const [fechaDesde, setFechaDesde] = useState(() => '')
  const [fechaHasta, setFechaHasta] = useState(() => '')
  const [etiquetaFiltroFecha, setEtiquetaFiltroFecha] = useState('')
  // Pila de carpetas del historial: cuál está bajo el mouse y cuál está abierta
  const [carpetaHover, setCarpetaHover] = useState(null)
  const [carpetaAbierta, setCarpetaAbierta] = useState(null)
  const calRef = useRef(null)
  const qRef = useRef(q)
  qRef.current = q

  // Cerrar el calendario al hacer click fuera de él
  useEffect(() => {
    if (!calAbierto) return
    const onClick = (e) => {
      if (calRef.current && !calRef.current.contains(e.target)) setCalAbierto(false)
    }
    const onEsc = (e) => { if (e.key === 'Escape') setCalAbierto(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [calAbierto])

  // Sincronizar la vista con el parámetro ?vista= de la URL (viene desde la página de inicio)
  useEffect(() => {
    if (vistaParam) setVista(vistaParam)
  }, [vistaParam])

  const cambiarVista = (id) => {
    setVista(id)
    setSearchParams({ vista: id }, { replace: true })
  }

  const cargar = async () => {
    try {
      setError(null)
      const fechaParam = fechaSeleccionada ? `&fecha=${fechaSeleccionada}` : ''
      const qParam = qRef.current ? `&q=${encodeURIComponent(qRef.current)}` : ''
      const res = await fetch(`${API}/api/pedidos?${qParam}${fechaParam}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setPedidos(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  const cargarFechas = async () => {
    try {
      const res = await fetch(`${API}/api/pedidos/fechas`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setFechasDisponibles(await res.json())
    } catch (e) {}
  }

  useEffect(() => { cargar(); cargarFechas() }, [q, fechaSeleccionada])

  // Primer snapshot: arma la base de comparación (sin sonar)
  useEffect(() => { revisarSonido() }, [])

  useEffect(() => {
    let ws = null
    let cerrado = false            // evita reconectar cuando el componente se desmonta
    let timerReconexion = null
    // Id de esta pestaña: el servidor mantiene una sola conexión por pestaña,
    // así una pestaña vieja/zombie no puede multiplicar el sonido.
    const sesion = idSesion()

    const conectar = () => {
      if (cerrado) return
      ws = new WebSocket(`${WS_URL}?s=${sesion}`)
      ws.onopen = () => setConectado(true)
      ws.onmessage = () => { revisarSonido(); cargar() }
      ws.onclose = () => {
        setConectado(false)
        // Sólo reconectamos si el componente sigue montado
        if (!cerrado) timerReconexion = setTimeout(conectar, 2000)
      }
    }
    conectar()
    const interval = setInterval(() => { revisarSonido(); cargar() }, 4000)
    return () => {
      cerrado = true
      clearInterval(interval)
      if (timerReconexion) clearTimeout(timerReconexion)
      if (ws) { ws.onclose = null; ws.close() }   // sin onclose => no reconecta
    }
  }, [])

  const accion = async (id, tipo) => {
    if (tipo === 'refresh') { cargar(); return }
    await fetch(`${API}/api/pedidos/${id}/${tipo}`, { method: 'POST' })
    cargar()
  }

  // Derived state: filtrado por estado REAL del sistema
  const pedidosAPasar = pedidos.filter(p => p.estado === 'PRESTADO' && !(p.notas && p.notas.includes('[EN_TALLER]'))) // Pedidos confirmados esperando pasar a taller
  const pedidosPendientes = pedidosAPasar
  const pedidosAConfirmar = pedidos.filter(p => p.estado === 'PENDIENTE') // Nuevos, por confirmar
  const pedidosEnTaller = pedidos.filter(p => p.estado === 'PRESTADO' && p.notas && p.notas.includes('[EN_TALLER]')) // En taller para tachar/devolver
  const pedidosPrestados = pedidosEnTaller
  const pedidosDevueltos = pedidos.filter(p => p.estado === 'DEVUELTO')

  const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

  const normalizarFecha = (fechaStr) => {
    if (!fechaStr) return ''
    return fechaStr.includes('T') ? fechaStr.split('T')[0] :
           fechaStr.includes(' ') ? fechaStr.split(' ')[0] :
           fechaStr
  }

  const esFechaHoy = (fechaStr) => {
    const fd = normalizarFecha(fechaStr)
    if (!fd) return false
    const [ay, am, ad] = fd.split('-')
    const [hy, hm, hd] = hoy().split('-')
    return ay === hy && am === hm && ad === hd
  }

  // Devueltos HOY - SIEMPRE filtrados por fecha de hoy
  const devueltosHoy = pedidosDevueltos.filter(p => esFechaHoy(p.fecha_devolucion))

  // Pedidos SOLICITADOS hoy (lo que se pidió en la jornada de hoy)
  const solicitadosHoy = pedidos.filter(p => esFechaHoy(p.fecha_solicitud))

  // Historial TOTAL - TODOS los registros sin filtro restrictivo
  const historialTotal = pedidosDevueltos

  // ============================================================
  // CALENDARIO DEL HISTORIAL: navegación de mes, rangos y filtrado
  // ============================================================
  const hayFiltroFecha = !!(fechaDesde || fechaHasta)

  // Cuántas devoluciones hay por fecha (para marcar los días con actividad)
  const conteoPorFecha = () => {
    const mapa = new Map()
    historialTotal.forEach(p => {
      const f = normalizarFecha(p.fecha_devolucion || p.fecha_solicitud)
      if (f) mapa.set(f, (mapa.get(f) || 0) + 1)
    })
    return mapa
  }

  // Celdas del mes actual (lunes = primera columna)
  const celdasDelMes = () => {
    const primero = new Date(calAnio, calMes, 1)
    const offset = (primero.getDay() + 6) % 7
    const diasEnMes = new Date(calAnio, calMes + 1, 0).getDate()
    const celdas = []
    for (let i = 0; i < offset; i++) celdas.push(null)
    for (let d = 1; d <= diasEnMes; d++) celdas.push(isoDe(new Date(calAnio, calMes, d)))
    while (celdas.length % 7 !== 0) celdas.push(null)
    return celdas
  }

  const moverMes = (delta) => {
    let m = calMes + delta
    let a = calAnio
    if (m < 0) { m = 11; a-- }
    if (m > 11) { m = 0; a++ }
    setCalMes(m)
    setCalAnio(a)
  }

  const elegirDia = (iso) => {
    if (modoFecha === 'dia') {
      setFechaDesde(iso)
      setFechaHasta(iso)
      setEtiquetaFiltroFecha(fmtCorta(iso))
      setRangoEnCurso(null)
      setCalAbierto(false)
      return
    }
    // Modo rango: primer click = inicio, segundo click = fin
    if (!rangoEnCurso) {
      setRangoEnCurso({ inicio: iso, fin: '' })
      return
    }
    const a = rangoEnCurso.inicio <= iso ? rangoEnCurso.inicio : iso
    const b = rangoEnCurso.inicio <= iso ? iso : rangoEnCurso.inicio
    setFechaDesde(a)
    setFechaHasta(b)
    setEtiquetaFiltroFecha(a === b ? fmtCorta(a) : `${fmtCorta(a)} - ${fmtCorta(b)}`)
    setRangoEnCurso(null)
    setCalAbierto(false)
  }

  const aplicarRangoRapido = (etiqueta, desde, hasta) => {
    setFechaDesde(desde)
    setFechaHasta(hasta)
    setEtiquetaFiltroFecha(etiqueta)
    setRangoEnCurso(null)
    setCalAbierto(false)
  }

  const limpiarFechas = () => {
    setFechaDesde('')
    setFechaHasta('')
    setEtiquetaFiltroFecha('')
    setRangoEnCurso(null)
  }

  const limpiarTodoHistorial = () => {
    setBusquedaHistorial('')
    limpiarFechas()
  }

  useEffect(() => {
    setPortfolios(generarPortfolioFechas(pedidos))
  }, [pedidos])

  const generarPortfolioFechas = (pedidos) => {
    if (!pedidos || pedidos.length === 0) return []
    const pedidosConFecha = pedidos.map(p => {
      const fecha = p.fecha_solicitud ? new Date(p.fecha_solicitud) : null
      return { ...p, fechaISO: p.fecha_solicitud, fechaObjeto: fecha }
    })
    const grupos = new Map()
    pedidosConFecha.forEach(p => {
      if (!p.fechaObjeto) return
      const key = p.fechaObjeto.toISOString().split('T')[0]
      if (!grupos.has(key)) grupos.set(key, [])
      grupos.get(key).push(p)
    })
    const fechasOrdenadas = Array.from(grupos.keys()).sort((a, b) => new Date(b) - new Date(a))
    const carpetas = []
    fechasOrdenadas.forEach((fecha, idx) => {
      const pedidosDia = grupos.get(fecha)
      const nombreDia = pedidosDia.length === 1
        ? `Jornada del ${formatearFechaISO(fecha)}`
        : `Jornada ${formatearFechaISO(fecha)}`
      carpetas.push({
        id: `cartera-${fecha}`,
        fecha,
        numeracion: idx + 1,
        nombre: nombreDia,
        pedidos: pedidosDia,
      })
    })
    return carpetas
  }

  const formatearFechaISO = (fechaISO) => {
    if (!fechaISO) return 'Hoy'
    const fd = normalizarFecha(fechaISO)
    const partes = fd.split('-')
    if (partes.length !== 3) return fechaISO  // si solo es hora (HH:MM) la mostramos tal cual
    const [a, m, d] = partes
    return `${d}/${m}/${a}`
  }

  // Tarjetas de cada vista - usando los filtros derivados
  const tarjetasPendientes = pedidosAPasar.length ?
    pedidosAPasar.map(p => <TarjetaPedido key={p.id} pedido={p} onAccion={accion} modoPasarATaller />) :
    null

  const tarjetasPrestados = pedidosEnTaller.length ?
    pedidosEnTaller.map(p => <TarjetaPedido key={p.id} pedido={p} onAccion={accion} />) :
    null

  // Para "Devueltos hoy": solo los que fueron devueltos HOY, con la misma
  // estética de card que Pendientes y En taller
  const tarjetasDevueltosHoy = () => {
    const itemsAMostrar = devueltosHoy  // Solo los que tienen fecha de devolución HOY
    if (!itemsAMostrar.length) {
      return (
        <p className="text-tinta/60 text-center py-8">No hay devoluciones para hoy</p>
      )
    }
    // Ordenar cronológicamente (más reciente primero)
    const ordenados = [...itemsAMostrar].sort((a, b) => {
      const ta = new Date(a.fecha_hora_devolucion || a.fecha_hora_solicitud || 0).getTime()
      const tb = new Date(b.fecha_hora_devolucion || b.fecha_hora_solicitud || 0).getTime()
      return tb - ta
    })
    return ordenados.map(p => (
      <TarjetaPedido key={p.id} pedido={p} onAccion={accion} />
    ))
  }

  // Historial con búsqueda en todos los campos + filtro por rango de fechas
  const historialFiltrado = () => {
    let filtrados = [...historialTotal]

    // Buscar en nombre, DNI, fecha, herramientas y notas
    const busq = busquedaHistorial.trim().toLowerCase()
    if (busq) {
      filtrados = filtrados.filter(p => {
        // Nombre del alumno
        if (p.alumno && p.alumno.toLowerCase().includes(busq)) return true
        // DNI
        if (p.dni && p.dni.toLowerCase().includes(busq)) return true
        // Curso
        if (p.curso && p.curso.toLowerCase().includes(busq)) return true
        // Fecha de devolución (acepta YYYY-MM-DD, DD/MM/AAAA o parcial)
        const fechaDev = normalizarFecha(p.fecha_devolucion)
        const fechaSol = normalizarFecha(p.fecha_solicitud)
        if (fechaDev.includes(busq) || fechaSol.includes(busq)) return true
        // Formato DD/MM/AAAA invertido
        if (fechaDev) {
          const [y, m, d] = fechaDev.split('-')
          if (`${d}/${m}/${y}`.includes(busq)) return true
        }
        // Herramientas
        if (p.items && p.items.some(item => item.nombre && item.nombre.toLowerCase().includes(busq))) return true
        // Notas
        if (p.notas && p.notas.toLowerCase().includes(busq)) return true
        return false
      })
    }

    // Filtro por rango de fechas elegido en el calendario
    if (fechaDesde || fechaHasta) {
      const desde = fechaDesde || '0000-01-01'
      const hasta = fechaHasta || '9999-12-31'
      filtrados = filtrados.filter(p => {
        const f = normalizarFecha(p.fecha_devolucion || p.fecha_solicitud)
        return !!f && f >= desde && f <= hasta
      })
    }

    // Ordenar cronológicamente (más reciente primero)
    return filtrados.sort((a, b) => {
      const ta = new Date(a.fecha_hora_devolucion || a.fecha_hora_solicitud || 0).getTime()
      const tb = new Date(b.fecha_hora_devolucion || b.fecha_hora_solicitud || 0).getTime()
      return tb - ta
    })
  }

  // Agrupa las devoluciones por alumno (DNI) -> una carpeta por alumno
  const agruparPorAlumno = (lista) => {
    const mapa = new Map()
    ;(lista || []).forEach(p => {
      const dni = (p.dni || '').toString().trim()
      const nom = (p.alumno || 'Sin nombre').toString().trim()
      const key = dni ? dni.toLowerCase() : nom.toLowerCase()
      if (!mapa.has(key)) {
        mapa.set(key, { key, nombre: nom, dni: dni || '—', devoluciones: [] })
      }
      mapa.get(key).devoluciones.push(p)
    })
    return Array.from(mapa.values())
  }

  // Pila de carpetas: una por alumno. Al pasar el mouse la carpeta se levanta
  // (sube de z-index, se corre y toma sombra) y al hacer click se abre.
  const tarjetasHistorial = (opciones = {}) => {
    const lista = opciones.lista || historialFiltrado()
    const ordenados = [...lista].sort((a, b) => {
      const ta = new Date(a.fecha_hora_devolucion || a.fecha_hora_solicitud || 0).getTime()
      const tb = new Date(b.fecha_hora_devolucion || b.fecha_hora_solicitud || 0).getTime()
      return tb - ta
    })
    const busq = busquedaHistorial.trim().toLowerCase()

    if (!ordenados.length) {
      return (
        <p className="text-tinta/60 text-center py-8">
          {opciones.vacio || (hayFiltroFecha
            ? `No hay devoluciones entre ${fmtCorta(fechaDesde || fechaHasta)}${fechaDesde && fechaHasta && fechaDesde !== fechaHasta ? ` y ${fmtCorta(fechaHasta)}` : ''}`
            : busq ? `No se encontraron resultados para "${busquedaHistorial}"` : 'No hay devoluciones en el historial')}
        </p>
      )
    }

    const carpetas = agruparPorAlumno(ordenados)

    return (
      <div className="relative isolate pt-3 flex flex-col gap-3">
        {carpetas.map((g, i) => {
          const abierta = carpetaAbierta === g.key
          const levantada = carpetaHover === g.key || abierta
          const ultima = g.devoluciones[0]
          return (
            <div
              key={g.key}
              onMouseEnter={() => setCarpetaHover(g.key)}
              onMouseLeave={() => setCarpetaHover(null)}
              onClick={() => setCarpetaAbierta(abierta ? null : g.key)}
              className={`relative cursor-pointer select-none transition-transform duration-200 ease-out ${levantada ? '-translate-y-2' : ''}`}
              style={{ zIndex: levantada ? 60 - i : i + 1 }}
            >
              {/* ---- Fondo de la carpeta (tableta) ---- */}
              <div
                className="absolute inset-0 rounded-md"
                style={{
                  background: 'linear-gradient(180deg,#DBD3B7 0%,#BBB88C 100%)',
                  boxShadow: levantada
                    ? '0 22px 34px rgba(7,22,40,.22), inset 0 0 0 1px #637758'
                    : '0 8px 16px rgba(7,22,40,.12), inset 0 0 0 1px #637758',
                }}
              />

              {/* ---- Pestaña de la carpeta (con nombre y DNI) ---- */}
              <div
                className="absolute top-0 left-5 h-[30px] pl-3 pr-5 flex items-center gap-2 z-10 whitespace-nowrap"
                style={{
                  background: abierta
                    ? 'linear-gradient(180deg,#C85956 0%,#AC303C 100%)'
                    : 'linear-gradient(180deg,#DBD3B7 0%,#BBB88C 100%)',
                  clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 100%, 0 100%)',
                  color: abierta ? '#E5DCB7' : '#071628',
                  boxShadow: 'inset 0 1px 0 rgba(229,220,183,.5)',
                }}
              >
                <span>👤</span>
                <span className="text-sm font-semibold">{g.nombre}</span>
                <span className="text-xs opacity-70">DNI {g.dni}</span>
                <span
                  className="ml-1 px-1.5 rounded-full text-[10px] font-bold"
                  style={{
                    background: abierta ? 'rgba(229,220,183,.3)' : '#BBB88C',
                    color: abierta ? '#E5DCB7' : '#071628',
                  }}
                >
                  {g.devoluciones.length}
                </span>
              </div>

              {/* ---- Hojas dentro de la carpeta (se despliegan al abrir) ---- */}
              <div
                className="relative z-10 mx-4 grid transition-[grid-template-rows] duration-300 ease-out"
                style={{ gridTemplateRows: abierta ? '1fr' : '0fr', marginTop: '72px' }}
              >
                <div className="overflow-hidden">
                  <div className="m-3 bg-papel rounded-sm p-4 shadow-[0_1px_3px_rgba(7,22,40,.12)]">
                    <div className="space-y-4">
                      {g.devoluciones.map(p => (
                        <div key={p.id} className="border-l-4 border-rojo2 pl-3">
                          <div className="text-sm font-bold text-tinta">
                            📅 {formatearFechaISO(p.fecha_devolucion || p.fecha_solicitud)}
                            {' · 🕒 '}{p.fecha_hora_devolucion || p.fecha_hora_solicitud}
                            {p.curso ? ` · ${p.curso}` : ''}
                          </div>
                          <ul className="text-sm text-tinta/85 mt-1 space-y-1">
                            {(p.items || []).map((item, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <span className={item.devuelto ? 'line-through text-tinta/60' : ''}>
                                  • {item.cantidad}× {item.nombre}
                                </span>
                              </li>
                            ))}
                          </ul>
                          {p.notas && (() => {
                            const notasLimpias = String(p.notas).replace(/\[EN_TALLER\]/g, '').trim()
                            return notasLimpias ? <p className="text-xs text-tinta/75 italic mt-1">{notasLimpias}</p> : null
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ---- Tapa / panel delantero con corte diagonal ---- */}
              <div
                className="absolute left-0 right-0 top-[26px] h-[46px] z-20 transition-transform duration-300 ease-out"
                style={{
                  background: 'linear-gradient(180deg,#E5DCB7 0%,#DBD3B7 100%)',
                  clipPath: 'polygon(0 0, calc(100% - 44px) 0, 100% 40px, 100% 100%, 0 100%)',
                  boxShadow: abierta ? '0 10px 16px rgba(7,22,40,.14)' : 'none',
                  transform: abierta ? 'translateY(-5px)' : 'none',
                }}
              />

              {/* ---- Texto de la tapa ---- */}
              <div className="absolute left-0 right-0 top-[26px] h-[46px] z-30 flex items-center gap-3 px-5 pr-16 pointer-events-none">
                <span className="text-sm text-[#071628]">
                  📁 {g.devoluciones.length} devolución{g.devoluciones.length > 1 ? 'es' : ''}
                  {ultima && (
                    <span className="text-[#071628]">
                      {' '}· última: {formatearFechaISO(ultima.fecha_devolucion || ultima.fecha_solicitud)}
                      {ultima.fecha_hora_devolucion || ultima.fecha_hora_solicitud ? ` ${ultima.fecha_hora_devolucion || ultima.fecha_hora_solicitud}` : ''}
                    </span>
                  )}
                </span>
                <span className="ml-auto text-xs text-[#071628]">{abierta ? '▲ cerrar' : '▼ abrir'}</span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Portfolio (solo si se abre)
  const vistaPortfolioDia = (cartera) => {
    const pedidosDia = cartera.pedidos
    const pedidosOrdenados = [...pedidosDia].sort((a, b) => {
      const ta = new Date(a.fecha_solicitud || '').getTime()
      const tb = new Date(b.fecha_solicitud || '').getTime()
      return ta - tb
    })
    return (
      <div className="fixed inset-0 bg-verdeoscuro/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
        <div className="bg-papel rounded-xl max-w-4xl w-full max-h-screen overflow-y-auto">
          <div className="border-b border-verde/40 p-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-tinta">📂 {cartera.nombre}</h2>
            <button onClick={() => setPortfolioAbierto(false)} className="text-tinta/75 hover:text-tinta transition">✕</button>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-tinta/85 text-sm">📅 {formatearFechaISO(cartera.fecha)} · N° {cartera.numeracion}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><div className="text-tinta/75">Entregas</div><div className="font-bold text-tinta">{pedidosDia.filter(p => p.estado === 'PRESTADO' || p.estado === 'PENDIENTE').length}</div></div>
              <div><div className="text-tinta/75">Devoluciones</div><div className="font-bold text-tinta">{pedidosDia.filter(p => p.estado === 'DEVUELTO').length}</div></div>
            </div>
            <h3 className="text-tinta font-medium mb-2">Pedidos de la jornada</h3>
            {pedidosOrdenados.length ? (
              pedidosOrdenados.map(p => (
                <div key={p.id} className="bg-papel2 rounded border border-verde/40 p-3 mb-2">
                  <div className="font-medium text-tinta">{p.alumno}</div>
                  <div className="text-xs text-tinta/75">{formatearFechaISO(p.fecha_solicitud)}</div>
                  <p className="text-xs text-tinta/85 mt-1">
                    {p.items.map((item, i) => `${item.cantidad}× ${item.nombre}${i < p.items.length - 1 && ', ' || ''}`).join(', ')}
                  </p>
                  {p.notas && <p className="text-xs text-tinta/75 italic mt-1">{p.notas}</p>}
                </div>
              ))
            ) : (
              <p className="text-tinta/60 text-center py-4">No hay pedidos registrados para este día</p>
            )}
            <div className="mt-4 pt-4 border-t border-verde/40 flex gap-2">
              <button onClick={() => setPortfolioSeleccionado(null)} className="flex-1 bg-verdeoscuro text-papel py-2 rounded text-sm hover:bg-verde transition">← Volver</button>
              <button onClick={() => cambiarVista('historial')} className="flex-1 bg-verdeoscuro text-papel py-2 rounded text-sm hover:bg-verde transition">Historial</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // VISTA "INICIO": sólo lo que se hizo HOY (nada de totales históricos)
  // ============================================================
  const vistaInicio = () => {
    const d = new Date()
    const diaSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][d.getDay()]
    const contadores = [
      { label: 'Solicitados hoy', valor: solicitadosHoy.length, borde: 'border-verde' },
      { label: 'Devueltos hoy', valor: devueltosHoy.length, borde: 'border-rojo2' },
      { label: 'A confirmar', valor: pedidosAConfirmar.length, borde: 'border-rojo2' },
      { label: 'Pendientes', valor: pedidosAPasar.length, borde: 'border-verdeoscuro' },
      { label: 'En taller', valor: pedidosEnTaller.length, borde: 'border-verdeoscuro' },
    ]
    return (
      <div className="pb-10 space-y-8">
        <section>
          <h2 className="text-xl font-bold text-tinta">📅 Hoy · {formatearFechaISO(isoHoy())}</h2>
          <p className="text-sm text-tinta mt-1">{diaSemana} · lo que se hizo hoy en el taller</p>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {contadores.map(c => (
              <div key={c.label} className={`bg-papel2 rounded-lg border border-verde/40 border-l-4 ${c.borde} px-4 py-3`}>
                <div className="text-2xl font-bold text-tinta">{c.valor}</div>
                <div className="text-xs text-tinta/75">{c.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Historial del día: las devoluciones de HOY, agrupadas en carpetas por alumno */}
        <section>
          <h3 className="text-lg font-bold text-tinta">
            📚 Historial de hoy <span className="text-sm font-normal text-tinta/75">({devueltosHoy.length} devoluciones)</span>
          </h3>
          <div className="mt-4">
            {tarjetasHistorial({ lista: devueltosHoy, vacio: 'Hoy no hubo devoluciones' })}
          </div>
        </section>
      </div>
    )
  }

  // Renderizador principal
  const renderVista = () => {
    if (cargando) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-verdeoscuro border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-tinta/75">Cargando pedidos...</p>
          </div>
        </div>
      )
    }
    if (error) {
      return (
        <div className="bg-carpeta/40 border border-rojo2 text-tinta rounded-xl p-4 mb-6 text-center">
          ⚠️ Error cargando pedidos: {error}
          <button onClick={cargar} className="ml-4 text-sm underline hover:no-underline">Reintentar</button>
        </div>
      )
    }
    if (portfolioSeleccionado) {
      return vistaPortfolioDia(portfolioSeleccionado)
    }

    // "Inicio" = sólo lo que se hizo hoy
    if (vista === 'inicio') {
      return vistaInicio()
    }

    // El menú lateral abre una sección por vez (sin deslizar la página).
    const conteoFechas = conteoPorFecha()
    const gruposHistorial = agruparPorAlumno(historialFiltrado())
    return (
      <div className="pb-10">
        {vista === 'pedidos' && (
        <section id="sec-pedidos" className="scroll-mt-24">
          <LibroPedidos pedidos={pedidosAConfirmar} onAccion={accion} />
        </section>
        )}

        {vista === 'pendientes' && (
        <section id="sec-pendientes" className="scroll-mt-24">
          <h2 className="text-xl font-bold text-tinta">⏳ Pendientes</h2>
          <p className="text-sm text-tinta mt-1">Pedidos confirmados para pasar a buscar ({pedidosAPasar.length})</p>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {pedidosAPasar.length ?
              pedidosAPasar.map(p => (
                <PostItPedido
                  key={p.id}
                  pedido={p}
                  onAccion={accion}
                  accion="pasar-a-taller"
                  label="✅ Entregado"
                />
              )) :
              <p className="col-span-full text-center text-base text-tinta py-8">No hay pedidos pendientes</p>}
          </div>
        </section>
        )}

        {vista === 'prestados' && (
        <section id="sec-prestados" className="scroll-mt-24">
          <h2 className="text-xl font-bold text-tinta">🔨 En taller / Prestados</h2>
          <p className="text-sm text-tinta mt-1">({pedidosPrestados.length} en taller)</p>
          <div className="mt-6 space-y-5">
            {tarjetasPrestados || <p className="text-center text-base text-tinta py-8">No hay pedidos en taller</p>}
          </div>
        </section>
        )}

        {vista === 'devueltos' && (
        <section id="sec-devueltos" className="scroll-mt-24">
          <h2 className="text-xl font-bold text-tinta">✅ Devueltos hoy</h2>
          <div className="mt-6">
            <CarpetaDevueltos lista={devueltosHoy} />
          </div>
        </section>
        )}

        {vista === 'historial' && (
        <section id="sec-historial" className="scroll-mt-24">
          <h2 className="text-xl font-bold text-tinta">📚 Historial General</h2>
          <p className="text-sm text-tinta mt-1">
            {hayFiltroFecha
              ? `Mostrando ${historialFiltrado().length} de ${historialTotal.length} devoluciones${etiquetaFiltroFecha ? ` · ${etiquetaFiltroFecha}` : ''}`
              : `Total de devoluciones: ${historialTotal.length}`}
          </p>

          {/* FILTROS DEL HISTORIAL: búsqueda + calendario */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="relative shrink-0">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tinta/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
              <input
                type="text"
                placeholder="Buscar por nombre, DNI, fecha, herramienta..."
                value={busquedaHistorial}
                onChange={(e) => setBusquedaHistorial(e.target.value)}
                className="h-10 w-[300px] rounded-md border border-[#BBB88C] bg-papel pl-9 pr-3 text-sm placeholder:text-[#637758] focus:outline-none focus:ring-2 focus:ring-verdeoscuro transition"
              />
            </div>

            {/* Botón + calendario (por encima de las carpetas: la pila está aislada) */}
            <div className="relative z-[25]" ref={calRef}>
              <button
                onClick={() => setCalAbierto(v => !v)}
                className={`h-10 px-3 flex items-center gap-2 rounded-md border text-sm transition ${
                  hayFiltroFecha
                    ? 'bg-verdeoscuro border-rojo2 text-papel'
                    : 'bg-papel border-[#BBB88C] text-tinta hover:bg-papel2'
                }`}
              >
                <span>📅</span>
                <span className="whitespace-nowrap">{hayFiltroFecha ? etiquetaFiltroFecha : 'Filtrar por fecha'}</span>
                {hayFiltroFecha && (
                  <span
                    onClick={(e) => { e.stopPropagation(); limpiarFechas() }}
                    className="cursor-pointer px-1 rounded hover:bg-papel2"
                    title="Quitar filtro de fecha"
                  >✕</span>
                )}
              </button>

              {calAbierto && (
                <div className="absolute z-50 mt-2 left-0 w-[296px] bg-papel border border-[#BBB88C] rounded-lg shadow-xl p-3 select-none">
                  {/* Modo: un día / rango */}
                  <div className="flex gap-1 mb-2 text-xs">
                    <button
                      onClick={() => { setModoFecha('dia'); setRangoEnCurso(null) }}
                      className={`px-2 py-1 rounded ${modoFecha === 'dia' ? 'bg-verdeoscuro text-papel' : 'bg-papel2 text-tinta hover:bg-carpeta'}`}
                    >Un día</button>
                    <button
                      onClick={() => setModoFecha('rango')}
                      className={`px-2 py-1 rounded ${modoFecha === 'rango' ? 'bg-verdeoscuro text-papel' : 'bg-papel2 text-tinta hover:bg-carpeta'}`}
                    >Rango</button>
                  </div>

                  {/* Navegación de mes */}
                  <div className="flex items-center justify-between mb-2">
                    <button onClick={() => moverMes(-1)} className="w-7 h-7 rounded hover:bg-papel2 text-tinta">‹</button>
                    <span className="text-sm font-semibold text-tinta">{MESES[calMes]} {calAnio}</span>
                    <button onClick={() => moverMes(1)} className="w-7 h-7 rounded hover:bg-papel2 text-tinta">›</button>
                  </div>

                  {/* Encabezados de la semana */}
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {DIAS_SEMANA.map(d => (
                      <div key={d} className="text-center text-[10px] text-tinta/60 font-semibold">{d}</div>
                    ))}
                  </div>

                  {/* Días */}
                  <div className="grid grid-cols-7 gap-1">
                    {celdasDelMes().map((iso, i) => {
                      if (!iso) return <div key={`vacio-${i}`} />
                      const numero = Number(iso.slice(-2))
                      const cant = conteoFechas.get(iso) || 0
                      const enRango = hayFiltroFecha && iso >= (fechaDesde || '0000-01-01') && iso <= (fechaHasta || '9999-12-31')
                      const esHoy = iso === isoHoy()
                      const enCurso = rangoEnCurso && rangoEnCurso.inicio === iso
                      return (
                        <button
                          key={iso}
                          onClick={() => elegirDia(iso)}
                          title={cant ? `${cant} devolución${cant > 1 ? 'es' : ''}` : 'Sin devoluciones'}
                          className={`relative h-8 rounded-md text-xs flex items-center justify-center transition ${
                            enRango || enCurso
                              ? 'bg-verdeoscuro text-papel font-bold'
                              : cant
                                ? 'text-tinta font-semibold hover:bg-papel2'
                                : 'text-tinta/60 hover:bg-papel2'
                          } ${esHoy && !enRango && !enCurso ? 'ring-1 ring-verdeoscuro' : ''}`}
                        >
                          {numero}
                          {cant > 0 && (
                            <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${enRango || enCurso ? 'bg-papel' : 'bg-verdeoscuro'}`} />
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Rangos rápidos */}
                  <div className="mt-3 pt-2 border-t border-[#BBB88C] flex flex-wrap gap-1 text-xs">
                    <button onClick={() => aplicarRangoRapido('Hoy', isoHoy(), isoHoy())} className="px-2 py-1 rounded bg-papel2 text-tinta hover:bg-carpeta">Hoy</button>
                    <button onClick={() => aplicarRangoRapido('Últimos 7 días', isoHaceDias(6), isoHoy())} className="px-2 py-1 rounded bg-papel2 text-tinta hover:bg-carpeta">Últimos 7 días</button>
                    <button onClick={() => aplicarRangoRapido('Últimos 30 días', isoHaceDias(29), isoHoy())} className="px-2 py-1 rounded bg-papel2 text-tinta hover:bg-carpeta">Últimos 30 días</button>
                    <button onClick={() => aplicarRangoRapido('Este mes', isoInicioMes(), isoHoy())} className="px-2 py-1 rounded bg-papel2 text-tinta hover:bg-carpeta">Este mes</button>
                    <button onClick={() => { limpiarFechas(); setCalAbierto(false) }} className="px-2 py-1 rounded bg-papel2 text-tinta hover:bg-carpeta">Todo</button>
                  </div>

                  {modoFecha === 'rango' && rangoEnCurso && (
                    <p className="mt-2 text-[11px] text-tinta/75">Elegí la fecha de fin (inicio: {fmtCorta(rangoEnCurso.inicio)})</p>
                  )}
                </div>
              )}
            </div>

            {(busquedaHistorial || hayFiltroFecha) && (
              <button onClick={limpiarTodoHistorial} className="text-xs text-tinta hover:underline">Limpiar</button>
            )}

            {(busquedaHistorial || hayFiltroFecha) && (
              <span className="text-xs text-tinta/75">
                {gruposHistorial.length} carpeta{gruposHistorial.length === 1 ? '' : 's'} · {historialFiltrado().length} de {historialTotal.length} devoluciones
              </span>
            )}
          </div>

          <div className="mt-6 space-y-5">
            {tarjetasHistorial()}
          </div>
        </section>
        )}
      </div>
    )
  }

  // Menú lateral (estilo foto): Inicio + ítems numerados del 1 al 4,
  // ítem activo en píldora salmón con punto blanco a la derecha
  const menuItems = [
    { id: 'inicio', label: 'Inicio', num: null, icon: '🏠' },
    { id: 'pedidos', label: 'Pedidos', num: pedidosAConfirmar.length, icon: '📦' },
    { id: 'pendientes', label: 'Pendientes', num: pedidosAPasar.length, icon: '⏳' },
    { id: 'prestados', label: 'En taller', num: pedidosEnTaller.length, icon: '🔧' },
    { id: 'devueltos', label: 'Devueltos hoy', num: 3, icon: '↩️' },
    { id: 'historial', label: 'Historial', num: 4, icon: '📚' },
  ]

  // El menú lateral abre la vista de una opción: cambia el contenido en el
  // lugar, sin deslizar la página. "Inicio" muestra el tablero completo.
  const irA = (id) => {
    cambiarVista(id)
    // Sin scroll suave: si el usuario estaba scrolleado, vuelve de golpe al
    // inicio (de una) para que la sección quede a la vista.
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  // Si llegás con ?vista=historial (por ejemplo desde Solicitar), se abre esa
  // vista automáticamente (la vista ya sale del parámetro al montar).

  useEffect(() => {
    setPortfolios(generarPortfolioFechas(pedidos))
  }, [pedidos])

  return (
    <div className="min-h-screen bg-papel">
      {/* ============ CABECERA ============ */}
      <header className="sticky top-0 z-20 bg-papel border-b border-[#BBB88C]">
        <div className="max-w-7xl mx-auto px-8 h-14 flex items-center justify-between">
          <h1 className="text-xl font-bold text-tinta flex items-center gap-2">
            <span>Sistema Pañol</span>
            <span className="text-sm font-normal">• Panel de control</span>
          </h1>
          <div className="hidden sm:flex items-center gap-6 pr-3">
            <div className="relative">
              <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-tinta/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
              </svg>
              <input type="text" placeholder="Buscar por alumno, DNI o herramienta..."
                className="pl-14 pr-4 h-10 w-[230px] rounded-md border border-[#BBB88C] bg-papel text-sm placeholder:text-[#637758] focus:outline-none focus:ring-2 focus:ring-verdeoscuro transition" />
            </div>
            <button title="Filtrar" className="text-tinta/75 hover:text-tinta transition">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18l-7 8v6l-4 2v-8L3 4z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ============ ÁREA PRINCIPAL ============ */}
      <main>
        <div className="max-w-7xl mx-auto lg:flex lg:items-start">
          {/* ============ BARRA LATERAL — MENÚ (según la captura) ============ */}
          <aside className="lg:w-64 shrink-0 sticky top-14 z-10">
            <div className="pt-[81px] pb-8">
              <div className="text-center text-sm font-semibold text-tinta">Menú</div>
              <nav className="mt-2">
                {menuItems.map((item, i) => (
                  <div key={item.id} className={i > 0 ? 'border-t border-[#BBB88C]' : ''}>
                    <button
                      onClick={() => irA(item.id)}
                      className={`w-full h-10 my-0.5 flex items-center gap-2 pl-5 pr-4 rounded-[3px] text-left transition-colors ${vista === item.id ? 'bg-verdeoscuro text-papel' : 'text-tinta hover:bg-papel2'}`}
                    >
                      <span className="w-4 text-center text-base leading-none">{item.icon}</span>
                      <span className="text-base flex-1">{item.label}</span>
                      {vista === item.id ? (
                        <span className="w-6 h-6 rounded-full bg-papel shrink-0" />
                      ) : item.num != null ? (
                        <span className="w-6 text-center text-xs shrink-0">{item.num}</span>
                      ) : (
                        <span className="w-6 shrink-0" />
                      )}
                    </button>
                  </div>
                ))}
              </nav>
            </div>
          </aside>

          {/* ============ ÁREA DE CONTENIDO PRINCIPAL ============ */}
          <div className="flex-1 min-w-0 px-6 pt-[87px] pb-16">
            {renderVista()}
          </div>
        </div>
      </main>
    </div>
  )
}