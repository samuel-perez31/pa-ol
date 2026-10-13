import React, { useEffect, useRef, useState } from 'react'
import { API, WS_URL } from '../api.js'
import TableroKanban from '../components/TableroKanban.jsx'
import BarraFiltros from '../components/BarraFiltros.jsx'

function sonar() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.value = 880; g.gain.value = 0.15
    o.start(); o.stop(ctx.currentTime + 0.2)
  } catch (e) {}
}

export default function Tablero() {
  const [pedidos, setPedidos] = useState([])
  const [q, setQ] = useState('')
  const [conectado, setConectado] = useState(false)
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null)
  const [fechasDisponibles, setFechasDisponibles] = useState([])
  const [dia, setDia] = useState('')
  const [mes, setMes] = useState('')
  const [anio, setAnio] = useState('')
  const qRef = useRef(q)
  qRef.current = q

  const cargar = async () => {
    try {
      const fechaParam = fechaSeleccionada ? `&fecha=${fechaSeleccionada}` : ''
      const res = await fetch(`${API}/api/pedidos?q=${encodeURIComponent(qRef.current)}${fechaParam}`)
      setPedidos(await res.json())
    } catch (e) {}
  }

  const cargarFechas = async () => {
    try {
      const res = await fetch(`${API}/api/pedidos/fechas`)
      setFechasDisponibles(await res.json())
    } catch (e) {}
  }

  useEffect(() => { 
    cargar() 
    cargarFechas()
  }, [q, fechaSeleccionada])

  useEffect(() => {
    let ws
    const conectar = () => {
      ws = new WebSocket(WS_URL)
      ws.onopen = () => setConectado(true)
      ws.onmessage = () => { sonar(); cargar() }
      ws.onclose = () => { setConectado(false); setTimeout(conectar, 2000) }
    }
    conectar()
    const interval = setInterval(cargar, 4000)
    return () => { clearInterval(interval); ws && ws.close() }
  }, [])

  const accion = async (id, tipo) => {
    if (tipo === 'refresh') {
      cargar()
      return
    }
    await fetch(`${API}/api/pedidos/${id}/${tipo}`, { method: 'POST' })
    cargar()
  }

  const formatearFecha = (fechaISO) => {
    if (!fechaISO) return 'Hoy'
    const [a, m, d] = fechaISO.split('-')
    return `${d}/${m}/${a}`
  }

  const handleDiaChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2)
    setDia(val)
  }
  const handleMesChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2)
    setMes(val)
  }
  const handleAnioChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4)
    setAnio(val)
  }
  const aplicarFecha = () => {
    if (dia && mes && anio) {
      const d = dia.padStart(2, '0')
      const m = mes.padStart(2, '0')
      setFechaSeleccionada(`${anio}-${m}-${d}`)
    }
  }
  const limpiarFecha = () => {
    setDia('')
    setMes('')
    setAnio('')
    setFechaSeleccionada(null)
  }

  const handleFechaSelect = (e) => {
    const val = e.target.value
    setFechaSeleccionada(val || null)
    if (val) {
      const [a, m, d] = val.split('-')
      setAnio(a)
      setMes(m)
      setDia(d)
    } else {
      setDia('')
      setMes('')
      setAnio('')
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-3xl font-bold text-primarydark">📋 Tablero del Pañol</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <BarraFiltros q={q} setQ={setQ} />
          
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-neutral200 shadow-sm">
            <label className="text-sm font-medium text-primary">📅 Fecha:</label>
            
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={dia}
                onChange={handleDiaChange}
                placeholder="DD"
                maxLength={2}
                className="w-14 border border-neutral300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                title="Día"
              />
              <span className="text-neutral400">/</span>
              <input
                type="text"
                value={mes}
                onChange={handleMesChange}
                placeholder="MM"
                maxLength={2}
                className="w-14 border border-neutral300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                title="Mes"
              />
              <span className="text-neutral400">/</span>
              <input
                type="text"
                value={anio}
                onChange={handleAnioChange}
                placeholder="AAAA"
                maxLength={4}
                className="w-20 border border-neutral300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
                title="Año"
              />
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={aplicarFecha}
                disabled={!dia || !mes || !anio}
                className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-lg hover:bg-primarydark disabled:bg-neutral300 disabled:cursor-not-allowed transition"
              >
                Ir
              </button>
              {fechaSeleccionada && (
                <button 
                  onClick={limpiarFecha}
                  className="text-xs text-danger hover:underline"
                  title="Volver a hoy"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="ml-2 flex items-center gap-2">
              <select 
                value={fechaSeleccionada || ''} 
                onChange={handleFechaSelect}
                className="border border-neutral300 rounded-lg px-3 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary min-w-[140px]"
                title="Seleccionar día con pedidos"
              >
                <option value="">Historial...</option>
                {fechasDisponibles.map(f => (
                  <option key={f} value={f}>{formatearFecha(f)}</option>
                ))}
              </select>
            </div>
          </div>
          
          <span className={`text-xs px-2 py-1 rounded ${conectado ? 'bg-successlight text-success' : 'bg-warninglight text-dangerbright'}`}>
            {conectado ? '🟢 en vivo' : '🔴 reconectando…'}
          </span>
        </div>
      </div>
      <TableroKanban pedidos={pedidos} onAccion={accion} fechaSeleccionada={fechaSeleccionada} />
    </div>
  )
}
