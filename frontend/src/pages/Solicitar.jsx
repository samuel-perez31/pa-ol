import React, { useState } from 'react'
import { API } from '../api.js'
import FormularioAlumno from '../components/FormularioAlumno.jsx'
import SelectorHerramientas from '../components/SelectorHerramientas.jsx'

export default function Solicitar() {
  const [datos, setDatos] = useState({ dni: '', nombre: '', curso: '', division: '' })
  const [conteos, setConteos] = useState({})
  const [notas, setNotas] = useState('')
  const [msg, setMsg] = useState(null)

  const enviar = async () => {
    const items = Object.entries(conteos)
      .filter(([, v]) => v.cantidad > 0)
      .map(([, v]) => ({ nombre: v.nombre, cantidad: v.cantidad }))

    if (!datos.dni || !datos.nombre || !datos.curso || !datos.division) {
      setMsg({ texto: '⚠️ Completá DNI, Nombre, Curso y División', clase: 'bg-amber-100 text-amber-800' }); return
    }
    if (items.length === 0 && !notas.trim()) {
      setMsg({ texto: '⚠️ Agregá al menos un ítem', clase: 'bg-amber-100 text-amber-800' }); return
    }

    try {
      const res = await fetch(`${API}/api/pedidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dni: datos.dni,                          // limpio, solo dígitos
          nombre: datos.nombre,
          curso: `${datos.curso} ${datos.division}`,
          items,
          notas: notas.trim() || null,
        }),
      })
      if (res.ok) {
        setMsg({ texto: '✅ ¡Pedido enviado! Acercate a la ventanilla.', clase: 'bg-green-100 text-green-800' })
        setConteos({})
        setNotas('')
        setTimeout(() => setMsg(null), 5000)
      } else {
        const err = await res.json().catch(() => ({}))
        setMsg({ texto: `❌ Error ${res.status}: ${JSON.stringify(err.detail ?? '')}`, clase: 'bg-red-100 text-red-800' })
      }
    } catch (e) {
      setMsg({ texto: '❌ No se pudo conectar con el pañol.', clase: 'bg-red-100 text-red-800' })
    }
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold text-slate-800 mb-4">🔧 Solicitar Material</h1>
      <FormularioAlumno datos={datos} setDatos={setDatos} />
      <h2 className="text-lg font-bold text-slate-700 mb-2">Herramientas</h2>
      <SelectorHerramientas conteos={conteos} setConteos={setConteos} />
      <label className="block text-sm font-semibold text-slate-600">Otros materiales / Insumos</label>
      <textarea rows="2" value={notas} onChange={e => setNotas(e.target.value)}
        className="w-full border rounded-lg p-3 mb-4" placeholder="Ej: 2m de cable 1.5..." />
      <button onClick={enviar}
        className="w-full bg-blue-600 text-white text-xl font-bold py-4 rounded-xl shadow active:scale-95 transition">
        📦 Solicitar Material
      </button>
      {msg && <div className={`mt-4 p-4 rounded-xl text-center font-bold ${msg.clase}`}>{msg.texto}</div>}
    </div>
  )
}
