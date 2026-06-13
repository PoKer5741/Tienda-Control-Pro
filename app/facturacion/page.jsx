'use client';
import { useState, useEffect } from 'react';
import { obtenerProductos } from '@/app/actions/inventarioActions';
import { procesarVentaTransaccional } from '@/app/actions/ventasActions';
import { obtenerClientes, registrarCliente } from '@/app/actions/clientesActions';
import { enviarFacturaCorreo } from '@/app/actions/emailActions';

export default function FacturacionPage() {
  const [inventario, setInventario] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  // Estados del Carrito
  const [codigoBusqueda, setCodigoBusqueda] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [cantidadVenta, setCantidadVenta] = useState(1);
  
  // Estados de Configuración de Venta
  const [tipoDocumento, setTipoDocumento] = useState('Tiquete');
  const [busquedaCliente, setBusquedaCliente] = useState('CLIENTE CONTADO');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  // Estados de Modales
  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [montoIngresado, setMontoIngresado] = useState('');
  
  // Modal de Nuevo Cliente Rápido
  const [mostrarModalCliente, setMostrarModalCliente] = useState(false);
  const [nuevoCliCedula, setNuevoCliCedula] = useState('');
  const [nuevoCliCorreo, setNuevoCliCorreo] = useState('');

  useEffect(() => {
    cargarSistemas();
  }, []);

  const cargarSistemas = async () => {
    setCargando(true);
    const [resInv, resCli] = await Promise.all([obtenerProductos(), obtenerClientes()]);
    
    if (resInv.success) {
        // FILTRO CRÍTICO: Excluir productos descontinuados del Punto de Venta
        setInventario(resInv.datos.filter(p => p.estado_comercial !== 'Descontinuado'));
    }
    
    if (resCli.success) {
        const listaClientes = resCli.datos || [];
        setClientes(listaClientes);
        const clienteBase = listaClientes.find(c => c.nombre === 'CLIENTE CONTADO') || { id: 1, nombre: 'CLIENTE CONTADO', cedula: '000000000', correo: 'sin@correo.com' };
        setClienteSeleccionado(clienteBase);
    }
    setCargando(false);
  };

  // Motor Inteligente de Autocompletado de Clientes
  const manejarBusquedaCliente = (valor) => {
    setBusquedaCliente(valor);
    const match = clientes.find(c => c.nombre.toLowerCase() === valor.toLowerCase() || c.cedula === valor);
    setClienteSeleccionado(match || null);
  };

  const omitirRegistro = () => {
    const clienteContado = clientes.find(c => c.nombre === 'CLIENTE CONTADO') || { id: 1, nombre: 'CLIENTE CONTADO', cedula: '000000000', correo: 'sin@correo.com' };
    setBusquedaCliente('CLIENTE CONTADO');
    setClienteSeleccionado(clienteContado);
    setTipoDocumento('Tiquete'); // Forzamos Tiquete si es anónimo
  };

  const guardarClienteRapido = async (e) => {
    e.preventDefault();
    if(!busquedaCliente || !nuevoCliCedula || !nuevoCliCorreo) return alert('Datos obligatorios faltantes.');
    
    const respuesta = await registrarCliente(busquedaCliente.toUpperCase(), nuevoCliCedula, nuevoCliCorreo, '');
    if (respuesta.success) {
        setMostrarModalCliente(false);
        setNuevoCliCedula(''); setNuevoCliCorreo('');
        
        const resCli = await obtenerClientes();
        if(resCli.success) {
            setClientes(resCli.datos);
            const recienCreado = resCli.datos.find(c => c.nombre === busquedaCliente.toUpperCase());
            setClienteSeleccionado(recienCreado);
            setBusquedaCliente(recienCreado.nombre);
        }
    } else {
        alert('Fallo al registrar: ' + respuesta.error);
    }
  };

  // Lógica de Carrito (Con Agrupación Inteligente Integrada)
  const agregarAlCarrito = (e) => {
    e.preventDefault();
    if (!codigoBusqueda || !cantidadVenta) return;

    // 1. Buscamos el producto
    const producto = inventario.find(p => p.codigo === codigoBusqueda || p.nombre === codigoBusqueda);
    if (!producto) return alert('Producto no válido o descontinuado.');

    const cantidadAñadir = parseInt(cantidadVenta);

    // 2. Verificamos si ya existe en el carrito
    const itemExistenteIndex = carrito.findIndex(item => item.id === producto.id);

    if (itemExistenteIndex >= 0) {
      // SI YA EXISTE: Sumamos cantidades
      const nuevaCantidadTotal = carrito[itemExistenteIndex].cantidad + cantidadAñadir;

      // Validamos contra stock real
      if (producto.cantidad < nuevaCantidadTotal) {
        return alert(`Stock insuficiente. Ya tienes ${carrito[itemExistenteIndex].cantidad} en el carrito y solo hay ${producto.cantidad} unidades físicas en bodega.`);
      }

      const nuevoCarrito = [...carrito];
      nuevoCarrito[itemExistenteIndex].cantidad = nuevaCantidadTotal;
      setCarrito(nuevoCarrito);

    } else {
      // SI ES NUEVO: Validamos e insertamos fila
      if (producto.cantidad < cantidadAñadir) return alert('Stock insuficiente en bodega.');

      const nuevoItem = {
        id: producto.id, codigo: producto.codigo, nombre: producto.nombre,
        precio: producto.precio, porcentaje_iva: producto.porcentaje_iva, cantidad: cantidadAñadir
      };

      setCarrito([...carrito, nuevoItem]);
    }

    // 3. Limpiar inputs
    setCodigoBusqueda(''); 
    setCantidadVenta(1);
  };

  const removerDelCarrito = (index) => {
    const nuevoCarrito = [...carrito];
    nuevoCarrito.splice(index, 1);
    setCarrito(nuevoCarrito);
  };

  // Matemáticas
  const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const totalImpuestos = carrito.reduce((sum, item) => sum + ((item.precio * item.cantidad) * (item.porcentaje_iva / 100)), 0);
  const total = subtotal + totalImpuestos;
  const totalArticulos = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  
  const ingresadoNum = parseFloat(montoIngresado) || 0;
  const vuelto = ingresadoNum - total;
  const pagoValido = ingresadoNum >= total;

  // Validaciones y Apertura de Modal
  const validarYAbrirPago = () => {
    if (carrito.length === 0) return alert('El carrito está vacío.');
    
    if (tipoDocumento === 'Factura' && (!clienteSeleccionado || clienteSeleccionado.nombre === 'CLIENTE CONTADO' || !clienteSeleccionado.cedula)) {
        return alert('RESTRICCIÓN HACIENDA: Para emitir Factura Electrónica, debe seleccionar un cliente con Cédula y Correo registrados.');
    }
    if (!clienteSeleccionado) {
        return alert('Debe resolver el estado del cliente (Regístrelo u Omita para usar Contado).');
    }

    setMetodoPago('Efectivo');
    setMontoIngresado('');
    setMostrarModalPago(true);
  };

  const manejarCambioMetodo = (metodo) => {
    setMetodoPago(metodo);
    if (metodo !== 'Efectivo') setMontoIngresado(total.toString());
    else setMontoIngresado('');
  };

  const ejecutarFacturacion = async () => {
    if (!pagoValido || !clienteSeleccionado) return;

    const btnSubmit = document.getElementById('btn-procesar-pago');
    if(btnSubmit) btnSubmit.innerText = 'PROCESANDO EN SQL...';

    // Asentar transacción en SQL Server (incluye amarre a caja de turno)
    const respuesta = await procesarVentaTransaccional(
        clienteSeleccionado.id, 
        clienteSeleccionado.nombre, 
        tipoDocumento, 
        metodoPago, subtotal, totalImpuestos, total, ingresadoNum, vuelto, carrito
    );
    
    if (respuesta.success) {
        const numFactura = respuesta.facturaId;
        const correo = clienteSeleccionado.correo;
        let mensajeExito = `${tipoDocumento} asentado con éxito (N° FAC-${numFactura.toString().padStart(5, '0')}).`;

        // Enviar correo si existe uno válido
        if (correo && correo !== '' && correo !== 'sin@correo.com') {
            if(btnSubmit) btnSubmit.innerText = 'ENVIANDO CORREO...';
            const resCorreo = await enviarFacturaCorreo(correo, clienteSeleccionado.nombre, tipoDocumento, numFactura, carrito, subtotal, totalImpuestos, total);
            if (resCorreo.success) {
                mensajeExito += `\nSe ha enviado una copia digital al correo: ${correo}`;
            } else {
                mensajeExito += `\n(Aviso: No se pudo enviar el correo electrónico).`;
            }
        }

        alert(mensajeExito);
        setMostrarModalPago(false);
        setCarrito([]);
        omitirRegistro(); // Resetear cliente
        cargarSistemas(); // Refrescar inventario
        if(btnSubmit) btnSubmit.innerText = 'ASENTAR TRANSACCIÓN';
    } else {
      alert('Error en el motor SQL: ' + respuesta.error);
      if(btnSubmit) btnSubmit.innerText = 'ASENTAR TRANSACCIÓN';
    }
  };

  const esClienteNuevo = busquedaCliente.length > 2 && !clienteSeleccionado && busquedaCliente !== 'CLIENTE CONTADO';

  return (
    <main style={{ padding: '2rem', position: 'relative' }}>
      
      {/* MODAL CAPTURA CLIENTE RÁPIDO */}
      {mostrarModalCliente && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
            <form onSubmit={guardarClienteRapido} style={{ background: 'var(--x-bg-card)', border: '1px solid var(--x-primary)', borderRadius: '12px', width: '100%', maxWidth: '400px', padding: '25px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                <h3 style={{ marginTop: 0, color: '#fff' }}>Alta Rápida de Cliente</h3>
                <p style={{ fontSize: '13px', color: 'var(--x-text-muted)' }}>Registrando a: <strong>{busquedaCliente.toUpperCase()}</strong></p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', margin: '20px 0' }}>
                    <input type="text" placeholder="Cédula Física o Jurídica" value={nuevoCliCedula} onChange={e => setNuevoCliCedula(e.target.value)} className="crud-input-style" required />
                    <input type="email" placeholder="Correo Electrónico (Hacienda)" value={nuevoCliCorreo} onChange={e => setNuevoCliCorreo(e.target.value)} className="crud-input-style" required />
                </div>

                <div className="form-grid-2">
                    <button type="button" onClick={() => setMostrarModalCliente(false)} style={{ padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: 'transparent', border: '1px solid var(--x-border)', color: 'var(--x-text-main)' }}>Cancelar</button>
                    <button type="submit" style={{ padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: 'var(--x-primary)', border: 'none', color: '#fff' }}>Guardar Ficha</button>
                </div>
            </form>
        </div>
      )}

      {/* MODAL DE COBRO */}
      {mostrarModalPago && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '15px' }}>
            <div style={{ background: 'var(--x-bg-card)', border: '1px solid var(--x-border)', borderRadius: '12px', width: '100%', maxWidth: '450px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                <div style={{ backgroundColor: 'var(--x-primary)', padding: '15px', textAlign: 'center' }}>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>Emitir {tipoDocumento}</h3>
                </div>

                <div style={{ padding: '25px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '15px', color: 'var(--x-text-muted)', fontSize: '14px', textTransform: 'uppercase' }}>
                        Cliente: <span style={{ color: '#fff', fontWeight: 'bold' }}>{clienteSeleccionado?.nombre}</span>
                    </div>

                    <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'var(--x-text-muted)' }}>
                            <span>{totalArticulos} artículos en carrito</span>
                            <span>Subtotal: ₡{subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'var(--x-text-muted)' }}>
                            <span>I.V.A.</span>
                            <span>₡{totalImpuestos.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--x-border)', fontSize: '18px', fontWeight: 'bold' }}>
                            <span>TOTAL A COBRAR</span>
                            <span style={{ color: 'var(--success-green)' }}>₡{total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--x-text-muted)', fontWeight: 'bold', marginBottom: '10px' }}>MÉTODO DE PAGO</div>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                        <button onClick={() => manejarCambioMetodo('Efectivo')} style={{ flex: 1, padding: '12px 0', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', border: metodoPago === 'Efectivo' ? '2px solid var(--success-green)' : '1px solid var(--x-border)', backgroundColor: metodoPago === 'Efectivo' ? 'rgba(0, 186, 124, 0.1)' : 'transparent', color: metodoPago === 'Efectivo' ? 'var(--success-green)' : 'var(--x-text-main)' }}>
                            EFECTIVO
                        </button>
                        <button onClick={() => manejarCambioMetodo('SINPE')} style={{ flex: 1, padding: '12px 0', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', border: metodoPago === 'SINPE' ? '2px solid #a855f7' : '1px solid var(--x-border)', backgroundColor: metodoPago === 'SINPE' ? 'rgba(168, 85, 247, 0.1)' : 'transparent', color: metodoPago === 'SINPE' ? '#a855f7' : 'var(--x-text-main)' }}>
                            SINPE
                        </button>
                        <button onClick={() => manejarCambioMetodo('Tarjeta')} style={{ flex: 1, padding: '12px 0', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', border: metodoPago === 'Tarjeta' ? '2px solid var(--x-primary)' : '1px solid var(--x-border)', backgroundColor: metodoPago === 'Tarjeta' ? 'rgba(29, 161, 242, 0.1)' : 'transparent', color: metodoPago === 'Tarjeta' ? 'var(--x-primary)' : 'var(--x-text-main)' }}>
                            TARJETA
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ color: 'var(--x-text-muted)', fontWeight: 'bold', width: '80px' }}>{metodoPago}</span>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <span style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--x-text-muted)' }}>₡</span>
                                <input type="number" value={montoIngresado} onChange={(e) => setMontoIngresado(e.target.value)} disabled={metodoPago !== 'Efectivo'} className="crud-input-style" style={{ width: '100%', paddingLeft: '25px', textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }} />
                            </div>
                            {metodoPago === 'Efectivo' && (
                                <button onClick={() => setMontoIngresado(total.toString())} style={{ padding: '10px', backgroundColor: 'transparent', border: '1px solid var(--x-border)', color: 'var(--x-text-muted)', borderRadius: '6px', cursor: 'pointer' }}>Exacto</button>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px' }}>
                            <span style={{ fontSize: '14px', color: 'var(--x-text-muted)' }}>Cambio / Vuelto</span>
                            <span style={{ fontSize: '18px', fontWeight: 'bold', color: vuelto >= 0 ? '#fff' : 'var(--danger-red)' }}>
                                ₡{vuelto >= 0 ? vuelto.toLocaleString(undefined, {minimumFractionDigits: 2}) : '0.00'}
                            </span>
                        </div>
                    </div>

                    <div className="form-grid-2">
                        <button onClick={() => setMostrarModalPago(false)} style={{ padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: 'transparent', border: '1px solid var(--x-border)', color: 'var(--x-text-main)' }}>
                            Cancelar
                        </button>
                        <button id="btn-procesar-pago" onClick={ejecutarFacturacion} disabled={!pagoValido} style={{ padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: pagoValido ? 'pointer' : 'not-allowed', backgroundColor: pagoValido ? 'var(--x-primary)' : 'rgba(29, 161, 242, 0.3)', border: 'none', color: '#fff' }}>
                            ASENTAR TRANSACCIÓN
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      <h2 style={{ marginBottom: '20px', color: 'var(--x-text-main)' }}>Punto de Venta Profesional</h2>

      <div className="responsive-grid">
        
        {/* PANEL IZQUIERDO */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
                
                <div className="form-grid-2" style={{ marginBottom: '20px' }}>
                    <button onClick={() => setTipoDocumento('Tiquete')} style={{ padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', border: '1px solid var(--x-border)', backgroundColor: tipoDocumento === 'Tiquete' ? 'var(--x-primary)' : 'transparent', color: tipoDocumento === 'Tiquete' ? '#fff' : 'var(--x-text-main)' }}>
                        TIQUETE ELECTRÓNICO
                    </button>
                    <button onClick={() => setTipoDocumento('Factura')} style={{ padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', border: '1px solid var(--x-border)', backgroundColor: tipoDocumento === 'Factura' ? 'var(--x-primary)' : 'transparent', color: tipoDocumento === 'Factura' ? '#fff' : 'var(--x-text-main)' }}>
                        FACTURA (RUT)
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ fontSize: '13px', color: 'var(--x-text-muted)', marginBottom: '5px' }}>Búsqueda de Cliente (Nombre o Cédula)</label>
                    <input 
                        list="lista-clientes-pos" 
                        placeholder="Buscar o escribir cliente nuevo..." 
                        value={busquedaCliente} 
                        onChange={e => manejarBusquedaCliente(e.target.value)} 
                        className="crud-input-style" 
                        style={{ borderColor: esClienteNuevo ? '#ffad1f' : clienteSeleccionado ? 'var(--success-green)' : 'var(--x-border)' }}
                    />
                    <datalist id="lista-clientes-pos">
                        {clientes.map(c => <option key={c.id} value={c.nombre}>{c.cedula}</option>)}
                    </datalist>

                    {esClienteNuevo && (
                        <div style={{ marginTop: '10px', padding: '12px', backgroundColor: 'rgba(255, 173, 31, 0.1)', border: '1px dashed #ffad1f', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                            <span style={{ fontSize: '12px', color: '#ffad1f' }}>Cliente no registrado en BD.</span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button type="button" onClick={() => setMostrarModalCliente(true)} style={{ backgroundColor: '#ffad1f', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Guardar Ficha</button>
                                <button type="button" onClick={omitirRegistro} style={{ backgroundColor: 'transparent', color: 'var(--x-text-main)', border: '1px solid var(--x-border)', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>Omitir</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
                <h3 style={{ marginTop: 0 }}>Líneas de Detalle</h3>
                <form onSubmit={agregarAlCarrito} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div className="form-grid-2">
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '13px', color: 'var(--x-text-muted)', marginBottom: '5px' }}>Código o Producto</label>
                            <input list="lista-inventario" placeholder="Buscar artículo..." value={codigoBusqueda} onChange={e => setCodigoBusqueda(e.target.value)} className="crud-input-style"/>
                            <datalist id="lista-inventario">
                                {inventario.map(p => <option key={p.id} value={p.codigo}>{p.nombre} (₡{p.precio})</option>)}
                            </datalist>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '13px', color: 'var(--x-text-muted)', marginBottom: '5px' }}>Cant.</label>
                            <input type="number" min="1" placeholder="Unidades" value={cantidadVenta} onChange={e => setCantidadVenta(e.target.value)} className="crud-input-style"/>
                        </div>
                    </div>
                    <button type="submit" style={{ backgroundColor: 'var(--x-bg-base)', border: '1px solid var(--x-border)', color: 'var(--x-text-main)', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Agregar Línea
                    </button>
                </form>
            </div>
        </div>

        {/* PANEL DERECHO: VISTA PREVIA DEL DOCUMENTO */}
        <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ borderBottom: '1px solid var(--x-border)', paddingBottom: '15px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Vista Previa de {tipoDocumento}</h3>
            <span style={{ fontSize: '12px', color: 'var(--x-text-muted)', backgroundColor: 'var(--x-bg-base)', padding: '4px 8px', borderRadius: '4px' }}>{carrito.length} ítems</span>
          </div>
          
          <ul style={{ listStyle: 'none', padding: 0, flex: 1, minHeight: '200px', maxHeight: '400px', overflowY: 'auto' }}>
            {carrito.map((c, i) => (
              <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '12px 0', fontSize: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: '500' }}>{c.cantidad}x {c.nombre}</span>
                    <span style={{ color: 'var(--x-text-muted)', fontSize: '11px', fontFamily: 'monospace' }}>{c.codigo}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold' }}>₡{(c.precio * c.cantidad).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                        <div style={{ fontSize: '11px', color: 'var(--x-text-muted)' }}>+ IVA ({c.porcentaje_iva}%)</div>
                    </div>
                    <button onClick={() => removerDelCarrito(i)} style={{ background: 'var(--danger-red)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '4px', width: '25px', height: '25px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>X</button>
                </div>
              </li>
            ))}
            {carrito.length === 0 && <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--x-text-muted)' }}>Sin artículos seleccionados.</div>}
          </ul>

          <div style={{ borderTop: '2px dashed var(--x-border)', paddingTop: '20px', marginTop: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ color: 'var(--x-text-muted)' }}>Subtotal Neto:</span> <span style={{ fontWeight: '500' }}>₡{subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><span style={{ color: 'var(--x-text-muted)' }}>I.V.A Acumulado:</span> <span style={{ fontWeight: '500' }}>₡{totalImpuestos.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '22px', fontWeight: 'bold', marginTop: '15px', color: 'var(--success-green)' }}>
              <span>Total CRC:</span> <span>₡{total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
          </div>

          <button onClick={validarYAbrirPago} style={{ width: '100%', backgroundColor: 'var(--success-green)', color: '#000', border: 'none', padding: '16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', marginTop: '25px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Cobrar {tipoDocumento}
          </button>
        </div>
      </div>
    </main>
  );
}