import React, { useState } from 'react'
import { useAuth } from '../auth.jsx'

const C = {
  milpa: '#637758',
  freshmint: '#3E583F',
  opulent: '#071628',
  glendale: '#BBB88C',
  rare: '#840D27',
  neutral500: 'rgba(7,22,40,0.78)',
}

export default function Login() {
  const { login } = useAuth()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const entrar = async (e) => {
    e.preventDefault()
    if (!usuario.trim() || !password) {
      setError('Completá usuario y contraseña')
      return
    }
    setEnviando(true)
    setError('')
    try {
      await login(usuario.trim(), password)
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión')
    } finally {
      setEnviando(false)
    }
  }

  const inputClass = `w-full border border-[${C.glendale}] rounded-lg p-3 mb-3 bg-papel focus:outline-none focus:ring-2 focus:ring-[${C.freshmint}]`

  return (
    <div className="min-h-screen bg-papel flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🔧</div>
          <h1 className={`text-2xl font-bold text-[${C.opulent}]`}>Sistema Pañol</h1>
          <p className={`text-sm text-[${C.neutral500}] mt-1`}>Gestión de préstamos de herramientas</p>
        </div>

        <form onSubmit={entrar} className="bg-papel2 rounded-2xl p-6 shadow-lg border-t-4 border-[#AC303C]">
          <h2 className={`text-lg font-bold text-[${C.opulent}] mb-4`}>Iniciar sesión</h2>

          <label className={`block text-sm font-semibold text-[${C.opulent}] mb-1`}>Usuario</label>
          <input
            autoFocus
            autoComplete="username"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className={inputClass}
            placeholder="Ej: jperez"
          />

          <label className={`block text-sm font-semibold text-[${C.opulent}] mb-1`}>Contraseña</label>
          <div className="relative">
            <input
              type={verPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass.replace('mb-3', 'mb-1 pr-20')}
              placeholder="Contraseña"
            />
            <button
              type="button"
              onClick={() => setVerPassword((v) => !v)}
              className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-[${C.milpa}] px-2 py-1`}
            >
              {verPassword ? 'Ocultar' : 'Ver'}
            </button>
          </div>

          {error && (
            <p className={`mt-3 mb-1 text-sm font-semibold text-[${C.rare}]`}>⚠️ {error}</p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className={`mt-4 w-full bg-[${C.freshmint}] text-papel text-lg font-bold py-3 rounded-xl shadow active:scale-95 transition hover:bg-[${C.milpa}] disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className={`text-center text-xs text-[${C.neutral500}] mt-5`}>
          ¿No tenés cuenta? Pedile a la pañolera que te cree una.
        </p>
      </div>
    </div>
  )
}
