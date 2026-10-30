import React, { useState } from 'react'
import { API } from '../api.js'

const C = {
  milpa: '#637758',
  freshmint: '#3E583F',
  opulent: '#071628',
  glendale: '#BBB88C',
  tandoori: '#AC303C',
  rare: '#840D27',
  neutral100: '#DBD3B7',
  neutral200: '#BBB88C',
  neutral300: '#637758',
  neutral400: 'rgba(7,22,40,0.64)',
  neutral500: 'rgba(7,22,40,0.78)',
  neutral600: 'rgba(7,22,40,0.9)',
}

// "2026-10-21T08:15:49" -> "21/10/2026"
const fmtFecha = (f) => {
  if (!f) return ''
  const s = String(f)
  const fd = s.includes('T') ? s.split('T')[0] : s.includes(' ') ? s.split(' ')[0] : s
  const p = fd.split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : fd
}

export default function TarjetaPedido({ pedido, onAccion, modoPedidos, modoPasarATaller }) {
  const esPendiente = pedido.estado === 'PENDIENTE'
  const esPrestado = pedido.estado === 'PRESTADO'
  const esDevuelto = pedido.estado === 'DEVUELTO'

  let borde = esPendiente ? `border-[${C.tandoori}]` : esPrestado ? `border-[${C.freshmint}]` : `border-[${C.milpa}]`
  let bgColor = ''

  if (esDevuelto && pedido.notas) {
    if (pedido.notas.includes('🟢')) { borde = `border-[${C.milpa}]`; bgColor = `bg-[${C.glendale}]` }
    else if (pedido.notas.includes('🟡')) { borde = `border-[${C.tandoori}]`; bgColor = `bg-[${C.glendale}20]` }
    else if (pedido.notas.includes('🔴')) { borde = `border-[${C.rare}]`; bgColor = `bg-[${C.glendale}20]` }
  }

  const [cargandoDevolucion, setCargandoDevolucion] = useState(false)

  const toggleItem = async (nombre, cantidad) => {
    try {
      await fetch(`${API}/api/pedidos/${pedido.id}/toggle-item`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, cantidad })
      })
      onAccion(pedido.id, 'refresh')
    } catch (e) {}
  }

  const cargarDevolucion = async () => {
    setCargandoDevolucion(true)
    try {
      const res = await fetch(`${API}/api/pedidos/${pedido.id}/cargar-devolucion`, { method: 'POST' })
      const data = await res.json()
      const mensajes = {
        completa: '✅ Devolución COMPLETA - Todos los items devueltos (Stock actualizado)',
        parcial: '⚠️ Devolución PARCIAL - Algunos items faltan por devolver',
        ninguno: '❌ Devolución NINGUNA - No se devolvió ningún item'
      }
      alert(`${mensajes[data.tipo_devolucion]}\n\nItems devueltos: ${data.items_devueltos} de ${data.total_items}`)
      onAccion(pedido.id, 'refresh')
    } catch (e) { alert('Error al procesar la devolución') }
    finally { setCargandoDevolucion(false) }
  }

  // Fecha y hora según el estado del pedido
  const fecha = esDevuelto
    ? (pedido.fecha_devolucion || pedido.fecha_solicitud)
    : esPrestado
      ? (pedido.fecha_entrega || pedido.fecha_solicitud)
      : pedido.fecha_solicitud
  const hora = esDevuelto
    ? pedido.fecha_hora_devolucion
    : esPrestado
      ? pedido.fecha_hora_entrega
      : pedido.fecha_hora_solicitud

  return (
    <div className={`bg-papel2 rounded-xl shadow border-l-4 ${borde} ${bgColor} ${!esPendiente && !esPrestado && !esDevuelto ? 'opacity-80' : ''}`}>
      <div className="flex items-start justify-between gap-6 px-4 pt-4">
        {/* ---------- Izquierda: título + fecha/curso + alumno ---------- */}
        <div className="min-w-0 flex-1">
          <div className={`font-bold text-base leading-tight`} style={{ color: C.opulent }}>Pedido</div>
          <div className="text-xs mt-1" style={{ color: C.neutral500 }}>
            {fmtFecha(fecha)}{pedido.curso ? ` · ${pedido.curso}` : ''}
          </div>
          <div className="text-xs mt-1" style={{ color: C.neutral400 }}>
            👤 {pedido.alumno} · DNI {pedido.dni}{hora ? ` · ${hora}` : ''}
          </div>
          {pedido.notas && (() => {
            const notasLimpias = String(pedido.notas).replace(/\[EN_TALLER\]/g, '').trim()
            return notasLimpias ? (
              <p className="text-xs italic mt-1" style={{ color: C.neutral500 }}>{notasLimpias}</p>
            ) : null
          })()}
        </div>

        {/* ---------- Derecha: lista de materiales ---------- */}
        <ul className="text-sm text-right shrink-0" style={{ color: C.opulent }}>
          {pedido.items.map((item, idx) => (
            <li key={idx} className="flex items-center justify-end gap-2 py-0.5">
              {esPrestado && (
                <button onClick={() => toggleItem(item.nombre, item.cantidad)}
                  className={`w-6 h-6 rounded text-xs shrink-0 ${item.devuelto ? `bg-[${C.glendale}] text-[${C.opulent}]` : `bg-[${C.neutral100}] text-[${C.neutral600}] hover:bg-[${C.neutral200}]`}`}
                  title={item.devuelto ? 'Destachar (marcar como no devuelto)' : 'Tachar (marcar como devuelto)'}>
                  {item.devuelto ? '✓' : '✎'}
                </button>
              )}
              <span className={item.devuelto ? `line-through` : ''} style={item.devuelto ? { color: C.neutral400 } : undefined}>
                {item.cantidad}× {item.nombre}
              </span>
            </li>
          ))}
        </ul>
      </div>

        {esPendiente && (
          <button onClick={() => onAccion(pedido.id, 'entregar')} className={`mt-3 w-full bg-[${C.milpa}] hover:bg-[${C.freshmint}] text-papel font-bold py-2 rounded-b-xl transition`}>
            {modoPedidos ? '✔ Confirmar pedido' : '✔ Confirmar Entrega'}
          </button>
        )}

        {modoPasarATaller && esPrestado && !esDevuelto && (
          <button onClick={() => onAccion(pedido.id, 'pasar-a-taller')} className={`mt-3 w-full bg-[${C.freshmint}] hover:bg-[${C.milpa}] text-papel font-bold py-2 rounded-b-xl transition`}>
            ✅ Entregado
          </button>
        )}

      {!modoPasarATaller && esPrestado && !esDevuelto && (
        <div className="mt-3 space-y-2 px-4 pb-4">
          <button onClick={() => onAccion(pedido.id, 'devolver')} className={`w-full bg-[${C.milpa}] hover:bg-[${C.freshmint}] text-papel font-bold py-2 rounded-lg transition`}>
            ↩ Marcar como Devuelto (Completo)
          </button>
          <button onClick={cargarDevolucion} disabled={cargandoDevolucion}
            className={`w-full bg-[${C.freshmint}] hover:bg-[${C.milpa}] text-papel font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition disabled:bg-[${C.neutral300}] disabled:cursor-not-allowed`}>
            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{display: cargandoDevolucion ? 'block' : 'none'}}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            📦 Cargar Devolución
          </button>
        </div>
      )}
    </div>
  )
}
