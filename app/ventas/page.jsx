'use client';
import { useState, useEffect, Fragment } from 'react'; // <--- Importación corregida
import { obtenerHistorialVentas } from '@/app/actions/ventasActions';

export default function HistorialVentasPage() {
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [facturaExpandida, setFacturaExpandida] = useState(null);

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    setCargando(true);
    const respuesta = await obtenerHistorialVentas();
    
    if (respuesta.success) {
      setFacturas(respuesta.datos || []);
    } else {
      alert('Error al cargar el historial de ventas: ' + respuesta.error);
    }
    setCargando(false);
  };

  const alternarDetalle = (id) => {
    setFacturaExpandida(facturaExpandida === id ? null : id);
  };

  return (
    <main style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px', color: 'var(--x-text-main)' }}>Registro Histórico de Ventas</h2>

      <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)', overflowX: 'auto' }}>
        {cargando ? (
          <p style={{ color: 'var(--x-text-muted)' }}>Sincronizando registros transaccionales con el motor SQL...</p>
        ) : facturas.length === 0 ? (
          <p style={{ color: 'var(--x-text-muted)' }}>No se han registrado ventas en el sistema.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--x-border)', color: 'var(--x-text-muted)' }}>
                <th style={{ padding: '12px 10px' }}>N° Factura</th>
                <th style={{ padding: '12px 10px' }}>Fecha y Hora</th>
                <th style={{ padding: '12px 10px' }}>Total Neto</th>
                <th style={{ padding: '12px 10px' }}>Impuesto (13%)</th>
                <th style={{ padding: '12px 10px' }}>Total Cobrado</th>
                <th style={{ padding: '12px 10px', textAlign: 'center' }}>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {facturas.map((f) => (
                <Fragment key={f.id}> {/* <--- Usando el Fragment importado */}
                  <tr style={{ borderBottom: facturaExpandida === f.id ? 'none' : '1px solid rgba(56,68,77,0.4)', backgroundColor: facturaExpandida === f.id ? 'var(--x-bg-card-hover)' : 'transparent' }}>
                    <td style={{ padding: '12px 10px', fontWeight: 'bold', color: 'var(--x-primary)' }}>FAC-{f.id.toString().padStart(5, '0')}</td>
                    <td style={{ padding: '12px 10px' }}>{f.fecha}</td>
                    <td style={{ padding: '12px 10px' }}>₡{f.total_neto.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '12px 10px' }}>₡{f.impuesto.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '12px 10px', color: 'var(--success-green)', fontWeight: 'bold' }}>₡{f.total_final.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                      <button 
                        onClick={() => alternarDetalle(f.id)}
                        style={{ backgroundColor: 'transparent', color: 'var(--x-text-muted)', border: '1px solid var(--x-border)', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
                      >
                        {facturaExpandida === f.id ? 'Ocultar' : 'Ver Productos'}
                      </button>
                    </td>
                  </tr>
                  
                  {facturaExpandida === f.id && (
                    <tr style={{ borderBottom: '1px solid var(--x-border)', backgroundColor: 'var(--x-bg)' }}>
                      <td colSpan="6" style={{ padding: '15px' }}>
                        <div style={{ borderLeft: '3px solid var(--x-primary)', paddingLeft: '15px' }}>
                          <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', textTransform: 'uppercase', color: 'var(--x-text-muted)' }}>Desglose de Artículos</h4>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                              <tr style={{ color: 'var(--x-text-muted)', borderBottom: '1px dashed var(--x-border)' }}>
                                <th style={{ padding: '6px', textAlign: 'left' }}>Producto</th>
                                <th style={{ padding: '6px', textAlign: 'center' }}>Cantidad</th>
                                <th style={{ padding: '6px', textAlign: 'right' }}>Precio Unit.</th>
                                <th style={{ padding: '6px', textAlign: 'right' }}>Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {f.detalles.map((d, index) => (
                                <tr key={index}>
                                  <td style={{ padding: '6px' }}>{d.producto}</td>
                                  <td style={{ padding: '6px', textAlign: 'center' }}>{d.cantidad}</td>
                                  <td style={{ padding: '6px', textAlign: 'right' }}>₡{d.precio_unitario.toLocaleString()}</td>
                                  <td style={{ padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>₡{d.subtotal.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}