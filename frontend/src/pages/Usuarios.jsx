import React, { useEffect, useState } from 'react'
import { apiFetch } from '../api.js'
import { useAuth } from '../auth.jsx'

const C = {
  milpa: '#637758',
  freshmint: '#3E583F',
  opulent: '#071628',
  glendale: '#BBB88C',
  rare: '#840D27',
  neutral500: 'rgba(7,22,40,0.78)',
}

const inputClass = `w-full border border-[${C.glendale}] rounded-lg p-2.5 bg-papel text-sm focus:outline-none focus:ring-2 focus:ring-[${C.freshmint}]`
const labelClass = `block text-xs font-semibold text-[${C.opulent}] mb-1`

const vacio = { nombre: '', usuario: '', password: '' }

export default function Usuarios() {
  const { usuario: yo } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [nuevo, setNuevo] = useState(vacio)
  const [editando, setEditando] = useState(null)
  const [msg, setMsg] = useState(null)
  const [clave, setClave] = useState({ actual: '', nueva: '', repetir: '' })

  const cargar = async () => {
    try {
      const res = await apiFetch('/api/usuarios')
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setUsuarios(await res.json())
    } catch (e) {
      setMsg({ tipo: 'error', texto: `No se pudieron cargar los usuarios: ${e.message}` })
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const aviso = (tipo, texto) => {
    setMsg({ tipo, texto })
    if (tipo === 'ok') setTimeout(() => setMsg(null), 4000)
  }

  const crear = async (e) => {
    e.preventDefault()
    if (!nuevo.nombre.trim() || !nuevo.usuario.trim()) {
      aviso('error', 'Completá nombre y usuario')
      return
    }
    try {
      const res = await apiFetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nuevo, rol: 'PROFESOR' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || `Error ${res.status}`)
      setNuevo(vacio)
      aviso('ok', `Profesor ${data.nombre} creado`)
      cargar()
    } catch (err) {
      aviso('error', err.message)
    }
  }

  const guardarEdicion = async (e) => {
    e.preventDefault()
    if (!editando) return
    try {
      const cambios = {
        nombre: editando.nombre,
        usuario: editando.usuario,
      }
      if (editando.password) cambios.password = editando.password
      const res = await apiFetch(`/api/usuarios/${editando.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cambios),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || `Error ${res.status}`)
      setEditando(null)
      aviso('ok', 'Cambios guardados')
      cargar()
    } catch (err) {
      aviso('error', err.message)
    }
  }

  const alternarActivo = async (u) => {
    try {
      const res = await apiFetch(`/api/usuarios/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !u.activo }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || `Error ${res.status}`)
      aviso('ok', u.activo ? `${u.nombre} desactivado` : `${u.nombre} activado`)
      cargar()
    } catch (err) {
      aviso('error', err.message)
    }
  }

  const cambiarMiClave = async (e) => {
    e.preventDefault()
    if (clave.nueva !== clave.repetir) {
      aviso('error', 'Las contraseñas nuevas no coinciden')
      return
    }
    try {
      const res = await apiFetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actual: clave.actual, nueva: clave.nueva }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.detail || `Error ${res.status}`)
      setClave({ actual: '', nueva: '', repetir: '' })
      aviso('ok', 'Contraseña actualizada')
    } catch (err) {
      aviso('error', err.message)
    }
  }

  const profesores = usuarios.filter((u) => u.rol === 'PROFESOR')
  const panoleras = usuarios.filter((u) => u.rol === 'PANOLERA')

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <h1 className={`text-2xl font-bold text-[${C.opulent}]`}>👥 Usuarios</h1>
      <p className={`text-sm text-[${C.neutral500}] mb-4`}>
        Los profesores solo pueden entrar a la pestaña “Solicitar”. La pañolera administra el tablero y las cuentas.
      </p>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-semibold ${
          msg.tipo === 'ok'
            ? 'bg-verde/20 text-verdeoscuro border-l-4 border-verde'
            : 'bg-rojo2/10 text-rojo border-l-4 border-rojo'
        }`}>
          {msg.texto}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Alta de profesor */}
        <section className="bg-papel2 rounded-xl shadow p-4">
          <h2 className={`font-bold text-[${C.opulent}] mb-3`}>➕ Nuevo profesor</h2>
          <form onSubmit={crear}>
            <label className={labelClass}>Nombre y apellido</label>
            <input className={inputClass} value={nuevo.nombre}
              onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
              placeholder="Ej: Juan Pérez" />
            <div className="h-3" />
            <label className={labelClass}>Usuario</label>
            <input className={inputClass} value={nuevo.usuario}
              onChange={(e) => setNuevo({ ...nuevo, usuario: e.target.value })}
              placeholder="Ej: jperez" autoCapitalize="none" />
            <div className="h-3" />
            <label className={labelClass}>Contraseña inicial</label>
            <input className={inputClass} type="password" value={nuevo.password}
              onChange={(e) => setNuevo({ ...nuevo, password: e.target.value })}
              placeholder="Mínimo 6 caracteres" />
            <button type="submit"
              className={`mt-4 w-full bg-[${C.freshmint}] text-papel font-bold py-2.5 rounded-lg hover:bg-[${C.milpa}] transition`}>
              Crear cuenta
            </button>
          </form>
        </section>

        {/* Mi contraseña */}
        <section className="bg-papel2 rounded-xl shadow p-4">
          <h2 className={`font-bold text-[${C.opulent}] mb-3`}>🔑 Mi contraseña</h2>
          <p className={`text-xs text-[${C.neutral500}] mb-3`}>
            Cuenta actual: <strong>{yo?.usuario}</strong>
          </p>
          <form onSubmit={cambiarMiClave}>
            <label className={labelClass}>Contraseña actual</label>
            <input className={inputClass} type="password" value={clave.actual}
              onChange={(e) => setClave({ ...clave, actual: e.target.value })} />
            <div className="h-3" />
            <label className={labelClass}>Contraseña nueva</label>
            <input className={inputClass} type="password" value={clave.nueva}
              onChange={(e) => setClave({ ...clave, nueva: e.target.value })} />
            <div className="h-3" />
            <label className={labelClass}>Repetir contraseña nueva</label>
            <input className={inputClass} type="password" value={clave.repetir}
              onChange={(e) => setClave({ ...clave, repetir: e.target.value })} />
            <button type="submit"
              className={`mt-4 w-full bg-[${C.freshmint}] text-papel font-bold py-2.5 rounded-lg hover:bg-[${C.milpa}] transition`}>
              Cambiar contraseña
            </button>
          </form>
        </section>
      </div>

      <section className="mt-6 bg-papel2 rounded-xl shadow p-4">
        <h2 className={`font-bold text-[${C.opulent}] mb-3`}>Profesores ({profesores.length})</h2>
        {cargando ? (
          <p className={`text-sm text-[${C.neutral500}]`}>Cargando…</p>
        ) : profesores.length === 0 ? (
          <p className={`text-sm text-[${C.neutral500}]`}>Todavía no hay profesores cargados.</p>
        ) : (
          <div className="divide-y divide-glendale/60">
            {profesores.map((u) => (
              <div key={u.id} className="py-3">
                {editando?.id === u.id ? (
                  <form onSubmit={guardarEdicion} className="grid sm:grid-cols-4 gap-2 items-end">
                    <div>
                      <label className={labelClass}>Nombre</label>
                      <input className={inputClass} value={editando.nombre}
                        onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelClass}>Usuario</label>
                      <input className={inputClass} value={editando.usuario}
                        onChange={(e) => setEditando({ ...editando, usuario: e.target.value })} />
                    </div>
                    <div>
                      <label className={labelClass}>Nueva clave (opcional)</label>
                      <input className={inputClass} type="password" value={editando.password}
                        onChange={(e) => setEditando({ ...editando, password: e.target.value })}
                        placeholder="Dejar vacío" />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit"
                        className={`flex-1 bg-[${C.freshmint}] text-papel font-bold py-2.5 rounded-lg`}>
                        Guardar
                      </button>
                      <button type="button" onClick={() => setEditando(null)}
                        className={`flex-1 bg-[${C.glendale}] text-[${C.opulent}] font-bold py-2.5 rounded-lg`}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className={`font-semibold text-[${C.opulent}]`}>
                        {u.nombre}{' '}
                        <span className={`text-xs font-normal text-[${C.neutral500}]`}>@{u.usuario}</span>
                      </div>
                      <div className={`text-xs ${u.activo ? 'text-verdeoscuro' : 'text-rojo'}`}>
                        {u.activo ? '● Activo' : '● Inactivo'}
                      </div>
                    </div>
                    <button onClick={() => setEditando({ ...u, password: '' })}
                      className={`text-sm font-semibold px-3 py-1.5 rounded-lg bg-[${C.glendale}]/50 hover:bg-[${C.glendale}] transition`}>
                      ✏️ Editar
                    </button>
                    <button onClick={() => alternarActivo(u)}
                      className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition ${
                        u.activo
                          ? `bg-[${C.rare}]/10 text-[${C.rare}] hover:bg-[${C.rare}]/20`
                          : `bg-[${C.freshmint}]/15 text-[${C.freshmint}] hover:bg-[${C.freshmint}]/25`
                      }`}>
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 bg-papel2/60 rounded-xl border border-glendale/60 p-4">
        <h2 className={`font-bold text-[${C.opulent}] mb-2 text-sm`}>Cuentas de pañolera</h2>
        <ul className="text-sm text-tinta/80">
          {panoleras.map((u) => (
            <li key={u.id}>
              {u.nombre} <span className="text-xs">@{u.usuario}</span>{u.activo ? '' : ' (inactiva)'}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
