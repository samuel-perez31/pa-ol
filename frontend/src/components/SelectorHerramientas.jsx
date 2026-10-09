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

  // Obtener herramienta por ID para saber su stock disponible
  const getHerramienta = (id) => herramientas.find(h => h.id === id)

  const agregar = (h) => {
    const actual = conteos[h.id] || { nombre: h.nombre, cantidad: 0 }
    const herramienta = getHerramienta(h.id)
    const maxDisponible = herramienta?.disponible ?? 0
    if (actual.cantidad >= maxDisponible) return // No permitir más de lo disponible
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
        className="w-full border rounded-lg p-3 mb-2"
      />

      {busqueda.trim() && (
        <div className="bg-white rounded-xl shadow divide-y mb-4 max-h-64 overflow-y-auto">
          {resultados.length ? resultados.map(h => (
            <div key={h.id} className="flex items-center justify-between p-3">
              <div className="flex flex-col">
                <span className="text-slate-700 text-sm">{h.nombre}</span>
                <span className="text-xs text-slate-500">Disponibles: {h.disponible} / {h.cantidad}</span>
              </div>
              <button 
                onClick={() => agregar(h)}
                disabled={h.disponible <= 0}
                className="bg-blue-500 text-white text-sm font-bold px-3 py-1 rounded-lg disabled:bg-slate-300 disabled:cursor-not-allowed">
                {h.disponible > 0 ? '+ Agregar' : 'Sin stock'}
              </button>
            </div>
          )) : (
            <p className="p-3 text-slate-400 text-sm">Sin coincidencias</p>
          )}
        </div>
      )}

      <h3 className="font-bold text-slate-700 mb-2">Herramientas seleccionadas</h3>
      {seleccionadas.length ? (
        <div className="bg-white rounded-xl shadow divide-y">
          {seleccionadas.map(([id, v]) => {
            const herramienta = getHerramienta(Number(id))
            const maxDisponible = herramienta?.disponible ?? 0
            return (
              <div key={id} className="flex items-center justify-between p-3">
                <div className="flex flex-col">
                  <span className="text-slate-700 text-sm font-semibold">{v.nombre}</span>
                  <span className="text-xs text-slate-500">Máx. disponible: {maxDisponible}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => cambiarCantidad(id, -1)}
                    className="w-8 h-8 bg-slate-200 rounded-lg font-bold">−</button>
                  <span className="w-8 text-center font-bold">{v.cantidad}</span>
                  <button 
                    onClick={() => cambiarCantidad(id, 1)}
                    disabled={v.cantidad >= maxDisponible}
                    className="w-8 h-8 bg-blue-500 text-white rounded-lg font-bold disabled:bg-slate-300 disabled:cursor-not-allowed">+</button>
                  <button onClick={() => quitar(id)}
                    className="w-8 h-8 bg-red-100 text-red-600 rounded-lg font-bold">✕</button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-slate-400 text-sm">Todavía no agregaste herramientas.</p>
      )}
    </div>
  )
}
