import React from 'react'
import TarjetaPedido from './TarjetaPedido.jsx'

const C = {
  milpa: '#679460',
  freshmint: '#2A5942',
  opulent: '#0E3225',
  glendale: '#9FBF8B',
  tandoori: '#D05865',
  rare: '#D70A34',
  neutral400: '#7A947A',
}

export default function TableroKanban({ pedidos, onAccion, fechaSeleccionada }) {
  const pendientes = pedidos.filter(p => p.estado === 'PENDIENTE')
  const prestados = pedidos.filter(p => p.estado === 'PRESTADO')
  const devueltos = pedidos.filter(p => p.estado === 'DEVUELTO')

  const formatearFecha = (fechaISO) => {
    if (!fechaISO) return 'Hoy'
    const [a, m, d] = fechaISO.split('-')
    return `${d}/${m}/${a}`
  }

  const Columna = ({ titulo, color, bgColor, borderColor, items }) => (
    <section className="rounded-xl overflow-hidden shadow bg-white">
      <div className={`px-4 py-3 font-bold text-white ${bgColor}`}>
        {titulo} ({items.length})
      </div>
      <div className={`p-4 border-t-2 ${borderColor}`}>
        <div className="space-y-3">
          {items.length
            ? items.map(p => <TarjetaPedido key={p.id} pedido={p} onAccion={onAccion} />)
            : <p className={`text-[${C.neutral400}] text-sm text-center py-4`}>Sin pedidos</p>}
        </div>
      </div>
    </section>
  )

  const tituloDevueltos = fechaSeleccionada ? `✅ Devueltos ${formatearFecha(fechaSeleccionada)}` : '✅ Devueltos Hoy'

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Columna 
        titulo="⏳ Pendientes de Entrega" 
        bgColor={`bg-[${C.tandoori}]`} 
        borderColor={`border-[${C.tandoori}]`} 
        items={pendientes} 
      />
      <Columna 
        titulo="🔨 En Taller / Prestados" 
        bgColor={`bg-[${C.freshmint}]`} 
        borderColor={`border-[${C.freshmint}]`} 
        items={prestados} 
      />
      <Columna 
        titulo={tituloDevueltos} 
        bgColor={`bg-[${C.milpa}]`} 
        borderColor={`border-[${C.milpa}]`} 
        items={devueltos} 
      />
    </div>
  )
}