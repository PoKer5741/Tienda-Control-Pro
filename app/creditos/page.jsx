'use client';
import { useState, useEffect } from 'react';
import { obtenerCuentasPendientes, asentarAbonoCredito } from '@/app/actions/creditosActions';
import Modal from '@/components/Modal';

export default function CreditosPage() {
  const [cuentas, setCuentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  // Estados del Modal de Abono
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
  const [montoAbono, setMontoAbono] = useState('');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    cargarCartera();
  }, []);

  const cargarCartera = async () => {
    setCargando(true);
    const respuesta = await obtenerCuentasPendientes();
    if (respuesta.success) setCuentas(respuesta.datos || []);
    else alert('Error al sincronizar cartera: ' + respuesta.error);
    setCargando(false);
  };

  const abrirModalAbono = (cuenta) => {
    setCuentaSeleccionada(cuenta);
    setMontoAbono('');
    setIsModalOpen(true);
  };

  const ejecutarAbono = async (e) => {
    e.preventDefault();
    const abonoNum = parseFloat(montoAbono);
    
    if (!abonoNum || abonoNum <= 0) return alert('Ingrese un monto válido mayor a cero.');
    if (abonoNum > cuentaSeleccionada.saldo_pendiente) return alert('El abono excede el saldo pendiente.');

    setProcesando(true);
    const res = await asentarAbonoCredito(cuentaSeleccionada.id, abonoNum);
    
    if (res.success) {
      alert('Abono registrado con éxito. El dinero ha ingresado a la caja activa.');
      setIsModalOpen(false);
      cargarCartera();
    } else {
      alert('Fallo al asentar abono: ' + res.error);
    }
    setProcesando(false);
  };

  const cuentasFiltradas = cuentas.filter(c => 
    c.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    c.factura_id.toString().includes(busqueda)
  );

  return (
    <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ color: 'var(--x-text-main)', margin: 0 }}>Cuentas por Cobrar (Créditos)</h2>
          <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: 'var(--x-text-muted)' }}>Gestión de cartera, amortizaciones y saldos de clientes.</p>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <input 
          type="text" 
          placeholder="Buscar por nombre de cliente o número de factura..." 
          value={busqueda} 
          onChange={(e) => setBusqueda(e.target.value)} 
          className="crud-input-style" 
          style={{ maxWidth: '450px' }}
        />
      </div>

      <div style={{ background: 'var(--x-bg-card)', padding: '0', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
        {cargando ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--x-text-muted)' }}>Consultando deudas en el libro mayor...</div>
        ) : cuentasFiltradas.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--success-green)', fontWeight: 'bold' }}>¡Excelente! No hay cuentas por cobrar pendientes.</div>
        ) : (
          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--x-border)', color: 'var(--x-text-muted)' }}>
                  <th style={{ padding: '15px' }}>Factura Original</th>
                  <th style={{ padding: '15px' }}>Cliente</th>
                  <th style={{ padding: '15px' }}>Vencimiento</th>
                  <th style={{ padding: '15px', textAlign: 'right' }}>Deuda Total</th>
                  <th style={{ padding: '15px', textAlign: 'right' }}>Saldo Pendiente</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Estado</th>
                  <th style={{ padding: '15px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cuentasFiltradas.map(c => {
                  const esPagado = c.estado === 'Pagado';
                  const vencida = !esPagado && new Date(c.fecha_vencimiento) < new Date();
                  
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: esPagado ? 0.5 : 1 }}>
                        <td style={{ padding: '15px', fontWeight: 'bold' }}>FAC-{(c.factura_id || 0).toString().padStart(5, '0')}</td>
                        <td style={{ padding: '15px' }}>
                            <div style={{ color: '#fff', fontWeight: '500' }}>{c.cliente_nombre}</div>
                            <div style={{ fontSize: '11px', color: 'var(--x-text-muted)' }}>CI: {c.cliente_cedula || 'N/A'}</div>
                        </td>
                        <td style={{ padding: '15px', color: vencida ? 'var(--danger-red)' : 'var(--x-text-muted)', fontWeight: vencida ? 'bold' : 'normal' }}>
                            {c.fecha_vencimiento}
                            {vencida && <span style={{ display: 'block', fontSize: '10px' }}>VENCIDA</span>}
                        </td>
                        <td style={{ padding: '15px', textAlign: 'right', color: 'var(--x-text-muted)' }}>
                            ₡{parseFloat(c.monto_total).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                        <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', color: esPagado ? 'var(--success-green)' : '#fff', fontSize: '15px' }}>
                            ₡{parseFloat(c.saldo_pendiente).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                        <td style={{ padding: '15px', textAlign: 'center' }}>
                            <span style={{ 
                                backgroundColor: esPagado ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                                color: esPagado ? 'var(--success-green)' : 'var(--danger-red)', 
                                padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' 
                            }}>
                                {c.estado.toUpperCase()}
                            </span>
                        </td>
                        <td style={{ padding: '15px', textAlign: 'center' }}>
                            {!esPagado && (
                                <button 
                                    onClick={() => abrirModalAbono(c)} 
                                    style={{ backgroundColor: 'transparent', border: '1px solid var(--x-primary)', color: 'var(--x-primary)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                    Recibir Abono
                                </button>
                            )}
                        </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DE REGISTRO DE ABONO */}
      <Modal isOpen={isModalOpen} onClose={() => !procesando && setIsModalOpen(false)}>
        <form onSubmit={ejecutarAbono} style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px' }}>
          <div style={{ borderBottom: '1px solid var(--x-border)', paddingBottom: '10px', marginBottom: '5px' }}>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>Asentar Nuevo Abono</h3>
            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: 'var(--x-text-muted)' }}>El monto se sumará automáticamente al turno de caja actual.</p>
          </div>
          
          {cuentaSeleccionada && (
              <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                      <span style={{ color: 'var(--x-text-muted)' }}>Cliente:</span>
                      <span style={{ color: '#fff', fontWeight: 'bold' }}>{cuentaSeleccionada.cliente_nombre}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                      <span style={{ color: 'var(--x-text-muted)' }}>Documento:</span>
                      <span style={{ color: '#fff' }}>FAC-{(cuentaSeleccionada.factura_id || 0).toString().padStart(5, '0')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--x-border)', paddingTop: '8px', marginTop: '8px', fontSize: '16px', fontWeight: 'bold' }}>
                      <span style={{ color: 'var(--danger-red)' }}>Saldo a la Fecha:</span>
                      <span style={{ color: '#fff' }}>₡{parseFloat(cuentaSeleccionada.saldo_pendiente).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
              </div>
          )}

          <div>
              <label style={{ fontSize: '12px', color: 'var(--x-text-muted)', marginBottom: '5px', display: 'block' }}>Monto Entregado (CRC)</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                      type="number" 
                      step="0.01" 
                      value={montoAbono} 
                      onChange={e => setMontoAbono(e.target.value)} 
                      className="crud-input-style" 
                      style={{ fontSize: '18px', fontWeight: 'bold', flex: 1 }} 
                      required 
                  />
                  <button 
                      type="button" 
                      className="crud-input-style" 
                      onClick={() => setMontoAbono(cuentaSeleccionada?.saldo_pendiente)} 
                      style={{ width: 'auto', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                      Liquidación Total
                  </button>
              </div>
          </div>

          <button 
              type="submit" 
              disabled={procesando}
              style={{ backgroundColor: 'var(--success-green)', color: '#fff', border: 'none', padding: '16px', borderRadius: '8px', fontWeight: 'bold', cursor: procesando ? 'wait' : 'pointer', marginTop: '10px', textTransform: 'uppercase', letterSpacing: '1px', opacity: procesando ? 0.7 : 1 }}
          >
              {procesando ? 'Procesando Abono...' : 'Confirmar Abono y Abrir Caja'}
          </button>
        </form>
      </Modal>

    </main>
  );
}