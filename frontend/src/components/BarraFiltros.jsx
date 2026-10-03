import React from 'react'

export default function BarraFiltros({ q, setQ }) {
  return (
    <input
      value={q}
      onChange={e => setQ(e.target.value)}
      placeholder="🔍 Buscar por apellido o DNI..."
      className="border rounded-lg p-2 w-72"
    />
  )
}
