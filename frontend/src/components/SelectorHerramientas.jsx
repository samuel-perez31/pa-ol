import React, { useEffect, useMemo, useRef, useState } from 'react'
import { API } from '../api.js'

const C = {
  milpa: '#679460',
  freshmint: '#2A5942',
  opulent: '#0E3225',
  glendale: '#9FBF8B',
  tandoori: '#D05865',
  rare: '#D70A34',
  neutral100: '#E8EDE8',
  neutral200: '#D1DAD1',
  neutral300: '#A3B8A3',
  neutral400: '#7A947A',
  neutral500: '#5A755A',
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

  // Stock que le queda a una herramienta: el disponible del server menos lo que
  // ya agregaste a esta misma solicitud.
  const restanteDe = (h) => {
    const yaPedido = conteos[h.id]?.cantidad || 0
    return Math.max(0, (h.disponible ?? 0) - yaPedido)
  }

  const coincidencias = useMemo(() => {
    const q = normalizar(busqueda.trim())
    if (!q) return []
    return herramientas.filter(h => normalizar(h.nombre).includes(q))
  }, [busqueda, herramientas])

  // Solo se listan las herramientas que todavia tienen stock: cuando la elegis
  // y se agota, desaparece del listado.
  const resultados = useMemo(
    () => coincidencias.filter(h => restanteDe(h) > 0).slice(0, 12),
    [coincidencias, conteos]
  )

  const seleccionadas = Object.entries(conteos).filter(([, v]) => v.cantidad > 0)
  const getHerramienta = (id) => herramientas.find(h => h.id === id)

  const agregar = (h) => {
    const actual = conteos[h.id] || { nombre: h.nombre, cantidad: 0 }
    const herramienta = getHerramienta(h.id)
    const maxDisponible = herramienta?.disponible ?? 0
    if (actual.cantidad >= maxDisponible) return
    setConteos({ ...conteos, [h.id]: { nombre: h.nombre, cantidad: actual.cantidad + 1 } })
    verSeleccionadas()   // baja la página hasta "Herramientas seleccionadas"
  }

  const cambiarCantidad = (id, delta) => {
    const actual = conteos[id]
    if (!actual) return
    const herramienta = getHerramienta(Number(id))
    const maxDisponible = herramienta?.disponible ?? 0
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
        <div className="bg-white rounded-xl shadow divide-y mb-4 max-h-64 overflow-y-auto">
          {resultados.length ? resultados.map(h => {
            const restante = restanteDe(h)
            return (
              <div key={h.id} className="flex items-center justify-between p-3">
                <div className="flex flex-col">
                  <span className={`text-[${C.freshmint}] text-sm`}>{h.nombre}</span>
                  <span className={`text-xs text-[${C.neutral500}]`}>Disponibles: {restante} / {h.cantidad}</span>
                </div>
                <button onClick={() => agregar(h)} disabled={restante <= 0}
                  className={`bg-[${C.freshmint}] text-white text-sm font-bold px-3 py-1 rounded-lg disabled:bg-[${C.neutral300}] disabled:cursor-not-allowed hover:bg-[${C.opulent}] transition`}>
                  + Agregar
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
        <h3 className={`font-bold text-[${C.freshmint}] mb-2`}>Herramientas seleccionadas</h3>
        {seleccionadas.length ? (
        <div className="bg-white rounded-xl shadow divide-y">
          {seleccionadas.map(([id, v]) => {
            const herramienta = getHerramienta(Number(id))
            const maxDisponible = herramienta?.disponible ?? 0
            return (
              <div key={id} className="flex items-center justify-between p-3">
                <div className="flex flex-col">
                  <span className={`text-[${C.freshmint}] text-sm font-semibold`}>{v.nombre}</span>
                  <span className={`text-xs text-[${C.neutral500}]`}>Máx. disponible: {maxDisponible}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => cambiarCantidad(id, -1)} className={`w-8 h-8 bg-[${C.neutral200}] rounded-lg font-bold hover:bg-[${C.neutral300}] transition`}>−</button>
                  <span className="w-8 text-center font-bold">{v.cantidad}</span>
                  <button onClick={() => cambiarCantidad(id, 1)} disabled={v.cantidad >= maxDisponible}
                    className={`w-8 h-8 bg-[${C.freshmint}] text-white rounded-lg font-bold disabled:bg-[${C.neutral300}] disabled:cursor-not-allowed hover:bg-[${C.opulent}] transition`}>+</button>
                  <button onClick={() => quitar(id)} className={`w-8 h-8 bg-[${C.glendale}20] text-[${C.tandoori}] rounded-lg font-bold hover:bg-[${C.glendale}] transition`}>✕</button>
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