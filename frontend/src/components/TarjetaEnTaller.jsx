import React, { useState } from 'react'
import { apiFetch } from '../api.js'
import './TarjetaEnTaller.css'

const fmtFecha = (f) => {
  if (!f) return ''
  const s = String(f)
  const fd = s.includes('T') ? s.split('T')[0] : s.includes(' ') ? s.split(' ')[0] : s
  const p = fd.split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : fd
}

// Inclinaciones suaves para que ninguna hoja quede perfectamente alineada.
const ROTACIONES = [-0.5, 0.28, -0.18, 0.44, -0.32, 0.14]
const rotacion = (id) => ROTACIONES[Math.abs(Number(id) || 0) % ROTACIONES.length]

export default function TarjetaEnTaller({ pedido, onAccion }) {
  const [cargandoDevolucion, setCargandoDevolucion] = useState(false)

  const toggleItem = async (nombre, cantidad) => {
    try {
      await apiFetch(`/api/pedidos/${pedido.id}/toggle-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, cantidad }),
      })
      onAccion(pedido.id, 'refresh')
    } catch (e) {}
  }

  const cargarDevolucion = async () => {
    setCargandoDevolucion(true)
    try {
      const res = await apiFetch(`/api/pedidos/${pedido.id}/cargar-devolucion`, { method: 'POST' })
      const data = await res.json()
      const mensajes = {
        completa: '✅ Devolución COMPLETA - Todos los items devueltos (Stock actualizado)',
        parcial: '⚠️ Devolución PARCIAL - Algunos items faltan por devolver',
        ninguno: '❌ Devolución NINGUNA - No se devolvió ningún item',
      }
      alert(`${mensajes[data.tipo_devolucion]}\n\nItems devueltos: ${data.items_devueltos} de ${data.total_items}`)
      onAccion(pedido.id, 'refresh')
    } catch (e) {
      alert('Error al procesar la devolución')
    } finally {
      setCargandoDevolucion(false)
    }
  }

  const fecha = pedido.fecha_entrega || pedido.fecha_solicitud
  const hora = pedido.fecha_hora_entrega || pedido.fecha_hora_solicitud || ''
  const notas = String(pedido.notas || '').replace(/\[EN_TALLER\]/g, '').trim()

  return (
    <article
      className="hoja-taller-wrap"
      style={{ '--hoja-rot': `${rotacion(pedido.id)}deg` }}
    >
      <div className="hoja-taller">
        <div className="hoja-taller-contenido flex items-start justify-between gap-5 pb-2.5 pl-8 pr-5 pt-3.5 sm:pl-10">
          {/* ---------- Izquierda: título + fecha/curso + profesor ---------- */}
          <div className="min-w-0 flex-1">
            <div className="text-base font-bold leading-tight" style={{ color: '#2f2114' }}>
              Pedido
            </div>
            <div className="mt-1 text-xs" style={{ color: '#614a31' }}>
              {fmtFecha(fecha)}{pedido.curso ? ` · ${pedido.curso}` : ''}
            </div>
            <div className="mt-1 text-xs" style={{ color: '#5b452d' }}>
              👤 {pedido.profesor || pedido.alumno}
              {pedido.dni ? ` · DNI ${pedido.dni}` : pedido.usuario ? ` · @${pedido.usuario}` : ''}
              {hora ? ` · ${hora}` : ''}
            </div>
            {notas && (
              <p className="mt-1 text-xs italic" style={{ color: '#5b452d' }}>
                {notas}
              </p>
            )}
          </div>

          {/* ---------- Derecha: lista de materiales ---------- */}
          <ul className="shrink-0 text-right text-sm" style={{ color: '#2f2114' }}>
            {pedido.items.map((item, idx) => (
              <li key={idx} className="flex items-center justify-end gap-2 py-0.5">
                <button
                  type="button"
                  onClick={() => toggleItem(item.nombre, item.cantidad)}
                  className={`hoja-taller-check ${item.devuelto ? 'hoja-taller-check-hecho' : ''}`}
                  title={item.devuelto ? 'Destachar (marcar como no devuelto)' : 'Tachar (marcar como devuelto)'}
                  aria-label={item.devuelto ? `Destachar ${item.nombre}` : `Tachar ${item.nombre}`}
                >
                  {item.devuelto ? '✓' : '✎'}
                </button>
                <span
                  className={item.devuelto ? 'hoja-taller-item-devuelto' : ''}
                  style={item.devuelto ? undefined : { color: '#2f2114' }}
                >
                  {item.cantidad}× {item.nombre}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="hoja-taller-contenido mt-1 flex flex-col gap-2 pb-3.5 pl-8 pr-5 sm:flex-row sm:pl-10">
          <button
            onClick={() => onAccion(pedido.id, 'devolver')}
            className="hoja-taller-btn hoja-taller-btn-primario flex-1"
          >
            ↩ Marcar como Devuelto (Completo)
          </button>
          <button
            onClick={cargarDevolucion}
            disabled={cargandoDevolucion}
            className="hoja-taller-btn hoja-taller-btn-secundario flex-1"
          >
            {cargandoDevolucion ? 'Procesando…' : '↺ Cargar Devolución'}
          </button>
        </div>
      </div>
    </article>
  )
}
