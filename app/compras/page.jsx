'use client';
import AccesoAdministrador from '@/components/AccesoAdministrador';
import { useState, useEffect, Fragment } from 'react';
import { obtenerHistorialVentas } from '@/app/actions/ventasActions';
import { anularFacturaTransaccional } from '@/app/actions/anulacionesActions';
import SelectPremium from '@/components/SelectPremium';
import Modal from '@/components/Modal';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function HistorialVentasPage() {
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [facturaExpandida, setFacturaExpandida] = useState(null);

  // Estados de Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [hayMasDatos, setHayMasDatos] = useState(true);
  const TAMANO_PAGINA = 50;

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroPago, setFiltroPago] = useState('Todos');

  // Modal de anulación
  const [modalAnulacion, setModalAnulacion] = useState({ abierto: false, id: null, numDoc: '' });
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [anulando, setAnulando] = useState(false);

  useEffect(() => {
    cargarHistorial(paginaActual);
  }, [paginaActual]);

  const cargarHistorial = async (pagina) => {
    setCargando(true);
    const respuesta = await obtenerHistorialVentas(pagina, TAMANO_PAGINA);
    if (respuesta.success) {
      const datosNuevos = respuesta.datos || [];
      setFacturas(datosNuevos);
      setHayMasDatos(datosNuevos.length === TAMANO_PAGINA);
    } else {
      alert('Error al cargar historial: ' + respuesta.error);
    }
    setCargando(false);
  };

  const abrirModalAnulacion = (id, numDoc) => {
    setMotivoAnulacion('');
    setModalAnulacion({ abierto: true, id, numDoc });
  };

  const confirmarAnulacion = async (e) => {
    e.preventDefault();
    if (!motivoAnulacion.trim()) return;
    setAnulando(true);
    const res = await anularFacturaTransaccional(modalAnulacion.id, motivoAnulacion);
    setAnulando(false);
    if (res.success) {
      setModalAnulacion({ abierto: false, id: null, numDoc: '' });
      setMotivoAnulacion('');
      cargarHistorial(paginaActual);
    } else {
      alert('Fallo al anular: ' + res.error);
    }
  };

  const manejarPaginacion = (direccion) => {
    if (direccion === 'siguiente' && hayMasDatos) {
        setPaginaActual(prev => prev + 1);
    } else if (direccion === 'anterior' && paginaActual > 1) {
        setPaginaActual(prev => prev - 1);
    }
  };

  // Filtrado en el cliente para el bloque actual
  const facturasVisibles = facturas.filter(f => {
    const cumpleTexto = f.id.toString().includes(busqueda) || f.cliente_nombre.toLowerCase().includes(busqueda.toLowerCase());
    const cumpleEstado = filtroEstado === 'Todos' || f.estado === filtroEstado;
    const cumplePago = filtroPago === 'Todos' || f.metodo_pago === filtroPago;
    
    const fechaDoc = f.fecha ? f.fecha.split(' ')[0] : '';
    const cumpleDesde = !fechaDesde || fechaDoc >= fechaDesde;
    const cumpleHasta = !fechaHasta || fechaDoc <= fechaHasta;

    return cumpleTexto && cumpleEstado && cumplePago && cumpleDesde && cumpleHasta;
  });

  // ==========================================
  // EXPORTACIÓN
  // ==========================================

  const exportarAExcel = () => {
    const totalAceptadas = facturasVisibles
        .filter(v => v.estado !== 'Cancelado')
        .reduce((acc, v) => acc + parseFloat(v.total_final || 0), 0);

    const cantAceptadas = facturasVisibles.filter(v => v.estado !== 'Cancelado').length;
    const cantAnuladas = facturasVisibles.filter(v => v.estado === 'Cancelado').length;

    const filas = facturasVisibles.map(v => ({
        Documento: `${v.tipo_documento} #${v.id}`,
        Fecha: v.fecha || 'N/A',
        Cliente: v.cliente_nombre,
        'Método de Pago': v.metodo_pago,
        'Total CRC': parseFloat(v.total_final || 0),
        Estado: v.estado
    }));

    filas.push({});
    filas.push({
        Documento: 'Documentos Aceptados',
        Fecha: '',
        Cliente: '',
        'Método de Pago': cantAceptadas,
        'Total CRC': totalAceptadas,
        Estado: ''
    });

    filas.push({
        Documento: 'Documentos Anulados',
        Fecha: '',
        Cliente: '',
        'Método de Pago': cantAnuladas,
        'Total CRC': 0,
        Estado: ''
    });

    filas.push({
        Documento: 'TOTAL GENERAL',
        Fecha: '',
        Cliente: '',
        'Método de Pago': facturasVisibles.length,
        'Total CRC': totalAceptadas,
        Estado: ''
    });

    const ws = XLSX.utils.json_to_sheet(filas);

    ws['!cols'] = [
        { wch: 18 },
        { wch: 22 },
        { wch: 30 },
        { wch: 16 },
        { wch: 16 },
        { wch: 12 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');

    XLSX.writeFile(
        wb,
        `Reporte_Ventas_${new Date().toISOString().split('T')[0]}.xlsx`
    );
};

const exportarAPDF = () => {
  const totalAceptadas = facturasVisibles
      .filter(v => v.estado !== 'Cancelado')
      .reduce((acc, v) => acc + parseFloat(v.total_final || 0), 0);

  const cantAceptadas = facturasVisibles.filter(v => v.estado !== 'Cancelado').length;
  const cantAnuladas = facturasVisibles.filter(v => v.estado === 'Cancelado').length;

  const doc = new jsPDF({
      orientation: 'landscape'
  });

  doc.setFontSize(16);
  doc.setTextColor(30, 58, 95);
  doc.text('Reporte General de Transacciones', 14, 16);

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
      `Generado: ${new Date().toLocaleString()}   |   Registros: ${facturasVisibles.length}   |   Aceptados: ${cantAceptadas}   |   Anulados: ${cantAnuladas}`,
      14,
      23
  );

  autoTable(doc, {
      startY: 28,
      head: [[
          '#',
          'Documento',
          'Fecha',
          'Cliente',
          'Método',
          'Total CRC',
          'Estado'
      ]],
      body: facturasVisibles.map((v, idx) => [
          idx + 1,
          `${v.tipo_documento} #${v.id}`,
          v.fecha || 'N/A',
          v.cliente_nombre,
          v.metodo_pago,
          `₡${parseFloat(v.total_final || 0).toLocaleString('es-CR', {
              minimumFractionDigits: 2
          })}`,
          v.estado.toUpperCase()
      ]),
      styles: {
          fontSize: 8,
          cellPadding: 3
      },
      headStyles: {
          fillColor: [30, 58, 95],
          textColor: 255,
          fontStyle: 'bold'
      },
      alternateRowStyles: {
          fillColor: [249, 250, 251]
      },
      columnStyles: {
          0: {
              halign: 'center',
              cellWidth: 10
          },
          5: {
              halign: 'right'
          },
          6: {
              halign: 'center'
          }
      },
      didParseCell: data => {
          if (data.section === 'body' && data.column.index === 6) {
              const estado = facturasVisibles[data.row.index]?.estado;

              if (estado === 'Cancelado') {
                  data.cell.styles.textColor = [220, 38, 38];
              } else {
                  data.cell.styles.textColor = [22, 163, 74];
              }
          }
      }
  });

  const finalY = doc.lastAutoTable.finalY + 10;

  doc.setFontSize(10);
  doc.setTextColor(30, 58, 95);
  doc.text('Resumen del Período', 14, finalY);

  autoTable(doc, {
      startY: finalY + 4,
      head: [['Concepto', 'Cantidad', 'Monto CRC']],
      body: [
          [
              'Documentos Aceptados',
              cantAceptadas,
              `₡${totalAceptadas.toLocaleString('es-CR', {
                  minimumFractionDigits: 2
              })}`
          ],
          [
              'Documentos Anulados',
              cantAnuladas,
              '₡0.00'
          ],
          [
              'TOTAL GENERAL',
              facturasVisibles.length,
              `₡${totalAceptadas.toLocaleString('es-CR', {
                  minimumFractionDigits: 2
              })}`
          ]
      ],
      styles: {
          fontSize: 9
      },
      headStyles: {
          fillColor: [55, 65, 81],
          textColor: 255
      },
      columnStyles: {
          1: {
              halign: 'right'
          },
          2: {
              halign: 'right'
          }
      },
      didParseCell: data => {
          if (data.section === 'body' && data.row.index === 2) {
              data.cell.styles.fillColor = [30, 58, 95];
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontStyle = 'bold';
          }
      }
  });

  doc.save(
      `Reporte_Ventas_${new Date().toISOString().split('T')[0]}.pdf`
  );
};

  // ==========================================

  const imprimirCopiaFactura = (factura) => {
    const fecha = factura.fecha && factura.fecha !== 'N/A' ? new Date(factura.fecha).toLocaleString() : new Date().toLocaleString();
    const tipo = factura.tipo_documento || 'Tiquete';
    
    const contenido = `
        <html>
        <head>
            <title>Copia Factura #${factura.id}</title>
            <style>
                body { font-family: monospace; font-size: 12px; max-width: 300px; margin: 0 auto; padding: 10px; color: #000; }
                table { width: 100%; font-size: 12px; border-collapse: collapse; }
                .center { text-align: center; }
                .right { text-align: right; }
                .bold { font-weight: bold; }
                .divider { border-top: 1px dashed #000; margin: 5px 0; }
                @media print { body { width: 80mm; margin: 0; padding: 0; } }
            </style>
        </head>
        <body>
            <div class="center">
                <h3 style="margin:0 0 5px 0;">TIENDA CONTROL PRO</h3>
                <p style="margin:0;">Golfito, Puntarenas, Costa Rica</p>
                <p class="bold" style="margin:5px 0;">*** COPIA REIMPRESIÓN ***</p>
                <p style="margin:0;">${tipo.toUpperCase()} ELECTRÓNICO</p>
                <p style="margin:0;">N° FAC-${factura.id}</p>
            </div>
            <div class="divider"></div>
            <p style="margin:2px 0;">Fecha: ${fecha}</p>
            <p style="margin:2px 0;">Cliente: ${factura.cliente_nombre}</p>
            <p style="margin:2px 0;">Método: ${factura.metodo_pago}</p>
            <div class="divider"></div>
            <table>
                <tbody>
                    ${(factura.detalles || []).map(d => `
                        <tr>
                            <td style="padding:2px 0;">${d.producto} (x${d.cantidad})</td>
                            <td class="right" style="padding:2px 0;">₡${parseFloat(d.subtotal || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="divider"></div>
            <div class="right">
                <p class="bold" style="margin:4px 0 0 0; font-size: 14px;">TOTAL CRC: ₡${parseFloat(factura.total_final || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
            </div>
            <script>
                window.onload = function() { window.print(); window.close(); }
            </script>
        </body>
        </html>
    `;
    const ventana = window.open('', '_blank', 'width=400,height=600');
    ventana.document.write(contenido);
    ventana.document.close();
  };

  const opcionesEstado = [
    { valor: 'Todos', etiqueta: 'Todos los Estados' },
    { valor: 'Completado', etiqueta: 'Completado' },
    { valor: 'Cancelado', etiqueta: 'Anulado / Cancelado' }
  ];

  const opcionesPago = [
    { valor: 'Todos', etiqueta: 'Cualquier Medio' },
    { valor: 'Efectivo', etiqueta: 'Efectivo' },
    { valor: 'Tarjeta', etiqueta: 'Tarjeta / Datafono' },
    { valor: 'SINPE', etiqueta: 'SINPE Móvil' },
    { valor: 'Mixto', etiqueta: 'Mixto' }
  ];

  return (

    <AccesoAdministrador>
    <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>

      {/* MODAL DE ANULACIÓN */}
      <Modal isOpen={modalAnulacion.abierto} onClose={() => !anulando && setModalAnulacion({ abierto: false, id: null, numDoc: '' })}>
        <form onSubmit={confirmarAnulacion} style={{ width: '380px', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--x-border)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '15px' }}>Anular Documento</div>
              <div style={{ fontSize: '12px', color: 'var(--x-text-muted)', marginTop: '2px' }}>
                {modalAnulacion.numDoc} #{modalAnulacion.id}
              </div>
            </div>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--x-text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
            Esta acción es permanente. Se creará una Nota de Crédito automáticamente y el stock volverá al inventario.
          </p>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Motivo de Anulación <span style={{ color: 'var(--danger-red)' }}>*</span>
            </label>
            <textarea
              value={motivoAnulacion}
              onChange={e => setMotivoAnulacion(e.target.value)}
              placeholder="Ej: Error en los productos facturados, devolución del cliente..."
              required
              autoFocus
              rows={3}
              style={{
                width: '100%', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid var(--x-border)',
                borderRadius: '6px', color: '#fff', padding: '10px 12px', fontSize: '13px',
                resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                lineHeight: '1.5'
              }}
              onFocus={e => e.target.style.borderColor = 'var(--danger-red)'}
              onBlur={e => e.target.style.borderColor = 'var(--x-border)'}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setModalAnulacion({ abierto: false, id: null, numDoc: '' })}
              disabled={anulando}
              style={{ flex: 1, backgroundColor: 'transparent', border: '1px solid var(--x-border)', color: 'var(--x-text-main)', padding: '11px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={anulando || !motivoAnulacion.trim()}
              style={{ flex: 1, backgroundColor: anulando || !motivoAnulacion.trim() ? 'rgba(239,68,68,0.4)' : 'var(--danger-red)', color: '#fff', border: 'none', padding: '11px', borderRadius: '6px', cursor: anulando || !motivoAnulacion.trim() ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase' }}
            >
              {anulando ? 'Procesando...' : 'Confirmar Anulación'}
            </button>
          </div>
        </form>
      </Modal>

      {/* HEADER CON BOTONES DE EXPORTACIÓN */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--x-text-main)' }}>Registro de Transacciones</h2>
          <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: 'var(--x-text-muted)' }}>Historial fiscal y logístico de ventas por bloque.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={exportarAExcel} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#107c41', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                Exportar Excel
            </button>
            <button onClick={exportarAPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#e11d48', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                Exportar PDF
            </button>
        </div>
      </div>

      {/* FILTROS */}
      <div style={{ background: 'var(--x-bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--x-border)', marginBottom: '25px', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end', position: 'relative', zIndex: 10 }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px' }}>Búsqueda Rápida</label>
          <input type="text" placeholder="ID Doc o Cliente..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="crud-input-style" />
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px' }}>Estado Comercial</label>
          <SelectPremium opciones={opcionesEstado} valorSeleccionado={filtroEstado} alCambiar={setFiltroEstado} />
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px' }}>Medio de Pago</label>
          <SelectPremium opciones={opcionesPago} valorSeleccionado={filtroPago} alCambiar={setFiltroPago} />
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px' }}>Desde</label>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="crud-input-style" style={{ colorScheme: 'dark' }} />
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--x-text-muted)', marginBottom: '5px' }}>Hasta</label>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="crud-input-style" style={{ colorScheme: 'dark' }} />
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
      <div style={{ background: 'var(--x-bg-card)', borderRadius: '12px', border: '1px solid var(--x-border)', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {cargando ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--x-text-muted)' }}>Cargando bloque de transacciones...</div>
        ) : facturasVisibles.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--x-text-muted)' }}>No se encontraron transacciones en esta página.</div>
        ) : (
          <div className="table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--x-border)', color: 'var(--x-text-muted)' }}>
                  <th style={{ padding: '15px 12px' }}>Documento</th>
                  <th style={{ padding: '15px 12px' }}>Fecha</th>
                  <th style={{ padding: '15px 12px' }}>Cliente</th>
                  <th style={{ padding: '15px 12px' }}>Método</th>
                  <th style={{ padding: '15px 12px', textAlign: 'right' }}>Total CRC</th>
                  <th style={{ padding: '15px 12px', textAlign: 'center' }}>Estado</th>
                  <th style={{ padding: '15px 12px', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {facturasVisibles.map(f => {
                  const expandido = facturaExpandida === f.id;
                  const esAnulada = f.estado === 'Cancelado';
                  return (
                    <Fragment key={f.id}>
                      <tr style={{ borderBottom: '1px solid rgba(56,68,77,0.3)', backgroundColor: expandido ? 'rgba(255,255,255,0.02)' : 'transparent', opacity: esAnulada ? 0.6 : 1 }}>
                        <td style={{ padding: '14px 12px', fontWeight: 'bold' }}>{f.tipo_documento} #{f.id}</td>
                        <td style={{ padding: '14px 12px', color: 'var(--x-text-muted)' }}>{f.fecha || 'N/A'}</td>
                        <td style={{ padding: '14px 12px' }}>{f.cliente_nombre}</td>
                        <td style={{ padding: '14px 12px' }}>{f.metodo_pago}</td>
                        <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 'bold', color: esAnulada ? 'var(--x-text-muted)' : 'var(--success-green)' }}>
                          ₡{(f.total_final || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                          <span style={{ backgroundColor: esAnulada ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 186, 124, 0.1)', color: esAnulada ? 'var(--danger-red)' : 'var(--success-green)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                            {f.estado.toUpperCase()}
                          </span>
                          {esAnulada && f.nota_credito_id && (
                            <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--x-text-muted)' }}>
                              NC #{f.nota_credito_id}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button onClick={() => setFacturaExpandida(expandido ? null : f.id)} style={{ backgroundColor: 'transparent', border: '1px solid var(--x-border)', color: 'var(--x-text-main)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                              {expandido ? 'Ocultar' : 'Detalle'}
                            </button>
                            {!esAnulada && (
                              <button onClick={() => abrirModalAnulacion(f.id, f.tipo_documento)} style={{ backgroundColor: 'transparent', border: '1px solid var(--danger-red)', color: 'var(--danger-red)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                                Anular
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* DETALLE EXPANDIDO CON BOTÓN DE IMPRESIÓN */}
                      {expandido && (
                        <tr style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderBottom: '2px solid var(--x-primary)' }}>
                          <td colSpan="7" style={{ padding: '20px' }}>
                            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                  <h4 style={{ margin: 0, color: 'var(--x-text-main)', fontSize: '13px', textTransform: 'uppercase' }}>Desglose de Artículos</h4>
                                  <button onClick={() => imprimirCopiaFactura(f)} style={{ backgroundColor: 'var(--x-bg-base)', border: '1px solid var(--x-border)', color: 'var(--x-primary)', padding: '6px 15px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                                      Imprimir Copia
                                  </button>
                              </div>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--x-border)' }}>
                                    <th style={{ padding: '8px 4px', textAlign: 'left', color: 'var(--x-text-muted)' }}>SKU</th>
                                    <th style={{ padding: '8px 4px', textAlign: 'left', color: 'var(--x-text-muted)' }}>Producto</th>
                                    <th style={{ padding: '8px 4px', textAlign: 'center', color: 'var(--x-text-muted)' }}>Cant.</th>
                                    <th style={{ padding: '8px 4px', textAlign: 'right', color: 'var(--x-text-muted)' }}>Precio Unit.</th>
                                    <th style={{ padding: '8px 4px', textAlign: 'right', color: 'var(--x-text-muted)' }}>Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {f.detalles && f.detalles.length > 0 ? f.detalles.map((d, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px dotted rgba(255,255,255,0.05)' }}>
                                      <td style={{ padding: '8px 4px', fontFamily: 'monospace', color: 'var(--x-text-muted)' }}>{d.codigo || 'N/A'}</td>
                                      <td style={{ padding: '8px 4px' }}>{d.producto}</td>
                                      <td style={{ padding: '8px 4px', textAlign: 'center' }}>{d.cantidad}</td>
                                      <td style={{ padding: '8px 4px', textAlign: 'right' }}>₡{(d.precio_unitario || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                      <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 'bold' }}>₡{(d.subtotal || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                    </tr>
                                  )) : (
                                    <tr>
                                      <td colSpan="5" style={{ padding: '8px 4px', color: 'var(--x-text-muted)', textAlign: 'center' }}>No hay detalles registrados.</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>

              {/* FILA DE TOTALES AL FINAL DE LA TABLA */}
              {facturasVisibles.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--x-border)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    <td colSpan="4" style={{ padding: '14px 12px', fontWeight: 'bold', fontSize: '12px', color: 'var(--x-text-muted)' }}>
                      TOTAL — {facturasVisibles.length} registros &nbsp;|&nbsp; {facturasVisibles.filter(f => f.estado !== 'Cancelado').length} aceptados &nbsp;|&nbsp; {facturasVisibles.filter(f => f.estado === 'Cancelado').length} anulados
                    </td>
                    <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 'bold', fontSize: '15px', color: 'var(--success-green)' }}>
                      ₡{facturasVisibles.filter(f => f.estado !== 'Cancelado').reduce((acc, f) => acc + parseFloat(f.total_final || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </td>
                    <td colSpan="2" style={{ padding: '14px 12px', textAlign: 'center', fontSize: '11px', color: 'var(--x-text-muted)' }}>
                      (sin anulados)
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
        
        {/* Controles de Paginación */}
        <div style={{ padding: '15px', borderTop: '1px solid var(--x-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--x-text-muted)' }}>
            Página {paginaActual}
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
                onClick={() => manejarPaginacion('anterior')} 
                disabled={paginaActual === 1 || cargando}
                style={{ padding: '8px 16px', backgroundColor: paginaActual === 1 ? 'rgba(255,255,255,0.05)' : 'var(--x-bg-base)', border: '1px solid var(--x-border)', color: paginaActual === 1 ? 'var(--x-text-muted)' : '#fff', borderRadius: '6px', cursor: paginaActual === 1 ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 'bold' }}
            >
                Anterior
            </button>
            <button 
                onClick={() => manejarPaginacion('siguiente')} 
                disabled={!hayMasDatos || cargando}
                style={{ padding: '8px 16px', backgroundColor: !hayMasDatos ? 'rgba(255,255,255,0.05)' : 'var(--x-bg-base)', border: '1px solid var(--x-border)', color: !hayMasDatos ? 'var(--x-text-muted)' : '#fff', borderRadius: '6px', cursor: !hayMasDatos ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 'bold' }}
            >
                Siguiente
            </button>
          </div>
        </div>

      </div>
    </main>
    </AccesoAdministrador>
  );
}