'use client';
import { useState, useEffect } from 'react';
import { obtenerCompras, registrarCompraConFirma } from '@/app/actions/comprasActions';
import { obtenerProveedores } from '@/app/actions/proveedoresActions';
import { obtenerCategorias } from '@/app/actions/categoriasActions';
import BuscadorPremium from '@/components/BuscadorPremium';

export default function ComprasPage() {
  const [compras, setCompras] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Inputs del Formulario Unificado
  const [proveedorId, setProveedorId] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [costoUnitario, setCostoUnitario] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
  
  // Campos Obligatorios de Firma Electrónica (Auditoría)
  const [cedulaEmpleado, setCedulaEmpleado] = useState('');
  const [contrasenaEmpleado, setContrasenaEmpleado] = useState('');

  useEffect(() => {
    cargarComponentes();
  }, []);

  const cargarComponentes = async () => {
    setCargando(true);
    const [resCom, resProv, resCat] = await Promise.all([
      obtenerCompras(),
      obtenerProveedores(),
      obtenerCategorias()
    ]);
    if (resCom.success) setCompras(resCom.datos || []);
    if (resProv.success) setProveedores(resProv.datos || []);
    if (resCat.success) setCategorias(resCat.datos || []);
    setCargando(false);
  };

  const ejecutarAsentamiento = async (e) => {
    e.preventDefault();
    if (!proveedorId || !codigo || !nombre || !categoriaId || !cantidad || !costoUnitario || !precioVenta || !cedulaEmpleado || !contrasenaEmpleado) {
      return alert('Todos los campos operativos y los datos de firma electronica son estrictamente obligatorios.');
    }

    const respuesta = await registrarCompraConFirma(
      proveedorId, 
      codigo, 
      nombre, 
      categoriaId, 
      cantidad, 
      costoUnitario, 
      precioVenta, 
      cedulaEmpleado, 
      contrasenaEmpleado
    );

    if (respuesta.success) {
      alert('Orden de compra autorizada y asentada. Notificacion enviada a gerencia.');
      // Se limpian los campos del producto, manteniendo la firma por comodidad operativa
      setCodigo(''); 
      setNombre(''); 
      setCategoriaId(''); 
      setCantidad(''); 
      setCostoUnitario(''); 
      setPrecioVenta('');
      cargarComponentes();
    } else {
      alert('Fallo de Autorizacion: ' + respuesta.error);
    }
  };

  // Función de RESTOCK RÁPIDO (Carga los datos del lote seleccionado al instante)
  const ejecutarRestockRapido = (loteViejo) => {
      setProveedorId(loteViejo.proveedor_id ? loteViejo.proveedor_id.toString() : '');
      setCodigo(loteViejo.codigo || '');
      setNombre(loteViejo.producto_nombre || '');
      setCategoriaId(loteViejo.categoria_id ? loteViejo.categoria_id.toString() : '');
      setCantidad(loteViejo.cantidad || '');
      setCostoUnitario(loteViejo.costo_unitario || '');
      setPrecioVenta(loteViejo.precio_venta || '');
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Mapear opciones puras para los buscadores autocompletables
  const opcionesProveedores = proveedores.map(p => ({ 
      valor: p.id.toString(), 
      etiqueta: p.nombre.toUpperCase() 
  }));

  const opcionesCategorias = categorias.map(c => ({ 
      valor: c.id.toString(), 
      etiqueta: c.nombre 
  }));

  return (
    <main style={{ padding: '2rem', maxWidth: '1500px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px', color: 'var(--x-text-main)' }}>Módulo de Abastecimiento Logístico</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '30px', marginBottom: '40px' }}>
        
        {/* PANEL IZQUIERDO: FORMULARIO DE INGRESO */}
        <form onSubmit={ejecutarAsentamiento} style={{ background: 'var(--x-bg-card)', padding: '25px', borderRadius: '12px', border: '1px solid var(--x-border)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <div style={{ borderBottom: '1px solid var(--x-border)', paddingBottom: '10px', marginBottom: '5px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>Adquisición de Nuevo Lote</h3>
          </div>
          
          {/* BLOQUE DE FIRMA ELECTRÓNICA MANDATORIA */}
          <div style={{ backgroundColor: 'rgba(29, 161, 242, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(29, 161, 242, 0.2)' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--x-primary)', marginBottom: '10px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>
              Firma Electronica de Autorizacion
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                    type="text" 
                    placeholder="Cedula de Identidad" 
                    value={cedulaEmpleado} 
                    onChange={e => setCedulaEmpleado(e.target.value)} 
                    className="crud-input-style" 
                    style={{ flex: '1', backgroundColor: 'var(--x-bg-base)' }} 
                    required 
                />
                <input 
                    type="password" 
                    placeholder="Contrasena de Sistema" 
                    value={contrasenaEmpleado} 
                    onChange={e => setContrasenaEmpleado(e.target.value)} 
                    className="crud-input-style" 
                    style={{ flex: '1', backgroundColor: 'var(--x-bg-base)' }} 
                    required 
                />
            </div>
            <div style={{ fontSize: '10px', color: 'var(--x-text-muted)', marginTop: '8px' }}>
                Esta transaccion requiere credenciales de nivel Operador o Administrador y despachara una auditoria por correo electronico.
            </div>
          </div>

          <div style={{ zIndex: 20, borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '10px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px' }}>Entidad Proveedora</label>
            <BuscadorPremium 
              opciones={opcionesProveedores}
              valorSeleccionado={proveedorId}
              alCambiar={setProveedorId}
              placeholder="Buscar proveedor..."
            />
          </div>

          <div style={{ borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '10px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px' }}>Datos de Catalogo</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" placeholder="Codigo de Barras / SKU" value={codigo} onChange={e => setCodigo(e.target.value)} className="crud-input-style" />
              <input type="text" placeholder="Descripcion del Articulo" value={nombre} onChange={e => setNombre(e.target.value)} className="crud-input-style" />
              
              <div style={{ zIndex: 19 }}>
                <BuscadorPremium 
                  opciones={opcionesCategorias}
                  valorSeleccionado={categoriaId}
                  alCambiar={setCategoriaId}
                  placeholder="Asignar familia contable..."
                />
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '10px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px' }}>Cantidades y Costos</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <input type="number" placeholder="Cantidad" value={cantidad} onChange={e => setQuantity(e.target.value)} className="crud-input-style" />
              </div>
              <div>
                <input type="number" step="0.01" placeholder="Costo Unit. (CRC)" value={costoUnitario} onChange={e => setCostoUnitario(e.target.value)} className="crud-input-style" />
              </div>
            </div>
            <input type="number" step="0.01" placeholder="Actualizar Precio Venta Publico (CRC)" value={precioVenta} onChange={e => setPrecioVenta(e.target.value)} className="crud-input-style" style={{ marginTop: '10px' }} />
          </div>

          <button type="submit" style={{ backgroundColor: 'var(--success-green)', color: '#fff', border: 'none', padding: '16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Asentar Compra e Inyectar Stock
          </button>
        </form>

        
        <div style={{ background: 'var(--x-bg-card)', padding: '25px', borderRadius: '12px', border: '1px solid var(--x-border)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#fff', marginBottom: '5px' }}>Bitácora de Lotes Recibidos</h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: 'var(--x-text-muted)' }}>Historial de compras registradas bajo firma electronica.</p>

          {cargando ? (
            <div style={{ padding: '40px', color: 'var(--x-text-muted)', fontSize: '13px', textAlign: 'center' }}>Consultando base de datos logisticos...</div>
          ) : compras.length === 0 ? (
            <div style={{ padding: '40px', color: 'var(--x-text-muted)', fontSize: '13px', textAlign: 'center' }}>No hay registros de abastecimiento asentados.</div>
          ) : (
            <div className="table-wrapper" style={{ flex: 1, maxHeight: '600px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--x-border)', color: 'var(--x-text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 10px' }}>Fecha y Firma</th>
                    <th style={{ padding: '12px 10px' }}>Catalogo</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>Volumen</th>
                    <th style={{ padding: '12px 10px', textAlign: 'right' }}>Inversion</th>
                    <th style={{ padding: '12px 10px', textAlign: 'center' }}>Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {compras.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(56,68,77,0.3)', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--x-bg-card-hover)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      
                      <td style={{ padding: '14px 10px' }}>
                        <div style={{ color: 'var(--x-text-muted)', fontSize: '11px', marginBottom: '3px' }}>{c.fecha ? c.fecha.split(' ')[0] : 'N/A'}</div>
                        <div style={{ fontWeight: 'bold', color: '#fff' }}>{c.solicitante_nombre}</div>
                        <div style={{ fontSize: '11px', color: 'var(--x-text-muted)' }}>ID: {c.solicitante_cedula}</div>
                      </td>
                      
                      <td style={{ padding: '14px 10px' }}>
                        <div style={{ fontWeight: '500', color: '#fff' }}>{c.producto_nombre}</div>
                        <div style={{ display: 'block', fontSize: '11px', color: 'var(--x-primary)', marginTop: '2px' }}>Prov: {c.proveedor_nombre}</div>
                      </td>
                      
                      <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                          <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff' }}>{c.cantidad}</span>
                          <div style={{ fontSize: '10px', color: 'var(--x-text-muted)' }}>a CRC {(c.costo_unitario || 0).toLocaleString()}</div>
                      </td>
                      
                      <td style={{ padding: '14px 10px', textAlign: 'right', color: 'var(--success-green)', fontWeight: 'bold', fontSize: '14px' }}>
                          CRC {((c.cantidad || 0) * (c.costo_unitario || 0)).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>

                      <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                        <button 
                            type="button"
                            onClick={() => ejecutarRestockRapido(c)}
                            style={{ 
                                backgroundColor: 'transparent', border: '1px solid var(--x-primary)', 
                                color: 'var(--x-primary)', padding: '6px 12px', borderRadius: '6px', 
                                fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(29, 161, 242, 0.1)'}
                            onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            Restock Rapido
                        </button>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}