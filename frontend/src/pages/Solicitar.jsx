import React, { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch, wsNotificacionesUrl } from '../api.js'
import FormularioProfesor from '../components/FormularioProfesor.jsx'
import SelectorHerramientas from '../components/SelectorHerramientas.jsx'

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
  neutral500: 'rgba(7,22,40,0.78)',
  neutral600: '#071628',
  neutral700: '#071628',
  neutral800: '#3E583F',
  neutral900: '#071628',
}

const resumenItems = (items) =>
  (items || []).map((i) => `${i.cantidad}× ${i.nombre}`).join(' · ')

export default function Solicitar() {
  const [curso, setCurso] = useState('')
  const [division, setDivision] = useState('')
  const [conteos, setConteos] = useState({})
  const [notas, setNotas] = useState('')
  const [msg, setMsg] = useState(null)
  const [alertaStock, setAlertaStock] = useState(false)
  const [notificaciones, setNotificaciones] = useState([])
  const [permisoAvisos, setPermisoAvisos] = useState(() => {
    try {
      return typeof Notification === 'undefined' ? 'no-soportado' : Notification.permission
    } catch (e) {
      return 'no-soportado'
    }
  })

  const refAudio = useRef(null)
  const refNotiIds = useRef(new Set())

  const cerrarAlerta = () => setAlertaStock(false)

  const sonar = useCallback(() => {
    try {
      if (!refAudio.current || refAudio.current.state === 'closed') {
        refAudio.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      const ctx = refAudio.current
      if (ctx.state === 'suspended') ctx.resume()

      const hacerBeep = (frecuencia, inicio, duracion) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = frecuencia
        gain.gain.setValueAtTime(0, ctx.currentTime + inicio)
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + inicio + 0.02)
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + inicio + duracion)
        osc.start(ctx.currentTime + inicio)
        osc.stop(ctx.currentTime + inicio + duracion + 0.02)
      }
      hacerBeep(880, 0, 0.16)
      hacerBeep(1175, 0.2, 0.2)
    } catch (e) {}
  }, [])

  // Los navegadores solo permiten reproducir audio después de una interacción.
  useEffect(() => {
    const desbloquear = () => {
      try {
        if (!refAudio.current || refAudio.current.state === 'closed') {
          refAudio.current = new (window.AudioContext || window.webkitAudioContext)()
        }
        if (refAudio.current.state === 'suspended') refAudio.current.resume()
      } catch (e) {}
    }
    window.addEventListener('pointerdown', desbloquear, { once: true })
    window.addEventListener('keydown', desbloquear, { once: true })
    return () => {
      window.removeEventListener('pointerdown', desbloquear)
      window.removeEventListener('keydown', desbloquear)
    }
  }, [])

  const mostrarNotificacion = useCallback((n, opciones = {}) => {
    if (!n || n.id == null) return
    const { conSonido = true, enNavegador = true } = opciones
    if (refNotiIds.current.has(n.id)) return
    refNotiIds.current.add(n.id)

    setNotificaciones((prev) => [n, ...prev.filter((x) => x.id !== n.id)])
    if (conSonido) sonar()

    try {
      if (enNavegador && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const detalle = resumenItems(n.items) || n.mensaje
        const aviso = new Notification('🔔 Pedido listo para retirar', {
          body: `Pedido #${n.pedido_id}${n.curso ? ` · ${n.curso}` : ''}\n${detalle}`,
          tag: `paol-pedido-${n.pedido_id}`,
        })
        aviso.onclick = () => {
          window.focus()
          aviso.close()
        }
      }
    } catch (e) {}
  }, [sonar])

  const cargarNotificaciones = useCallback(async () => {
    try {
      const res = await apiFetch('/api/mis-notificaciones')
      if (!res.ok) return
      const lista = await res.json()
      lista.forEach((n) => mostrarNotificacion(n, { conSonido: false, enNavegador: false }))
    } catch (e) {}
  }, [mostrarNotificacion])

  // Al entrar, recuperamos avisos sin leer (por si el profesor no estaba conectado).
  useEffect(() => {
    cargarNotificaciones()
  }, [cargarNotificaciones])

  // Avisos en vivo + consulta periódica de respaldo.
  useEffect(() => {
    let ws = null
    let cerrado = false
    let timerReconexion = null

    const conectar = () => {
      if (cerrado) return
      try {
        ws = new WebSocket(wsNotificacionesUrl())
        ws.onmessage = (e) => {
          try {
            mostrarNotificacion(JSON.parse(e.data))
          } catch (err) {}
        }
        ws.onclose = () => {
          if (!cerrado) timerReconexion = setTimeout(conectar, 3000)
        }
      } catch (e) {
        if (!cerrado) timerReconexion = setTimeout(conectar, 3000)
      }
    }

    conectar()
    const intervalo = setInterval(cargarNotificaciones, 20000)

    return () => {
      cerrado = true
      clearInterval(intervalo)
      if (timerReconexion) clearTimeout(timerReconexion)
      if (ws) {
        ws.onclose = null
        ws.close()
      }
    }
  }, [cargarNotificaciones, mostrarNotificacion])

  const marcarLeida = async (n) => {
    try {
      await apiFetch(`/api/notificaciones/${n.id}/leer`, { method: 'POST' })
    } catch (e) {}
    refNotiIds.current.delete(n.id)
    setNotificaciones((prev) => prev.filter((x) => x.id !== n.id))
  }

  const marcarTodas = async () => {
    try {
      await apiFetch('/api/notificaciones/leer-todas', { method: 'POST' })
    } catch (e) {}
    refNotiIds.current.clear()
    setNotificaciones([])
  }

  const activarAvisos = async () => {
    if (typeof Notification === 'undefined') return
    try {
      const permiso = await Notification.requestPermission()
      setPermisoAvisos(permiso)
    } catch (e) {}
  }

  const enviar = async () => {
    const items = Object.entries(conteos)
      .filter(([, v]) => v.cantidad > 0)
      .map(([, v]) => ({ nombre: v.nombre, cantidad: v.cantidad }))

    if (!curso || !division) {
      setMsg({ texto: '⚠️ Elegí Curso y División', clase: `bg-[${C.glendale}20] text-[${C.opulent}] border-l-4 border-[${C.rare}]` }); return
    }
    if (items.length === 0 && !notas.trim()) {
      setMsg({ texto: '⚠️ Agregá al menos un ítem', clase: `bg-[${C.glendale}20] text-[${C.opulent}] border-l-4 border-[${C.rare}]` }); return
    }

    try {
      const res = await apiFetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          curso,
          division,
          items,
          notas: notas.trim() || null,
        }),
      })
      if (res.ok) {
        setMsg({ texto: '✅ ¡Pedido enviado! Te avisamos cuando esté listo para retirar.', clase: `bg-[${C.glendale}] text-[${C.opulent}]` })
        setConteos({})
        setNotas('')
        setTimeout(() => setMsg(null), 6000)
      } else {
        const err = await res.json().catch(() => ({}))
        const detalle = err.detail ?? ''
        if (res.status === 400 && String(detalle).toLowerCase().includes('stock')) {
          setAlertaStock(true)
        } else {
          setMsg({ texto: `❌ Error ${res.status}: ${JSON.stringify(detalle)}`, clase: `bg-[${C.glendale}20] text-[${C.opulent}] border-l-4 border-[${C.rare}]` })
        }
      }
    } catch (e) {
      setMsg({ texto: '❌ No se pudo conectar con el pañol.', clase: `bg-[${C.glendale}20] text-[${C.opulent}] border-l-4 border-[${C.rare}]` })
    }
  }

  const puedePedirAvisos = permisoAvisos === 'default'

  return (
    <div className="max-w-md mx-auto p-4 pb-32">
      <div className="flex items-start justify-between gap-3 mb-4">
        <h1 className={`text-2xl font-bold text-[${C.opulent}]`}>🔧 Solicitar Material</h1>
        {puedePedirAvisos && (
          <button onClick={activarAvisos}
            className={`text-xs font-semibold text-[${C.freshmint}] border border-[${C.freshmint}] rounded-lg px-2 py-1.5 whitespace-nowrap`}>
            🔔 Activar avisos
          </button>
        )}
      </div>

      <FormularioProfesor
        curso={curso}
        division={division}
        setCurso={setCurso}
        setDivision={setDivision}
      />
      <h2 className={`text-lg font-bold text-[${C.opulent}] mb-2`}>Herramientas</h2>
      <SelectorHerramientas conteos={conteos} setConteos={setConteos} />
      <label className={`block text-sm font-semibold text-[${C.opulent}] mb-2`}>Otros materiales / Insumos</label>
      <textarea rows="2" value={notas} onChange={e => setNotas(e.target.value)}
        className={`w-full border border-[${C.neutral300}] rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-[${C.freshmint}]`} placeholder="Ej: 2m de cable 1.5..." />
      <button onClick={enviar}
        className={`w-full bg-[${C.freshmint}] text-papel text-xl font-bold py-4 rounded-xl shadow active:scale-95 transition hover:bg-[${C.milpa}]`}>
        📦 Solicitar Material
      </button>
      {msg && <div className={`mt-4 p-4 rounded-xl text-center font-bold ${msg.clase}`}>{msg.texto}</div>}

      {/* Avisos de "pedido listo para retirar" */}
      {notificaciones.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 pointer-events-none">
          <div className="max-w-md mx-auto space-y-2 pointer-events-auto max-h-[70vh] overflow-y-auto">
            {notificaciones.map((n) => (
              <div key={n.id} className="bg-papel rounded-xl shadow-2xl border-l-4 border-verdeoscuro p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none">🔔</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-tinta leading-tight">Pedido listo para retirar</p>
                    <p className="text-sm text-tinta/75 mt-0.5">
                      Pedido #{n.pedido_id}{n.curso ? ` · ${n.curso}` : ''}
                    </p>
                    {n.items?.length > 0 && (
                      <p className="text-xs text-tinta/60 mt-1">{resumenItems(n.items)}</p>
                    )}
                    <button onClick={() => marcarLeida(n)}
                      className="mt-3 w-full bg-verdeoscuro text-papel font-bold py-2 rounded-lg text-sm hover:bg-verde transition">
                      ✅ Entendido, ya lo retiro
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {notificaciones.length > 1 && (
              <button onClick={marcarTodas}
                className="w-full text-xs font-semibold text-tinta/70 underline">
                Marcar todos como leídos
              </button>
            )}
          </div>
        </div>
      )}

      {alertaStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-verdeoscuro/70" onClick={cerrarAlerta}>
          <div className="bg-papel2 rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl text-center" onClick={e => e.stopPropagation()}>
            <div className="text-6xl mb-4">📦</div>
            <h2 className={`text-2xl font-bold text-[${C.opulent}] mb-2`}>Material no disponible</h2>
            <p className={`text-lg text-[${C.opulent}] mb-6`}>El material no está en stock</p>
            <p className={`text-sm text-[${C.neutral500}] mb-6`}>Ya fue solicitado por otro profesor o no hay unidades disponibles.</p>
            <button onClick={cerrarAlerta} className={`w-full bg-[${C.freshmint}] text-papel font-bold py-3 rounded-xl hover:bg-[${C.milpa}] transition`}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
