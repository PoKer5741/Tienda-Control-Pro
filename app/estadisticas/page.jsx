'use client';
import { useState, useEffect } from 'react';
import { obtenerMetricasDashboard } from '@/app/actions/estadisticasActions';

export default function EstadisticasPage() {
  const [metricas, setMetricas] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    setCargando(true);
    const respuesta = await obtenerMetricasDashboard();
    
    if (respuesta.success) {
      setMetricas(respuesta.datos);
    } else {
      alert('Error al procesar metricas en el servidor: ' + respuesta.error);
    }
    setCargando(false);
  };

  if (cargando) {
    return (
      <main style={{ padding: '2rem', textAlign: 'center', color: 'var(--x-text-muted)' }}>
        <h2>Generando Reportes Analíticos...</h2>
        <p>Consultando métricas en el motor SQL Server.</p>
      </main>
    );
  }

  if (!metricas) return null;

  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px', color: 'var(--x-text-main)' }}>Métricas y Rendimiento</h2>

      {/* Fila superior: Tarjetas de Indicadores Clave (KPIs) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        
        <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)', textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 10px 0', color: 'var(--x-text-muted)', fontSize: '14px', textTransform: 'uppercase' }}>Ingresos por Ventas</h4>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--success-green)', fontFamily: 'monospace' }}>
            ₡{metricas.ingresosTotales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)', textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 10px 0', color: 'var(--x-text-muted)', fontSize: '14px', textTransform: 'uppercase' }}>Capital en Inventario</h4>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--x-primary)', fontFamily: 'monospace' }}>
            ₡{metricas.valorTotalInventario.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)', textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 10px 0', color: 'var(--x-text-muted)', fontSize: '14px', textTransform: 'uppercase' }}>Productos en Catálogo</h4>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff', fontFamily: 'monospace' }}>
            {metricas.totalProductos.toLocaleString()}
          </div>
        </div>

      </div>

      {/* Fila inferior: Tablas de detalle analitico */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Top 5 Productos Más Vendidos</h3>
          {metricas.topProductos.length === 0 ? (
            <p style={{ color: 'var(--x-text-muted)' }}>No hay datos de ventas registrados.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--x-border)', color: 'var(--x-text-muted)' }}>
                  <th style={{ padding: '10px' }}>Producto</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Unidades Vendidas</th>
                </tr>
              </thead>
              <tbody>
                {metricas.topProductos.map((prod, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(56,68,77,0.4)' }}>
                    <td style={{ padding: '10px', fontWeight: '500' }}>{prod.nombre}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: 'var(--success-green)', fontWeight: 'bold' }}>
                      {prod.unidades_vendidas}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--danger-red)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--danger-red)' }}>Alertas de Stock Crítico</h3>
          {metricas.stockCritico.length === 0 ? (
            <p style={{ color: 'var(--success-green)' }}>Inventario estable. Ningún producto bajo el punto de reorden.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--x-border)', color: 'var(--x-text-muted)' }}>
                  <th style={{ padding: '10px' }}>Producto</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Stock Actual</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Punto Reorden</th>
                </tr>
              </thead>
              <tbody>
                {metricas.stockCritico.map((prod, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(56,68,77,0.4)' }}>
                    <td style={{ padding: '10px', fontWeight: '500' }}>{prod.nombre}</td>
                    <td style={{ padding: '10px', textAlign: 'center', color: 'var(--danger-red)', fontWeight: 'bold' }}>
                      {prod.cantidad}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center', color: 'var(--x-text-muted)' }}>
                      {prod.punto_reorden}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </main>
  );
}