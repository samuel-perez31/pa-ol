import React from 'react'
import PedidoManuscrito from './PedidoManuscrito.jsx'

// Textura de papel (ruido sutil), igual que en la carpeta de devueltos
const RUIDO = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")"

// Gancho metálico del borde de la tapa (uno por lado)
function Gancho({ lado = 'izq' }) {
  const izq = lado === 'izq'
  const idMetal = `metal-${lado}`
  const idSombra = `sombra-${lado}`
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute top-1/2 z-30 -translate-y-1/2 ${izq ? '-left-[26px]' : '-right-[26px]'}`}
    >
      <svg width="36" height="132" viewBox="0 0 36 132" className={izq ? '' : '-scale-x-100'}>
        <defs>
          <linearGradient id={idMetal} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#26231F" />
            <stop offset="22%" stopColor="#6C675F" />
            <stop offset="45%" stopColor="#D7D2C9" />
            <stop offset="62%" stopColor="#8E887F" />
            <stop offset="82%" stopColor="#4B4740" />
            <stop offset="100%" stopColor="#1E1B18" />
          </linearGradient>
          <filter id={idSombra} x="-60%" y="-40%" width="220%" height="180%">
            <feDropShadow dx="2" dy="3" stdDeviation="2.5" floodColor="#071628" floodOpacity="0.5" />
          </filter>
        </defs>

        <g filter={`url(#${idSombra})`}>
          {/* planchuela que abraza el borde de la tapa */}
          <rect x="17" y="8" width="15" height="116" rx="7.5" fill={`url(#${idMetal})`} />
          {/* gancho que sale hacia afuera */}
          <path d="M20 58 C5 58 5 84 20 84" fill="none" stroke={`url(#${idMetal})`} strokeWidth="6" strokeLinecap="round" />
        </g>

        {/* brillo y remaches */}
        <rect x="21" y="12" width="3" height="108" rx="1.5" fill="#F1EEE8" opacity="0.32" />
        <circle cx="24.5" cy="24" r="2.2" fill="#171512" stroke="#C9C4BA" strokeWidth="0.7" />
        <circle cx="24.5" cy="108" r="2.2" fill="#171512" stroke="#C9C4BA" strokeWidth="0.7" />
      </svg>
    </div>
  )
}

function Pagina({ lado = 'izq', numero, children }) {
  const izq = lado === 'izq'
  return (
    <div
      className={`relative flex min-h-[520px] flex-col px-6 pb-12 pt-7 sm:px-8 sm:pt-9 lg:px-10 lg:pt-10 ${
        izq
          ? 'bg-[linear-gradient(90deg,#F6F3EB_0%,#F6F3EB_78%,#EFE9DD_93%,#E3DCCD_100%)]'
          : 'border-t border-[rgba(7,22,40,0.08)] bg-[linear-gradient(270deg,#F6F3EB_0%,#F6F3EB_78%,#EFE9DD_93%,#E3DCCD_100%)] lg:border-l lg:border-t-0'
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply"
        style={{ backgroundImage: RUIDO }}
      />

      {children}

      <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 font-['Caveat'] text-base text-tinta/40">
        {numero}
      </span>
    </div>
  )
}

export default function LibroPedidos({ pedidos = [], onAccion }) {
  const mitad = Math.ceil(pedidos.length / 2)
  const izquierda = pedidos.slice(0, mitad)
  const derecha = pedidos.slice(mitad)

  return (
    <div className="mx-auto w-full max-w-5xl px-8 sm:px-10">
      <div className="relative">
        <Gancho lado="izq" />
        <Gancho lado="der" />

        {/* Tapa */}
        <div className="relative rounded-[18px] bg-[linear-gradient(180deg,#5F5D56_0%,#3A3734_45%,#201E1D_100%)] p-3 shadow-[0_34px_70px_rgba(7,22,40,0.42)] ring-1 ring-[#121110]/50 sm:p-4">
          <div
            className="pointer-events-none absolute inset-0 rounded-[18px] opacity-[0.16] mix-blend-overlay"
            style={{ backgroundImage: RUIDO }}
          />
          <div className="pointer-events-none absolute inset-[7px] rounded-[13px] border border-[#E5DCB7]/10" />

          {/* Páginas */}
          <div className="relative grid grid-cols-1 overflow-hidden rounded-[10px] shadow-[inset_0_0_0_1px_rgba(7,22,40,0.1)] lg:grid-cols-2">
            {/* ---------- Página izquierda ---------- */}
            <Pagina lado="izq" numero="1">
              <div className="relative">
                <div className="mb-6">
                  <h2 className="font-['Caveat'] text-[36px] leading-none text-tinta">Pedidos</h2>
                  <p className="mt-1 font-['Patrick_Hand'] text-[14px] leading-none text-tinta/60">
                    esperando confirmación · {pedidos.length}
                  </p>
                  <svg className="mt-2 h-[6px] w-28 text-[rgba(132,13,39,0.6)]" viewBox="0 0 120 6" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M2 4C22 1 42 5 62 3S101 1 118 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              <div className="relative flex flex-1 flex-col">
                {izquierda.length ? (
                  <div>
                    {izquierda.map((p, i) => (
                      <PedidoManuscrito
                        key={p.id}
                        pedido={p}
                        onAccion={onAccion}
                        index={i}
                        ultima={i === izquierda.length - 1}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center pb-8">
                    <p className="text-center font-['Caveat'] text-3xl leading-tight text-tinta/55">
                      No hay pedidos<br />por confirmar
                    </p>
                  </div>
                )}
              </div>
            </Pagina>

            {/* ---------- Página derecha ---------- */}
            <Pagina lado="der" numero="2">
              <div className="relative flex flex-1 flex-col">
                {derecha.length ? (
                  <div>
                    {derecha.map((p, i) => (
                      <PedidoManuscrito
                        key={p.id}
                        pedido={p}
                        onAccion={onAccion}
                        index={izquierda.length + i}
                        ultima={i === derecha.length - 1}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center pb-8">
                    <span className="font-['Caveat'] text-3xl text-tinta/30">—</span>
                  </div>
                )}
              </div>
            </Pagina>

            {/* Lomo / sombra central */}
            <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-16 -translate-x-1/2 bg-[linear-gradient(90deg,transparent_0%,rgba(7,22,40,0.14)_38%,rgba(7,22,40,0.26)_50%,rgba(7,22,40,0.14)_62%,transparent_100%)] lg:block" />
            <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-[rgba(7,22,40,0.28)] lg:block" />
          </div>
        </div>
      </div>
    </div>
  )
}
