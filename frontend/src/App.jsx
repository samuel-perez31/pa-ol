import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import Solicitar from './pages/Solicitar.jsx'
import Tablero from './pages/Tablero.jsx'
import Usuarios from './pages/Usuarios.jsx'
import Login from './pages/Login.jsx'
import { useAuth } from './auth.jsx'
import { API } from './api.js'

function BarraSuperior({ usuario, onSalir }) {
  const esPanolera = usuario.rol === 'PANOLERA'
  return (
    <nav className="bg-papel2 text-tinta border-b-2 border-rojo2 px-4 pt-[5px] pb-[9px] flex items-center gap-4 text-sm">
      <div className="flex gap-4">
        {esPanolera ? (
          <>
            <Link to="/tablero" className="hover:underline">📋 Tablero</Link>
            <Link to="/usuarios" className="hover:underline">👥 Usuarios</Link>
          </>
        ) : (
          <Link to="/solicitar" className="hover:underline">📱 Solicitar</Link>
        )}
      </div>
      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs text-tinta/70 hidden sm:inline">
          {esPanolera ? '🔑' : '👤'} {usuario.nombre}
        </span>
        <button onClick={onSalir} className="text-xs font-semibold hover:underline text-rojo">
          Salir
        </button>
      </div>
    </nav>
  )
}

export default function App() {
  const { usuario, cargando, logout } = useAuth()

  // Si el backend sirve una versión nueva del frontend, recargamos la página
  // sola. Así el navegador nunca queda corriendo código viejo (que era la
  // causa de que el sonido sonara varias veces).
  useEffect(() => {
    let vivo = true
    const chequear = async () => {
      try {
        const res = await fetch(`${API}/api/version?t=${Date.now()}`)
        if (!res.ok || !vivo) return
        const { version } = await res.json()
        if (!version) return
        const guardada = localStorage.getItem('paol_version')
        if (guardada && guardada !== version) {
          localStorage.setItem('paol_version', version)
          location.reload()          // hay versión nueva -> recargar
          return
        }
        if (!guardada) localStorage.setItem('paol_version', version)
      } catch (e) {}
    }
    chequear()
    const t = setInterval(chequear, 20000)
    return () => { vivo = false; clearInterval(t) }
  }, [])

  if (cargando) {
    return (
      <div className="min-h-screen bg-papel flex items-center justify-center">
        <p className="text-tinta/70 font-semibold">Cargando…</p>
      </div>
    )
  }

  if (!usuario) return <Login />

  const esPanolera = usuario.rol === 'PANOLERA'

  return (
    <BrowserRouter>
      <BarraSuperior usuario={usuario} onSalir={logout} />
      <Routes>
        {esPanolera ? (
          <>
            <Route path="/tablero" element={<Tablero />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/solicitar" element={<Navigate to="/tablero" replace />} />
            <Route path="*" element={<Navigate to="/tablero" replace />} />
          </>
        ) : (
          <>
            <Route path="/solicitar" element={<Solicitar />} />
            <Route path="/tablero" element={<Navigate to="/solicitar" replace />} />
            <Route path="/usuarios" element={<Navigate to="/solicitar" replace />} />
            <Route path="*" element={<Navigate to="/solicitar" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}
