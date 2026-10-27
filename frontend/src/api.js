// Puerto del backend.
// - La app se sirve desde el propio backend (:8000) -> habla con :8000
// - En desarrollo (vite :5173) -> habla con :8000
// - Si se sirve desde otro puerto del backend (ej. :8001 en pruebas) -> usa ese
const puerto = window.location.port
const PUERTO_API = ['8000', '8001'].includes(puerto) ? puerto : '8000'

const API_HOST = `${window.location.hostname}:${PUERTO_API}`
export const API = `http://${API_HOST}`
export const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${API_HOST}/ws/tablero`
