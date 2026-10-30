import React, { useState } from 'react'
import { API } from '../api.js'
import FormularioAlumno from '../components/FormularioAlumno.jsx'
import SelectorHerramientas from '../components/SelectorHerramientas.jsx'

const C = {
  milpa: '#637758',
  freshmint: '#3E583F',
  opulent: '#071628',
  glendale: '#BBB88C',
  tandoori: '#AC303C',
  rare: '#840D27',
  neutral50: '#E5DCB7',
  neutral100: '#DBD3B7',
  neutral200: '#BBB88C',
  neutral300: '#637758',
  neutral400: '#071628',
  neutral500: 'rgba(7,22,40,0.78)',
  neutral600: '#071628',
  neutral700: '#071628',
  neutral800: '#3E583F',
  neutral900: '#071628',
}

export default function Solicitar() {
  const [datos, setDatos] = useState({ dni: '', nombre: '', curso: '', division: '' })
  const [conteos, setConteos] = useState({})
  const [notas, setNotas] = useState('')
  const [msg, setMsg] = useState(null)
  const [alertaStock, setAlertaStock] = useState(false)

  const cerrarAlerta = () => setAlertaStock(false)

  const enviar = async () => {
    const items = Object.entries(conteos)
      .filter(([, v]) => v.cantidad > 0)
      .map(([, v]) => ({ nombre: v.nombre, cantidad: v.cantidad }))

    if (!datos.dni || !datos.nombre || !datos.curso || !datos.division) {
      setMsg({ texto: '⚠️ Completá DNI, Nombre, Curso y División', clase: `bg-[${C.glendale}20] text-[${C.opulent}] border-l-4 border-[${C.rare}]` }); return
    }
    if (items.length === 0 && !notas.trim()) {
      setMsg({ texto: '⚠️ Agregá al menos un ítem', clase: `bg-[${C.glendale}20] text-[${C.opulent}] border-l-4 border-[${C.rare}]` }); return
    }

    try {
      const res = await fetch(`${API}/api/pedidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dni: datos.dni,
          nombre: datos.nombre,
          curso: `${datos.curso} ${datos.division}`,
          items,
          notas: notas.trim() || null,
        }),
      })
      if (res.ok) {
        setMsg({ texto: '✅ ¡Pedido enviado! Acercate a la ventanilla.', clase: `bg-[${C.glendale}] text-[${C.opulent}]` })
        setConteos({})
        setNotas('')
        setTimeout(() => setMsg(null), 5000)
      } else {
        const err = await res.json().catch(() => ({}))
        const detalle = err.detail ?? ''
        if (res.status === 400 && detalle.includes('Stock no disponible')) {
          setAlertaStock(true)
        } else {
          setMsg({ texto: `❌ Error ${res.status}: ${JSON.stringify(detalle)}`, clase: `bg-[${C.glendale}20] text-[${C.opulent}] border-l-4 border-[${C.rare}]` })
        }
      }
    } catch (e) {
      setMsg({ texto: '❌ No se pudo conectar con el pañol.', clase: `bg-[${C.glendale}20] text-[${C.opulent}] border-l-4 border-[${C.rare}]` })
    }
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className={`text-2xl font-bold text-[${C.opulent}] mb-4`}>🔧 Solicitar Material</h1>
      <FormularioAlumno datos={datos} setDatos={setDatos} />
      <h2 className={`text-lg font-bold text-[${C.opulent}] mb-2`}>Herramientas</h2>
      <SelectorHerramientas conteos={conteos} setConteos={setConteos} />
      <label className={`block text-sm font-semibold text-[${C.opulent}] mb-2`}>Otros materiales / Insumos</label>
      <textarea rows="2" value={notas} onChange={e => setNotas(e.target.value)}
        className={`w-full border border-[${C.neutral300}] rounded-lg p-3 mb-4 focus:outline-none focus:ring-2 focus:ring-[${C.freshmint}]`} placeholder="Ej: 2m de cable 1.5..." />
      <button onClick={enviar}
        className={`w-full bg-[${C.freshmint}] text-papel text-xl font-bold py-4 rounded-xl shadow active:scale-95 transition hover:bg-[${C.milpa}]`}>
        📦 Solicitar Material
      </button>
      {msg && <div className={`mt-4 p-4 rounded-xl text-center font-bold ${msg.clase}`}>{msg.texto}</div>}
      
      {alertaStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-verdeoscuro/70" onClick={cerrarAlerta}>
          <div className="bg-papel2 rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl text-center" onClick={e => e.stopPropagation()}>
            <div className="text-6xl mb-4">📦</div>
            <h2 className={`text-2xl font-bold text-[${C.opulent}] mb-2`}>Material no disponible</h2>
            <p className={`text-lg text-[${C.opulent}] mb-6`}>El material no está en stock</p>
            <p className={`text-sm text-[${C.neutral500}] mb-6`}>Ya fue solicitado por otro alumno o no hay unidades disponibles.</p>
            <button onClick={cerrarAlerta} className={`w-full bg-[${C.freshmint}] text-papel font-bold py-3 rounded-xl hover:bg-[${C.milpa}] transition`}>
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  )
}