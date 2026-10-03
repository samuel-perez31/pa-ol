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
  const qRef = useRef(q)
  qRef.current = q

  const cargar = async () => {
    try {
      const res = await fetch(`${API}/api/pedidos?q=${encodeURIComponent(qRef.current)}`)
      setPedidos(await res.json())
    } catch (e) {}
  }

  useEffect(() => { cargar() }, [q])

  useEffect(() => {
    let ws
    const conectar = () => {
      ws = new WebSocket(WS_URL)
      ws.onopen = () => setConectado(true)
      ws.onmessage = () => { sonar(); cargar() }
      ws.onclose = () => { setConectado(false); setTimeout(conectar, 2000) }
    }
    conectar()
    const interval = setInterval(cargar, 4000) // fallback polling
    return () => { clearInterval(interval); ws && ws.close() }
  }, [])

  const accion = async (id, tipo) => {
    await fetch(`${API}/api/pedidos/${id}/${tipo}`, { method: 'POST' })
    cargar()
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-3xl font-bold text-slate-800">📋 Tablero del Pañol</h1>
        <div className="flex items-center gap-3">
          <BarraFiltros q={q} setQ={setQ} />
          <span className={`text-xs px-2 py-1 rounded ${conectado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {conectado ? '🟢 en vivo' : '🔴 reconectando…'}
          </span>
        </div>
      </div>
      <TableroKanban pedidos={pedidos} onAccion={accion} />
    </div>
  )
}
