import React from 'react'
import TarjetaPedido from './TarjetaPedido.jsx'

export default function TableroKanban({ pedidos, onAccion, fechaSeleccionada }) {
  const pendientes = pedidos.filter(p => p.estado === 'PENDIENTE')
  const prestados = pedidos.filter(p => p.estado === 'PRESTADO')
  const devueltos = pedidos.filter(p => p.estado === 'DEVUELTO')

  const formatearFecha = (fechaISO) => {
    if (!fechaISO) return 'Hoy'
    const [a, m, d] = fechaISO.split('-')
    return `${d}/${m}/${a}`
  }

  const Columna = ({ titulo, color, items }) => (
    <section>
      <h2 className={`text-lg font-bold mb-2 ${color}`}>{titulo} ({items.length})</h2>
      <div className="space-y-3">
        {items.length
          ? items.map(p => <TarjetaPedido key={p.id} pedido={p} onAccion={onAccion} />)
          : <p className="text-neutral400 text-sm">Sin pedidos</p>}
      </div>
    </section>
  )

  const tituloDevueltos = fechaSeleccionada ? `✅ Devueltos ${formatearFecha(fechaSeleccionada)}` : '✅ Devueltos Hoy'

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Columna titulo="⏳ Pendientes de Entrega" color="text-warning" items={pendientes} />
      <Columna titulo="🔨 En Taller / Prestados" color="text-primary" items={prestados} />
      <Columna titulo={tituloDevueltos} color="text-success" items={devueltos} />
    </div>
  )
}
