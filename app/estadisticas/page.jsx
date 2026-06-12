'use client';
import { useState, useEffect } from 'react';
import { obtenerMetricasDashboard } from '@/app/actions/estadisticasActions';

export default function EstadisticasPage() {
  const [metricas, setMetricas] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarPaneles();
  }, []);

  const cargarPaneles = async () => {
    setCargando(true);
    const res = await obtenerMetricasDashboard();
    if (res.success && res.datos) {
      setMetricas(res.datos);
    } else {
      alert('Error en la sincronización del Core: ' + res.error);
    }
    setCargando(false);
  };

  // Convertir fecha SQL "YYYY-MM-DD" a día corto ("lun", "mar", etc.)
  const formatearDia = (fechaStr) => {
    const [y, m, d] = fechaStr.split('-');
    const fecha = new Date(y, m - 1, d);
    return fecha.toLocaleDateString('es-ES', { weekday: 'short' });
  };

  if (cargando) return <main style={{ padding: '2rem', color: 'var(--x-text-muted)' }}>Procesando modelos de rendimiento financiero...</main>;
  if (!metricas) return <main style={{ padding: '2rem', color: 'var(--danger-red)' }}>Error al cargar los datos del servidor.</main>;

  const { valorTotalInventario, totalProductos, ingresosTotales, topProductos, stockCritico, ventasSieteDias } = metricas;

  // Matemática para escalar las gráficas dinámicamente
  const maxUnidadesVendidas = topProductos.length > 0 ? Math.max(...topProductos.map(p => p.unidades_vendidas)) : 1;
  const maxVentaDia = ventasSieteDias.length > 0 ? Math.max(...ventasSieteDias.map(v => v.total_dia)) : 1;
  const picoHistorico = maxVentaDia === 0 ? 1 : maxVentaDia; // Evitar divisiones por cero si no hay ventas en 7 días

  return (
    <main style={{ padding: '2.5rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h2 style={{ color: '#fff', margin: 0, fontSize: '26px', fontWeight: '700' }}>Métricas y Rendimiento Comercial</h2>
          <p style={{ color: 'var(--x-text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>Análisis consolidados extraídos del motor transaccional</p>
        </div>
        <button onClick={cargarPaneles} style={{ backgroundColor: 'var(--x-bg-card)', border: '1px solid var(--x-border)', color: 'var(--x-text-main)', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
          Sincronizar Tableros
        </button>
      </div>

      {/* BLOQUE SUPERIOR: INDICADORES CLAVE (KPIs) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '35px' }}>
        <div style={{ background: 'var(--x-bg-card)', padding: '25px', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
          <div style={{ fontSize: '11px', color: 'var(--x-text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Ingresos por Ventas</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--success-green)', margin: '10px 0', fontFamily: 'monospace' }}>₡{(ingresosTotales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div style={{ background: 'var(--x-bg-card)', padding: '25px', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
          <div style={{ fontSize: '11px', color: 'var(--x-text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Capital en Inventario</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--x-primary)', margin: '10px 0', fontFamily: 'monospace' }}>₡{(valorTotalInventario || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div style={{ background: 'var(--x-bg-card)', padding: '25px', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
          <div style={{ fontSize: '11px', color: 'var(--x-text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Productos en Catálogo</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff', margin: '10px 0', fontFamily: 'monospace' }}>{totalProductos || 0}</div>
        </div>
      </div>

      {/* NUEVO MÓDULO GRÁFICO: VENTAS DE LOS ÚLTIMOS 7 DÍAS */}
      <div style={{ background: 'var(--x-bg-card)', padding: '30px', borderRadius: '12px', border: '1px solid var(--x-border)', marginBottom: '35px' }}>
        <h3 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '16px' }}>Tendencia de Ingresos (Últimos 7 Días)</h3>
        <p style={{ margin: '0 0 40px 0', fontSize: '12px', color: 'var(--x-text-muted)' }}>Mapeo de flujo de caja diario en Costa Rica Colones.</p>

        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '180px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {ventasSieteDias.map((dia, idx) => {
            const alturaPorcentaje = (dia.total_dia / picoHistorico) * 100;
            const esHoy = idx === 6; // El último elemento del array siempre es hoy por el ASC en SQL

            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', height: '100%', justifyContent: 'flex-end', width: '10%' }}>
                {/* Etiqueta del monto sobre la barra (solo si hay ventas) */}
                <div style={{ fontSize: '11px', color: dia.total_dia > 0 ? '#fff' : 'transparent', fontWeight: 'bold', fontFamily: 'monospace', textAlign: 'center' }}>
                  {dia.total_dia > 0 ? `₡${(dia.total_dia/1000).toFixed(1)}k` : '0'}
                </div>
                
                {/* La Barra Vertical CSS Mágica */}
                <div style={{ 
                  width: '100%', 
                  maxWidth: '40px', 
                  height: `${alturaPorcentaje}%`, 
                  minHeight: dia.total_dia === 0 ? '4px' : '0', // Un puntito base si no se vendió nada
                  backgroundColor: esHoy ? 'var(--success-green)' : 'var(--x-primary)', 
                  borderRadius: '6px 6px 0 0',
                  transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                  opacity: dia.total_dia === 0 ? 0.2 : 1
                }}></div>
              </div>
            );
          })}
        </div>

        {/* Eje X: Días de la semana */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '15px' }}>
          {ventasSieteDias.map((dia, idx) => (
             <div key={idx} style={{ width: '10%', textAlign: 'center', fontSize: '12px', color: idx === 6 ? '#fff' : 'var(--x-text-muted)', textTransform: 'capitalize', fontWeight: idx === 6 ? 'bold' : 'normal' }}>
                {formatearDia(dia.fecha_corta)}
             </div>
          ))}
        </div>
      </div>

      {/* BLOQUE INFERIOR: TOP 5 Y ALERTAS (Mantenemos tu código brillante de antes) */}
      <div className="responsive-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        
        <div style={{ background: 'var(--x-bg-card)', padding: '25px', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
          <h3 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '16px' }}>Top 5 Productos Más Vendidos</h3>
          
          {topProductos.length === 0 ? (
            <div style={{ color: 'var(--x-text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No se registran operaciones.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', marginTop: '25px' }}>
              {topProductos.map((prod, index) => {
                const pctBarra = (prod.unidades_vendidas / maxUnidadesVendidas) * 100;
                return (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ fontWeight: '500', color: '#fff' }}>{index + 1}. {prod.nombre}</span>
                      <span style={{ color: 'var(--x-text-muted)' }}><strong style={{ color: '#fff' }}>{prod.unidades_vendidas}</strong> un.</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${pctBarra}%`, height: '100%', backgroundColor: 'var(--x-primary)', borderRadius: '3px' }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ background: 'var(--x-bg-card)', padding: '25px', borderRadius: '12px', border: '1px solid var(--x-border)', height: 'fit-content' }}>
          <h3 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '16px' }}>Alertas de Stock Crítico</h3>
          
          {stockCritico.length === 0 ? (
            <div style={{ padding: '20px', backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px dashed var(--success-green)', borderRadius: '8px', color: 'var(--success-green)', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
              Inventario estable. Ningún producto se encuentra bajo los mínimos de seguridad.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '350px', overflowY: 'auto', marginTop: '20px', paddingRight: '5px' }}>
              {stockCritico.map((item, index) => (
                <div key={index} style={{ backgroundColor: 'rgba(0,0,0,0.15)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: '#fff' }}>{item.nombre}</span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--danger-red)' }}>{item.cantidad <= 0 ? 'AGOTADO' : `${item.cantidad} un.`}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}