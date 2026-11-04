import React, { useEffect } from 'react'
import { useAuth } from '../auth.jsx'

const C = {
  freshmint: '#3E583F',
  opulent: '#071628',
  neutral300: '#637758',
  neutral500: 'rgba(7,22,40,0.78)',
}

const CURSOS = ['1°', '2°', '3°', '4°', '5°', '6°', '7°']
const DIVISIONES = ['1ª', '2ª', '3ª', '4ª', '5ª', '6ª']

export default function FormularioProfesor({ curso, division, setCurso, setDivision }) {
  const { usuario } = useAuth()
  const clave = `paol_profesor_${usuario?.id || 'x'}`

  useEffect(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(clave) || 'null')
      if (guardado) {
        if (guardado.curso) setCurso(guardado.curso)
        if (guardado.division) setDivision(guardado.division)
      }
    } catch (e) {}
  }, [clave])

  useEffect(() => {
    try {
      localStorage.setItem(clave, JSON.stringify({ curso, division }))
    } catch (e) {}
  }, [clave, curso, division])

  const inputClass = `w-full border border-[${C.neutral300}] rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[${C.freshmint}]`
  const labelClass = `block text-sm font-semibold text-[${C.opulent}] mb-2`

  return (
    <div className="bg-papel2 rounded-xl p-4 shadow mb-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-verdeoscuro text-papel flex items-center justify-center font-bold text-lg">
          {(usuario?.nombre || '?').charAt(0).toUpperCase()}
        </div>
        <div>
          <div className={`font-bold text-[${C.opulent}]`}>{usuario?.nombre}</div>
          <div className={`text-xs text-[${C.neutral500}]`}>@{usuario?.usuario} · Profesor</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Curso</label>
          <select value={curso} onChange={(e) => setCurso(e.target.value)} className={inputClass}>
            <option value="">Elegir…</option>
            {CURSOS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>División</label>
          <select value={division} onChange={(e) => setDivision(e.target.value)} className={inputClass}>
            <option value="">Elegir…</option>
            {DIVISIONES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}
