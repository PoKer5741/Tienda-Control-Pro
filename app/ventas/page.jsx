'use client';
import { useState, useEffect, Fragment } from 'react';
import { obtenerHistorialVentas } from '@/app/actions/ventasActions';
import { anularFacturaTransaccional } from '@/app/actions/anulacionesActions';
import SelectPremium from '@/components/SelectPremium';

export default function HistorialVentasPage() {
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [facturaExpandida, setFacturaExpandida] = useState(null);

  // Estados de Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [hayMasDatos, setHayMasDatos] = useState(true);
  const TAMANO_PAGINA = 50;

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroPago, setFiltroPago] = useState('Todos');

  useEffect(() => {
    cargarHistorial(paginaActual);
  }, [paginaActual]);

  const cargarHistorial = async (pagina) => {
    setCargando(true);
    const respuesta = await obtenerHistorialVentas(pagina, TAMANO_PAGINA);
    if (respuesta.success) {
      const datosNuevos = respuesta.datos || [];
      setFacturas(datosNuevos);
      // Si trajo menos registros que el límite, significa que es la última página
      setHayMasDatos(datosNuevos.length === TAMANO_PAGINA);
    } else {
      alert('Error al cargar historial: ' + respuesta.error);
    }
    setCargando(false);
  };

  const manejarAnulacion = async (id, numDoc) => {
    if (window.confirm(`¿Está seguro de que desea anular el documento ${numDoc} #${id}? Esta acción devolverá el stock al inventario.`)) {
      const res = await anularFacturaTransaccional(id);
      if (res.success) {
        cargarHistorial(paginaActual);
      } else {
        alert('Fallo al anular: ' + res.error);
      }
    }
  };

  const manejarPaginacion = (direccion) => {
    if (direccion === 'siguiente' && hayMasDatos) {
        setPaginaActual(prev => prev + 1);
    } else if (direccion === 'anterior' && paginaActual > 1) {
        setPaginaActual(prev => prev - 1);
    }
  };

  // Filtrado en el cliente para el bloque actual de 50 registros
  const facturasVisibles = facturas.filter(f => {
    const cumpleTexto = f.id.toString().includes(busqueda) || f.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase());
    const cumpleEstado = filtroEstado === 'Todos' || f.estado === filtroEstado;
    const cumplePago = filtroPago === 'Todos' || f.metodo_pago === filtroPago;
    
    const fechaDoc = f.fecha ? f.fecha.split(' ')[0] : '';
    const cumpleDesde = !fechaDesde || fechaDoc >= fechaDesde;
    const cumpleHasta = !fechaHasta || fechaDoc <= fechaHasta;

    return cumpleTexto && cumpleEstado && cumplePago && cumpleDesde && cumpleHasta;
  });

  const opcionesEstado = [
    { valor: 'Todos', etiqueta: 'Todos los Estados' },
    { valor: 'Completado', etiqueta: 'Completado' },
    { valor: 'Cancelado', etiqueta: 'Anulado / Cancelado' }
  ];

  const opcionesPago = [
    { valor: 'Todos', etiqueta: 'Cualquier Medio' },
    { valor: 'Efectivo', etiqueta: 'Efectivo' },
    { valor: 'Tarjeta', etiqueta: 'Tarjeta / Datafono' },
    { valor: 'SINPE', etiqueta: 'SINPE Móvil' }
  ];

  return (
    <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--x-text-main)' }}>Registro de Transacciones</h2>
          <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: 'var(--x-text-muted)' }}>Historial fiscal y logístico de ventas por bloque.</p>
        </div>
      </div>

      <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)', marginBottom: '25px', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end', position: 'relative', zIndex: 10 }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px' }}>Búsqueda Rápida</label>
          <input type="text" placeholder="ID Doc o Cliente..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="crud-input-style" />
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px' }}>Estado Comercial</label>
          <SelectPremium opciones={opcionesEstado} valorSeleccionado={filtroEstado} alCambiar={setFiltroEstado} />
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px' }}>Medio de Pago</label>
          <SelectPremium opciones={opcionesPago} valorSeleccionado={filtroPago} alCambiar={setFiltroPago} />
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px' }}>Desde</label>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="crud-input-style" style={{ colorScheme: 'dark' }} />
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px' }}>Hasta</label>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="crud-input-style" style={{ colorScheme: 'dark' }} />
        </div>
      </div>

      <div style={{ background: 'var(--x-bg-card)', borderRadius: '12px', border: '1px solid var(--x-border)', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {cargando ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--x-text-muted)' }}>Cargando bloque de transacciones...</div>
        ) : facturasVisibles.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--x-text-muted)' }}>No se encontraron transacciones en esta página.</div>
        ) : (
          <div className="table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--x-border)', color: 'var(--x-text-muted)' }}>
                  <th style={{ padding: '15px 12px' }}>Documento</th>
                  <th style={{ padding: '15px 12px' }}>Fecha</th>
                  <th style={{ padding: '15px 12px' }}>Cliente</th>
                  <th style={{ padding: '15px 12px' }}>Método</th>
                  <th style={{ padding: '15px 12px', textAlign: 'right' }}>Total CRC</th>
                  <th style={{ padding: '15px 12px', textAlign: 'center' }}>Estado</th>
                  <th style={{ padding: '15px 12px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {facturasVisibles.map(f => {
                  const expandido = facturaExpandida === f.id;
                  const esAnulada = f.estado === 'Cancelado';
                  return (
                    <Fragment key={f.id}>
                      <tr style={{ borderBottom: '1px solid rgba(56,68,77,0.3)', backgroundColor: expandido ? 'rgba(255,255,255,0.02)' : 'transparent', opacity: esAnulada ? 0.6 : 1 }}>
                        <td style={{ padding: '14px 12px', fontWeight: 'bold' }}>{f.tipo_documento} #{f.id}</td>
                        <td style={{ padding: '14px 12px', color: 'var(--x-text-muted)' }}>{f.fecha || 'N/A'}</td>
                        <td style={{ padding: '14px 12px' }}>{f.cliente_nombre}</td>
                        <td style={{ padding: '14px 12px' }}>{f.metodo_pago}</td>
                        <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 'bold', color: esAnulada ? 'var(--x-text-muted)' : 'var(--success-green)' }}>
                          ₡{(f.total_final || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                          <span style={{ backgroundColor: esAnulada ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 186, 124, 0.1)', color: esAnulada ? 'var(--danger-red)' : 'var(--success-green)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                            {f.estado.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button onClick={() => setFacturaExpandida(expandido ? null : f.id)} style={{ backgroundColor: 'transparent', border: '1px solid var(--x-border)', color: 'var(--x-text-main)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                              {expandido ? 'Ocultar' : 'Detalle'}
                            </button>
                            {!esAnulada && (
                              <button onClick={() => manejarAnulacion(f.id, f.tipo_documento)} style={{ backgroundColor: 'transparent', border: '1px solid var(--danger-red)', color: 'var(--danger-red)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                                Anular
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandido && (
                        <tr style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderBottom: '2px solid var(--x-primary)' }}>
                          <td colSpan="7" style={{ padding: '20px' }}>
                            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                              <h4 style={{ margin: '0 0 10px 0', color: 'var(--x-text-main)', fontSize: '13px', textTransform: 'uppercase' }}>Desglose de Artículos</h4>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--x-border)' }}>
                                    <th style={{ padding: '8px 4px', textAlign: 'left', color: 'var(--x-text-muted)' }}>SKU</th>
                                    <th style={{ padding: '8px 4px', textAlign: 'left', color: 'var(--x-text-muted)' }}>Producto</th>
                                    <th style={{ padding: '8px 4px', textAlign: 'center', color: 'var(--x-text-muted)' }}>Cant.</th>
                                    <th style={{ padding: '8px 4px', textAlign: 'right', color: 'var(--x-text-muted)' }}>Precio Unit.</th>
                                    <th style={{ padding: '8px 4px', textAlign: 'right', color: 'var(--x-text-muted)' }}>Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {f.detalles && f.detalles.length > 0 ? f.detalles.map((d, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px dotted rgba(255,255,255,0.05)' }}>
                                      <td style={{ padding: '8px 4px', fontFamily: 'monospace', color: 'var(--x-text-muted)' }}>{d.codigo || 'N/A'}</td>
                                      <td style={{ padding: '8px 4px' }}>{d.producto}</td>
                                      <td style={{ padding: '8px 4px', textAlign: 'center' }}>{d.cantidad}</td>
                                      <td style={{ padding: '8px 4px', textAlign: 'right' }}>₡{(d.precio_unitario || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                      <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 'bold' }}>₡{(d.subtotal || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                    </tr>
                                  )) : (
                                    <tr>
                                      <td colSpan="5" style={{ padding: '8px 4px', color: 'var(--x-text-muted)', textAlign: 'center' }}>No hay detalles registrados.</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Controles de Paginación */}
        <div style={{ padding: '15px', borderTop: '1px solid var(--x-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--x-text-muted)' }}>
            Página {paginaActual}
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
                onClick={() => manejarPaginacion('anterior')} 
                disabled={paginaActual === 1 || cargando}
                style={{ padding: '8px 16px', backgroundColor: paginaActual === 1 ? 'rgba(255,255,255,0.05)' : 'var(--x-bg-base)', border: '1px solid var(--x-border)', color: paginaActual === 1 ? 'var(--x-text-muted)' : '#fff', borderRadius: '6px', cursor: paginaActual === 1 ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 'bold' }}
            >
                Anterior
            </button>
            <button 
                onClick={() => manejarPaginacion('siguiente')} 
                disabled={!hayMasDatos || cargando}
                style={{ padding: '8px 16px', backgroundColor: !hayMasDatos ? 'rgba(255,255,255,0.05)' : 'var(--x-bg-base)', border: '1px solid var(--x-border)', color: !hayMasDatos ? 'var(--x-text-muted)' : '#fff', borderRadius: '6px', cursor: !hayMasDatos ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 'bold' }}
            >
                Siguiente
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}