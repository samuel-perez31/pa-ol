import React from 'react'

export default function ItemHerramienta({ nombre, cantidad, onSumar, onRestar }) {
  return (
    <div className={`bg-white rounded-xl p-3 shadow text-center ${cantidad > 0 ? 'ring-2 ring-primary' : ''}`}>
      <div className="font-semibold text-primary text-sm mb-2">{nombre}</div>
      <div className="flex items-center justify-center gap-3">
        <button onClick={onRestar} className="w-10 h-10 bg-neutral200 rounded-lg text-xl font-bold hover:bg-neutral300 transition">−</button>
        <span className="text-xl font-bold w-6 text-center">{cantidad}</span>
        <button onClick={onSumar} className="w-10 h-10 bg-primary text-white rounded-lg text-xl font-bold hover:bg-primarydark transition">+</button>
      </div>
    </div>
  )
}
