import React from 'react'

// Textura de papel (ruido sutil) reutilizada en las dos mitades
const RUIDO = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")"

const COLORES_POSTIT = ['bg-[#EFEAA7]']
const ROTACIONES = ['-rotate-1', 'rotate-1', '-rotate-[0.8deg]', 'rotate-[0.8deg]', '-rotate-[0.5deg]', 'rotate-[0.5deg]']

const fechaCorta = (iso) => {
  if (!iso) return ''
  return String(iso).split('T')[0].split('-').reverse().join('/')
}

const horaDe = (p) => p.fecha_hora_devolucion || (p.fecha_devolucion ? String(p.fecha_devolucion).slice(11, 16) : '')

// Reparte los devueltos del día entre las cuatro zonas de la carpeta, sin
// repetir ninguno y según el tamaño del pedido:
//   · pedidos largos (4+ herramientas o 5+ unidades) → hoja de archivos (8)
//   · pedidos cortos (1 o 2 herramientas)            → las dos tarjetas (2 + 2)
//   · pedidos medianos (3 herramientas)              → post-its (4)
// Si una zona se llena, lo que sobra pasa a la que tenga lugar, así nunca se
// pierde ningún pedido. El orden dentro de cada zona es del más reciente al más
// viejo.
//
// La carpeta tiene lugar para 16 devoluciones (8 + 4 + 2 + 2). Cuando entran
// más, la carpeta se renueva sola: muestra siempre las 16 más recientes y las
// que quedan afuera siguen en el Historial (no se borra nada).
const LARGO_DESDE_ITEMS = 4
const LARGO_DESDE_UNIDADES = 5
const CAPACIDAD_CARPETA = 8 + 4 + 2 + 2

const cantHerramientas = (p) => (p.items || []).reduce((s, it) => s + (Number(it.cantidad) || 0), 0)
const esPedidoLargo = (p) =>
  (p.items || []).length >= LARGO_DESDE_ITEMS || cantHerramientas(p) >= LARGO_DESDE_UNIDADES

export const repartirDevueltos = (lista) => {
  const ordenados = [...(lista || [])].sort((a, b) => {
    const ta = new Date(a.fecha_hora_devolucion || a.fecha_devolucion || a.fecha_solicitud || 0).getTime()
    const tb = new Date(b.fecha_hora_devolucion || b.fecha_devolucion || b.fecha_solicitud || 0).getTime()
    return tb - ta
  })
  const visibles = ordenados.slice(0, CAPACIDAD_CARPETA)

  const fichas = []
  const postits = []
  const ranura = []
  const suelta = []
  const usados = new Set()

  const meter = (zona, tope, candidatos) => {
    for (const p of candidatos) {
      if (zona.length >= tope) break
      if (usados.has(p.id)) continue
      zona.push(p)
      usados.add(p.id)
    }
  }

  const cortos = visibles.filter((p) => !esPedidoLargo(p) && (p.items || []).length <= 2)
  const largos = visibles.filter(esPedidoLargo)

  // Las dos tarjetas reciben los pedidos con pocas herramientas, alternando.
  const tarjetas = [ranura, suelta]
  let turno = 0
  for (const p of cortos) {
    const libres = tarjetas.filter((z) => z.length < 2)
    if (!libres.length) break
    libres[turno % libres.length].push(p)
    usados.add(p.id)
    turno += 1
  }

  // La hoja de archivos se queda con los pedidos largos.
  meter(fichas, 8, largos)

  // Los post-its, con los medianos (3 herramientas) primero.
  const sobrantes = visibles.filter((p) => !usados.has(p.id))
  const medianos = sobrantes.filter((p) => (p.items || []).length === 3)
  const otros = sobrantes.filter((p) => (p.items || []).length !== 3)
  meter(postits, 4, [...medianos, ...otros])

  // Si todavía sobra, completa primero la hoja y los post-its y recién después
  // las tarjetas (que tienen menos lugar). Nada se pierde.
  visibles
    .filter((p) => !usados.has(p.id))
    .forEach((p) => {
      const destino =
        [fichas, postits, ranura, suelta].find((z, i) => z.length < [8, 4, 2, 2][i]) ||
        [fichas, postits].sort((a, b) => a.length - b.length)[0]
      destino.push(p)
      usados.add(p.id)
    })

  return {
    fichas,
    postits,
    ranura,
    suelta,
    total: ordenados.length,
    mostrados: visibles.length,
    ocultos: ordenados.length - visibles.length,
  }
}

const resumenItems = (p, max = 3) => {
  const items = p.items || []
  const texto = items.slice(0, max).map((it) => `${it.cantidad}× ${it.nombre}`).join(' · ')
  return items.length > max ? `${texto} · +${items.length - max}` : texto
}

const notasLimpiasDevuelto = (p) => {
  if (!p?.notas) return ''
  let n = String(p.notas)
  n = n.replace(/\[EN_TALLER\]/g, '')
  const idx = n.indexOf('[Devolución')
  if (idx >= 0) n = n.slice(0, idx)
  n = n.replace(/\r/g, ' ')
  n = n.replace(/\n+/g, ' ')
  return n.trim()
}

// Ficha sobria que va sobre la hoja de archivos (mitad izquierda)
function FichaArchivo({ pedido: p }) {
  const items = p.items || []
  const notas = notasLimpiasDevuelto(p)
  return (
    <div className="relative bg-[#EFEAA7] border border-[rgba(99,119,88,0.5)] p-3 shadow-[0_10px_24px_rgba(7,22,40,0.15)]">
      <div className="font-['Patrick_Hand'] text-base leading-tight text-[#071628]">Pedido {p.id}</div>
      <div className="mt-0.5 break-words font-['Patrick_Hand'] text-[13px] leading-tight text-[#071628]">
        {p.alumno}
      </div>
      <div className="mt-0.5 text-[10px] text-[#071628]">
        {fechaCorta(p.fecha_devolucion || p.fecha_solicitud)}
        {horaDe(p) ? ` · ${horaDe(p)}` : ''}
      </div>
      <ul className="mt-2 text-xs space-y-1 text-[#071628]">
        {items.slice(0, 3).map((it, ix) => (
          <li key={ix}>• {it.cantidad}× {it.nombre}</li>
        ))}
        {items.length > 3 && <li className="text-[#071628]">+ {items.length - 3} más</li>}
      </ul>
      {notas && (
        <div className="mt-2 break-words text-[11px] leading-snug text-[#071628]">
          <span className="italic">Otros materiales / Insumos:</span> {notas}
        </div>
      )}
    </div>
  )
}

// Post-it cuadrado
function PostItDevuelto({ pedido: p, indice: i }) {
  const color = COLORES_POSTIT[i % COLORES_POSTIT.length]
  const rot = ROTACIONES[i % ROTACIONES.length]
  const notas = notasLimpiasDevuelto(p)
  return (
    <div
      className={`relative ${color} border border-[rgba(99,119,88,0.45)] p-3 shadow-[0_14px_30px_rgba(7,22,40,0.18)] ${rot} aspect-square flex flex-col overflow-hidden`}
    >
      <div className="absolute bottom-0 right-0 w-[16px] h-[16px] bg-[linear-gradient(225deg,transparent_50%,rgba(7,22,40,0.08)_50%)]" />

      <div className="flex items-baseline justify-between gap-2">
        <div className="font-['Caveat'] text-xl leading-none text-[#071628]">Pedido {p.id}</div>
        <div className="font-['Patrick_Hand'] text-xs text-[#071628] whitespace-nowrap">
          {fechaCorta(p.fecha_devolucion || p.fecha_solicitud)}
          {horaDe(p) ? ` · ${horaDe(p)}` : ''}
        </div>
      </div>

      <div className="mt-1.5 break-words font-['Patrick_Hand'] text-[13px] leading-tight text-[#071628]">{p.alumno}</div>
      <div className="font-['Patrick_Hand'] text-[11px] text-[#071628]">DNI {p.dni}</div>

      <ul className="mt-1.5 flex-1 space-y-0.5 overflow-hidden text-[11px] leading-snug text-[#071628]">
        {(p.items || []).slice(0, 4).map((it, ix) => (
          <li key={ix} className="truncate">• {it.cantidad}× {it.nombre}</li>
        ))}
        {(p.items || []).length > 4 && <li className="text-[#071628]">+ {(p.items || []).length - 4} más</li>}
      </ul>

      {notas && (
        <div className="mt-1 break-words text-[10px] leading-snug text-[#071628]">
          <span className="italic">Otros materiales / Insumos:</span> {notas}
        </div>
      )}

      <div className="mt-1 text-right font-['Caveat'] text-base leading-none -rotate-2 text-[#071628]">~ devuelto ~</div>
    </div>
  )
}

// Tarjeta de presentación: formato cartulina, horizontal (9 × 5,5 aprox.)
const FONDO_TARJETA = {
  backgroundImage:
    'linear-gradient(135deg, rgba(229,220,183,0.95) 0%, rgba(219,211,183,0.95) 55%, rgba(187,184,140,0.95) 100%)',
}

function TarjetaPresentacion({ pedidos = [] }) {
  return (
    <div
      className="relative overflow-hidden bg-[#E5DCB7] border border-[rgba(99,119,88,0.55)] shadow-[0_16px_38px_rgba(7,22,40,0.22)] p-4 sm:p-5 min-h-[236px] flex"
      style={FONDO_TARJETA}
    >
      {/* Filete decorativo */}
      <div className="absolute inset-[6px] border border-[rgba(172,48,60,0.3)] pointer-events-none" />
      {/* Lomo */}
      <div className="absolute left-0 top-0 h-full w-[3px] bg-[linear-gradient(180deg,#AC303C_0%,#840D27_100%)]" />

      <div className="relative flex flex-1 flex-col">
        <div className="grid grid-cols-[1.05fr_1fr] gap-3 sm:gap-4">
          {/* Marca */}
          <div className="min-w-0">
            <div className="font-['Caveat'] text-[30px] leading-none text-[#071628]">Sistema Pañol</div>
            <div className="mt-1 text-[9px] uppercase tracking-[5px] text-[#071628]">
              Herramientas · Taller
            </div>
            <div className="mt-2 h-[1px] w-16 bg-[repeating-linear-gradient(90deg,rgba(99,119,88,0.4)_0_8px,transparent_8px_14px)]" />
          </div>

          {/* Datos o pedidos, separados por una línea vertical */}
          <div className="min-w-0 border-l border-dashed border-[rgba(99,119,88,0.35)] pl-3">
            {pedidos.length ? (
              <div className="space-y-2">
                {pedidos.map((p) => {
                  const notas = notasLimpiasDevuelto(p)
                  return (
                    <div key={p.id} className="min-w-0">
                      <div className="flex items-baseline justify-between gap-1">
                        <span className="font-['Patrick_Hand'] text-[14px] leading-none text-[#071628]">
                          Pedido {p.id}
                        </span>
                        <span className="shrink-0 text-[9px] uppercase tracking-[2px] text-[#071628]">
                          {horaDe(p)}
                        </span>
                      </div>
                      <div className="break-words font-['Patrick_Hand'] text-[12px] leading-tight text-[#071628]">
                        <span className="text-[#071628]">{String(p.alumno || '').split(',')[0]}</span>
                        <span className="text-[#071628]"> — </span>
                        <span className="text-[11px] text-[#071628]">{resumenItems(p, 4)}</span>
                      </div>
                      {notas && (
                        <div className="mt-1 break-words text-[10px] leading-snug text-[#071628]">
                          <span className="italic">Otros materiales / Insumos:</span> {notas}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <div className="text-[8px] uppercase tracking-[3px] text-[#071628]">Área</div>
                  <div className="font-['Patrick_Hand'] text-base leading-tight text-[#071628]">Pañol</div>
                </div>
                <div>
                  <div className="text-[8px] uppercase tracking-[3px] text-[#071628]">Registro</div>
                  <div className="font-['Patrick_Hand'] text-base leading-tight text-[#071628]">
                    Préstamos y devoluciones
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pie de la tarjeta */}
        <div className="mt-auto flex items-end justify-between pt-3">
          <span className="font-['Caveat'] text-xl leading-none text-[#071628]">gracias</span>
          <span className="text-[9px] uppercase tracking-[4px] text-[#071628]">— archivo —</span>
        </div>
      </div>
    </div>
  )
}

// Tarjeta / hoja del archivo: encabezado, regla roja y renglones azules
// (formato tomado de la hoja de referencia)
function TarjetaHoja({ pedidos = [] }) {
  return (
    <div className="relative overflow-hidden bg-[#E5DCB7] border border-[rgba(99,119,88,0.55)] shadow-[0_16px_38px_rgba(7,22,40,0.22)] min-h-[236px] flex flex-col">
      {/* Lomo / margen */}
      <div className="absolute left-0 top-0 h-full w-[3px] bg-[linear-gradient(180deg,#AC303C_0%,#840D27_100%)]" />

      {/* Encabezado */}
      <div className="pl-5 pr-4 pt-3 sm:pl-6 sm:pt-4">
        <div className="font-['Caveat'] text-[27px] leading-none text-[#071628]">Sistema Pañol</div>
        <div className="mt-1 text-[9px] uppercase tracking-[5px] text-[#071628]">
          Herramientas · Taller
        </div>
      </div>

      {/* Regla roja del encabezado */}
      <div className="mt-2 h-[3px] bg-[rgba(132,13,39,0.8)] shadow-[0_1px_0_rgba(132,13,39,0.2)]" />

      {/* Renglones azules con las anotaciones encima */}
      <div
        className="relative flex-1 pl-5 pr-4 sm:pl-6"
        style={{
          backgroundImage:
            'repeating-linear-gradient(180deg, transparent 0 21px, rgba(62,88,63,0.3) 21px 22px)',
        }}
      >
        <div className="font-['Patrick_Hand'] text-[14px] leading-[22px] text-[#071628]">
          {pedidos.length ? (
            pedidos.map((p) => {
              const notas = notasLimpiasDevuelto(p)
              return (
                <div key={p.id} className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-['Caveat'] text-[19px] leading-[22px]">Pedido {p.id}</span>
                    <span className="shrink-0 text-[10px] leading-[22px] tracking-[1px] text-[#071628]">
                      {horaDe(p)}
                    </span>
                  </div>
                  <div className="break-words text-[13px] leading-[22px] text-[#071628]">
                    {String(p.alumno || '').split(',')[0]} — {resumenItems(p, 4)}
                  </div>
                  {notas && (
                    <div className="break-words text-[11px] leading-[18px] text-[#071628]">
                      <span className="italic">Otros materiales / Insumos:</span> {notas}
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="w-[52px] shrink-0 text-[7px] uppercase tracking-[3px] leading-[22px] text-[#071628]">
                  Área
                </span>
                <span>Pañol</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="w-[52px] shrink-0 text-[7px] uppercase tracking-[3px] leading-[22px] text-[#071628]">
                  Registro
                </span>
                <span>Préstamos y devoluciones</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Pie de la hoja */}
      <div className="flex items-end justify-between pl-5 pr-4 pb-2 sm:pl-6">
        <span className="font-['Caveat'] text-xl leading-none text-[#071628]">gracias</span>
        <span className="text-[9px] uppercase tracking-[4px] text-[#071628]">— archivo —</span>
      </div>
    </div>
  )
}

const Vacio = ({ children = '—' }) => (
  <p className="py-6 text-center font-['Patrick_Hand'] text-sm text-[#071628]">{children}</p>
)

export default function CarpetaDevueltos({ lista = [] }) {
  const { fichas, postits, ranura, suelta, total, ocultos } = repartirDevueltos(lista)

  return (
    <div className="relative bg-[rgba(115,107,103,0.5)] rounded-[10px] shadow-[0_28px_64px_rgba(7,22,40,0.28)] border border-[#637758] overflow-hidden">
      {/* Lomo / etiqueta lateral */}
      <div className="absolute -right-3 top-14 w-11 h-56 bg-[#DBD3B7] rounded-r-[8px] border border-[#637758] border-l-0 shadow-[14px_20px_36px_rgba(7,22,40,0.22)] hidden lg:flex items-center justify-center">
        <span className="font-['Caveat'] uppercase tracking-[12px] text-[20px] rotate-180 [writing-mode:vertical-rl] text-[#071628]">
          Archivo
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* ---------------- Mitad izquierda: hoja de archivos ---------------- */}
        <div className="relative p-6 sm:p-10 border-b lg:border-b-0 lg:border-r border-dashed border-[rgba(99,119,88,0.45)]">
          <div className="absolute inset-0 opacity-[0.05] mix-blend-soft-light pointer-events-none" style={{ backgroundImage: RUIDO }} />
          <div className="relative h-full bg-[#DBD3B7] border border-[rgba(99,119,88,0.55)] shadow-[0_18px_42px_rgba(7,22,40,0.2)] p-6 sm:p-8 rotate-[-0.4deg]">
            <div className="absolute left-0 right-0 top-2 h-[1px] bg-[repeating-linear-gradient(90deg,transparent_0_12px,rgba(99,119,88,0.25)_12px_14px)]" />
            <div className="absolute left-0 right-0 bottom-2 h-[1px] bg-[repeating-linear-gradient(90deg,transparent_0_12px,rgba(99,119,88,0.25)_12px_14px)]" />

            <div className="mb-5 font-['Caveat'] text-3xl text-[#071628]">Devueltos hoy</div>

            {fichas.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fichas.map((p) => (
                  <FichaArchivo key={p.id} pedido={p} />
                ))}
              </div>
            ) : (
              <Vacio>{total ? 'Sin fichas en esta hoja' : 'Sin devoluciones'}</Vacio>
            )}
          </div>
        </div>

        {/* ---------------- Mitad derecha: post-its + dos tarjetas de presentación ---------------- */}
        <div className="relative p-6 sm:p-10">
          <div className="absolute inset-0 opacity-[0.05] mix-blend-soft-light pointer-events-none" style={{ backgroundImage: RUIDO }} />
          <div className="relative flex flex-col gap-6">
            {/* Bloque de post-its con pestaña arriba */}
            <div className="relative">
              <div className="absolute -top-2 left-6 h-4 w-28 bg-[#DBD3B7] rounded-t-sm border border-[#637758] border-b-0" />
              <div className="bg-[#DBD3B7] border border-[rgba(99,119,88,0.55)] p-4 shadow-[0_16px_38px_rgba(7,22,40,0.2)] rotate-[0.8deg]">
                {postits.length ? (
                  <div className="grid grid-cols-2 gap-3">
                    {postits.map((p, i) => (
                      <PostItDevuelto key={p.id} pedido={p} indice={i} />
                    ))}
                  </div>
                ) : (
                  <Vacio />
                )}
              </div>
            </div>

            {/* Ranura: una tarjeta de presentación asoma de la abertura */}
            <div className="relative mx-auto w-full max-w-[340px]">
              <div className="h-5 bg-[rgba(115,107,103,0.5)] rounded-t-md border border-[#637758] border-b-0" />
              <div className="relative bg-[#DBD3B7] border border-[#637758] border-t-0 p-3 shadow-[0_16px_38px_rgba(7,22,40,0.18)] -mt-1">
                <div className="absolute left-1/2 -translate-x-1/2 -top-[6px] h-[3px] w-24 rounded-full bg-[rgba(99,119,88,0.3)]" />
                <div className="pt-2">
                  <TarjetaHoja pedidos={ranura} />
                </div>
              </div>
            </div>

            {/* Tarjeta suelta sobre la carpeta, en formato tarjeta */}
            <div className="mx-auto w-full max-w-[360px] rotate-[-1deg]">
              <TarjetaPresentacion pedidos={suelta} />
            </div>
          </div>
        </div>
      </div>

      {/* Cuando la carpeta se llena, sigue con las devoluciones más recientes */}
      {ocultos > 0 && (
        <div className="relative border-t border-dashed border-[rgba(99,119,88,0.45)] px-6 py-2 text-right">
          <span className="font-['Patrick_Hand'] text-[11px] text-[#071628]">
            carpeta completa · {ocultos} {ocultos === 1 ? 'devolución sigue' : 'devoluciones siguen'} en el
            historial
          </span>
        </div>
      )}
    </div>
  )
}
