import React from 'react'

export default function ItemHerramienta({ nombre, cantidad, onSumar, onRestar }) {
  return (
    <div className={`bg-white rounded-xl p-3 shadow text-center ${cantidad > 0 ? 'ring-2 ring-blue-400' : ''}`}>
      <div className="font-semibold text-slate-700 text-sm mb-2">{nombre}</div>
      <div className="flex items-center justify-center gap-3">
        <button onClick={onRestar} className="w-10 h-10 bg-slate-200 rounded-lg text-xl font-bold">−</button>
        <span className="text-xl font-bold w-6 text-center">{cantidad}</span>
        <button onClick={onSumar} className="w-10 h-10 bg-blue-500 text-white rounded-lg text-xl font-bold">+</button>
      </div>
    </div>
  )
}
