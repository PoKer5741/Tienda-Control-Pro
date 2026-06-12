'use client';
import { useState, useEffect } from 'react';
import { verificarCajaAbierta, abrirCajaTransaccional, obtenerVentasTurno, cerrarCajaTransaccional, obtenerHistorialArqueos } from '@/app/actions/cajaActions';

export default function CajaPage() {
  const [cajaActiva, setCajaActiva] = useState(null);
  const [ventasMetodos, setVentasMetodos] = useState([]);
  const [historialCajas, setHistorialCajas] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Inputs
  const [montoApertura, setMontoApertura] = useState('');
  const [efectivoContado, setEfectivoContado] = useState('');

  useEffect(() => {
    cargarTodaLaData();
  }, []);

  const cargarTodaLaData = async () => {
    setCargando(true);
    
    // Ejecutar ambas consultas al mismo tiempo para mayor velocidad
    const [resActiva, resHistorial] = await Promise.all([
        verificarCajaAbierta(),
        obtenerHistorialArqueos()
    ]);

    if (resActiva.success && resActiva.caja) {
      setCajaActiva(resActiva.caja);
      const resVentas = await obtenerVentasTurno(resActiva.caja.id);
      if (resVentas.success) setVentasMetodos(resVentas.datos || []);
    } else {
      setCajaActiva(null);
    }

    if (resHistorial.success) {
        setHistorialCajas(resHistorial.datos || []);
    }

    setCargando(false);
  };

  const manejarAbrirCaja = async (e) => {
    e.preventDefault();
    if (!montoApertura || parseFloat(montoApertura) < 0) return alert('Defina un monto válido.');

    const res = await abrirCajaTransaccional(montoApertura);
    if (res.success) {
      alert('Turno de caja inicializado correctamente.');
      setMontoApertura('');
      cargarTodaLaData();
    } else {
      alert('Error: ' + res.error);
    }
  };

  const manejarCerrarCaja = async (e) => {
    e.preventDefault();
    if (!efectivoContado || parseFloat(efectivoContado) < 0) return alert('Escriba el dinero físico contado.');

    if(window.confirm('¿Está seguro de asentar este arqueo? Una vez cerrado el turno, no se podrá modificar el monto registrado.')) {
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

  // Cálculos de conciliación del turno actual
  const totalEfectivoVendido = ventasMetodos.find(m => m.metodo_pago === 'Efectivo')?.total_metodo || 0;
  const totalSinpe = ventasMetodos.find(m => m.metodo_pago === 'SINPE')?.total_metodo || 0;
  const totalTarjeta = ventasMetodos.find(m => m.metodo_pago === 'Tarjeta')?.total_metodo || 0;
  
  const apertura = cajaActiva ? parseFloat(cajaActiva.monto_apertura) : 0;
  const efectivoTeoricoSist = apertura + totalEfectivoVendido;
  const efectivoRealUsuario = parseFloat(efectivoContado) || 0;
  const diferenciaArqueo = efectivoRealUsuario - efectivoTeoricoSist;

  if (cargando) return <main style={{ padding: '2rem', color: 'var(--x-text-muted)' }}>Sincronizando estado y auditoría de cajas...</main>;

  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '25px', color: 'var(--x-text-main)' }}>Control de Turno y Arqueo de Caja</h2>

      {/* SECCIÓN SUPERIOR: CAJA ACTIVA O APERTURA */}
      {!cajaActiva ? (
        <div style={{ background: 'var(--x-bg-card)', padding: '30px', borderRadius: '12px', border: '1px solid var(--x-border)', maxWidth: '450px', margin: '0 auto 40px auto' }}>
          <h3 style={{ marginTop: 0, color: 'var(--x-primary)' }}>Apertura de Turno Requerida</h3>
          <p style={{ fontSize: '13px', color: 'var(--x-text-muted)', marginBottom: '20px' }}>
            El sistema transaccional se encuentra bloqueado temporalmente. Registre el efectivo base para dar vuelto antes de operar las cajas. Todo quedará en la bitácora de auditoría.
          </p>
          <form onSubmit={manejarAbrirCaja} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--x-text-muted)', display: 'block', marginBottom: '5px' }}>Monto de Apertura (Efectivo Base)</label>
              <input type="number" placeholder="₡0.00" value={montoApertura} onChange={e => setMontoApertura(e.target.value)} className="crud-input-style" style={{ fontWeight: 'bold', fontSize: '16px' }} required />
            </div>
            <button type="submit" style={{ backgroundColor: 'var(--x-primary)', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
              Inicializar Caja Activa
            </button>
          </form>
        </div>
      ) : (
        <div className="responsive-grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: '30px', marginBottom: '40px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--x-text-muted)', textTransform: 'uppercase' }}>Sesión Iniciada (Turno #{cajaActiva.id})</span>
              <div style={{ fontSize: '13px', color: '#fff', fontWeight: 'bold', marginTop: '4px' }}>{cajaActiva.fecha_apertura}</div>
              <div style={{ fontSize: '13px', color: 'var(--x-text-muted)', marginTop: '8px' }}>Monto de Apertura: <strong>₡{apertura.toLocaleString()}</strong></div>
            </div>

            <div style={{ background: 'var(--x-bg-card)', padding: '25px', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '15px' }}>Ventas del Turno por Medio</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--x-border)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--x-text-muted)' }}>(+) Ventas Efectivo:</span>
                  <span style={{ fontWeight: 'bold' }}>₡{totalEfectivoVendido.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--x-border)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--x-text-muted)' }}> SINPE Móvil:</span>
                  <span style={{ fontWeight: 'bold', color: '#a855f7' }}>₡{totalSinpe.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--x-border)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--x-text-muted)' }}> Tarjetas Débito/Crédito:</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--x-primary)' }}>₡{totalTarjeta.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', fontSize: '15px', fontWeight: 'bold' }}>
                  <span>Efectivo Esperado en Gaveta:</span>
                  <span style={{ color: 'var(--success-green)' }}>₡{efectivoTeoricoSist.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--x-bg-card)', padding: '25px', borderRadius: '12px', border: '1px solid var(--x-border)', height: 'fit-content' }}>
            <h3 style={{ marginTop: 0, marginBottom: '5px', fontSize: '16px' }}>Cierre y Arqueo Físico</h3>
            <p style={{ fontSize: '12px', color: 'var(--x-text-muted)', marginBottom: '20px' }}>Cuente el dinero físico de la caja registradora e ingrese el total real.</p>
            
            <form onSubmit={manejarCerrarCaja} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--x-text-muted)', display: 'block', marginBottom: '5px' }}>Efectivo Real Contado (Gaveta)</label>
                <input type="number" placeholder="₡0.00" value={efectivoContado} onChange={e => setEfectivoContado(e.target.value)} className="crud-input-style" style={{ fontSize: '16px', fontWeight: 'bold' }} required />
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
                    <span>Diferencia CRC:</span>
                    <span>₡{diferenciaArqueo.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                  </div>
                </div>
              )}

              <button type="submit" style={{ backgroundColor: 'var(--danger-red)', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Asentar Arqueo y Cerrar Turno
              </button>
            </form>
          </div>

        </div>
      )}

      {/* SECCIÓN INFERIOR: BITÁCORA DE AUDITORÍA (HISTORIAL) */}
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
                  <th style={{ padding: '15px 12px' }}>Apertura</th>
                  <th style={{ padding: '15px 12px' }}>Cierre</th>
                  <th style={{ padding: '15px 12px', textAlign: 'right' }}>Fondo Base</th>
                  <th style={{ padding: '15px 12px', textAlign: 'right' }}>Efectivo Sistema</th>
                  <th style={{ padding: '15px 12px', textAlign: 'right' }}>Efectivo Real (Cajero)</th>
                  <th style={{ padding: '15px 12px', textAlign: 'right' }}>Descuadre</th>
                  <th style={{ padding: '15px 12px', textAlign: 'center' }}>Estado</th>
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
                          textoDescuadre = `Falta ₡${Math.abs(diferencia).toLocaleString()}`;
                      } else if (diferencia > 0) {
                          colorDescuadre = 'var(--x-primary)';
                          textoDescuadre = `Sobra ₡${diferencia.toLocaleString()}`;
                      } else {
                          colorDescuadre = 'var(--success-green)';
                          textoDescuadre = 'Cuadre Exacto';
                      }
                  }

                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(56,68,77,0.4)', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--x-bg-card-hover)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: 'var(--x-text-muted)' }}>#{c.id}</td>
                      <td style={{ padding: '12px' }}>{c.fecha_apertura}</td>
                      <td style={{ padding: '12px', color: c.estado === 'Abierto' ? 'var(--success-green)' : 'inherit' }}>{c.fecha_cierre}</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>₡{(c.monto_apertura || 0).toLocaleString()}</td>
                      <td style={{ padding: '12px', textAlign: 'right', color: 'var(--x-text-muted)' }}>₡{montoEsperado.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                          {montoReal !== null ? `₡${montoReal.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: colorDescuadre }}>
                          {textoDescuadre}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{ backgroundColor: c.estado === 'Abierto' ? 'rgba(0, 186, 124, 0.15)' : 'rgba(255, 255, 255, 0.05)', color: c.estado === 'Abierto' ? 'var(--success-green)' : 'var(--x-text-muted)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                          {c.estado}
                        </span>
                      </td>
                    </tr>
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