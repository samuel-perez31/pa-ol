const API_HOST = `${window.location.hostname}:8000`
export const API = `http://${API_HOST}`
export const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${API_HOST}/ws/tablero`
