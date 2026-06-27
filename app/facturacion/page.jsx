'use client';
import { useState, useEffect } from 'react';
import { obtenerProductos } from '@/app/actions/inventarioActions';
import { procesarVentaTransaccional } from '@/app/actions/ventasActions';
import { obtenerClientes, registrarCliente, guardarExoneracion } from '@/app/actions/clientesActions';
import { enviarFacturaCorreo } from '@/app/actions/emailActions';
import Modal from '@/components/Modal';

export default function FacturacionPage() {
    // ==========================================
    // 1. ESTADOS GLOBALES DE LA TERMINAL
    // ==========================================
    const [inventario, setInventario] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [cajaAbierta, setCajaAbierta] = useState(false);
    const [cargando, setCargando] = useState(true);

    // ==========================================
    // 2. ESTADOS: BÚSQUEDA Y CARRITO DE PRODUCTOS
    // ==========================================
    const [codigoBusqueda, setCodigoBusqueda] = useState('');
    const [productosSugeridos, setProductosSugeridos] = useState([]);
    const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
    
    const [carrito, setCarrito] = useState([]);
    const [cantidadVenta, setCantidadVenta] = useState(1);
    const [descuentoVenta, setDescuentoVenta] = useState(0);

    // ==========================================
    // 3. ESTADOS: DATOS DEL CLIENTE Y DOCUMENTO
    // ==========================================
    const [tipoDocumento, setTipoDocumento] = useState('Tiquete');
    const [busquedaCliente, setBusquedaCliente] = useState('CLIENTE CONTADO');
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [clientesSugeridos, setClientesSugeridos] = useState([]);
    const [mostrarSugerenciasCliente, setMostrarSugerenciasCliente] = useState(false);

    // ==========================================
    // 4. ESTADOS: COBRO Y PAGOS
    // ==========================================
    const [mostrarModalPago, setMostrarModalPago] = useState(false);
    const [metodoPago, setMetodoPago] = useState('Efectivo');
    const [montoIngresado, setMontoIngresado] = useState('');
    const [montosMixtos, setMontosMixtos] = useState({ efectivo: '', sinpe: '', tarjeta: '' });
    const [notasFactura, setNotasFactura] = useState('');
    const [facturaImpresion, setFacturaImpresion] = useState(null);

    // ==========================================
    // 5. ESTADOS: TICKETS EN ESPERA (PAUSADOS)
    // ==========================================
    const [carritosEnEspera, setCarritosEnEspera] = useState([]);
    const [mostrarModalEspera, setMostrarModalEspera] = useState(false);
    const [nombreEspera, setNombreEspera] = useState('');

    // ==========================================
    // 6. ESTADOS: ALTA EXPRÉS DE CLIENTES
    // ==========================================
    const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);
    const [cargandoClienteRapido, setCargandoClienteRapido] = useState(false);

    const [quickNombre, setQuickNombre] = useState('');
    const [quickCedula, setQuickCedula] = useState('');
    const [quickCorreo, setQuickCorreo] = useState('');
    const [quickTelefono, setQuickTelefono] = useState('');
    
    const [quickAplicaExo, setQuickAplicaExo] = useState(false);
    const [quickTipoExo, setQuickTipoExo] = useState('05'); 
    const [quickNumExo, setQuickNumExo] = useState('');
    const [quickPorcentajeExo, setQuickPorcentajeExo] = useState('13');

    // ==========================================
    // EFECTOS: INICIALIZACIÓN Y TECLADO/ESCÁNER
    // ==========================================
    useEffect(() => { cargarSistemas(); }, []);

    useEffect(() => {
        let buffer = '';
        let ultimaPulsacion = Date.now();

        const manejarTecladoGlobal = (e) => {
            if (e.key === 'F2') { e.preventDefault(); if (carrito.length > 0) validarYAbrirPago(); return; }
            if (e.key === 'F8') { e.preventDefault(); if (carrito.length > 0) pausarVentaActual(); return; }

            const ahora = Date.now();
            const diff = ahora - ultimaPulsacion;
            ultimaPulsacion = ahora;

            // Detección de pistola lectora de código de barras
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
                else alert('Código de barras no registrado: ' + codigoEscaneado);
                return;
            }

            if (!e.key) return;
            if (e.key.length === 1) buffer = (diff < 25 || buffer.length === 0) ? buffer + e.key : e.key;
        };

        window.addEventListener('keydown', manejarTecladoGlobal, true);
        return () => window.removeEventListener('keydown', manejarTecladoGlobal, true);
    }, [inventario, carrito, tipoDocumento, clienteSeleccionado]);

    const cargarSistemas = async () => {
        setCargando(true);
        try {
            const [resInv, resCli] = await Promise.all([obtenerProductos(), obtenerClientes()]);
            setCajaAbierta(true);
            
            if (resInv?.success) setInventario(resInv.datos.filter(p => p.estado_comercial !== 'Descontinuado') || []);
            if (resCli?.success) {
                const listaClientes = resCli.datos || [];
                setClientes(listaClientes);
                const clienteBase = listaClientes.find(c => c.nombre === 'CLIENTE CONTADO') || { id: 1, nombre: 'CLIENTE CONTADO', cedula: '000000000', correo: 'sin@correo.com' };
                setClienteSeleccionado(clienteBase);
            }
        } catch (error) {
            console.error("Error cargando sistemas:", error);
        }
        setCargando(false);
    };

    // ==========================================
    // AUTOCOMPLETADO DE PRODUCTOS
    // ==========================================
    const manejarCambioBusqueda = (e) => {
        const valor = e.target.value;
        setCodigoBusqueda(valor);
        
        if (valor.trim().length > 1) {
            const filtrados = inventario.filter(p => 
                p.nombre?.toLowerCase().includes(valor.toLowerCase()) || 
                p.codigo?.includes(valor)
            ).slice(0, 6);
            
            setProductosSugeridos(filtrados);
            setMostrarSugerencias(true);
        } else {
            setMostrarSugerencias(false);
        }
    };

    const seleccionarSugerencia = (producto) => {
        setCodigoBusqueda(producto.codigo);
        setMostrarSugerencias(false);
        const inputCant = document.getElementById('input-cantidad');
        if(inputCant) inputCant.focus();
    };

    // ==========================================
    // AUTOCOMPLETADO DE CLIENTES
    // ==========================================
    const manejarBusquedaCliente = (valor) => {
        setBusquedaCliente(valor);
        
        if (valor.trim().length > 1) {
            const filtrados = clientes.filter(c => 
                c.nombre?.toLowerCase().includes(valor.toLowerCase()) || 
                c.cedula?.includes(valor) ||
                c.correo?.toLowerCase().includes(valor.toLowerCase())
            ).slice(0, 5);
            
            setClientesSugeridos(filtrados);
            setMostrarSugerenciasCliente(true);
        } else {
            setMostrarSugerenciasCliente(false);
        }
    };

    const seleccionarClienteSugerido = (cliente) => {
        setBusquedaCliente(cliente.nombre);
        setClienteSeleccionado(cliente);
        setMostrarSugerenciasCliente(false);
    };

    const omitirRegistro = () => {
        const cc = clientes.find(c => c.nombre === 'CLIENTE CONTADO') || { id: 1, nombre: 'CLIENTE CONTADO' };
        setBusquedaCliente('CLIENTE CONTADO'); 
        setClienteSeleccionado(cc); 
        setTipoDocumento('Tiquete'); 
        setMostrarSugerenciasCliente(false);
    };

    // ==========================================
    // LÓGICA DEL CARRITO DE COMPRAS
    // ==========================================
    const procesarIngresoCarrito = (producto, cant, descPorcentaje) => {
        const montoDescuento = (producto.precio * cant) * (descPorcentaje / 100);
        const subtotalFinal = (producto.precio * cant) - montoDescuento;

        setCarrito(actual => {
            const idx = actual.findIndex(i => i.id === producto.id && i.descPorcentaje === descPorcentaje);
            if (idx >= 0) {
                const nuevaCant = actual[idx].cantidad + cant;
                if (producto.cantidad < nuevaCant) { alert('Stock insuficiente en almacén.'); return actual; }
                const nuevo = [...actual];
                nuevo[idx].cantidad = nuevaCant;
                nuevo[idx].montoDescuento = (producto.precio * nuevaCant) * (descPorcentaje / 100);
                nuevo[idx].subtotalFinal = (producto.precio * nuevaCant) - nuevo[idx].montoDescuento;
                return nuevo;
            } else {
                if (producto.cantidad < cant) { alert('Stock insuficiente en almacén.'); return actual; }
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
        if (!producto) return alert('Artículo no válido o no encontrado.');
        
        procesarIngresoCarrito(producto, parseInt(cantidadVenta), parseFloat(descuentoVenta) || 0);
        setCodigoBusqueda(''); setCantidadVenta(1); setDescuentoVenta(0);
    };

    const removerDelCarrito = (index) => {
        const nuevoCarrito = [...carrito];
        nuevoCarrito.splice(index, 1);
        setCarrito(nuevoCarrito);
    };

    const actualizarCantidad = (index, nuevaCantidad) => {
        // CORRECCIÓN BUG 1: Permite dejar el campo vacío temporalmente para poder borrar y escribir sin que se bloquee
        const val = nuevaCantidad === '' ? '' : parseInt(nuevaCantidad);
        if (val !== '' && val < 1) return;
        
        const nuevoCarrito = [...carrito];
        const item = nuevoCarrito[index];
        item.cantidad = val; 
        
        const cantParaCalculo = val || 0; 
        const precioBruto = item.precio * cantParaCalculo;
        const montoDescuento = item.descPorcentaje > 0 ? (precioBruto * (item.descPorcentaje / 100)) : 0;
        
        item.subtotalFinal = precioBruto - montoDescuento;
        item.montoDescuento = montoDescuento;
        
        setCarrito(nuevoCarrito);
    };

    // ==========================================
    // PAUSA Y RECUPERACIÓN DE TICKETS
    // ==========================================
    const pausarVentaActual = () => {
        if (carrito.length === 0) return alert('El carrito ya está vacío.');
        setNombreEspera(''); setMostrarModalEspera(true);
    };

    const confirmarPausaVenta = (e) => {
        e.preventDefault();
        setCarritosEnEspera(p => [...p, { nombre: nombreEspera || `Ticket ${new Date().toLocaleTimeString()}`, carrito: [...carrito], clienteSeleccionado, busquedaCliente, tipoDocumento }]);
        setCarrito([]); omitirRegistro(); setMostrarModalEspera(false);
    };

    const recuperarCarritoEspera = (index) => {
        if (carrito.length > 0) return alert('ATENCIÓN: Cobre o vacíe la caja actual antes de recuperar un ticket pausado.');
        const rec = carritosEnEspera[index];
        setCarrito(rec.carrito); 
        setClienteSeleccionado(rec.clienteSeleccionado); 
        setBusquedaCliente(rec.busquedaCliente); 
        setTipoDocumento(rec.tipoDocumento);
        setCarritosEnEspera(p => p.filter((_, idx) => idx !== index));
    };

    // ==========================================
    // MOTOR FISCAL: CÁLCULOS MATEMÁTICOS DE HACIENDA
    // ==========================================
    const calcularTotalesFactura = () => {
        let subtotalGeneral = 0;
        let totalDescuentosGen = 0;
        let totalIvaOriginal = 0;
        let totalExonerado = 0;

        carrito.forEach(item => {
            // Usa 0 temporalmente si el cajero borró el número
            const cantCalculo = item.cantidad || 0; 
            const subtotalLineaBruto = item.precio * cantCalculo;
            const montoDescLinea = item.montoDescuento || 0;
            const subtotalLineaNeto = subtotalLineaBruto - montoDescLinea;

            // CORRECCIÓN BUG 2: Usa '??' para respetar el 0% de IVA de la base de datos sin forzar el 13%
            const porcentajeIva = item.porcentaje_iva ?? 13;
            const ivaOriginalLinea = subtotalLineaNeto * (porcentajeIva / 100);

            let exoneradoLinea = 0;
            if (clienteSeleccionado && clienteSeleccionado.aplica_exoneracion) {
                const porcExo = parseFloat(clienteSeleccionado.porcentaje_exoneracion || 0);
                exoneradoLinea = subtotalLineaNeto * (porcExo / 100);
                if (exoneradoLinea > ivaOriginalLinea) exoneradoLinea = ivaOriginalLinea; // Tope legal
            }

            subtotalGeneral += subtotalLineaBruto;
            totalDescuentosGen += montoDescLinea;
            totalIvaOriginal += ivaOriginalLinea;
            totalExonerado += exoneradoLinea;
        });

        const subtotalNeto = subtotalGeneral - totalDescuentosGen;
        const ivaCobradoFinal = totalIvaOriginal - totalExonerado;
        const totalPagar = subtotalNeto + ivaCobradoFinal;

        return {
            subtotalBruto: subtotalGeneral,
            descuentos: totalDescuentosGen,
            subtotalNeto: subtotalNeto,
            ivaOriginal: totalIvaOriginal,
            montoExonerado: totalExonerado,
            ivaNeto: ivaCobradoFinal,
            total: totalPagar
        };
    };

    const totales = calcularTotalesFactura();

    // ==========================================
    // LÓGICA DE APERTURA DE PAGOS Y VUELTOS
    // ==========================================
    const ingresadoNum = parseFloat(montoIngresado) || 0;
    const totalMixtoIngresado = (parseFloat(montosMixtos.efectivo) || 0) + (parseFloat(montosMixtos.sinpe) || 0) + (parseFloat(montosMixtos.tarjeta) || 0);
    const saldoPendiente = totales.total - totalMixtoIngresado;
    const vuelto = ingresadoNum > totales.total ? ingresadoNum - totales.total : 0;
    const vueltoMixto = totalMixtoIngresado > totales.total ? totalMixtoIngresado - totales.total : 0;
    
    const pagoValido = ingresadoNum >= totales.total;
    const puedeCobrar = totalMixtoIngresado >= totales.total;

    const validarYAbrirPago = () => {
        if (!cajaAbierta) return alert('CAJA CERRADA: Debe abrir un turno de caja para facturar.');
        if (carrito.length === 0) return alert('El carrito está vacío.');
        // Limpiamos los items con cantidad "vacía" por el bug anterior antes de cobrar
        if (carrito.some(i => i.cantidad === '' || i.cantidad === 0)) return alert('Por favor, asigne una cantidad válida a todos los productos antes de cobrar.');
        
        if (tipoDocumento === 'Factura' && (!clienteSeleccionado || !clienteSeleccionado.cedula || clienteSeleccionado.cedula === '000000000')) return alert('Hacienda requiere Cédula Real para emitir Factura Electrónica.');
        if (!clienteSeleccionado) return alert('Seleccione o registre al comprador.');
        
        setMetodoPago('Efectivo'); 
        setMontoIngresado(''); 
        setMontosMixtos({ efectivo: '', sinpe: '', tarjeta: '' });
        setMostrarModalPago(true);
    };

    // ==========================================
    // EJECUCIÓN FINAL DE LA FACTURA EN SQL SERVER
    // ==========================================
    const ejecutarFacturacion = async () => {
        const esPagoValido = metodoPago === 'Mixto' ? puedeCobrar : pagoValido;
        if (!esPagoValido || !clienteSeleccionado) return;

        const btn = document.getElementById('btn-procesar');
        if(btn) btn.innerText = 'PROCESANDO TRANSACCIÓN...';
        
        let enviarEfectivo = 0, enviarSinpe = 0, enviarTarjeta = 0;
        if (metodoPago === 'Mixto') {
            enviarEfectivo = parseFloat(montosMixtos.efectivo) || 0;
            enviarSinpe = parseFloat(montosMixtos.sinpe) || 0;
            enviarTarjeta = parseFloat(montosMixtos.tarjeta) || 0;
        } else if (metodoPago === 'Efectivo') { enviarEfectivo = parseFloat(montoIngresado) || totales.total;
        } else if (metodoPago === 'SINPE') { enviarSinpe = parseFloat(montoIngresado) || totales.total;
        } else if (metodoPago === 'Tarjeta') { enviarTarjeta = parseFloat(montoIngresado) || totales.total; }

        const respuesta = await procesarVentaTransaccional(
            clienteSeleccionado.id, tipoDocumento, metodoPago, 
            totales.subtotalBruto, totales.descuentos, totales.ivaNeto, totales.total, 
            enviarEfectivo, enviarSinpe, enviarTarjeta, notasFactura, carrito
        );

        if (respuesta.success) {
            const fac = respuesta.facturaId;
            
            // Preparamos datos exactos para el Voucher Térmico
            setFacturaImpresion({
                consecutivo: fac.toString().padStart(5, '0'), tipoDocumento, fecha: new Date().toLocaleString(),
                cliente: clienteSeleccionado, metodoPago, notas: notasFactura,
                subtotalBruto: totales.subtotalBruto, totalDescuentos: totales.descuentos, subtotalNeto: totales.subtotalNeto, 
                totalImpuestos: totales.ivaNeto, totalFinal: totales.total, items: [...carrito]
            });

            if (clienteSeleccionado.correo && clienteSeleccionado.correo !== 'sin@correo.com') {
                await enviarFacturaCorreo(clienteSeleccionado.correo, clienteSeleccionado.nombre, tipoDocumento, fac, carrito, totales.subtotalNeto, totales.ivaNeto, totales.total);
            }

            setMostrarModalPago(false); 
            setCarrito([]); 
            omitirRegistro(); 
            setMontosMixtos({ efectivo: '', sinpe: '', tarjeta: '' });
            
            if(btn) btn.innerText = 'ASENTAR Y FACTURAR';
            setTimeout(() => { window.print(); }, 300);
        } else {
            alert('Fallo crítico al asentar la factura: ' + respuesta.error);
            if(btn) btn.innerText = 'ASENTAR Y FACTURAR';
        }
    };

    // ==========================================
    // CREACIÓN RÁPIDA DE CLIENTES (FICHA EXPRÉS)
    // ==========================================
    const manejarGuardarClienteRapido = async (e) => {
        e.preventDefault();
        setCargandoClienteRapido(true);
        try {
            const resCliente = await registrarCliente(quickNombre.toUpperCase(), quickCedula, quickCorreo, quickTelefono);
            if (!resCliente.success) throw new Error(resCliente.error);

            const nuevoClienteId = resCliente.datos?.id || resCliente.id;

            if (nuevoClienteId && quickAplicaExo && guardarExoneracion) {
                const nuevaExo = {
                    tipo_documento: quickTipoExo,
                    numero_documento: quickNumExo,
                    porcentaje_exonerado: quickPorcentajeExo,
                    fecha_emision: new Date().toISOString().split('T')[0],
                    fecha_vencimiento: null
                };
                await guardarExoneracion(nuevoClienteId, nuevaExo);
            }

            const clienteArmado = {
                id: nuevoClienteId, nombre: quickNombre.toUpperCase(), cedula: quickCedula, correo: quickCorreo, telefono: quickTelefono,
                aplica_exoneracion: quickAplicaExo, porcentaje_exoneracion: quickAplicaExo ? quickPorcentajeExo : 0
            };

            setClientes(prev => [...prev.filter(c => c.cedula !== quickCedula), clienteArmado]);
            setBusquedaCliente(clienteArmado.nombre);
            setClienteSeleccionado(clienteArmado);

            setIsClienteModalOpen(false);
            setQuickNombre(''); setQuickCedula(''); setQuickCorreo(''); setQuickTelefono('');
            setQuickAplicaExo(false); setQuickNumExo('');
        } catch (error) {
            alert("Error de persistencia: " + error.message);
        }
        setCargandoClienteRapido(false);
    };

    return (
        <main style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--x-bg-base)', color: '#fff', overflow: 'hidden', fontFamily: 'sans-serif' }}>
            
            {/* PANEL IZQUIERDO: CARRITO DE COMPRAS Y BÚSQUEDA DE PRODUCTOS */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '15px', borderRight: '1px solid var(--x-border)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h1 style={{ fontSize: '20px', margin: 0, fontWeight: 'bold', letterSpacing: '0.5px' }}>Terminal de Caja</h1>
                    {cajaAbierta && <span style={{ fontSize: '11px', backgroundColor: 'rgba(0, 186, 124, 0.1)', color: 'var(--success-green)', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>● TURNO ACTIVO</span>}
                </div>

                {/* Buscador de Productos Compacto con Etiquetas Fijas */}
                <form onSubmit={agregarAlCarritoManual} style={{ display: 'flex', gap: '12px', marginBottom: '15px', alignItems: 'flex-end', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--x-border)' }}>
                    
                    {/* Input de Búsqueda con Autocomplete */}
                    <div style={{ flex: 1, position: 'relative' }}>
                        <label style={{ fontSize: '10px', color: 'var(--x-text-muted)', marginBottom: '4px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Buscar Artículo</label>
                        <input 
                            type="text" 
                            placeholder="Escanee código o escriba el nombre del artículo..." 
                            value={codigoBusqueda} 
                            onChange={manejarCambioBusqueda} 
                            onBlur={() => setTimeout(() => setMostrarSugerencias(false), 200)} 
                            className="crud-input-style" 
                            style={{ width: '100%', padding: '8px 10px', fontSize: '13px' }} 
                            autoFocus 
                            autoComplete="off" 
                        />

                        {/* Desplegable de Sugerencias */}
                        {mostrarSugerencias && productosSugeridos?.length > 0 && (
                            <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--x-bg-card)', border: '1px solid var(--x-primary)', borderRadius: '6px', marginTop: '5px', padding: '0', listStyle: 'none', zIndex: 90, maxHeight: '220px', overflowY: 'auto', boxShadow: '0 8px 20px rgba(0,0,0,0.6)' }}>
                                {productosSugeridos.map(p => (
                                    <li 
                                        key={p.id} 
                                        onClick={() => seleccionarSugerencia(p)} 
                                        style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} 
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.12)'} 
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#fff' }}>{p.nombre}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--x-text-muted)', marginTop: '2px', fontFamily: 'monospace' }}>Cod: {p.codigo} • Almacén: {p.cantidad}</div>
                                        </div>
                                        <div style={{ color: 'var(--success-green)', fontWeight: 'bold', fontSize: '13px' }}>₡{p.precio.toLocaleString()}</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Input de Cantidad */}
                    <div style={{ width: '70px' }}>
                        <label style={{ fontSize: '10px', color: 'var(--x-text-muted)', marginBottom: '4px', display: 'block', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px' }}>CANT.</label>
                        <input 
                            id="input-cantidad" 
                            type="number" 
                            min="1" 
                            value={cantidadVenta} 
                            onChange={(e) => setCantidadVenta(e.target.value)} 
                            className="crud-input-style" 
                            style={{ width: '100%', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '13px' }} 
                        />
                    </div>

                    {/* Input de Descuento (Diferenciado en Naranja) */}
                    <div style={{ width: '80px' }}>
                        <label style={{ fontSize: '10px', color: '#ffad1f', marginBottom: '4px', display: 'block', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'bold' }}>% DESC.</label>
                        <input 
                            type="number" 
                            min="0" 
                            max="100" 
                            value={descuentoVenta} 
                            onChange={(e) => setDescuentoVenta(e.target.value)} 
                            className="crud-input-style" 
                            style={{ width: '100%', padding: '8px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', borderColor: descuentoVenta > 0 ? '#ffad1f' : 'var(--x-border)', color: descuentoVenta > 0 ? '#ffad1f' : '#fff' }} 
                        />
                    </div>

                    <button type="submit" style={{ backgroundColor: 'var(--x-primary)', color: '#fff', border: 'none', padding: '0 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', height: '34px', fontSize: '13px' }}>
                        Agregar
                    </button>
                </form>

                {/* CAJA DEL CARRITO (Se encoge automáticamente) */}
                <div style={{ flex: 1, minHeight: 0, backgroundColor: 'var(--x-bg-card)', borderRadius: '10px', border: '1px solid var(--x-border)', overflowY: 'auto', marginBottom: '20px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: 'rgba(255,255,255,0.04)', position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr style={{ borderBottom: '1px solid var(--x-border)' }}>
                                <th style={{ padding: '10px 12px' }}>Artículo</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center', width: '70px' }}>Cant</th>
                                <th style={{ padding: '10px 12px', textAlign: 'right', width: '90px' }}>Precio</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center', width: '60px' }}>Desc</th>
                                <th style={{ padding: '10px 12px', textAlign: 'right', width: '100px' }}>Total</th>
                                <th style={{ padding: '10px 12px', textAlign: 'center', width: '40px' }}>X</th>
                            </tr>
                        </thead>
                        <tbody>
                            {carrito.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--x-text-muted)', fontStyle: 'italic' }}>
                                        Caja lista. Ingrese productos o escanee un código de barras para comenzar.
                                    </td>
                                </tr>
                            ) : (
                                carrito.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                        <td style={{ padding: '8px 12px', fontWeight: '500' }}>{item.nombre}</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                            <input 
                                                type="number" 
                                                min="1" 
                                                value={item.cantidad} 
                                                onChange={e => actualizarCantidad(idx, e.target.value)} 
                                                style={{ width: '45px', backgroundColor: 'rgba(0,0,0,0.2)', color: '#fff', border: '1px solid var(--x-border)', textAlign: 'center', borderRadius: '4px', padding: '3px 0', fontSize: '12px', fontWeight: 'bold' }} 
                                            />
                                        </td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--x-text-muted)' }}>₡{item.precio.toLocaleString()}</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'center', color: item.descPorcentaje > 0 ? '#ffad1f' : 'var(--x-text-muted)', fontWeight: item.descPorcentaje > 0 ? 'bold' : 'normal' }}>{item.descPorcentaje}%</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 'bold', color: 'var(--success-green)' }}>₡{item.subtotalFinal.toLocaleString()}</td>
                                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                            <button onClick={() => removerDelCarrito(idx)} style={{ background: 'none', border: 'none', color: 'var(--danger-red)', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>⊗</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* BOTONES DE RETENCIÓN Y LIQUIDACIÓN (Con más separación del borde inferior) */}
                <div style={{ display: 'flex', gap: '12px', paddingBottom: '70px' }}>
                    <button onClick={pausarVentaActual} style={{ flex: 1, backgroundColor: 'rgba(255, 173, 31, 0.08)', color: '#ffad1f', border: '1px solid rgba(255, 173, 31, 0.3)', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' }}>
                        [F8] Pausar Ticket
                    </button>
                    <button onClick={validarYAbrirPago} style={{ flex: 2, backgroundColor: 'var(--success-green)', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', letterSpacing: '0.5px', boxShadow: '0 4px 12px rgba(0, 186, 124, 0.2)' }}>
                        [F2] PROCESAR COBRO (₡{totales.total.toLocaleString()})
                    </button>
                </div>

            </div>

            {/* PANEL DERECHO: DATOS FISCALES DEL CLIENTE Y DESGLOSE MONETARIO */}
            <div style={{ width: '360px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: 'rgba(0,0,0,0.15)', overflowY: 'auto' }}>
                
                {/* SECCIÓN CLIENTE CON DOBLE CLIC PARA EDICIÓN RÁPIDA */}
                <div style={{ background: 'var(--x-bg-card)', padding: '15px', borderRadius: '12px', border: '1px solid var(--x-border)' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: 'var(--x-primary)', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Datos del Comprador</h4>
                    
                    <select value={tipoDocumento} onChange={e => setTipoDocumento(e.target.value)} className="crud-input-style" style={{ width: '100%', marginBottom: '12px', fontSize: '13px', padding: '8px' }}>
                        <option value="Tiquete">Tiquete Electrónico</option>
                        <option value="Factura">Factura Electrónica</option>
                    </select>

                    {/* Input de búsqueda inteligente con autocompletado */}
                    <div style={{ position: 'relative', marginBottom: '10px' }}>
                        <input 
                            type="text" 
                            placeholder="Buscar cliente (Nombre o Cédula)..." 
                            value={busquedaCliente} 
                            onChange={(e) => manejarBusquedaCliente(e.target.value)} 
                            onFocus={() => { if (clientesSugeridos?.length > 0) setMostrarSugerenciasCliente(true); }}
                            onBlur={() => setTimeout(() => setMostrarSugerenciasCliente(false), 200)}
                            className="crud-input-style" 
                            style={{ width: '100%', padding: '8px 10px', fontSize: '13px' }} 
                            autoComplete="off"
                        />
                        
                        {/* Listado Desplegable de Clientes */}
                        {mostrarSugerenciasCliente && clientesSugeridos?.length > 0 && (
                            <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--x-bg-card)', border: '1px solid var(--x-primary)', borderRadius: '6px', marginTop: '4px', padding: '0', listStyle: 'none', zIndex: 95, maxHeight: '180px', overflowY: 'auto', boxShadow: '0 6px 15px rgba(0,0,0,0.5)' }}>
                                {busquedaCliente !== 'CLIENTE CONTADO' && (
                                    <li 
                                        onClick={omitirRegistro}
                                        style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', color: 'var(--x-text-muted)', fontSize: '11px', fontStyle: 'italic' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)'} 
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        ↶ Volver a Cliente Contado
                                    </li>
                                )}
                                {clientesSugeridos.map(c => (
                                    <li 
                                        key={c.id} 
                                        onClick={() => seleccionarClienteSugerido(c)} 
                                        style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', flexDirection: 'column' }} 
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.12)'} 
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                                            {c.nombre}
                                            {c.aplica_exoneracion && <span style={{ color: '#ffad1f', fontSize: '10px', backgroundColor: 'rgba(255,173,31,0.1)', padding: '1px 4px', borderRadius: '3px' }}>Exonerado</span>}
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--x-text-muted)', marginTop: '2px' }}>ID: {c.cedula || 'N/A'} • {c.correo || 'Sin correo'}</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    
                    <button type="button" onClick={() => { setQuickNombre(busquedaCliente !== 'CLIENTE CONTADO' ? busquedaCliente : ''); setIsClienteModalOpen(true); }} style={{ width: '100%', backgroundColor: 'rgba(59, 130, 246, 0.08)', color: 'var(--x-primary)', border: '1px dashed rgba(59, 130, 246, 0.4)', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '12px', fontSize: '12px', transition: 'all 0.2s' }}>
                        + Nuevo Usuario
                    </button>

                    {/* TARJETA INFORMATIVA: SOPORTA DOBLE CLIC PARA ACTUALIZAR EXONERACIÓN RÁPIDAMENTE */}
                    {clienteSeleccionado && (
                        <div 
                            title="¡Doble clic para abrir el editor fiscal rápido de este cliente!"
                            onDoubleClick={() => {
                                if (clienteSeleccionado.nombre === 'CLIENTE CONTADO') return;
                                setQuickNombre(clienteSeleccionado.nombre);
                                setQuickCedula(clienteSeleccionado.cedula);
                                setQuickCorreo(clienteSeleccionado.correo || '');
                                setQuickTelefono(clienteSeleccionado.telefono || '');
                                setQuickAplicaExo(!!clienteSeleccionado.aplica_exoneracion);
                                setQuickPorcentajeExo(clienteSeleccionado.porcentaje_exoneracion?.toString() || '13');
                                setIsClienteModalOpen(true);
                            }}
                            style={{ 
                                backgroundColor: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '8px', fontSize: '12px', borderLeft: clienteSeleccionado.nombre !== 'CLIENTE CONTADO' ? '3px solid var(--x-primary)' : '3px solid var(--x-border)', cursor: clienteSeleccionado.nombre !== 'CLIENTE CONTADO' ? 'pointer' : 'default', transition: 'background 0.2s', userSelect: 'none' 
                            }}
                            onMouseEnter={(e) => { if(clienteSeleccionado.nombre !== 'CLIENTE CONTADO') e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
                        >
                            <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '13px' }}>{clienteSeleccionado.nombre}</div>
                            <div style={{ color: 'var(--x-text-muted)', marginTop: '2px' }}>Cédula / Tipo: {clienteSeleccionado.cedula}</div>
                            
                            {clienteSeleccionado.aplica_exoneracion ? (
                                <div style={{ color: '#ffad1f', fontWeight: 'bold', marginTop: '8px', padding: '6px', backgroundColor: 'rgba(255, 173, 31, 0.08)', borderRadius: '4px', border: '1px solid rgba(255, 173, 31, 0.2)', fontSize: '11px', textAlign: 'center' }}>
                                    ✓ EXONERADO HACIENDA ({clienteSeleccionado.porcentaje_exoneracion}%)
                                </div>
                            ) : (
                                clienteSeleccionado.nombre !== 'CLIENTE CONTADO' && (
                                    <div style={{ fontSize: '10px', color: 'var(--x-text-muted)', marginTop: '6px', textAlign: 'center', fontStyle: 'italic' }}>
                                        💡 Doble clic aquí para agregar exoneración
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </div>

                {/* DESGLOSE LIQUIDACIÓN DE FACTURA (HACIENDA COSTA RICA) */}
                <div style={{ background: 'var(--x-bg-card)', padding: '15px', borderRadius: '12px', border: '1px solid var(--x-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h4 style={{ margin: '0 0 5px 0', textTransform: 'uppercase', fontSize: '11px', color: 'var(--x-text-muted)', letterSpacing: '0.5px', fontWeight: 'bold' }}>Liquidación de Caja</h4>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: 'var(--x-text-muted)' }}>Subtotal Bruto:</span>
                        <span>₡{totales.subtotalBruto.toLocaleString()}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#ffad1f' }}>
                        <span>Descuentos Otorgados:</span>
                        <span style={{ fontWeight: 'bold' }}>- ₡{totales.descuentos.toLocaleString()}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--x-text-muted)' }}>
                        <span>Impuesto IVA Teórico:</span>
                        <span>₡{totales.ivaOriginal.toLocaleString()}</span>
                    </div>

                    {/* Desglose dinámico de la rebaja restada por ley de exoneraciones */}
                    {totales.montoExonerado > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--danger-red)', backgroundColor: 'rgba(239, 68, 68, 0.05)', padding: '6px 8px', borderRadius: '5px', border: '1px dashed var(--danger-red)' }}>
                            <span style={{ fontWeight: 'bold' }}>Rebaja Exoneración (Hacienda):</span>
                            <span style={{ fontWeight: 'bold' }}>- ₡{totales.montoExonerado.toLocaleString()}</span>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: 'var(--x-text-muted)' }}>Impuesto IVA Neto Cobrado:</span>
                        <span style={{ fontWeight: 'bold' }}>₡{totales.ivaNeto.toLocaleString()}</span>
                    </div>

                    <div style={{ borderTop: '1px solid var(--x-border)', paddingTop: '10px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Total a Pagar:</span>
                        <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--success-green)' }}>₡{totales.total.toLocaleString()}</span>
                    </div>
                </div>

                {/* HISTORIAL COLA DE TICKETS EN ESPERA */}
                {carritosEnEspera.length > 0 && (
                    <div style={{ background: 'var(--x-bg-card)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255, 173, 31, 0.3)', backgroundColor: 'rgba(255, 173, 31, 0.02)' }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#ffad1f', fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold' }}>Tickets Retenidos ({carritosEnEspera.length})</h4>
                        {carritosEnEspera.map((c, idx) => (
                            <button key={idx} onClick={() => recuperarCarritoEspera(idx)} style={{ width: '100%', textAlign: 'left', backgroundColor: 'rgba(255, 173, 31, 0.08)', color: '#fff', border: '1px solid rgba(255, 173, 31, 0.15)', padding: '6px 10px', borderRadius: '6px', marginBottom: '4px', cursor: 'pointer', fontSize: '12px', transition: 'all 0.2s' }} onMouseEnter={(e)=>e.currentTarget.style.backgroundColor='rgba(255,173,31,0.15)'} onMouseLeave={(e)=>e.currentTarget.style.backgroundColor='rgba(255, 173, 31, 0.08)'}>
                                {c.nombre}
                            </button>
                        ))}
                    </div>
                )}
            </div>

          {/* MODAL: PROCESAMIENTO COBRO MAESTRO CON DISEÑO EXACTO AL MOCKUP */}
         {/* MODAL: PROCESAMIENTO COBRO MAESTRO CON DISEÑO EXACTO AL MOCKUP */}
         <Modal isOpen={mostrarModalPago} onClose={() => setMostrarModalPago(false)}>
                {/* 🛠️ FIX: Se aplica margin negativo (-24px) para absorber el padding del componente Modal padre y borrar el "trozo de sobra" */}
                <div style={{ minWidth: '420px', backgroundColor: '#161b22', borderRadius: '8px', overflow: 'hidden', color: '#fff', fontFamily: 'sans-serif', margin: '-24px' }}>
                    
                    {/* Encabezado Azul Prominente (Pegado a los bordes) */}
                    <div style={{ backgroundColor: '#3b82f6', padding: '20px 16px 16px 16px', textAlign: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>Emitir {tipoDocumento}</h3>
                    </div>

                    {/* Contenedor interno con padding restaurado para el resto de los elementos */}
                    <div style={{ padding: '24px' }}>
                        
                        {/* Cliente Seleccionado */}
                        <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            CLIENTE: <span style={{ color: '#fff', fontWeight: 'bold', marginLeft: '5px' }}>{clienteSeleccionado?.nombre || 'CLIENTE CONTADO'}</span>
                        </div>

                        {/* Caja de Totales (Oscura) */}
                        <div style={{ backgroundColor: '#0d1117', padding: '15px 20px', borderRadius: '8px', marginBottom: '25px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--x-text-muted)', marginBottom: '10px' }}>
                                <span>{carrito.reduce((acc, item) => acc + (parseInt(item.cantidad) || 0), 0)} artículos en carrito</span>
                                <span>Subtotal: ₡{totales.subtotalNeto.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--x-text-muted)', marginBottom: '15px' }}>
                                <span>I.V.A.</span>
                                <span>₡{totales.ivaNeto.toLocaleString()}</span>
                            </div>
                            {totales.montoExonerado > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--danger-red)', marginBottom: '15px' }}>
                                    <span>Exoneración</span>
                                    <span>-₡{totales.montoExonerado.toLocaleString()}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px', marginTop: '5px' }}>
                                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>TOTAL A COBRAR</span>
                                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>₡{totales.total.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Método de Pago */}
                        <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '10px', display: 'block', fontWeight: 'bold' }}>MÉTODO DE PAGO</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '25px' }}>
                            {['Efectivo', 'SINPE', 'Tarjeta', 'Mixto'].map(metodo => (
                                <button 
                                    key={metodo}
                                    type="button"
                                    onClick={() => {
                                        setMetodoPago(metodo);
                                        // Autocompletar el total si el pago es digital puro
                                        if (metodo === 'SINPE' || metodo === 'Tarjeta') {
                                            setMontoIngresado(totales.total.toString());
                                        } else {
                                            setMontoIngresado('');
                                        }
                                    }}
                                    style={{
                                        padding: '10px 5px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.15s', fontSize: '11px', textTransform: 'uppercase',
                                        backgroundColor: metodoPago === metodo ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                                        color: metodoPago === metodo ? '#10b981' : '#fff',
                                        border: metodoPago === metodo ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)'
                                    }}
                                >
                                    {metodo}
                                </button>
                            ))}
                        </div>

                        {/* BLOQUE: EFECTIVO */}
                        {metodoPago === 'Efectivo' && (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                                    <label style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold', width: '70px' }}>Efectivo</label>
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', backgroundColor: '#0d1117', borderRadius: '6px', padding: '2px 10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <span style={{ color: 'var(--x-text-muted)', fontSize: '14px' }}>₡</span>
                                        <input 
                                            type="number" 
                                            value={montoIngresado} 
                                            onChange={e => setMontoIngresado(e.target.value)} 
                                            style={{ width: '100%', backgroundColor: 'transparent', border: 'none', color: '#fff', padding: '10px', fontSize: '14px', outline: 'none' }} 
                                            autoFocus
                                        />
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => setMontoIngresado(totales.total.toString())} 
                                        style={{ backgroundColor: 'transparent', color: 'var(--x-text-muted)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 15px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
                                        onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--x-text-muted)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                                    >
                                        Exacto
                                    </button>
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0d1117', padding: '15px 20px', borderRadius: '6px', marginBottom: '25px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <span style={{ color: 'var(--x-text-muted)', fontSize: '13px' }}>Cambio / Vuelto</span>
                                    <span style={{ color: vuelto > 0 ? '#10b981' : '#ef4444', fontWeight: 'bold', fontSize: '16px' }}>
                                        ₡{vuelto > 0 ? vuelto.toLocaleString() : '0.00'}
                                    </span>
                                </div>
                            </>
                        )}

                        {/* BLOQUE: MIXTO */}
                        {metodoPago === 'Mixto' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#0d1117', borderRadius: '6px', padding: '5px 10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <span style={{ color: 'var(--x-text-muted)', fontSize: '13px', width: '70px' }}>Efectivo</span>
                                    <span style={{ color: 'var(--x-text-muted)', fontSize: '14px' }}>₡</span>
                                    <input type="number" value={montosMixtos.efectivo} onChange={e => setMontosMixtos({...montosMixtos, efectivo: e.target.value})} style={{ flex: 1, backgroundColor: 'transparent', border: 'none', color: '#fff', padding: '8px', outline: 'none' }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#0d1117', borderRadius: '6px', padding: '5px 10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <span style={{ color: 'var(--x-text-muted)', fontSize: '13px', width: '70px' }}>SINPE</span>
                                    <span style={{ color: 'var(--x-text-muted)', fontSize: '14px' }}>₡</span>
                                    <input type="number" value={montosMixtos.sinpe} onChange={e => setMontosMixtos({...montosMixtos, sinpe: e.target.value})} style={{ flex: 1, backgroundColor: 'transparent', border: 'none', color: '#fff', padding: '8px', outline: 'none' }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#0d1117', borderRadius: '6px', padding: '5px 10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <span style={{ color: 'var(--x-text-muted)', fontSize: '13px', width: '70px' }}>Tarjeta</span>
                                    <span style={{ color: 'var(--x-text-muted)', fontSize: '14px' }}>₡</span>
                                    <input type="number" value={montosMixtos.tarjeta} onChange={e => setMontosMixtos({...montosMixtos, tarjeta: e.target.value})} style={{ flex: 1, backgroundColor: 'transparent', border: 'none', color: '#fff', padding: '8px', outline: 'none' }} />
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0d1117', padding: '15px 20px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <span style={{ color: 'var(--x-text-muted)', fontSize: '13px' }}>Faltante / Vuelto</span>
                                    <span style={{ color: saldoPendiente > 0 ? '#ef4444' : (vueltoMixto > 0 ? '#10b981' : '#ef4444'), fontWeight: 'bold', fontSize: '16px' }}>
                                        ₡{saldoPendiente > 0 ? saldoPendiente.toLocaleString() : (vueltoMixto > 0 ? vueltoMixto.toLocaleString() : '0.00')}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* BLOQUE: SINPE / TARJETA (Limpio y minimalista) */}
                        {(metodoPago === 'SINPE' || metodoPago === 'Tarjeta') && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0d1117', padding: '15px 20px', borderRadius: '6px', marginBottom: '25px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                <span style={{ color: 'var(--x-text-muted)', fontSize: '13px' }}>Total {metodoPago}</span>
                                <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '16px' }}>
                                    ₡{totales.total.toLocaleString()}
                                </span>
                            </div>
                        )}

                        {/* Footer Botones Identicos a la Imagen */}
                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button 
                                type="button" 
                                onClick={() => setMostrarModalPago(false)} 
                                style={{ flex: 1, backgroundColor: '#111827', color: '#fff', border: '1px solid rgba(255,255,255,0.05)', padding: '14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', transition: 'background 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1f2937'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#111827'}
                            >
                                Cancelar
                            </button>
                            <button 
                                id="btn-procesar"
                                type="button" 
                                onClick={ejecutarFacturacion} 
                                disabled={metodoPago === 'Mixto' ? !puedeCobrar : (metodoPago === 'Efectivo' ? !pagoValido : false)}
                                style={{ 
                                    flex: 1, backgroundColor: '#1e3a5f', color: '#93c5fd', border: 'none', padding: '14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', textTransform: 'uppercase', transition: 'all 0.2s', 
                                    opacity: (metodoPago === 'Mixto' ? puedeCobrar : (metodoPago === 'Efectivo' ? pagoValido : true)) ? 1 : 0.5 
                                }}
                            >
                                Asentar Transacción
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* MODAL: ALTA EXPRESIVA / RE-CONFIGURADOR FISCAL DE CLIENTES */}
            <Modal isOpen={isClienteModalOpen} onClose={() => setIsClienteModalOpen(false)}>
                <form onSubmit={manejarGuardarClienteRapido} style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', maxWidth: '440px', color: '#fff' }}>
                    <div style={{ borderBottom: '1px solid var(--x-border)', paddingBottom: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>Ficha Operativa de Cliente Exprés</h3>
                    </div>

                    <div>
                        <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '4px', display: 'block' }}>Nombre Completo / Razón Social</label>
                        <input type="text" value={quickNombre} onChange={e => setQuickNombre(e.target.value)} className="crud-input-style" required style={{ textTransform: 'uppercase' }} />
                    </div>
                    
                    <div className="form-grid-2">
                        <div>
                            <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '4px', display: 'block' }}>Cédula / ID</label>
                            <input type="text" value={quickCedula} onChange={e => setQuickCedula(e.target.value)} className="crud-input-style" required />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '4px', display: 'block' }}>Teléfono</label>
                            <input type="text" value={quickTelefono} onChange={e => setQuickTelefono(e.target.value)} className="crud-input-style" />
                        </div>
                    </div>
                    
                    <div>
                        <label style={{ fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '4px', display: 'block' }}>Correo Electrónico (Hacienda)</label>
                        <input type="email" value={quickCorreo} onChange={e => setQuickCorreo(e.target.value)} className="crud-input-style" required />
                    </div>

                    {/* SECCIÓN FISCAL DE EXONERACIÓN */}
                    <div style={{ backgroundColor: 'rgba(255, 173, 31, 0.04)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 173, 31, 0.2)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', color: '#ffad1f' }}>
                            <input type="checkbox" checked={quickAplicaExo} onChange={e => setQuickAplicaExo(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#ffad1f' }} />
                            Gozar de Exoneración Tributaria
                        </label>

                        {quickAplicaExo && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px', borderTop: '1px dashed rgba(255, 173, 31, 0.2)', paddingTop: '10px' }}>
                                <div className="form-grid-2">
                                    <div>
                                        <label style={{ fontSize: '10px', color: 'var(--x-text-muted)', marginBottom: '3px', display: 'block' }}>Tipo Doc.</label>
                                        <select value={quickTipoExo} onChange={e => setQuickTipoExo(e.target.value)} className="crud-input-style" style={{ backgroundColor: 'var(--x-bg-base)', fontSize: '12px', padding: '6px' }}><option value="05">05 - Zonas Francas</option><option value="01">01 - Compras Autorizadas</option><option value="03">03 - Ley Especial</option></select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '10px', color: 'var(--x-text-muted)', marginBottom: '3px', display: 'block' }}>Porcentaje %</label>
                                        <input type="number" min="1" max="13" value={quickPorcentajeExo} onChange={e => setQuickPorcentajeExo(e.target.value)} className="crud-input-style" style={{ padding: '6px', textAlign: 'center', fontWeight: 'bold' }} />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '10px', color: 'var(--x-text-muted)', marginBottom: '3px', display: 'block' }}>Número de Resolución / Autorización</label>
                                    <input type="text" placeholder="Ej: AL-0012423" value={quickNumExo} onChange={e => setQuickNumExo(e.target.value)} className="crud-input-style" style={{ padding: '6px' }} required={quickAplicaExo} />
                                </div>
                            </div>
                        )}
                    </div>

                    <button type="submit" disabled={cargandoClienteRapido} style={{ backgroundColor: 'var(--x-primary)', color: '#fff', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', textTransform: 'uppercase', opacity: cargandoClienteRapido ? 0.7 : 1 }}>
                        {cargandoClienteRapido ? 'Sincronizando Base de Datos...' : 'Vincular y Guardar Cliente'}
                    </button>
                </form>
            </Modal>

            {/* MODAL DE RETENCIÓN DE VENTAS (TICKETS EN ESPERA) */}
            <Modal isOpen={mostrarModalEspera} onClose={() => setMostrarModalEspera(false)}>
                <form onSubmit={confirmarPausaVenta} style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: '#fff', width: '320px' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>Pausar Ticket de Venta</h3>
                    <p style={{ fontSize: '12px', color: 'var(--x-text-muted)', margin: 0 }}>Identifique este carrito para poder restaurarlo más tarde en caja.</p>
                    <input type="text" value={nombreEspera} onChange={e => setNombreEspera(e.target.value)} placeholder="Ej: Manuel (Fue por efectivo)" className="crud-input-style" autoFocus required />
                    <button type="submit" style={{ backgroundColor: '#ffad1f', color: '#000', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', textTransform: 'uppercase' }}>Retener Carrito</button>
                </form>
            </Modal>

            {/* VOUCHER DE IMPRESIÓN TÉRMICA DE HACIENDA (80MM TICKET) */}
            {/* VOUCHER DE IMPRESIÓN TÉRMICA DE HACIENDA (Invisible en pantalla) */}
            {facturaImpresion && (
                <div id="seccion-impresion">
                    <style type="text/css">
                        {`
                            /* 1. OCULTAR COMPLETAMENTE EN EL MONITOR */
                            @media screen {
                                #seccion-impresion { display: none !important; }
                            }

                            /* 2. MOSTRAR ÚNICAMENTE EN LA IMPRESORA TÉRMICA */
                            @media print {
                                @page { margin: 0; size: auto; }
                                body * { visibility: hidden; }
                                #seccion-impresion, #seccion-impresion * { visibility: visible !important; }
                                #seccion-impresion {
                                    display: block !important;
                                    position: absolute; left: 0; top: 0; width: 80mm; padding: 12px;
                                    font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #000; background-color: #fff;
                                }
                                .t-header { text-align: center; margin-bottom: 8px; }
                                .t-divider { border-bottom: 1px dashed #000; margin: 6px 0; }
                                .t-table { width: 100%; border-collapse: collapse; font-size: 11px; }
                                .t-table th { border-bottom: 1px solid #000; padding-bottom: 3px; text-align: left; }
                                .t-table td { padding: 3px 0; }
                                .t-right { text-align: right; }
                                .t-center { text-align: center; }
                                .t-bold { font-weight: bold; }
                            }
                        `}
                    </style>

                    <div className="t-header">
                        <h2 style={{ margin: '0 0 3px 0', fontSize: '16px', fontWeight: 'bold' }}>SISTEMA CONTROL</h2>
                        <div style={{ fontSize: '10px' }}>{facturaImpresion.tipoDocumento} Electrónico</div>
                        <div style={{ fontSize: '10px' }}>Consecutivo: #{facturaImpresion.consecutivo}</div>
                        <div style={{ fontSize: '10px' }}>{facturaImpresion.fecha}</div>
                    </div>

                    <div className="t-divider"></div>
                    <div><span className="t-bold">Cliente:</span> {facturaImpresion.cliente?.nombre || 'CLIENTE CONTADO'}</div>
                    {facturaImpresion.cliente?.cedula && facturaImpresion.cliente.cedula !== '000000000' && (
                        <div><span className="t-bold">Cédula:</span> {facturaImpresion.cliente.cedula}</div>
                    )}
                    <div className="t-divider"></div>

                    <table className="t-table">
                        <thead>
                            <tr>
                                <th style={{ width: '15%' }} className="t-center">Cant</th>
                                <th style={{ width: '55%' }}>Artículo</th>
                                <th style={{ width: '30%' }} className="t-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {facturaImpresion.items.map((item, idx) => (
                                <tr key={idx}>
                                    <td valign="top" className="t-center">{item.cantidad}</td>
                                    <td>
                                        {item.nombre}<br/>
                                        <small>₡{item.precio.toLocaleString()} {item.descPorcentaje > 0 ? `(-${item.descPorcentaje}%)` : ''}</small>
                                    </td>
                                    <td valign="top" className="t-right">₡{item.subtotalFinal.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="t-divider"></div>
                    
                    <table className="t-table">
                        <tbody>
                            <tr>
                                <td>Subtotal Bruto:</td>
                                <td className="t-right">₡{facturaImpresion.subtotalBruto.toLocaleString()}</td>
                            </tr>
                            {facturaImpresion.totalDescuentos > 0 && (
                                <tr>
                                    <td>Descuentos:</td>
                                    <td className="t-right">-₡{facturaImpresion.totalDescuentos.toLocaleString()}</td>
                                </tr>
                            )}
                            <tr>
                                <td>Impuesto IVA Neto:</td>
                                <td className="t-right">₡{facturaImpresion.totalImpuestos.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td className="t-bold" style={{ fontSize: '13px', paddingTop: '4px' }}>TOTAL COMPRA:</td>
                                <td className="t-right t-bold" style={{ fontSize: '13px', paddingTop: '4px' }}>₡{facturaImpresion.totalFinal.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="t-divider"></div>
                    <div><span className="t-bold">Forma de Pago:</span> {facturaImpresion.metodoPago}</div>
                    <div className="t-divider"></div>
                    
                    <div className="t-center" style={{ marginTop: '10px', fontSize: '10px' }}>
                        ¡Muchas gracias por su compra!<br/>
                        Documento Autorizado por Hacienda CR
                    </div>
                </div>
            )}
        </main>
    );
}