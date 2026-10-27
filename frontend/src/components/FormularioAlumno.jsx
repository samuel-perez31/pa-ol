import React from 'react'

const C = {
  freshmint: '#2A5942',
  opulent: '#0E3225',
  neutral300: '#A3B8A3',
}

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
      dni: nuevo.dni, nombre: nuevo.nombre, curso: nuevo.curso, division: nuevo.division,
    }))
  }

  const onDni = (e) => {
    const limpio = e.target.value.replace(/\D/g, '').slice(0, 8)
    guardar({ ...datos, dni: limpio })
  }

  const inputClass = `w-full border border-[${C.neutral300}] rounded-lg p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-[${C.freshmint}]`
  const labelClass = `block text-sm font-semibold text-[${C.freshmint}] mb-2`

  return (
    <div className="bg-white rounded-xl p-4 shadow mb-4">
      <label className={labelClass}>DNI</label>
      <input inputMode="numeric" value={formatearDni(datos.dni)} onChange={onDni} className={inputClass} placeholder="Ej: 45.123.456" />
      <label className={labelClass}>Nombre y Apellido</label>
      <input value={datos.nombre} onChange={e => guardar({ ...datos, nombre: e.target.value })} className={inputClass} placeholder="Ej: Juan Pérez" />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Curso</label>
          <select value={datos.curso} onChange={e => guardar({ ...datos, curso: e.target.value })} className={inputClass.replace('mb-3', '')}>
            <option value="">Elegir…</option>
            {CURSOS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>División</label>
          <select value={datos.division} onChange={e => guardar({ ...datos, division: e.target.value })} className={inputClass.replace('mb-3', '')}>
            <option value="">Elegir…</option>
            {DIVISIONES.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}