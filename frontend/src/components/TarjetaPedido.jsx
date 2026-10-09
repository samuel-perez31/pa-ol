import React, { useState } from 'react'
import { API } from '../api.js'

export default function TarjetaPedido({ pedido, onAccion }) {
  const esPendiente = pedido.estado === 'PENDIENTE'
  const esPrestado = pedido.estado === 'PRESTADO'
  const borde = esPendiente ? 'border-amber-400' : esPrestado ? 'border-blue-400' : 'border-green-400'
  const [cargandoDevolucion, setCargandoDevolucion] = useState(false)

  const toggleItem = async (nombre, cantidad) => {
    try {
      await fetch(`${API}/api/pedidos/${pedido.id}/toggle-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, cantidad })
      })
      onAccion(pedido.id, 'refresh')
    } catch (e) {}
  }

  const cargarDevolucion = async () => {
    setCargandoDevolucion(true)
    try {
      const res = await fetch(`${API}/api/pedidos/${pedido.id}/cargar-devolucion`, {
        method: 'POST'
      })
      const data = await res.json()
      
      // Mostrar feedback visual según tipo de devolución
      const mensajes = {
        completa: '✅ Devolución COMPLETA - Todos los items devueltos (Stock actualizado)',
        parcial: '⚠️ Devolución PARCIAL - Algunos items faltan por devolver',
        ninguno: '❌ Devolución NINGUNA - No se devolvió ningún item'
      }
      const colores = {
        completa: 'bg-green-100 text-green-800 border-green-300',
        parcial: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        ninguno: 'bg-red-100 text-red-800 border-red-300'
      }
      
      alert(`${mensajes[data.tipo_devolucion]}\n\nItems devueltos: ${data.items_devueltos} de ${data.total_items}`)
      onAccion(pedido.id, 'refresh')
    } catch (e) {
      alert('Error al procesar la devolución')
    } finally {
      setCargandoDevolucion(false)
    }
  }

  return (
    <div className={`bg-white rounded-xl p-4 shadow border-l-4 ${borde} ${!esPendiente && !esPrestado ? 'opacity-80' : ''}`}>
      <div className="font-bold">{pedido.alumno} <span className="text-xs text-slate-400">DNI {pedido.dni}</span></div>
      <div className="text-xs text-slate-500">{pedido.curso} · 🕒 {esPrestado ? `Salió ${pedido.fecha_hora_entrega}` : esPendiente ? pedido.fecha_hora_solicitud : `Devuelto ${pedido.fecha_hora_devolucion}`}</div>
      
      <ul className="text-sm text-slate-700 mt-1 space-y-1">
        {pedido.items.map((item, idx) => (
          <li key={idx} className="flex items-center gap-2">
            <span className={item.devuelto ? 'line-through text-slate-400' : ''}>
              • {item.cantidad}× {item.nombre}
            </span>
            {esPrestado && (
              <button
                onClick={() => toggleItem(item.nombre, item.cantidad)}
                className={`ml-2 px-2 py-0.5 text-xs rounded ${item.devuelto ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                title={item.devuelto ? 'Destachar (marcar como no devuelto)' : 'Tachar (marcar como devuelto)'}
              >
                {item.devuelto ? '✓ Devuelto' : '✎ Tachar'}
              </button>
            )}
          </li>
        ))}
      </ul>
      
      {pedido.notas && <p className="text-xs text-slate-500 italic mt-1">{pedido.notas}</p>}
      
      {esPendiente && (
        <button onClick={() => onAccion(pedido.id, 'entregar')}
          className="mt-3 w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-lg">
          ✔ Confirmar Entrega
        </button>
      )}
      
      {esPrestado && (
        <div className="mt-3 space-y-2">
          <button onClick={() => onAccion(pedido.id, 'devolver')}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg">
            ↩ Marcar como Devuelto (Completo)
          </button>
          
          <button 
            onClick={cargarDevolucion}
            disabled={cargandoDevolucion}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2"
          >
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
