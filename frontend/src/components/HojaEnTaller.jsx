import React, { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../api.js'
import './HojaEnTaller.css'

const fmtFecha = (f) => {
  if (!f) return ''
  const s = String(f)
  const fd = s.includes('T') ? s.split('T')[0] : s.includes(' ') ? s.split(' ')[0] : s
  const p = fd.split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : fd
}

// Inclinaciones suaves para que la hoja no quede perfectamente alineada.
const ROTACIONES = [-0.35, 0.24, -0.16, 0.38, -0.26, 0.12]
const rotacion = (n) => ROTACIONES[Math.abs(Number(n) || 0) % ROTACIONES.length]

export default function HojaEnTaller({
  pedidos = [],
  pagina = 0,
  totalPaginas = 1,
  onCambiarPagina = () => {},
  onAccion = () => {},
}) {
  const [cargandoId, setCargandoId] = useState(null)
  const paginaAnterior = useRef(pagina)
  const direccion = pagina > paginaAnterior.current
    ? 'adelante'
    : pagina < paginaAnterior.current
      ? 'atras'
      : 'inicial'

  useEffect(() => {
    paginaAnterior.current = pagina
  }, [pagina])

  const toggleItem = async (pedido, nombre, cantidad) => {
    try {
      await apiFetch(`/api/pedidos/${pedido.id}/toggle-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, cantidad }),
      })
      onAccion(pedido.id, 'refresh')
    } catch (e) {}
  }

  const cargarDevolucion = async (pedido) => {
    setCargandoId(pedido.id)
    try {
      const res = await apiFetch(`/api/pedidos/${pedido.id}/cargar-devolucion`, { method: 'POST' })
      const data = await res.json()
      const mensajes = {
        completa: '✅ Devolución COMPLETA - Todos los items devueltos (Stock actualizado)',
        parcial: '⚠️ Devolución PARCIAL - Algunos items faltan por devolver',
        ninguno: '❌ Devolución NINGUNA - No se devolvió ningún item',
      }
      alert(`${mensajes[data.tipo_devolucion]}\n\nItems devueltos: ${data.items_devueltos} de ${data.total_items}`)
      onAccion(pedido.id, 'refresh')
    } catch (e) {
      alert('Error al procesar la devolución')
    } finally {
      setCargandoId(null)
    }
  }

  const irAnterior = () => onCambiarPagina(Math.max(0, pagina - 1))
  const irSiguiente = () => onCambiarPagina(Math.min(totalPaginas - 1, pagina + 1))

  return (
    <article
      className="hoja-taller-wrap"
      style={{ '--hoja-rot': `${rotacion(pagina)}deg` }}
    >
      <div className="hoja-taller">
        <div className="hoja-taller-contenido">
          <div className="hoja-taller-cabecera">
            <span className="hoja-taller-hoja-num">
              {totalPaginas > 1 ? `Hoja ${pagina + 1} de ${totalPaginas}` : 'Hoja de taller'}
            </span>

            {totalPaginas > 1 && (
              <nav className="hoja-taller-paginacion" aria-label="Cambiar de hoja">
                <button
                  type="button"
                  onClick={irAnterior}
                  disabled={pagina === 0}
                  className="hoja-taller-pagina-btn"
                  aria-label="Hoja anterior"
                  title="Hoja anterior"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={irSiguiente}
                  disabled={pagina >= totalPaginas - 1}
                  className="hoja-taller-pagina-btn"
                  aria-label="Hoja siguiente"
                  title="Hoja siguiente"
                >
                  →
                </button>
              </nav>
            )}
          </div>

          <div key={pagina} className={`hoja-taller-pedidos hoja-taller-pedidos-${direccion}`}>
            {pedidos.map((pedido) => {
              const fecha = pedido.fecha_entrega || pedido.fecha_solicitud
              const hora = pedido.fecha_hora_entrega || pedido.fecha_hora_solicitud || ''
              const notas = String(pedido.notas || '').replace(/\[EN_TALLER\]/g, '').trim()
              const cargando = cargandoId === pedido.id

              return (
                <div key={pedido.id} className="hoja-taller-pedido">
                  {/* ---------- Izquierda: datos del pedido y acciones ---------- */}
                  <div className="hoja-taller-pedido-info">
                    <div className="hoja-taller-pedido-titulo">
                      Pedido <span className="hoja-taller-pedido-id">#{pedido.id}</span>
                    </div>
                    <div className="hoja-taller-pedido-meta">
                      {fmtFecha(fecha)}{pedido.curso ? ` · ${pedido.curso}` : ''}
                    </div>
                    <div className="hoja-taller-pedido-meta">
                      👤 {pedido.profesor || pedido.alumno}
                      {pedido.dni ? ` · DNI ${pedido.dni}` : pedido.usuario ? ` · @${pedido.usuario}` : ''}
                      {hora ? ` · ${hora}` : ''}
                    </div>
                    {notas && <p className="hoja-taller-pedido-notas">{notas}</p>}

                    <div className="hoja-taller-acciones">
                      <button
                        type="button"
                        onClick={() => onAccion(pedido.id, 'devolver')}
                        className="hoja-taller-btn hoja-taller-btn-primario hoja-taller-btn-mini"
                      >
                        ↩ Devuelto completo
                      </button>
                      <button
                        type="button"
                        onClick={() => cargarDevolucion(pedido)}
                        disabled={cargando}
                        className="hoja-taller-btn hoja-taller-btn-secundario hoja-taller-btn-mini"
                      >
                        {cargando ? 'Procesando…' : '↺ Cargar devolución'}
                      </button>
                    </div>
                  </div>

                  {/* ---------- Derecha: materiales del pedido ---------- */}
                  <ul className="hoja-taller-items">
                    {(pedido.items || []).map((item, idx) => (
                      <li key={idx} className="hoja-taller-item">
                        <button
                          type="button"
                          onClick={() => toggleItem(pedido, item.nombre, item.cantidad)}
                          className={`hoja-taller-check ${item.devuelto ? 'hoja-taller-check-hecho' : ''}`}
                          title={item.devuelto ? 'Destachar (marcar como no devuelto)' : 'Tachar (marcar como devuelto)'}
                          aria-label={item.devuelto ? `Destachar ${item.nombre}` : `Tachar ${item.nombre}`}
                        >
                          {item.devuelto ? '✓' : '✎'}
                        </button>
                        <span className={`hoja-taller-item-texto ${item.devuelto ? 'hoja-taller-item-devuelto' : ''}`}>
                          {item.cantidad}× {item.nombre}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </article>
  )
}
