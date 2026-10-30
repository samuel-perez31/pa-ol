import React from 'react'

const C = {
  freshmint: '#3E583F',
  opulent: '#071628',
  neutral200: '#BBB88C',
  neutral300: '#637758',
}

export default function ItemHerramienta({ nombre, cantidad, onSumar, onRestar }) {
  return (
    <div className={`bg-papel2 rounded-xl p-3 shadow text-center ${cantidad > 0 ? `ring-2 ring-[${C.freshmint}]` : ''}`}>
      <div className={`font-semibold text-[${C.opulent}] text-sm mb-2`}>{nombre}</div>
      <div className="flex items-center justify-center gap-3">
        <button onClick={onRestar} className={`w-10 h-10 bg-[${C.neutral200}] rounded-lg text-xl font-bold hover:bg-[${C.neutral300}] transition`}>−</button>
        <span className="text-xl font-bold w-6 text-center">{cantidad}</span>
        <button onClick={onSumar} className={`w-10 h-10 bg-[${C.freshmint}] text-papel rounded-lg text-xl font-bold hover:bg-[${C.milpa}] transition`}>+</button>
      </div>
    </div>
  )
}