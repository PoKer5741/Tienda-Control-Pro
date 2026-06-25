'use client';
import { useState, useEffect } from 'react';
import { obtenerProductos } from '@/app/actions/inventarioActions';
import { procesarVentaTransaccional } from '@/app/actions/ventasActions';
import { obtenerClientes, registrarCliente } from '@/app/actions/clientesActions';
import { enviarFacturaCorreo } from '@/app/actions/emailActions';

export default function FacturacionPage() {
  const [inventario, setInventario] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cajaAbierta, setCajaAbierta] = useState(false);
  const [cargando, setCargando] = useState(true);
  
  const [codigoBusqueda, setCodigoBusqueda] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [cantidadVenta, setCantidadVenta] = useState(1);
  const [descuentoVenta, setDescuentoVenta] = useState(0); 
  
  const [tipoDocumento, setTipoDocumento] = useState('Tiquete');
  const [busquedaCliente, setBusquedaCliente] = useState('CLIENTE CONTADO');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [montoIngresado, setMontoIngresado] = useState('');
  const [notasFactura, setNotasFactura] = useState('');
  
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false);
  const [nuevoCliCedula, setNuevoCliCedula] = useState('');
  const [nuevoCliCorreo, setNuevoCliCorreo] = useState('');

  const [carritosEnEspera, setCarritosEnEspera] = useState([]);
  const [mostrarModalEspera, setMostrarModalEspera] = useState(false);
  const [nombreEspera, setNombreEspera] = useState('');

  const [facturaImpresion, setFacturaImpresion] = useState(null);

  useEffect(() => { cargarSistemas(); }, []);

  // FOCO UNIVERSAL: Escáner y Atajos (Intacto)
  useEffect(() => {
    let buffer = '';
    let ultimaPulsacion = Date.now();

    const manejarTecladoGlobal = (e) => {
        if (e.key === 'F2') { e.preventDefault(); if (carrito.length > 0) validarYAbrirPago(); return; }
        if (e.key === 'F8') { e.preventDefault(); if (carrito.length > 0) pausarVentaActual(); return; }

        const ahora = Date.now();
        const diff = ahora - ultimaPulsacion;
        ultimaPulsacion = ahora;

        if (e.key === 'Enter' && buffer.length > 2) {
            e.preventDefault(); e.stopPropagation();
            const codigoEscaneado = buffer;
            buffer = '';

            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                const inputActivo = document.activeElement;
                if (inputActivo.value.endsWith(codigoEscaneado)) {
                    inputActivo.value = inputActivo.value.slice(0, -codigoEscaneado.length);
                    inputActivo.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }

            const producto = inventario.find(p => p.codigo === codigoEscaneado);
            if (producto) procesarIngresoCarrito(producto, 1, 0);
            else alert('Código no registrado: ' + codigoEscaneado);
            return;
        }

        if (e.key.length === 1) buffer = (diff < 25 || buffer.length === 0) ? buffer + e.key : e.key;
    };

    window.addEventListener('keydown', manejarTecladoGlobal, true);
    return () => window.removeEventListener('keydown', manejarTecladoGlobal, true);
  }, [inventario, carrito, tipoDocumento, clienteSeleccionado]); 

  const cargarSistemas = async () => {
    setCargando(true);
    const [resInv, resCli] = await Promise.all([obtenerProductos(), obtenerClientes()]);
    // En un sistema real, aquí validas la caja (Paso 18 integrado visualmente)
    setCajaAbierta(true); 
    
    if (resInv.success) setInventario(resInv.datos.filter(p => p.estado_comercial !== 'Descontinuado'));
    if (resCli.success) {
        const listaClientes = resCli.datos || [];
        setClientes(listaClientes);
        const clienteBase = listaClientes.find(c => c.nombre === 'CLIENTE CONTADO') || { id: 1, nombre: 'CLIENTE CONTADO', cedula: '000000000', correo: 'sin@correo.com' };
        setClienteSeleccionado(clienteBase);
    }
    setCargando(false);
  };

  const manejarBusquedaCliente = (valor) => {
    setBusquedaCliente(valor);
    setClienteSeleccionado(clientes.find(c => c.nombre.toLowerCase() === valor.toLowerCase() || c.cedula === valor) || null);
  };

  const omitirRegistro = () => {
    const cc = clientes.find(c => c.nombre === 'CLIENTE CONTADO') || { id: 1, nombre: 'CLIENTE CONTADO' };
    setBusquedaCliente('CLIENTE CONTADO'); setClienteSeleccionado(cc); setTipoDocumento('Tiquete'); 
  };

  const guardarClienteRapido = async (e) => {
    e.preventDefault();
    if(!busquedaCliente || !nuevoCliCedula || !nuevoCliCorreo) return alert('Faltan datos.');
    const res = await registrarCliente(busquedaCliente.toUpperCase(), nuevoCliCedula, nuevoCliCorreo, '');
    if (res.success) {
        setMostrarModalCliente(false); setNuevoCliCedula(''); setNuevoCliCorreo('');
        cargarSistemas();
    } else alert('Fallo: ' + res.error);
  };

  const procesarIngresoCarrito = (producto, cant, descPorcentaje) => {
    const montoDescuento = (producto.precio * cant) * (descPorcentaje / 100);
    const subtotalFinal = (producto.precio * cant) - montoDescuento;

    setCarrito(actual => {
        const idx = actual.findIndex(i => i.id === producto.id && i.descPorcentaje === descPorcentaje);
        if (idx >= 0) {
            const nuevaCant = actual[idx].cantidad + cant;
            if (producto.cantidad < nuevaCant) { alert('Stock insuficiente.'); return actual; }
            const nuevo = [...actual];
            nuevo[idx].cantidad = nuevaCant;
            nuevo[idx].montoDescuento = (producto.precio * nuevaCant) * (descPorcentaje / 100);
            nuevo[idx].subtotalFinal = (producto.precio * nuevaCant) - nuevo[idx].montoDescuento;
            return nuevo;
        } else {
            if (producto.cantidad < cant) { alert('Stock insuficiente.'); return actual; }
            return [...actual, {
                id: producto.id, codigo: producto.codigo, nombre: producto.nombre,
                precio: producto.precio, porcentaje_iva: producto.porcentaje_iva, 
                cantidad: cant, descPorcentaje, montoDescuento, subtotalFinal
            }];
        }
    });
  };

  const agregarAlCarritoManual = (e) => {
    e.preventDefault();
    if (!codigoBusqueda || !cantidadVenta) return;
    const producto = inventario.find(p => p.codigo === codigoBusqueda || p.nombre === codigoBusqueda);
    if (!producto) return alert('Producto no válido.');
    
    procesarIngresoCarrito(producto, parseInt(cantidadVenta), parseFloat(descuentoVenta) || 0);
    setCodigoBusqueda(''); setCantidadVenta(1); setDescuentoVenta(0);
  };

  const removerDelCarrito = (index) => {
    const nuevo = [...carrito]; nuevo.splice(index, 1); setCarrito(nuevo);
  };

  const pausarVentaActual = () => {
    if (carrito.length === 0) return alert('Carrito vacío.');
    setNombreEspera(''); setMostrarModalEspera(true);
  };

  const confirmarPausaVenta = (e) => {
    e.preventDefault();
    setCarritosEnEspera(p => [...p, { nombre: nombreEspera || `Ticket ${new Date().toLocaleTimeString()}`, carrito: [...carrito], clienteSeleccionado, busquedaCliente, tipoDocumento }]);
    setCarrito([]); omitirRegistro(); setMostrarModalEspera(false);
  };

  const recuperarCarritoEspera = (index) => {
    const rec = carritosEnEspera[index];
    setCarrito(rec.carrito); setClienteSeleccionado(rec.clienteSeleccionado); setBusquedaCliente(rec.busquedaCliente); setTipoDocumento(rec.tipoDocumento);
    setCarritosEnEspera(p => p.filter((_, idx) => idx !== index));
  };

  // MATEMÁTICAS (Incluyendo Descuentos)
  const subtotalBruto = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const totalDescuentos = carrito.reduce((sum, item) => sum + item.montoDescuento, 0);
  const subtotalNeto = subtotalBruto - totalDescuentos;
  const totalImpuestos = carrito.reduce((sum, item) => sum + (item.subtotalFinal * (item.porcentaje_iva / 100)), 0);
  const totalFinal = subtotalNeto + totalImpuestos;
  
  const totalArticulos = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const ingresadoNum = parseFloat(montoIngresado) || 0;
  const vuelto = ingresadoNum - totalFinal;
  const pagoValido = ingresadoNum >= totalFinal;

  const validarYAbrirPago = () => {
    if (!cajaAbierta) return alert('CAJA CERRADA: Debe abrir un turno de caja para facturar.');
    if (carrito.length === 0) return alert('Carrito vacío.');
    if (tipoDocumento === 'Factura' && (!clienteSeleccionado || !clienteSeleccionado.cedula)) return alert('Hacienda requiere cédula para Factura.');
    if (!clienteSeleccionado) return alert('Seleccione o registre al cliente.');

    setMetodoPago('Efectivo'); setMontoIngresado(''); setNotasFactura(''); setMostrarModalPago(true);
  };

  const ejecutarFacturacion = async () => {
    if (!pagoValido || !clienteSeleccionado) return;
    const btn = document.getElementById('btn-procesar');
    if(btn) btn.innerText = 'PROCESANDO...';
    
    const respuesta = await procesarVentaTransaccional(
        clienteSeleccionado.id, tipoDocumento, metodoPago, subtotalBruto, totalDescuentos, 
        totalImpuestos, totalFinal, ingresadoNum, vuelto, notasFactura, carrito
    );
    
    if (respuesta.success) {
        const fac = respuesta.facturaId;
        setFacturaImpresion({
            consecutivo: fac.toString().padStart(5, '0'), tipoDocumento, fecha: new Date().toLocaleString(),
            cliente: clienteSeleccionado, metodoPago, notas: notasFactura,
            subtotalBruto, totalDescuentos, subtotalNeto, totalImpuestos, totalFinal, items: [...carrito]
        });

        if (clienteSeleccionado.correo && clienteSeleccionado.correo !== 'sin@correo.com') {
            await enviarFacturaCorreo(clienteSeleccionado.correo, clienteSeleccionado.nombre, tipoDocumento, fac, carrito, subtotalNeto, totalImpuestos, totalFinal);
        }

        setMostrarModalPago(false); setCarrito([]); omitirRegistro(); 
        if(btn) btn.innerText = 'ASENTAR';
        setTimeout(() => { window.print(); }, 300);
    } else {
      alert('Error SQL: ' + respuesta.error);
      if(btn) btn.innerText = 'ASENTAR';
    }
  };

  const esClienteNuevo = busquedaCliente.length > 2 && !clienteSeleccionado && busquedaCliente !== 'CLIENTE CONTADO';

  return (
    <main style={{ padding: '2rem', position: 'relative' }}>
      <style>{`
        @media print {
            body, html, main { background: #ffffff !important; color: #000000 !important; padding: 0 !important; margin: 0 !important; }
            nav, .responsive-grid, h2, div[style*="justify-content: space-between"], .crud-input-style, button, datalist { display: none !important; }
            .seccion-recibo-termico { display: block !important; width: 76mm !important; margin: 0 auto !important; padding: 10px !important; font-family: 'Courier New', Courier, monospace !important; font-size: 11px !important; color: #000 !important; }
        }
        @media screen { .seccion-recibo-termico { display: none !important; } }
      `}</style>

      {/* MODAL COBRO (CON NOTAS INCLUIDAS) */}
      {mostrarModalPago && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
            <div style={{ background: 'var(--x-bg-card)', border: '1px solid var(--x-border)', borderRadius: '12px', width: '100%', maxWidth: '450px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: 'var(--x-primary)', padding: '15px', textAlign: 'center' }}><h3 style={{ margin: 0, color: '#fff' }}>Emitir {tipoDocumento}</h3></div>
                <div style={{ padding: '25px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '15px', fontSize: '14px' }}>Cliente: <span style={{ color: '#fff', fontWeight: 'bold' }}>{clienteSeleccionado?.nombre}</span></div>

                    <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px', color: 'var(--x-text-muted)' }}><span>Bruto:</span><span>₡{subtotalBruto.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px', color: 'var(--danger-red)' }}><span>Descuentos:</span><span>- ₡{totalDescuentos.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: 'var(--x-text-muted)' }}><span>I.V.A.:</span><span>₡{totalImpuestos.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--x-border)', fontSize: '18px', fontWeight: 'bold' }}>
                            <span>A COBRAR</span><span style={{ color: 'var(--success-green)' }}>₡{totalFinal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
                        {['Efectivo', 'SINPE', 'Tarjeta'].map(met => (
                            <button key={met} onClick={() => {setMetodoPago(met); setMontoIngresado(met!=='Efectivo' ? totalFinal.toString() : '');}} style={{ flex: 1, padding: '10px 0', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', border: metodoPago === met ? `2px solid var(--x-primary)` : '1px solid var(--x-border)', backgroundColor: 'transparent', color: '#fff' }}>{met.toUpperCase()}</button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                        <input type="number" value={montoIngresado} onChange={(e) => setMontoIngresado(e.target.value)} disabled={metodoPago !== 'Efectivo'} className="crud-input-style" placeholder="Monto recibido CRC" style={{ flex: 1, textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }} />
                        {metodoPago === 'Efectivo' && <button onClick={() => setMontoIngresado(totalFinal.toString())} className="crud-input-style" style={{cursor: 'pointer', width:'auto'}}>Exacto</button>}
                    </div>
                    
                    <input type="text" placeholder="Notas de venta (Ej: Entregar a Juan)..." value={notasFactura} onChange={e => setNotasFactura(e.target.value)} className="crud-input-style" style={{ marginBottom: '20px' }} />

                    <div className="form-grid-2">
                        <button onClick={() => setMostrarModalPago(false)} className="crud-input-style" style={{cursor: 'pointer'}}>Cancelar</button>
                        <button id="btn-procesar" onClick={ejecutarFacturacion} disabled={!pagoValido} style={{ padding: '15px', borderRadius: '8px', fontWeight: 'bold', backgroundColor: pagoValido ? 'var(--success-green)' : 'gray', border: 'none', color: '#000', cursor: pagoValido ? 'pointer' : 'not-allowed' }}>ASENTAR</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* POS UI MAIN */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: 'var(--x-text-main)' }}>POS Táctil & Láser</h2>
        {!cajaAbierta && <span style={{ background: 'var(--danger-red)', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>CAJA CERRADA</span>}
      </div>

      <div className="responsive-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
                <div className="form-grid-2" style={{ marginBottom: '15px' }}>
                    <button onClick={() => setTipoDocumento('Tiquete')} style={{ padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', border: '1px solid var(--x-border)', backgroundColor: tipoDocumento === 'Tiquete' ? 'var(--x-primary)' : 'transparent', color: '#fff' }}>TIQUETE</button>
                    <button onClick={() => setTipoDocumento('Factura')} style={{ padding: '10px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', border: '1px solid var(--x-border)', backgroundColor: tipoDocumento === 'Factura' ? 'var(--x-primary)' : 'transparent', color: '#fff' }}>FACTURA</button>
                </div>
                <input list="lista-clientes-pos" placeholder="Cliente..." value={busquedaCliente} onChange={e => manejarBusquedaCliente(e.target.value)} className="crud-input-style" style={{ borderColor: esClienteNuevo ? '#ffad1f' : 'var(--x-border)' }} />
                <datalist id="lista-clientes-pos">{clientes.map(c => <option key={c.id} value={c.nombre}>{c.cedula}</option>)}</datalist>
            </div>

            <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
                <h3 style={{ marginTop: 0 }}>Entrada Manual</h3>
                <form onSubmit={agregarAlCarritoManual} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input list="lista-inventario" placeholder="Producto/Código..." value={codigoBusqueda} onChange={e => setCodigoBusqueda(e.target.value)} className="crud-input-style"/>
                    <datalist id="lista-inventario">{inventario.map(p => <option key={p.id} value={p.codigo}>{p.nombre} (₡{p.precio})</option>)}</datalist>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input type="number" min="1" placeholder="Cant" value={cantidadVenta} onChange={e => setCantidadVenta(e.target.value)} className="crud-input-style" style={{flex:1}}/>
                        <input type="number" min="0" max="100" placeholder="% Desc" value={descuentoVenta} onChange={e => setDescuentoVenta(e.target.value)} className="crud-input-style" style={{flex:1}}/>
                    </div>
                    <button type="submit" className="crud-input-style" style={{cursor: 'pointer'}}>Insertar</button>
                </form>
            </div>
        </div>

        <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)', display: 'flex', flexDirection: 'column' }}>
          <ul style={{ listStyle: 'none', padding: 0, flex: 1, maxHeight: '350px', overflowY: 'auto' }}>
            {carrito.map((c, i) => (
              <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                    <div><strong>{c.cantidad}x</strong> {c.nombre}</div>
                    {c.descPorcentaje > 0 && <div style={{ fontSize: '11px', color: 'var(--danger-red)' }}>-{c.descPorcentaje}% (₡{c.montoDescuento.toLocaleString()})</div>}
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <span>₡{c.subtotalFinal.toLocaleString()}</span>
                    <button onClick={() => removerDelCarrito(i)} style={{ color: 'var(--danger-red)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                </div>
              </li>
            ))}
          </ul>
          <div style={{ borderTop: '2px dashed var(--x-border)', paddingTop: '15px', marginTop: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20px', fontWeight: 'bold', color: 'var(--success-green)' }}>
              <span>TOTAL CRC:</span> <span>₡{totalFinal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button onClick={pausarVentaActual} style={{ padding: '12px', background: 'transparent', border: '1px solid var(--x-border)', color: '#fff', borderRadius: '6px', cursor: 'pointer' }}>Pausar [F8]</button>
            <button onClick={validarYAbrirPago} style={{ flex: 1, backgroundColor: 'var(--success-green)', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Cobrar [F2]</button>
          </div>
        </div>
      </div>

      {/* COMPROBANTE TÉRMICO (INCLUYE NOTAS Y DESCUENTOS) */}
      {facturaImpresion && (
        <div className="seccion-recibo-termico">
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: '0 0 5px 0' }}>TIENDA CONTROL PRO</h3>
                <p style={{ margin: 0 }}>Golfito, Puntarenas, Costa Rica</p>
                <p style={{ margin: '5px 0', fontWeight: 'bold' }}>{facturaImpresion.tipoDocumento.toUpperCase()} ELECTRÓNICO</p>
                <p style={{ margin: 0 }}>N° FAC-{facturaImpresion.consecutivo}</p>
            </div>
            <div style={{ borderBottom: '1px dashed #000', paddingBottom: '5px', marginBottom: '5px' }}>
                <p style={{ margin: '3px 0' }}>Fecha: {facturaImpresion.fecha}</p>
                <p style={{ margin: '3px 0' }}>Cliente: {facturaImpresion.cliente?.nombre}</p>
                {facturaImpresion.notas && <p style={{ margin: '3px 0', fontWeight: 'bold' }}>Notas: {facturaImpresion.notas}</p>}
            </div>
            <table style={{ width: '100%', fontSize: '11px' }}>
                {facturaImpresion.items.map((item, idx) => (
                    <tr key={idx}>
                        <td>{item.nombre} (x{item.cantidad}) {item.descPorcentaje > 0 ? `[-${item.descPorcentaje}%]` : ''}</td>
                        <td style={{ textAlign: 'right' }}>₡{item.subtotalFinal.toLocaleString()}</td>
                    </tr>
                ))}
            </table>
            <div style={{ borderTop: '1px dashed #000', marginTop: '5px', paddingTop: '5px', textAlign: 'right' }}>
                <p style={{ margin: '0 0 2px 0' }}>Subtotal: ₡{facturaImpresion.subtotalBruto.toLocaleString()}</p>
                {facturaImpresion.totalDescuentos > 0 && <p style={{ margin: '0 0 2px 0' }}>Descuentos: -₡{facturaImpresion.totalDescuentos.toLocaleString()}</p>}
                <p style={{ margin: '0 0 2px 0' }}>IVA (13%): ₡{facturaImpresion.totalImpuestos.toLocaleString()}</p>
                <p style={{ margin: '4px 0 0 0', fontWeight: 'bold' }}>TOTAL CRC: ₡{facturaImpresion.totalFinal.toLocaleString()}</p>
            </div>
        </div>
      )}
    </main>
  );
}