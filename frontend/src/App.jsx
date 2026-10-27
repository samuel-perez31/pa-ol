import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import Solicitar from './pages/Solicitar.jsx'
import Tablero from './pages/Tablero.jsx'
import { API } from './api.js'

export default function App() {
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

  return (
    <BrowserRouter>
      <nav className="bg-[#0E3225] text-white px-4 pt-[5px] pb-[9px] flex gap-4 text-sm">
        <Link to="/solicitar" className="hover:underline">📱 Solicitar</Link>
        <Link to="/tablero" className="hover:underline">📋 Tablero</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Navigate to="/tablero" />} />
        <Route path="/solicitar" element={<Solicitar />} />
        <Route path="/tablero" element={<Tablero />} />
      </Routes>
    </BrowserRouter>
  )
}
