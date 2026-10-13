import React, { useEffect, useMemo, useState } from 'react'
import { API } from '../api.js'

const normalizar = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export default function SelectorHerramientas({ conteos, setConteos }) {
  const [herramientas, setHerramientas] = useState([])
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    fetch(`${API}/api/herramientas`)
      .then(r => r.json())
      .then(setHerramientas)
      .catch(() => {})
  }, [])

  const resultados = useMemo(() => {
    const q = normalizar(busqueda.trim())
    if (!q) return []
    return herramientas
      .filter(h => normalizar(h.nombre).includes(q))
      .slice(0, 12)
  }, [busqueda, herramientas])

  const seleccionadas = Object.entries(conteos)
    .filter(([, v]) => v.cantidad > 0)

  const getHerramienta = (id) => herramientas.find(h => h.id === id)

  const agregar = (h) => {
    const actual = conteos[h.id] || { nombre: h.nombre, cantidad: 0 }
    const herramienta = getHerramienta(h.id)
    const maxDisponible = herramienta?.disponible ?? 0
    if (actual.cantidad >= maxDisponible) return
    setConteos({ ...conteos, [h.id]: { nombre: h.nombre, cantidad: actual.cantidad + 1 } })
  }

  const cambiarCantidad = (id, delta) => {
    const actual = conteos[id]
    if (!actual) return
    const herramienta = getHerramienta(Number(id))
    const maxDisponible = herramienta?.disponible ?? 0
    const nueva = Math.max(0, Math.min(maxDisponible, actual.cantidad + delta))
    setConteos({ ...conteos, [id]: { ...actual, cantidad: nueva } })
  }

  const quitar = (id) => {
    const copia = { ...conteos }
    delete copia[id]
    setConteos(copia)
  }

  return (
    <div className="mb-4">
      <input
        type="text"
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        placeholder="Buscar herramienta (ej. tester, calibre, pinza)..."
        className="w-full border border-neutral300 rounded-lg p-3 mb-2 focus:outline-none focus:ring-2 focus:ring-primary"
      />

      {busqueda.trim() && (
        <div className="bg-white rounded-xl shadow divide-y mb-4 max-h-64 overflow-y-auto">
          {resultados.length ? resultados.map(h => (
            <div key={h.id} className="flex items-center justify-between p-3">
              <div className="flex flex-col">
                <span className="text-primary text-sm">{h.nombre}</span>
                <span className="text-xs text-neutral500">Disponibles: {h.disponible} / {h.cantidad}</span>
              </div>
              <button 
                onClick={() => agregar(h)}
                disabled={h.disponible <= 0}
                className="bg-primary text-white text-sm font-bold px-3 py-1 rounded-lg disabled:bg-neutral300 disabled:cursor-not-allowed hover:bg-primarydark transition">
                {h.disponible > 0 ? '+ Agregar' : 'Sin stock'}
              </button>
            </div>
          )) : (
            <p className="p-3 text-neutral400 text-sm">Sin coincidencias</p>
          )}
        </div>
      )}

      <h3 className="font-bold text-primary mb-2">Herramientas seleccionadas</h3>
      {seleccionadas.length ? (
        <div className="bg-white rounded-xl shadow divide-y">
          {seleccionadas.map(([id, v]) => {
            const herramienta = getHerramienta(Number(id))
            const maxDisponible = herramienta?.disponible ?? 0
            return (
              <div key={id} className="flex items-center justify-between p-3">
                <div className="flex flex-col">
                  <span className="text-primary text-sm font-semibold">{v.nombre}</span>
                  <span className="text-xs text-neutral500">Máx. disponible: {maxDisponible}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => cambiarCantidad(id, -1)}
                    className="w-8 h-8 bg-neutral200 rounded-lg font-bold hover:bg-neutral300 transition">−</button>
                  <span className="w-8 text-center font-bold">{v.cantidad}</span>
                  <button 
                    onClick={() => cambiarCantidad(id, 1)}
                    disabled={v.cantidad >= maxDisponible}
                    className="w-8 h-8 bg-primary text-white rounded-lg font-bold disabled:bg-neutral300 disabled:cursor-not-allowed hover:bg-primarydark transition">+</button>
                  <button onClick={() => quitar(id)}
                    className="w-8 h-8 bg-warninglight text-danger rounded-lg font-bold hover:bg-warning transition">✕</button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-neutral400 text-sm">Todavía no agregaste herramientas.</p>
      )}
    </div>
  )
}
