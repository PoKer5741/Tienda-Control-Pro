'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { obtenerDatosDashboard } from '@/app/actions/dashboardActions';

export default function HomePage() {
  const [metricas, setMetricas] = useState({ ingresos_totales: 0, total_facturas: 0, capital_inventario: 0, total_productos: 0 });
  const [alertas, setAlertas] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDashboard();
  }, []);

  const cargarDashboard = async () => {
    setCargando(true);
    const respuesta = await obtenerDatosDashboard();
    if (respuesta.success) {
      setMetricas(respuesta.metricas);
      setAlertas(respuesta.alertasStock);
    }
    setCargando(false);
  };

  const ticketPromedio = metricas.total_facturas > 0 ? metricas.ingresos_totales / metricas.total_facturas : 0;

  const bloquesNegocio = [
    {
      categoria: 'Administración y Catálogos',
      items: [
        { nombre: 'Fichas de Clientes', ruta: '/clientes', detalle: 'Control de carteras, cédulas y correos de Hacienda.' },
        { nombre: 'Familias y Categorías', ruta: '/categorias', detalle: 'Estructuración y agrupación contable de familias.' },
        { nombre: 'Control de Inventario', ruta: '/inventario', detalle: 'Ajuste de márgenes, IVA y umbrales de reorden.' }
      ]
    },
    {
      categoria: 'Módulos Operativos',
      items: [
        { nombre: 'Abastecimiento (Compras)', ruta: '/compras', detalle: 'Asentamiento de órdenes y recepción de stock.' },
        { nombre: 'Punto de Venta (Facturación)', ruta: '/facturacion', detalle: 'Caja rápida, cálculo de vuelto y tiquetes.' }
      ]
    },
    {
      categoria: 'Auditoría y Reportes',
      items: [
        { nombre: 'Registro Histórico', ruta: '/ventas', detalle: 'Trazabilidad total, anulaciones y notas de crédito.' }
      ]
    }
  ];

  return (
    <main style={{ padding: '2.5rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* HEADER PRINCIPAL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: '28px', margin: 0, fontWeight: '700' }}>Panel de Control Comercial</h1>
          <p style={{ color: 'var(--x-text-muted)', fontSize: '14px', margin: '5px 0 0 0' }}>Sincronizado en tiempo real con el motor SQL Server</p>
        </div>
        <button onClick={cargarDashboard} style={{ backgroundColor: 'transparent', border: '1px solid var(--x-border)', color: 'var(--x-text-main)', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
          Sincronizar Datos
        </button>
      </div>

      {/* SECCIÓN 1: CUADRO DE MANDO ANALÍTICO (KPIs REALES) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '35px' }}>
        <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
          <div style={{ fontSize: '11px', color: 'var(--x-text-muted)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>Flujo de Caja Real</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: 'var(--success-green)', margin: '8px 0', fontFamily: 'monospace' }}>
            ₡{(metricas.ingresos_totales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--x-text-muted)' }}>Basado en {metricas.total_facturas || 0} ventas líquidas</div>
        </div>

        <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
          <div style={{ fontSize: '11px', color: 'var(--x-text-muted)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>Capital en Bodega</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#fff', margin: '8px 0', fontFamily: 'monospace' }}>
            ₡{(metricas.capital_inventario || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--x-text-muted)' }}>Distribuidos en {metricas.total_productos || 0} artículos</div>
        </div>

        <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
          <div style={{ fontSize: '11px', color: 'var(--x-text-muted)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>Ticket Promedio Diario</div>
          <div style={{ fontSize: '26px', fontWeight: 'bold', color: 'var(--x-primary)', margin: '8px 0', fontFamily: 'monospace' }}>
            ₡{ticketPromedio.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--x-text-muted)' }}>Rendimiento por transacción</div>
        </div>
      </div>

      <div className="responsive-grid" style={{ gridTemplateColumns: '1.8fr 1fr', gap: '30px' }}>
        
        {/* COLUMNA IZQUIERDA: ACCESOS OPERATIVOS ORDENADOS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {bloquesNegocio.map((bloque, idx) => (
            <div key={idx}>
              <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {bloque.categoria}
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
                {bloque.items.map((item, itemIdx) => (
                  <Link key={itemIdx} href={item.ruta} style={{ textDecoration: 'none' }}>
                    <div 
                      style={{ background: 'var(--x-bg-card)', border: '1px solid var(--x-border)', borderRadius: '10px', padding: '18px', height: '100%', boxSizing: 'border-box', transition: 'all 0.2s ease' }}
                      onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--x-primary)'; e.currentTarget.style.backgroundColor = 'var(--x-bg-card-hover)'; }}
                      onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--x-border)'; e.currentTarget.style.backgroundColor = 'var(--x-bg-card)'; }}
                    >
                      <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--x-primary)', marginBottom: '6px' }}>{item.nombre}</div>
                      <div style={{ fontSize: '12px', color: 'var(--x-text-muted)', lineHeight: '1.4' }}>{item.detalle}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* COLUMNA DERECHA: ALERTAS EN TIEMPO REAL (MÓDULO INTELIGENTE) */}
        <div style={{ background: 'var(--x-bg-card)', padding: '25px', borderRadius: '12px', border: '1px solid var(--x-border)', height: 'fit-content' }}>
          <h3 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '16px' }}>Alertas de Abastecimiento</h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: 'var(--x-text-muted)' }}>Artículos que alcanzaron o superaron el punto de reorden.</p>

          {cargando ? (
            <div style={{ color: 'var(--x-text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Analizando existencias...</div>
          ) : alertas.length === 0 ? (
            <div style={{ padding: '20px', backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px dashed var(--success-green)', borderRadius: '8px', color: 'var(--success-green)', fontSize: '13px', textAlign: 'center' }}>
              Inventario estable. Ningún artículo bajo el mínimo.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {alertas.slice(0, 5).map((a, index) => {
                const porcentaje = a.cantidad <= 0 ? 0 : (a.cantidad / a.stock_minimo) * 100;
                
                return (
                  <div key={index} style={{ backgroundColor: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: '500', color: '#fff' }}>{a.nombre}</span>
                      <span style={{ color: 'var(--danger-red)', fontWeight: 'bold' }}>{a.cantidad} un.</span>
                    </div>
                    
                    {/* Barra de Progreso CSS pura sin librerías */}
                    <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(porcentaje, 100)}%`, height: '100%', backgroundColor: 'var(--danger-red)' }}></div>
                    </div>
                    
                    <div style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginTop: '5px', textAlign: 'right' }}>
                      Mínimo requerido: {a.stock_minimo} un.
                    </div>
                  </div>
                );
              })}
              {alertas.length > 5 && (
                <Link href="/inventario" style={{ color: 'var(--x-primary)', fontSize: '12px', fontWeight: 'bold', textDecoration: 'none', textAlign: 'center', display: 'block', marginTop: '5px' }}>
                  Ver los {alertas.length - 5} productos críticos restantes
                </Link>
              )}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}