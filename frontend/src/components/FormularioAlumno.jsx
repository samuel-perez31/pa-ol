import React from 'react'

const CURSOS = ['1°', '2°', '3°', '4°', '5°', '6°', '7°']
const DIVISIONES = ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª']

export function formatearDni(dni) {
  const limpio = String(dni).replace(/\D/g, '').slice(0, 8)
  return limpio.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

const KEY = 'paol_alumno'

export default function FormularioAlumno({ datos, setDatos }) {
  React.useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(KEY))
      if (d) setDatos({ dni: '', nombre: '', curso: '', division: '', ...d })
    } catch (e) {}
  }, [])

  const guardar = (nuevo) => {
    setDatos(nuevo)
    localStorage.setItem(KEY, JSON.stringify({
      dni: nuevo.dni,
      nombre: nuevo.nombre,
      curso: nuevo.curso,
      division: nuevo.division,
    }))
  }

  const onDni = (e) => {
    const limpio = e.target.value.replace(/\D/g, '').slice(0, 8)
    guardar({ ...datos, dni: limpio })
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow mb-4">
      <label className="block text-sm font-semibold text-primary mb-2">DNI</label>
      <input
        inputMode="numeric"
        value={formatearDni(datos.dni)}
        onChange={onDni}
        className="w-full border border-neutral300 rounded-lg p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-primary"
        placeholder="Ej: 45.123.456"
      />
      <label className="block text-sm font-semibold text-primary mb-2">Nombre y Apellido</label>
      <input
        value={datos.nombre}
        onChange={e => guardar({ ...datos, nombre: e.target.value })}
        className="w-full border border-neutral300 rounded-lg p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-primary"
        placeholder="Ej: Juan Pérez"
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-primary mb-2">Curso</label>
          <select
            value={datos.curso}
            onChange={e => guardar({ ...datos, curso: e.target.value })}
            className="w-full border border-neutral300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Elegir…</option>
            {CURSOS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-primary mb-2">División</label>
          <select
            value={datos.division}
            onChange={e => guardar({ ...datos, division: e.target.value })}
            className="w-full border border-neutral300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Elegir…</option>
            {DIVISIONES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}
