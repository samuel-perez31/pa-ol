import React from 'react'
import { API } from '../api.js'

export default function TarjetaPedido({ pedido, onAccion }) {
  const esPendiente = pedido.estado === 'PENDIENTE'
  const esPrestado = pedido.estado === 'PRESTADO'
  const borde = esPendiente ? 'border-amber-400' : esPrestado ? 'border-blue-400' : 'border-green-400'

  return (
    <div className={`bg-white rounded-xl p-4 shadow border-l-4 ${borde} ${!esPendiente && !esPrestado ? 'opacity-80' : ''}`}>
      <div className="font-bold">{pedido.alumno} <span className="text-xs text-slate-400">DNI {pedido.dni}</span></div>
      <div className="text-xs text-slate-500">{pedido.curso} · 🕒 {esPrestado ? `Salió ${pedido.fecha_hora_entrega}` : esPendiente ? pedido.fecha_hora_solicitud : `Devuelto ${pedido.fecha_hora_devolucion}`}</div>
      <ul className="text-sm text-slate-700 mt-1">
        {pedido.items.map((i, idx) => <li key={idx}>• {i.cantidad}× {i.nombre}</li>)}
      </ul>
      {pedido.notas && <p className="text-xs text-slate-500 italic mt-1">{pedido.notas}</p>}
      {esPendiente && (
        <button onClick={() => onAccion(pedido.id, 'entregar')}
          className="mt-3 w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-lg">
          ✔ Confirmar Entrega
        </button>
      )}
      {esPrestado && (
        <button onClick={() => onAccion(pedido.id, 'devolver')}
          className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg">
          ↩ Marcar como Devuelto
        </button>
      )}
    </div>
  )
}
