'use client';
import { useState, useEffect } from 'react';
import { adminObtenerTrabajadores, adminObtenerHistorialArqueos } from '@/app/actions/adminActions';
import { obtenerDesgloseMetodosTurno } from '@/app/actions/cajaActions';
import SelectPremium from '@/components/SelectPremium';
import Modal from '@/components/Modal';

export default function AuditoriaArqueosPage() {
  const [arqueos, setArqueos] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Estados de los Filtros de Servidor
  const [filtroTrabajador, setFiltroTrabajador] = useState('Todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  
  // Estado del Filtro de Interfaz (Salud de Arqueo)
  const [filtroCuadre, setFiltroCuadre] = useState('Todos');

  // Estados del Modal de Desglose
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [turnoDetalle, setTurnoDetalle] = useState(null);
  const [desgloseTurno, setDesgloseTurno] = useState([]);
  const [cargandoModal, setCargandoModal] = useState(false);

  useEffect(() => {
    inicializarModulo();
  }, [filtroTrabajador, fechaDesde, fechaHasta]);

  const inicializarModulo = async () => {
    setCargando(true);
    const [resTrab, resArq] = await Promise.all([
        adminObtenerTrabajadores(),
        adminObtenerHistorialArqueos(filtroTrabajador, fechaDesde, fechaHasta)
    ]);

    if (resTrab.success) setTrabajadores(resTrab.datos || []);
    if (resArq.success) setArqueos(resArq.datos || []);
    setCargando(false);
  };

  const abrirAuditoriaFicha = async (turno) => {
    setTurnoDetalle(turno);
    setIsModalOpen(true);
    setDesgloseTurno([]);
    setCargandoModal(true);
    
    const res = await obtenerDesgloseMetodosTurno(turno.id);
    if (res.success) {
        setDesgloseTurno(res.datos || []);
    } else {
        alert('Error al consultar el desglose de transacciones bancarias.');
    }
    setCargandoModal(false);
  };

  // Motor de filtrado en cliente para anomalías de cuadre
  const arqueosFiltrados = arqueos.filter(a => {
    if (a.monto_efectivo_real === null) return filtroCuadre === 'Todos' || filtroCuadre === 'Abiertos';
    
    const diferencia = parseFloat(a.monto_efectivo_real) - parseFloat(a.monto_esperado_sistema);
    if (filtroCuadre === 'Abiertos') return a.estado === 'Abierto';
    if (filtroCuadre === 'Cuadrados') return diferencia === 0 && a.estado !== 'Abierto';
    if (filtroCuadre === 'Faltantes') return diferencia < 0;
    if (filtroCuadre === 'Sobrantes') return diferencia > 0;
    
    return true;
  });

  // KPIs de Auditoría de los registros visibles
  const resumenMétricas = arqueosFiltrados.reduce((acc, cur) => {
    if (cur.monto_efectivo_real !== null) {
        const dif = parseFloat(cur.monto_efectivo_real) - parseFloat(cur.monto_esperado_sistema);
        if (dif < 0) acc.totalFaltantes += Math.abs(dif);
        if (dif > 0) acc.totalSobrantes += dif;
        acc.cierresProcesados += 1;
    }
    return acc;
  }, { totalFaltantes: 0, totalSobrantes: 0, closuresProcesados: 0 });

  // Transformación de opciones limpias para los selectores premium (Sin emojis)
  const opcionesTrabajadores = [
    { valor: 'Todos', etiqueta: 'Todos los Trabajadores' },
    ...trabajadores.map(t => ({ valor: t.id.toString(), etiqueta: `${t.nombre} (${t.rol})` }))
  ];

  const opcionesCuadre = [
    { valor: 'Todos', etiqueta: 'Todos los Registros' },
    { valor: 'Abiertos', etiqueta: 'Turnos en Ejecución' },
    { valor: 'Cuadrados', etiqueta: 'Balances Cuadrados Exactos' },
    { valor: 'Faltantes', etiqueta: <span style={{ color: 'var(--danger-red)', fontWeight: 'bold' }}>Alertas por Faltante</span> },
    { valor: 'Sobrantes', etiqueta: <span style={{ color: 'var(--x-primary)', fontWeight: 'bold' }}>Sobrantes en Arqueo</span> }
  ];

  return (
    <main style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* CUADRO DE MANDO SUPERIOR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h2 style={{ color: 'var(--x-text-main)', margin: 0 }}>Bitácora de Auditoría de Arqueos</h2>
          <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: 'var(--x-text-muted)' }}>Consola de supervisión financiera y fiscalización de cajas activas e históricas.</p>
        </div>

        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--x-bg-card)', padding: '12px 20px', borderRadius: '8px', border: '1px solid var(--x-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--x-text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>Pérdidas por Faltantes</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--danger-red)' }}>₡{resumenMétricas.totalFaltantes.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          </div>
          <div style={{ background: 'var(--x-bg-card)', padding: '12px 20px', borderRadius: '8px', border: '1px solid var(--x-border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--x-text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>Excedentes Registrados</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--x-primary)' }}>₡{resumenMétricas.totalSobrantes.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS AVANZADOS */}
      <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)', marginBottom: '25px', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end', position: 'relative', zIndex: 10 }}>
        <div style={{ flex: '1 1 250px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '6px' }}>Filtrar por Responsable</label>
          <SelectPremium opciones={opcionesTrabajadores} valorSeleccionado={filtroTrabajador} alCambiar={setFiltroTrabajador} />
        </div>

        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '6px' }}>Condición del Balance</label>
          <SelectPremium opciones={opcionesCuadre} valorSeleccionado={filtroCuadre} alCambiar={setFiltroCuadre} />
        </div>

        <div style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '6px' }}>Rango Desde</label>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="crud-input-style" style={{ colorScheme: 'dark' }} />
        </div>

        <div style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '6px' }}>Rango Hasta</label>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="crud-input-style" style={{ colorScheme: 'dark' }} />
        </div>
      </div>

      {/* TABLA PRINCIPAL DE CONTROL INTERNO */}
      <div style={{ background: 'var(--x-bg-card)', padding: '0', borderRadius: '12px', border: '1px solid var(--x-border)', position: 'relative', zIndex: 1 }}>
        {cargando ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--x-text-muted)' }}>Extrayendo balances contables desde SQL Server...</div>
        ) : arqueosFiltrados.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--x-text-muted)' }}>No se encontraron conciliaciones de caja bajo las condiciones seleccionadas.</div>
        ) : (
          <div className="table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--x-border)', color: 'var(--x-text-muted)' }}>
                  <th style={{ padding: '15px 12px' }}>Turno</th>
                  <th style={{ padding: '15px 12px' }}>Auditoría de Personal</th>
                  <th style={{ padding: '15px 12px' }}>Apertura Sistema</th>
                  <th style={{ padding: '15px 12px' }}>Cierre Operación</th>
                  <th style={{ padding: '15px 12px', textAlign: 'right' }}>Fondo Inicial</th>
                  <th style={{ padding: '15px 12px', textAlign: 'right' }}>Descuadre Caja</th>
                  <th style={{ padding: '15px 12px', textAlign: 'center' }}>Estado</th>
                  <th style={{ padding: '15px 12px', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {arqueosFiltrados.map((a) => {
                  const esperado = parseFloat(a.monto_esperado_sistema || 0);
                  const real = a.monto_efectivo_real !== null ? parseFloat(a.monto_efectivo_real) : null;
                  
                  let diferencia = 0;
                  let colorVariación = 'inherit';
                  let textoVariación = 'En proceso';
                  
                  if (real !== null) {
                      diferencia = real - esperado;
                      if (diferencia < 0) {
                          colorVariación = 'var(--danger-red)';
                          textoVariación = `Defecto ₡${Math.abs(diferencia).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
                      } else if (diferencia > 0) {
                          colorVariación = 'var(--x-primary)';
                          textoVariación = `Exceso ₡${diferencia.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
                      } else {
                          colorVariación = 'var(--success-green)';
                          textoVariación = 'Cuadrado';
                      }
                  }

                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid rgba(56,68,77,0.4)', backgroundColor: a.estado === 'Abierto' ? 'rgba(29,161,242,0.02)' : 'transparent' }}>
                      <td style={{ padding: '14px 12px', fontWeight: 'bold' }}>#{a.id}</td>
                      <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontWeight: '500', color: '#fff' }}>{a.trabajador_nombre || 'Desconocido'}</div>
                        <span style={{ fontSize: '11px', color: 'var(--x-text-muted)' }}>{a.trabajador_correo}</span>
                      </td>
                      <td style={{ padding: '14px 12px' }}>{a.fecha_apertura ? new Date(a.fecha_apertura).toISOString().replace('T', ' ').substring(0, 19) : 'N/A'}</td>
                      <td style={{ padding: '14px 12px' }}>{a.fecha_cierre ? new Date(a.fecha_cierre).toISOString().replace('T', ' ').substring(0, 19) : 'Ventas en progreso'}</td>
                      <td style={{ padding: '14px 12px', textAlign: 'right', color: 'var(--x-text-muted)' }}>₡{parseFloat(a.monto_apertura).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 'bold', color: colorVariación }}>{textoVariación}</td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <span style={{ backgroundColor: a.estado === 'Abierto' ? 'rgba(0, 186, 124, 0.15)' : 'rgba(255, 255, 255, 0.05)', color: a.estado === 'Abierto' ? 'var(--success-green)' : 'var(--x-text-muted)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                          {a.estado ? a.estado.toUpperCase() : 'N/A'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <button 
                          onClick={() => abrirAuditoriaFicha(a)}
                          style={{ backgroundColor: 'transparent', border: '1px solid var(--x-primary)', color: 'var(--x-primary)', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(29,161,242,0.1)'}
                          onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          Fiscalizar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* COMPONENTE MODAL DE FISCALIZACIÓN */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div style={{ padding: '5px' }}>
          <h3 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '18px' }}>Informe de Fiscalización</h3>
          <p style={{ fontSize: '12px', color: 'var(--x-text-muted)', marginBottom: '20px' }}>
            Desglose contable pormenorizado del Turno #{turnoDetalle?.id}
          </p>

          {cargandoModal ? (
            <div style={{ color: 'var(--x-text-muted)', padding: '25px 0', textAlign: 'center', fontSize: '13px' }}>
              Consultando transacciones en el libro de ventas...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Bloque Ficha de Identificación */}
              <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', border: '1px solid var(--x-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--x-text-muted)' }}>Operario Evaluado:</span>
                  <span style={{ fontWeight: 'bold', color: '#fff' }}>{turnoDetalle?.trabajador_nombre}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--x-text-muted)' }}>Rol del Usuario:</span>
                  <span style={{ color: 'var(--x-primary)' }}>{turnoDetalle?.trabajador_rol}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '4px' }}>
                  <span style={{ color: 'var(--x-text-muted)' }}>Fondo Inicial Base:</span>
                  <span>₡{parseFloat(turnoDetalle?.monto_apertura || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--x-text-muted)' }}>Efectivo Declarado:</span>
                  <span style={{ fontWeight: 'bold' }}>{turnoDetalle?.monto_efectivo_real !== null ? `₡${parseFloat(turnoDetalle?.monto_efectivo_real).toLocaleString(undefined, {minimumFractionDigits: 2})}` : 'Pendiente de Cierre'}</span>
                </div>
              </div>

              {/* Bloque de Métodos de Pago Consolidados */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Flujos Verificados por Medio</h4>
                {desgloseTurno.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--x-text-muted)', padding: '15px 0', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '6px' }}>
                    No se consolidaron facturas líquidas durante el turno.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {desgloseTurno.map((m, idx) => {
                      let colorEje = 'var(--success-green)';
                      if (m.metodo_pago === 'SINPE') colorEje = '#a855f7';
                      if (m.metodo_pago === 'Tarjeta') colorEje = 'var(--x-primary)';

                      return (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px', borderLeft: `3px solid ${colorEje}` }}>
                          <div>
                            <span style={{ mountaineer: 'bold', color: '#fff', fontSize: '13px', fontWeight: 'bold' }}>{m.metodo_pago}</span>
                            <span style={{ display: 'block', fontSize: '11px', color: 'var(--x-text-muted)', marginTop: '2px' }}>{m.cantidad_ventas} transacciones</span>
                          </div>
                          <span style={{ alignSelf: 'center', fontWeight: 'bold', fontFamily: 'monospace', color: colorEje, fontSize: '14px' }}>
                            ₡{parseFloat(m.total_monto).toLocaleString(undefined, {minimumFractionDigits: 2})}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}
          
          <button 
            onClick={() => setIsModalOpen(false)} 
            style={{ width: '100%', backgroundColor: 'var(--x-bg-base)', border: '1px solid var(--x-border)', color: 'var(--x-text-main)', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '25px', textTransform: 'uppercase', fontSize: '12px' }}
          >
            Cerrar Ficha de Auditoría
          </button>
        </div>
      </Modal>

    </main>
  );
}