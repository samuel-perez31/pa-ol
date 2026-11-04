// Puerto del backend.
// - La app se sirve desde el propio backend (:8000) -> habla con :8000
// - En desarrollo (vite :5173) -> habla con :8000
// - Si se sirve desde otro puerto del backend (ej. :8001 en pruebas) -> usa ese
const puerto = window.location.port
const PUERTO_API = ['8000', '8001'].includes(puerto) ? puerto : '8000'

const API_HOST = `${window.location.hostname}:${PUERTO_API}`
export const API = `http://${API_HOST}`
export const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${API_HOST}/ws/tablero`

const TOKEN_KEY = 'paol_token'
const USUARIO_KEY = 'paol_usuario'

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) || '' } catch (e) { return '' }
}

export const getUsuarioGuardado = () => {
  try { return JSON.parse(localStorage.getItem(USUARIO_KEY) || 'null') } catch (e) { return null }
}

export const guardarSesion = (token, usuario) => {
  try {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario))
  } catch (e) {}
}

export const borrarSesion = () => {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USUARIO_KEY)
  } catch (e) {}
}

// Fetch con el token de la sesión. Si el backend responde 401, avisa a la app
// para que vuelva a la pantalla de login.
export async function apiFetch(path, options = {}) {
  const token = getToken()
  const headers = { ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API}${path}`, { ...options, headers })
  if (res.status === 401) {
    borrarSesion()
    window.dispatchEvent(new Event('paol:sesion-vencida'))
  }
  return res
}

export const wsTableroUrl = (sesion) =>
  `${WS_URL}?s=${encodeURIComponent(sesion)}&token=${encodeURIComponent(getToken())}`

export const wsNotificacionesUrl = () =>
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${API_HOST}/ws/notificaciones?token=${encodeURIComponent(getToken())}`
