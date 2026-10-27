import React from 'react'

const C = { neutral300: '#A3B8A3', freshmint: '#2A5942' }

export default function BarraFiltros({ q, setQ }) {
  return (
    <input value={q} onChange={e => setQ(e.target.value)}
      placeholder="🔍 Buscar por alumno, DNI o herramienta..."
      className={`border border-[${C.neutral300}] rounded-lg p-2 w-72 focus:outline-none focus:ring-2 focus:ring-[${C.freshmint}]`} />
  )
}