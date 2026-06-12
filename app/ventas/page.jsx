'use client';
import { useState, useEffect, Fragment } from 'react';
import { obtenerHistorialVentas } from '@/app/actions/ventasActions';
import { anularFacturaTransaccional } from '@/app/actions/anulacionesActions';
import SelectPremium from '@/components/SelectPremium';

export default function HistorialVentasPage() {
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [facturaExpandida, setFacturaExpandida] = useState(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroPago, setFiltroPago] = useState('Todos');

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    setCargando(true);
    const respuesta = await obtenerHistorialVentas();
    if (respuesta.success) {
      setFacturas(respuesta.datos || []);
    } else {
      alert('Error al cargar historial: ' + respuesta.error);
    }
    setCargando(false);
  };

  const manejarAnulacion = async (id, numDoc) => {
    if (window.confirm(`¿Está seguro que desea ANULAR la ${numDoc}? Esta acción generará una Nota de Crédito en SQL Server y reintegrará todos los artículos al inventario automáticamente.`)) {
        const respuesta = await anularFacturaTransaccional(id);
        if (respuesta.success) {
            alert(`${numDoc} anulada correctamente. Stock devuelto al catálogo.`);
            cargarHistorial();
        } else {
            alert('Error al procesar anulación: ' + respuesta.error);
        }
    }
  };

  // Motor de filtrado en tiempo real
  const facturasFiltradas = facturas.filter(f => {
    const coincideBusqueda = 
      f.id.toString().includes(busqueda) || 
      (f.cliente_nombre && f.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase()));
    
    const coincideEstado = filtroEstado === 'Todos' || f.estado === filtroEstado;
    const coincidePago = filtroPago === 'Todos' || f.metodo_pago === filtroPago;
    
    const fechaFactura = f.fecha ? f.fecha.split(' ')[0] : ''; 
    const coincideDesde = !fechaDesde || fechaFactura >= fechaDesde;
    const coincideHasta = !fechaHasta || fechaFactura <= fechaHasta;

    return coincideBusqueda && coincideEstado && coincidePago && coincideDesde && coincideHasta;
  });

  // KPIs dinámicos (Ignorando montos de facturas canceladas)
  const totalMonto = facturasFiltradas.reduce((sum, f) => sum + (f.estado === 'Cancelado' ? 0 : (f.total_final || 0)), 0);
  const cantidadFacturas = facturasFiltradas.length;
  const ticketPromedio = cantidadFacturas > 0 ? totalMonto / cantidadFacturas : 0;

  // Opciones formateadas para SelectPremium
  const opcionesEstado = [
    { valor: 'Todos', etiqueta: 'Todos los estados' },
    { valor: 'Aceptado', etiqueta: 'Aceptado' },
    { valor: 'Cancelado', etiqueta: 'Cancelado' }
  ];

  const opcionesPago = [
    { valor: 'Todos', etiqueta: 'Cualquier medio' },
    { valor: 'Efectivo', etiqueta: 'Efectivo' },
    { valor: 'SINPE', etiqueta: 'SINPE' },
    { valor: 'Tarjeta', etiqueta: 'Tarjeta' }
  ];

  return (
    <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* CUADRO DE MANDO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', flexWrap: 'wrap', gap: '20px' }}>
        <h2 style={{ color: 'var(--x-text-main)', margin: 0, alignSelf: 'center' }}>Registro Histórico de Ventas</h2>
        
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--x-bg-card)', padding: '15px 25px', borderRadius: '10px', border: '1px solid var(--x-border)', minWidth: '220px' }}>
            <div style={{ fontSize: '12px', color: 'var(--x-text-muted)', textTransform: 'uppercase', marginBottom: '5px' }}>Monto Neto Real</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success-green)' }}>₡{totalMonto.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          </div>
          
          <div style={{ background: 'var(--x-bg-card)', padding: '15px 25px', borderRadius: '10px', border: '1px solid var(--x-border)', minWidth: '130px' }}>
            <div style={{ fontSize: '12px', color: 'var(--x-text-muted)', textTransform: 'uppercase', marginBottom: '5px' }}>Transacciones</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff' }}>{cantidadFacturas}</div>
          </div>

          <div style={{ background: 'var(--x-bg-card)', padding: '15px 25px', borderRadius: '10px', border: '1px solid var(--x-border)', minWidth: '180px' }}>
            <div style={{ fontSize: '12px', color: 'var(--x-text-muted)', textTransform: 'uppercase', marginBottom: '5px' }}>Ticket Promedio</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--x-primary)' }}>₡{ticketPromedio.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          </div>
        </div>
      </div>

      {/* PANEL DE FILTROS PREMIUM */}
      <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end', position: 'relative', zIndex: 10 }}>
        <div style={{ flex: '1 1 250px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--x-text-muted)', marginBottom: '8px' }}>Buscar (N° Factura, Cliente)</label>
          <input type="text" placeholder="Término de búsqueda..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="crud-input-style" />
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--x-text-muted)', marginBottom: '8px' }}>Desde</label>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="crud-input-style" />
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--x-text-muted)', marginBottom: '8px' }}>Hasta</label>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="crud-input-style" />
        </div>
        <div style={{ flex: '1 1 180px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--x-text-muted)', marginBottom: '8px' }}>Estado</label>
          <SelectPremium 
            opciones={opcionesEstado}
            valorSeleccionado={filtroEstado}
            alCambiar={setFiltroEstado}
          />
        </div>
        <div style={{ flex: '1 1 180px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--x-text-muted)', marginBottom: '8px' }}>Medio de Pago</label>
          <SelectPremium 
            opciones={opcionesPago}
            valorSeleccionado={filtroPago}
            alCambiar={setFiltroPago}
          />
        </div>
      </div>

      {/* TABLA DE HISTORIAL */}
      <div style={{ background: 'var(--x-bg-card)', padding: '0', borderRadius: '12px', border: '1px solid var(--x-border)', position: 'relative', zIndex: 1 }}>
        {cargando ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--x-text-muted)' }}>Sincronizando con el servidor transaccional...</div>
        ) : facturasFiltradas.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--x-text-muted)' }}>No se encontraron registros contables.</div>
        ) : (
          <div className="table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--x-border)', color: 'var(--x-text-muted)' }}>
                  <th style={{ padding: '15px 12px' }}>Tipo</th>
                  <th style={{ padding: '15px 12px' }}>Documento</th>
                  <th style={{ padding: '15px 12px' }}>Fecha y Hora</th>
                  <th style={{ padding: '15px 12px' }}>Cliente</th>
                  <th style={{ padding: '15px 12px' }}>Pago</th>
                  <th style={{ padding: '15px 12px', textAlign: 'right' }}>Subtotal</th>
                  <th style={{ padding: '15px 12px', textAlign: 'right' }}>IVA</th>
                  <th style={{ padding: '15px 12px', textAlign: 'right' }}>Total</th>
                  <th style={{ padding: '15px 12px', textAlign: 'center' }}>Estado</th>
                  <th style={{ padding: '15px 12px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {facturasFiltradas.map((f) => {
                  const numDoc = `FAC-${f.id.toString().padStart(5, '0')}`;
                  const esCancelado = f.estado === 'Cancelado';
                  
                  return (
                    <Fragment key={f.id}>
                      <tr style={{ borderBottom: facturaExpandida === f.id ? 'none' : '1px solid rgba(56,68,77,0.4)', backgroundColor: facturaExpandida === f.id ? 'var(--x-bg-card-hover)' : 'transparent', opacity: esCancelado ? 0.6 : 1 }}>
                        <td style={{ padding: '12px' }}>
                          <span style={{ backgroundColor: f.tipo_documento === 'Factura' ? 'rgba(29, 161, 242, 0.15)' : 'rgba(168, 85, 247, 0.15)', color: f.tipo_documento === 'Factura' ? 'var(--x-primary)' : '#a855f7', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                            {f.tipo_documento ? f.tipo_documento.substring(0,3).toUpperCase() : 'N/A'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: 'var(--x-primary)' }}>{numDoc}</td>
                        <td style={{ padding: '12px' }}>{f.fecha}</td>
                        <td style={{ padding: '12px', textTransform: 'uppercase' }}>{f.cliente_nombre || 'N/A'}</td>
                        <td style={{ padding: '12px' }}>{f.metodo_pago || 'N/A'}</td>
                        
                        <td style={{ padding: '12px', textAlign: 'right', textDecoration: esCancelado ? 'line-through' : 'none' }}>₡{(f.total_neto || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td style={{ padding: '12px', textAlign: 'right', textDecoration: esCancelado ? 'line-through' : 'none' }}>₡{(f.impuesto || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td style={{ padding: '12px', textAlign: 'right', color: esCancelado ? 'var(--x-text-muted)' : 'var(--success-green)', fontWeight: 'bold', textDecoration: esCancelado ? 'line-through' : 'none' }}>₡{(f.total_final || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{ backgroundColor: esCancelado ? 'rgba(244, 33, 46, 0.15)' : 'rgba(0, 186, 124, 0.15)', color: esCancelado ? 'var(--danger-red)' : 'var(--success-green)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                            {f.estado || 'N/A'}
                          </span>
                        </td>

                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button onClick={() => setFacturaExpandida(facturaExpandida === f.id ? null : f.id)} style={{ background: 'none', border: '1px solid var(--x-primary)', color: 'var(--x-primary)', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                              {facturaExpandida === f.id ? 'Cerrar' : 'Detalle'}
                            </button>
                            <button 
                              onClick={() => manejarAnulacion(f.id, numDoc)} 
                              disabled={esCancelado}
                              style={{ 
                                background: 'none', 
                                border: esCancelado ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--danger-red)', 
                                color: esCancelado ? 'var(--x-text-muted)' : 'var(--danger-red)', 
                                padding: '5px 10px', 
                                borderRadius: '4px', 
                                cursor: esCancelado ? 'not-allowed' : 'pointer', 
                                fontSize: '11px', 
                                fontWeight: 'bold' 
                              }}
                            >
                              {esCancelado ? 'Anulada' : 'Anular'}
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* DESGLOSE EXPANDIBLE */}
                      {facturaExpandida === f.id && (
                        <tr style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}>
                          <td colSpan="10" style={{ padding: '20px', borderBottom: '1px solid var(--x-border)' }}>
                            <div style={{ borderLeft: '3px solid var(--x-primary)', paddingLeft: '20px' }}>
                              <h4 style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#fff' }}>Desglose de Artículos - {numDoc}</h4>
                              
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                  <tr style={{ color: 'var(--x-text-muted)', borderBottom: '1px solid rgba(56,68,77,0.5)', textAlign: 'left' }}>
                                    <th style={{ padding: '8px 4px' }}>Código</th>
                                    <th style={{ padding: '8px 4px' }}>Producto</th>
                                    <th style={{ padding: '8px 4px', textAlign: 'center' }}>Cantidad</th>
                                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>Precio Unit.</th>
                                    <th style={{ padding: '8px 4px', textAlign: 'right' }}>Subtotal Línea</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {f.detalles && f.detalles.length > 0 ? f.detalles.map((d, index) => (
                                    <tr key={index} style={{ borderBottom: '1px dashed rgba(56,68,77,0.3)' }}>
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
      </div>
    </main>
  );
}