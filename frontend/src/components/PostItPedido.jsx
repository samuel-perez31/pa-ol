import React from 'react'

const C = {
  opulent: '#071628',
  neutral500: 'rgba(7,22,40,0.78)',
  neutral400: 'rgba(7,22,40,0.64)',
}

const fmtFecha = (f) => {
  if (!f) return ''
  const s = String(f)
  const fd = s.includes('T') ? s.split('T')[0] : s.includes(' ') ? s.split(' ')[0] : s
  const p = fd.split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : fd
}

const COLORES = [
  '#DBD3B7',
  '#D6D3B4',
  '#E5DCB7',
  '#CFCDAB',
  '#C7C7A3',
]

const PATRONES = [
  'none',
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='10' cy='14' r='0.6' fill='%23637758' opacity='0.14'/%3E%3Ccircle cx='26' cy='20' r='0.6' fill='%23637758' opacity='0.14'/%3E%3Ccircle cx='18' cy='30' r='0.6' fill='%23637758' opacity='0.14'/%3E%3C/svg%3E\")",
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cline x1='0' y1='22' x2='60' y2='22' stroke='%23637758' stroke-width='0.4' opacity='0.09'/%3E%3Cline x1='0' y1='42' x2='60' y2='42' stroke='%23637758' stroke-width='0.4' opacity='0.09'/%3E%3C/svg%3E\")",
]

export default function PostItPedido({ pedido, onAccion, accion = 'entregar', label = '✅ Confirmar pedido' }) {
  const fecha = pedido.fecha_solicitud
  const hora = pedido.fecha_hora_solicitud

  const rotacion = pedido.id % 7 === 0 ? '-rotate-2' : pedido.id % 7 === 1 ? 'rotate-2' : pedido.id % 7 === 2 ? '-rotate-[1.5deg]' : pedido.id % 7 === 3 ? 'rotate-[1.8deg]' : pedido.id % 7 === 4 ? '-rotate-[1.2deg]' : pedido.id % 7 === 5 ? 'rotate-[1.4deg]' : '-rotate-[0.8deg]'
  const color = COLORES[pedido.id % COLORES.length]
  const patron = PATRONES[pedido.id % PATRONES.length]
  const inclinacion = pedido.id % 4 === 0 ? '-rotate-[10deg]' : pedido.id % 4 === 1 ? 'rotate-[8deg]' : pedido.id % 4 === 2 ? '-rotate-[12deg]' : 'rotate-[9deg]'

  return (
    <div className={`relative ${rotacion} mb-3`}>
      {/* Chincheta inclinada más estética */}
      <div className={`absolute -top-5 left-1/2 -translate-x-1/2 z-40 pointer-events-none ${inclinacion}`}>
        <svg width="20" height="30" viewBox="0 0 20 30" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Cabeza redonda con brillo */}
          <ellipse cx="10" cy="6" rx="8" ry="6.5" fill="url(#headGrad)" />
          <ellipse cx="10" cy="5" rx="5" ry="4" fill="url(#shine)" opacity="0.6" />
          <circle cx="10" cy="6" r="2.2" fill="#071628" />
          <circle cx="10" cy="6" r="1.2" fill="#071628" />
          {/* Cuerpo */}
          <rect x="8.5" y="11" width="3" height="11" rx="1.5" fill="url(#pinGrad)" />
          <rect x="8.8" y="11.5" width="0.8" height="10" rx="0.4" fill="rgba(229,220,183,0.25)" />
          {/* Punta */}
          <path d="M10 22L10 26" stroke="#071628" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M10 25L10 26" stroke="#071628" strokeWidth="1.6" strokeLinecap="round" />
          <defs>
            <linearGradient id="headGrad" x1="10" y1="0" x2="10" y2="12.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#E38E38" />
              <stop offset="0.6" stopColor="#C85956" />
              <stop offset="1" stopColor="#AC303C" />
            </linearGradient>
            <radialGradient id="shine" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(9 4) rotate(90) scale(4 3)">
              <stop stopColor="#E5DCB7" />
              <stop offset="1" stopColor="#E5DCB7" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="pinGrad" x1="10" y1="11" x2="10" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#C85956" />
              <stop offset="0.5" stopColor="#AC303C" />
              <stop offset="1" stopColor="#840D27" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Post-it with folded corner */}
      <div
        className="relative shadow-[0_14px_28px_rgba(7,22,40,0.2)] p-5 pt-8 flex flex-col justify-between min-h-[240px] overflow-hidden"
        style={{
          backgroundColor: color,
          backgroundImage: patron,
          backgroundSize: 'auto',
          borderRadius: '1px',
        }}
      >
        {/* Folded corner with realistic shadow */}
        <div className="absolute bottom-0 right-0 w-[30px] h-[30px]">
          <svg width="30" height="30" viewBox="0 0 30 30" className="absolute bottom-0 right-0">
            <path d="M30 0L30 30L0 30L30 0Z" fill={color} />
            <path d="M30 6L24 12L30 18L30 6Z" fill="rgba(7,22,40,0.05)" />
            <path d="M30 0L30 30L0 30L30 0Z" fill="url(#foldGrad)" opacity="0.16" />
            <defs>
              <linearGradient id="foldGrad" x1="15" y1="15" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                <stop stopColor="#071628" stopOpacity="0" />
                <stop offset="0.7" stopColor="#071628" stopOpacity="0.12" />
                <stop offset="1" stopColor="#071628" stopOpacity="0.28" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div>
          <div className="font-bold text-base leading-tight tracking-tight" style={{ color: C.opulent }}>Pedido #{pedido.id}</div>
          <div className="text-xs mt-1" style={{ color: C.neutral500 }}>
            {fmtFecha(fecha)}{pedido.curso ? ` · ${pedido.curso}` : ''}
          </div>
          <div className="text-xs mt-1" style={{ color: C.neutral400 }}>
            👤 {pedido.alumno} · DNI {pedido.dni}{hora ? ` · ${hora}` : ''}
          </div>
          {pedido.notas && (
            <p className="text-xs italic mt-1 leading-snug" style={{ color: C.neutral500 }}>{pedido.notas}</p>
          )}
          <ul className="mt-3 text-sm space-y-1.5" style={{ color: C.opulent }}>
            {(pedido.items || []).map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span className="leading-tight">{item.cantidad}× {item.nombre}</span>
              </li>
            ))}
          </ul>
        </div>
        <button 
          onClick={() => onAccion(pedido.id, accion)} 
          className="mt-5 w-full bg-[#3E583F] hover:bg-[#637758] text-papel font-bold py-2 rounded-[1px] shadow-[0_2px_4px_rgba(7,22,40,0.12)] transition-all active:translate-y-[1px]"
        >
          {label}
        </button>
      </div>
    </div>
  )
}
