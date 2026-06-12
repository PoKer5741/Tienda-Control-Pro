'use client';
import { useState, useEffect } from 'react';
import { 
  verificarCajaAbierta, 
  abrirCajaTransaccional, 
  cerrarCajaTransaccional, 
  obtenerHistorialArqueos,
  obtenerDesgloseMetodosTurno 
} from '@/app/actions/cajaActions';
import Modal from '@/components/Modal';

export default function CajaPage() {
  const [cajaActiva, setCajaActiva] = useState(null);
  const [ventasMetodos, setVentasMetodos] = useState([]);
  const [historialCajas, setHistorialCajas] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Estados de control del modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [turnoDetalle, setTurnoDetalle] = useState(null);
  const [desgloseTurno, setDesgloseTurno] = useState([]);
  const [cargandoModal, setCargandoModal] = useState(false);

  // Inputs para credenciales y montos
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [montoApertura, setMontoApertura] = useState('');
  const [efectivoContado, setEfectivoContado] = useState('');

  useEffect(() => {
    cargarTodaLaData();
  }, []);

  const cargarTodaLaData = async () => {
    setCargando(true);
    const [resActiva, resHistorial] = await Promise.all([
        verificarCajaAbierta(),
        obtenerHistorialArqueos()
    ]);

    if (resActiva.success && resActiva.caja) {
      setCajaActiva(resActiva.caja);
      // REPARADO: Usamos la función correcta que ya consulta la DB por métodos
      const resVentas = await obtenerDesgloseMetodosTurno(resActiva.caja.id);
      if (resVentas.success) setVentasMetodos(resVentas.datos || []);
    } else {
      setCajaActiva(null);
    }

    if (resHistorial.success) {
        setHistorialCajas(resHistorial.datos || []);
    }
    setCargando(false);
  };

  const abrirDetalleHistorico = async (turno) => {
    setTurnoDetalle(turno);
    setIsModalOpen(true);
    setDesgloseTurno([]);
    setCargandoModal(true);
    
    const res = await obtenerDesgloseMetodosTurno(turno.id);
    if (res.success) {
        setDesgloseTurno(res.datos || []);
    } else {
        alert('Error al consultar el desglose transaccional.');
    }
    setCargandoModal(false);
  };

  const manejarAbrirCaja = async (e) => {
    e.preventDefault();
    if (!correo || !contrasena || !montoApertura || parseFloat(montoApertura) < 0) {
        return alert('Debe completar todos los datos del formulario de manera válida.');
    }

    const res = await abrirCajaTransaccional(correo, contrasena, montoApertura);
    if (res.success) {
      alert('Autenticación correcta. Turno de caja inicializado.');
      setCorreo('');
      setContrasena('');
      setMontoApertura('');
      cargarTodaLaData();
    } else {
      alert('Fallo de seguridad: ' + res.error);
    }
  };

  const manejarCerrarCaja = async (e) => {
    e.preventDefault();
    if (!efectivoContado || parseFloat(efectivoContado) < 0) return alert('Escriba el dinero físico contado.');

    if(window.confirm('Confirme el asiento del arqueo diario. Esta acción cerrará de forma permanente el turno activo.')) {
        const res = await cerrarCajaTransaccional(cajaActiva.id, efectivoContado);
        if (res.success) {
          alert('Arqueo asentado con éxito. Caja cerrada.');
          setEfectivoContado('');
          cargarTodaLaData();
        } else {
          alert('Fallo al cerrar caja: ' + res.error);
        }
    }
  };

  // REPARADO: Ahora lee "total_monto" tal cual lo envía SQL Server
  const totalEfectivoVendido = ventasMetodos.find(m => m.metodo_pago === 'Efectivo')?.total_monto || 0;
  const totalSinpe = ventasMetodos.find(m => m.metodo_pago === 'SINPE')?.total_monto || 0;
  const totalTarjeta = ventasMetodos.find(m => m.metodo_pago === 'Tarjeta')?.total_monto || 0;
  
  const apertura = cajaActiva ? parseFloat(cajaActiva.monto_apertura) : 0;
  const efectivoTeoricoSist = apertura + totalEfectivoVendido;
  const efectivoRealUsuario = parseFloat(efectivoContado) || 0;
  const diferenciaArqueo = efectivoRealUsuario - efectivoTeoricoSist;

  if (cargando) return <main style={{ padding: '2rem', color: 'var(--x-text-muted)' }}>Sincronizando estado y auditoría de cajas...</main>;

  return (
    <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '25px', color: 'var(--x-text-main)' }}>Control de Turno y Arqueo de Caja</h2>

      {/* SECCIÓN CAJA INACTIVA: FORMULARIO CON AUTENTICACIÓN */}
      {!cajaActiva ? (
        <div style={{ background: 'var(--x-bg-card)', padding: '30px', borderRadius: '12px', border: '1px solid var(--x-border)', maxWidth: '450px', margin: '0 auto 40px auto' }}>
          <h3 style={{ marginTop: 0, color: 'var(--x-primary)', fontSize: '18px', borderBottom: '1px solid var(--x-border)', paddingBottom: '10px', marginBottom: '15px' }}>
            Apertura de Turno Contable
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--x-text-muted)', marginBottom: '20px', lineHeight: '1.4' }}>
            El sistema se encuentra bloqueado. Ingrese sus credenciales de empleado y el fondo inicial de efectivo de la gaveta para continuar.
          </p>
          <form onSubmit={manejarAbrirCaja} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', display: 'block', marginBottom: '5px' }}>Correo Electrónico Institucional</label>
              <input type="email" placeholder="usuario@tienda.com" value={correo} onChange={e => setCorreo(e.target.value)} className="crud-input-style" required />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', display: 'block', marginBottom: '5px' }}>Contraseña de Seguridad</label>
              <input type="password" placeholder="••••••••" value={contrasena} onChange={e => setContrasena(e.target.value)} className="crud-input-style" required />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', display: 'block', marginBottom: '5px' }}>Monto de Apertura (Fondo Fijo Clic)</label>
              <input type="number" step="0.01" placeholder="₡0.00" value={montoApertura} onChange={e => setMontoApertura(e.target.value)} className="crud-input-style" style={{ fontWeight: 'bold', fontSize: '15px' }} required />
            </div>
            <button type="submit" style={{ backgroundColor: 'var(--x-primary)', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Validar y Abrir Turno
            </button>
          </form>
        </div>
      ) : (
        <div className="responsive-grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: '30px', marginBottom: '40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--x-text-muted)', textTransform: 'uppercase' }}>Sesión Activa - Turno #{cajaActiva.id}</span>
              <div style={{ fontSize: '16px', color: '#fff', fontWeight: 'bold', marginTop: '6px' }}>
                Responsable: {cajaActiva.trabajador_nombre} 
                <span style={{ fontSize: '12px', color: 'var(--x-primary)', marginLeft: '8px', fontWeight: 'normal' }}>({cajaActiva.trabajador_rol})</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--x-text-muted)', marginTop: '4px' }}>Iniciado: {cajaActiva.fecha_apertura ? new Date(cajaActiva.fecha_apertura).toLocaleString() : 'N/A'}</div>
              <div style={{ fontSize: '13px', color: 'var(--x-text-muted)', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed rgba(255,255,255,0.05)' }}>Monto de Apertura en Gaveta: <strong>₡{apertura.toLocaleString(undefined, {minimumFractionDigits: 2})}</strong></div>
            </div>

            <div style={{ background: 'var(--x-bg-card)', padding: '25px', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '15px' }}>Flujos Contables del Turno</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* REPARADO: justifyContent en camelCase */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--x-border)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--x-text-muted)' }}>(+) Ventas en Efectivo:</span>
                  <span style={{ fontWeight: 'bold' }}>₡{totalEfectivoVendido.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--x-border)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--x-text-muted)' }}>(+) Transferencias SINPE:</span>
                  <span style={{ fontWeight: 'bold', color: '#a855f7' }}>₡{totalSinpe.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--x-border)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--x-text-muted)' }}>(+) Datáfono Tarjetas:</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--x-primary)' }}>₡{totalTarjeta.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', fontSize: '15px', fontWeight: 'bold' }}>
                  <span>Efectivo Teórico Requerido:</span>
                  <span style={{ color: 'var(--success-green)' }}>₡{efectivoTeoricoSist.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--x-bg-card)', padding: '25px', borderRadius: '12px', border: '1px solid var(--x-border)', height: 'fit-content' }}>
            <h3 style={{ marginTop: 0, marginBottom: '5px', fontSize: '16px' }}>Cierre y Arqueo Físico</h3>
            <p style={{ fontSize: '12px', color: 'var(--x-text-muted)', marginBottom: '20px' }}>Cuente el papel moneda y la moneda física de la gaveta e ingrese el saldo final.</p>
            <form onSubmit={manejarCerrarCaja} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <input type="number" step="0.01" placeholder="₡0.00" value={efectivoContado} onChange={e => setEfectivoContado(e.target.value)} className="crud-input-style" style={{ fontSize: '16px', fontWeight: 'bold' }} required />
              </div>

              {efectivoContado && (
                <div style={{ backgroundColor: diferenciaArqueo === 0 ? 'rgba(16,185,129,0.08)' : diferenciaArqueo > 0 ? 'rgba(59,130,246,0.08)' : 'rgba(239,68,68,0.08)', border: '1px solid', borderColor: diferenciaArqueo === 0 ? 'var(--success-green)' : diferenciaArqueo > 0 ? 'var(--x-primary)' : 'var(--danger-red)', padding: '15px', borderRadius: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Estado del Cuadre:</span>
                    <strong style={{ color: diferenciaArqueo === 0 ? 'var(--success-green)' : diferenciaArqueo > 0 ? 'var(--x-primary)' : 'var(--danger-red)' }}>
                      {diferenciaArqueo === 0 ? 'Cuadrado Perfecto' : diferenciaArqueo > 0 ? 'Sobrante en Caja' : 'Faltante en Caja'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontWeight: 'bold' }}>
                    <span>Diferencia de Arqueo:</span>
                    <span>₡{diferenciaArqueo.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                </div>
              )}

              <button type="submit" style={{ backgroundColor: 'var(--danger-red)', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', textTransform: 'uppercase' }}>
                Asentar Arqueo y Cerrar Turno
              </button>
            </form>
          </div>
        </div>
      )}

      {/* BITÁCORA DE AUDITORÍA */}
      <h3 style={{ marginTop: '20px', marginBottom: '15px', color: 'var(--x-text-main)', borderBottom: '1px solid var(--x-border)', paddingBottom: '10px' }}>
        Bitácora de Auditoría de Arqueos
      </h3>
      
      <div style={{ background: 'var(--x-bg-card)', padding: '0', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
        {historialCajas.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--x-text-muted)' }}>No hay historial de cajas registrado.</div>
        ) : (
          <div className="table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--x-border)', color: 'var(--x-text-muted)' }}>
                  <th style={{ padding: '15px 12px' }}>Turno</th>
                  <th style={{ padding: '15px 12px' }}>Responsable</th>
                  <th style={{ padding: '15px 12px' }}>Apertura</th>
                  <th style={{ padding: '15px 12px' }}>Cierre</th>
                  <th style={{ padding: '15px 12px', textAlign: 'right' }}>Descuadre</th>
                  <th style={{ padding: '15px 12px', textAlign: 'center' }}>Estado</th>
                  <th style={{ padding: '15px 12px', textAlign: 'center' }}>Auditar</th>
                </tr>
              </thead>
              <tbody>
                {historialCajas.map((c) => {
                  const montoEsperado = parseFloat(c.monto_esperado_sistema || 0);
                  const montoReal = c.monto_efectivo_real !== null ? parseFloat(c.monto_efectivo_real) : null;
                  
                  let diferencia = 0;
                  let colorDescuadre = 'inherit';
                  let textoDescuadre = '-';
                  
                  if (montoReal !== null) {
                      diferencia = montoReal - montoEsperado;
                      if (diferencia < 0) {
                          colorDescuadre = 'var(--danger-red)';
                          textoDescuadre = `Falta ₡${Math.abs(diferencia).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
                      } else if (diferencia > 0) {
                          colorDescuadre = 'var(--x-primary)';
                          textoDescuadre = `Sobra ₡${diferencia.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
                      } else {
                          colorDescuadre = 'var(--success-green)';
                          textoDescuadre = 'Cuadre Exacto';
                      }
                  }

                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(56,68,77,0.4)' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>#{c.id}</td>
                      <td style={{ padding: '12px', fontWeight: '500' }}>{c.trabajador_nombre}</td>
                      <td style={{ padding: '12px' }}>{c.fecha_apertura ? new Date(c.fecha_apertura).toISOString().replace('T', ' ').substring(0, 19) : 'N/A'}</td>
                      <td style={{ padding: '12px' }}>{c.fecha_cierre ? new Date(c.fecha_cierre).toISOString().replace('T', ' ').substring(0, 19) : 'En ejecución'}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: colorDescuadre }}>{textoDescuadre}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ backgroundColor: c.estado === 'Abierto' ? 'rgba(0, 186, 124, 0.15)' : 'rgba(255, 255, 255, 0.05)', color: c.estado === 'Abierto' ? 'var(--success-green)' : 'var(--x-text-muted)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                          {c.estado}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button 
                          onClick={() => abrirDetalleHistorico(c)}
                          style={{ backgroundColor: 'transparent', border: '1px solid var(--x-primary)', color: 'var(--x-primary)', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Ver Detalles
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

      {/* MODAL DE DETALLES TRANSACCIONALES */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div style={{ padding: '5px' }}>
          <h3 style={{ margin: '0 0 5px 0', color: '#fff' }}>Auditoría de Flujo Diario</h3>
          <p style={{ fontSize: '12px', color: 'var(--x-text-muted)', marginBottom: '20px' }}>
            Reporte de rendimiento y arqueo del Turno #{turnoDetalle?.id}
          </p>

          {cargandoModal ? (
            <div style={{ color: 'var(--x-text-muted)', padding: '20px 0', textAlign: 'center' }}>
              Consultando transacciones en el libro diario...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', border: '1px solid var(--x-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--x-text-muted)' }}>Operario a cargo:</span>
                  <span style={{ fontWeight: 'bold', color: '#fff' }}>{turnoDetalle?.trabajador_nombre}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--x-text-muted)' }}>Fondo Base Inicial:</span>
                  <span>₡{parseFloat(turnoDetalle?.monto_apertura || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--x-text-muted)' }}>Efectivo Declarado:</span>
                  <span>{turnoDetalle?.monto_efectivo_real !== null ? `₡${parseFloat(turnoDetalle?.monto_efectivo_real).toLocaleString(undefined, {minimumFractionDigits: 2})}` : 'Sin liquidar'}</span>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#fff' }}>Desglose por Métodos de Pago</h4>
                {desgloseTurno.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--x-text-muted)', padding: '10px 0' }}>
                    No se registraron ventas líquidas en este turno.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {desgloseTurno.map((m, idx) => {
                      let colorMetodo = 'var(--success-green)';
                      if (m.metodo_pago === 'SINPE') colorMetodo = '#a855f7';
                      if (m.metodo_pago === 'Tarjeta') colorMetodo = 'var(--x-primary)';

                      return (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px', borderLeft: `3px solid ${colorMetodo}` }}>
                          <div>
                            {/* REPARADO: fontWeight en lugar de "mountaineer" */}
                            <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '13px' }}>{m.metodo_pago}</span>
                            <span style={{ display: 'block', fontSize: '11px', color: 'var(--x-text-muted)' }}>{m.cantidad_ventas} transacciones</span>
                          </div>
                          <span style={{ alignSelf: 'center', fontWeight: 'bold', fontFamily: 'monospace', color: colorMetodo }}>
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
            style={{ width: '100%', backgroundColor: 'var(--x-bg-base)', border: '1px solid var(--x-border)', color: 'var(--x-text-main)', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '25px' }}
          >
            Cerrar Reporte
          </button>
        </div>
      </Modal>

    </main>
  );
}