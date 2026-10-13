import React from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import Solicitar from './pages/Solicitar.jsx'
import Tablero from './pages/Tablero.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <nav className="bg-primarydark text-white px-4 py-2 flex gap-4 text-sm">
        <Link to="/solicitar" className="hover:underline">📱 Solicitar</Link>
        <Link to="/tablero" className="hover:underline">📋 Tablero</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Navigate to="/solicitar" />} />
        <Route path="/solicitar" element={<Solicitar />} />
        <Route path="/tablero" element={<Tablero />} />
      </Routes>
    </BrowserRouter>
  )
}
