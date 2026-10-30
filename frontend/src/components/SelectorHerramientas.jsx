import React, { useEffect, useMemo, useRef, useState } from 'react'
import { API } from '../api.js'

const C = {
  milpa: '#637758',
  freshmint: '#3E583F',
  opulent: '#071628',
  glendale: '#BBB88C',
  tandoori: '#AC303C',
  rare: '#840D27',
  neutral100: '#DBD3B7',
  neutral200: '#BBB88C',
  neutral300: '#637758',
  neutral400: 'rgba(7,22,40,0.64)',
  neutral500: 'rgba(7,22,40,0.78)',
}

const normalizar = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export default function SelectorHerramientas({ conteos, setConteos }) {
  const [herramientas, setHerramientas] = useState([])
  const [busqueda, setBusqueda] = useState('')
  // Referencia a la sección "Herramientas seleccionadas" para bajar hasta ahí
  // cuando se agrega una herramienta.
  const refSeleccionadas = useRef(null)

  const verSeleccionadas = () => {
    requestAnimationFrame(() => {
      refSeleccionadas.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  useEffect(() => {
    fetch(`${API}/api/herramientas`).then(r => r.json()).then(setHerramientas).catch(() => {})
  }, [])

  // Stock que le queda a una herramienta: usar el mayor entre disponible y cantidad, o cantidad
  const getMax = (h) => {
    if (!h) return 0
    const d = Number(h.disponible) || 0
    const c = Number(h.cantidad) || 0
    const m = Math.max(d, c)
    if (m > 0) return m
    return c || d || 0
  }
  const restanteDe = (h) => {
    const yaPedido = conteos[h.id]?.cantidad || 0
    return Math.max(0, getMax(h) - yaPedido)
  }

  const coincidencias = useMemo(() => {
    const q = normalizar(busqueda.trim())
    if (!q) return []
    return herramientas.filter(h => {
      const yaSeleccionada = (conteos[h.id]?.cantidad || 0) > 0
      if (yaSeleccionada) return false
      return normalizar(h.nombre).includes(q)
    })
  }, [busqueda, herramientas, conteos])

  // Mostrar todas las coincidencias al buscar. Si no hay stock queda deshabilitado.
  const resultados = useMemo(
    () => coincidencias.slice(0, 12),
    [coincidencias]
  )

  const seleccionadas = Object.entries(conteos).filter(([, v]) => v.cantidad > 0)
  const getHerramienta = (id) => herramientas.find(h => h.id === id)

  const agregar = (h) => {
    const actual = conteos[h.id] || { nombre: h.nombre, cantidad: 0 }
    const herramienta = getHerramienta(h.id)
    const fuente = herramienta || h
    const maxDisponible = Number(fuente.disponible) > 0 ? Number(fuente.disponible) : Number(fuente.cantidad)
    if (maxDisponible <= 0) return
    if (actual.cantidad >= maxDisponible) return
    setConteos({ ...conteos, [h.id]: { nombre: h.nombre, cantidad: actual.cantidad + 1 } })
    verSeleccionadas()
  }

  const cambiarCantidad = (id, delta) => {
    const actual = conteos[id]
    if (!actual) return
    const herramienta = getHerramienta(Number(id))
    const maxDisponible = getMax(herramienta)
    const nueva = Math.max(0, Math.min(maxDisponible, actual.cantidad + delta))
    setConteos({ ...conteos, [id]: { ...actual, cantidad: nueva } })
  }

  const quitar = (id) => { const copia = { ...conteos }; delete copia[id]; setConteos(copia) }

  return (
    <div className="mb-4">
      <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
        placeholder="Buscar herramienta (ej. tester, calibre, pinza)..."
        className={`w-full border border-[${C.neutral300}] rounded-lg p-3 mb-2 focus:outline-none focus:ring-2 focus:ring-[${C.freshmint}]`} />

      {busqueda.trim() && (
        <div className="bg-papel2 rounded-xl shadow divide-y mb-4 max-h-64 overflow-y-auto">
          {resultados.length ? resultados.map(h => {
            const max = getMax(h)
            const restante = restanteDe(h)
            const disponibleMostrar = max
            return (
              <div key={h.id} className="flex items-center justify-between p-3">
                <div className="flex flex-col">
                  <span className={`text-[${C.opulent}] text-sm`}>{h.nombre}</span>
                  <span className={`text-xs text-[${C.neutral500}]`}>Disponibles: {Math.max(Number(h.disponible)||0, Number(h.cantidad)||0)} / {h.cantidad}</span>
                </div>
                <button onClick={() => agregar(h)} disabled={Math.max(Number(h.disponible)||0, Number(h.cantidad)||0) <= 0}
                  className={`bg-[${C.freshmint}] text-papel text-sm font-bold px-3 py-1 rounded-lg disabled:bg-[${C.neutral300}] disabled:cursor-not-allowed hover:bg-[${C.milpa}] transition`}>
                  {Math.max(Number(h.disponible)||0, Number(h.cantidad)||0) <= 0 ? 'Sin stock' : '+ Agregar'}
                </button>
              </div>
            )
          }) : (
            <p className={`p-3 text-[${C.neutral400}] text-sm`}>
              {coincidencias.length ? 'Sin stock disponible de esas herramientas' : 'Sin coincidencias'}
            </p>
          )}
        </div>
      )}

      <div ref={refSeleccionadas}>
        <h3 className={`font-bold text-[${C.opulent}] mb-2`}>Herramientas seleccionadas</h3>
        {seleccionadas.length ? (
        <div className="bg-papel2 rounded-xl shadow divide-y">
          {seleccionadas.map(([id, v]) => {
            const herramienta = getHerramienta(Number(id))
            const maxDisponible = herramienta?.disponible ?? 0
            return (
              <div key={id} className="flex items-center justify-between p-3">
                <div className="flex flex-col">
                  <span className={`text-[${C.opulent}] text-sm font-semibold`}>{v.nombre}</span>
                  <span className={`text-xs text-[${C.neutral500}]`}>Máx. disponible: {getMax(herramienta)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => cambiarCantidad(id, -1)} className={`w-8 h-8 bg-[${C.neutral200}] rounded-lg font-bold hover:bg-[${C.neutral300}] transition`}>−</button>
                  <span className="w-8 text-center font-bold">{v.cantidad}</span>
                  <button onClick={() => cambiarCantidad(id, 1)} disabled={v.cantidad >= maxDisponible}
                    className={`w-8 h-8 bg-[${C.freshmint}] text-papel rounded-lg font-bold disabled:bg-[${C.neutral300}] disabled:cursor-not-allowed hover:bg-[${C.milpa}] transition`}>+</button>
                  <button onClick={() => quitar(id)} className={`w-8 h-8 bg-[${C.glendale}20] text-[${C.opulent}] rounded-lg font-bold hover:bg-[${C.glendale}] transition`}>✕</button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className={`text-[${C.neutral400}] text-sm`}>Todavía no agregaste herramientas.</p>
      )}
      </div>
    </div>
  )
}