import React from 'react'

// "2026-10-21T08:15:49" -> "21/10/2026"
const fmtFecha = (f) => {
  if (!f) return ''
  const s = String(f)
  const fd = s.includes('T') ? s.split('T')[0] : s.includes(' ') ? s.split(' ')[0] : s
  const p = fd.split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : fd
}

// Cada entrada arranca con una inclinación apenas distinta, como cuando se
// escribe a mano en una hoja.
const ROTACIONES = [-0.35, 0.22, -0.12, 0.3, -0.25, 0.15]

export default function PedidoManuscrito({ pedido, onAccion, index = 0, ultima = false }) {
  const items = pedido.items || []
  const notas = String(pedido.notas || '').replace(/\[EN_TALLER\]/g, '').trim()
  const hora = pedido.fecha_hora_solicitud
  const rot = ROTACIONES[index % ROTACIONES.length]

  return (
    <article className="relative" style={{ transform: `rotate(${rot}deg)` }}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-['Caveat'] text-[28px] leading-none text-tinta">
          Pedido {pedido.id}
        </h3>
        <span className="font-['Patrick_Hand'] text-[14px] leading-none text-tinta/50">
          {fmtFecha(pedido.fecha_solicitud)}{hora ? ` · ${hora}` : ''}
        </span>
      </div>

      <p className="mt-1.5 font-['Patrick_Hand'] text-[17px] leading-snug text-tinta">
        {pedido.alumno}
      </p>
      <p className="font-['Patrick_Hand'] text-[14px] leading-snug text-tinta/55">
        DNI {pedido.dni}{pedido.curso ? ` · ${pedido.curso}` : ''}
      </p>

      <ul className="mt-2 space-y-[1px] font-['Patrick_Hand'] text-[16px] leading-[1.4] text-tinta">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-[2px] text-[12px] leading-none text-verdeoscuro/60">•</span>
            <span>
              <span className="tabular-nums">{item.cantidad}×</span> {item.nombre}
            </span>
          </li>
        ))}
      </ul>

      {notas && (
        <p className="mt-1.5 font-['Caveat'] text-[19px] leading-tight text-tinta/65">
          nota: {notas}
        </p>
      )}

      <button
        type="button"
        onClick={() => onAccion(pedido.id, 'entregar')}
        title="Confirmar pedido y pasarlo a Pendientes"
        className="group mt-3 inline-flex cursor-pointer items-center gap-2 font-['Caveat'] text-[20px] leading-none text-verdeoscuro transition-colors hover:text-[#840D27]"
      >
        <span className="flex h-[17px] w-[17px] items-center justify-center rounded-full border border-verdeoscuro/45 font-['Patrick_Hand'] text-[11px] leading-none transition-colors group-hover:border-[#840D27]/50">
          ✓
        </span>
        <span className="relative">
          confirmar pedido
          <svg
            className="absolute -bottom-[4px] left-0 h-[5px] w-full text-verde/60 transition-colors group-hover:text-[#840D27]/50"
            viewBox="0 0 120 6"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M1 4C21 1 41 5 61 3S101 1 119 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      {!ultima && (
        <svg className="my-4 block h-[8px] w-full text-tinta/15" viewBox="0 0 400 8" preserveAspectRatio="none" aria-hidden="true">
          <path d="M2 4C60 1 120 7 180 4S320 1 398 5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      )}
    </article>
  )
}
