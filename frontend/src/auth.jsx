import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  API,
  apiFetch,
  borrarSesion,
  getToken,
  getUsuarioGuardado,
  guardarSesion,
} from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => getUsuarioGuardado())
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vivo = true

    const validar = async () => {
      if (!getToken()) {
        if (vivo) {
          setUsuario(null)
          setCargando(false)
        }
        return
      }
      try {
        const res = await apiFetch('/api/auth/me')
        if (!vivo) return
        if (res.ok) {
          const u = await res.json()
          setUsuario(u)
          guardarSesion(getToken(), u)
        } else {
          setUsuario(null)
        }
      } catch (e) {
        // Sin conexión: mantenemos la sesión guardada para reintentar.
      } finally {
        if (vivo) setCargando(false)
      }
    }

    validar()

    const alVencer = () => {
      setUsuario(null)
      setCargando(false)
    }
    window.addEventListener('paol:sesion-vencida', alVencer)
    return () => {
      vivo = false
      window.removeEventListener('paol:sesion-vencida', alVencer)
    }
  }, [])

  const login = async (nombreUsuario, password) => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: nombreUsuario, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.detail || 'No se pudo iniciar sesión')
    }
    guardarSesion(data.token, data.usuario)
    setUsuario(data.usuario)
    return data.usuario
  }

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } catch (e) {}
    borrarSesion()
    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout, setUsuario }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
