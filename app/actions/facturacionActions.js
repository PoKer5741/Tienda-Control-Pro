'use server'
import { poolPromise, sql } from '@/lib/db';
import { registrarLogAuditoria } from './auditoriaActions';

export async function obtenerDatosFacturacionInicial() {
    try {
        const pool = await poolPromise;
        
        // Obtenemos los productos para el catálogo de venta
        const prodResult = await pool.request().execute('sp_ObtenerProductos');
        // Obtenemos los clientes registrados
        const clientResult = await pool.request().execute('sp_ObtenerClientes');
        // Verificamos la caja abierta actual
        const cajaResult = await pool.request().execute('sp_VerificarCajaAbierta');

        return { 
            success: true, 
            productos: prodResult.recordset || [],
            clientes: clientResult.recordset || [],
            cajaAbierta: cajaResult.recordset[0] || null
        };
    } catch (err) {
        console.error('[FACTURACIÓN INICIAL ERROR]:', err.message);
        return { success: false, error: err.message };
    }
}

export async function emitirDocumentoElectronico(facturaId, datosFactura, carritoItems) {
    try {
        // 1. Construir el XML o el JSON estructurado que exige el Ministerio de Hacienda (Costa Rica)
        const payloadHacienda = {
            clave: `5062306202699999999900100001010000000001${String(facturaId).padStart(10, '0')}`,
            fechaEmision: new Date().toISOString(),
            emisor: {
                identificacion: { tipo: "02", numero: "3101999999" },
                nombre: "TIENDA CONTROL PRO S.A."
            },
            receptor: datosFactura.clienteId !== 1 ? {
                identificacion: { tipo: "01", numero: datosFactura.cedula },
                nombre: datosFactura.nombreCliente,
                correoElectronico: datosFactura.correo
            } : null, // Si es cliente contado, se emite tiquete genérico sin receptor
            detallesServicio: carritoItems.map((item, index) => ({
                numeroLinea: index + 1,
                cantidad: item.cantidad,
                codigo: item.codigo,
                descripcion: item.nombre,
                precioUnitario: item.precio,
                montoTotal: item.precio * item.cantidad,
                impuesto: {
                    codigo: "01",
                    tarifa: 13,
                    monto: (item.precio * item.cantidad) * 0.13
                },
                montoTotalLinea: (item.precio * item.cantidad) * 1.13
            }))
        };

        // 2. Simulación de consumo de la API de Hacienda o Proveedor de Facturación
        console.log('[HACIENDA] Enviando documento electrónico...', JSON.stringify(payloadHacienda));

        // En un entorno real aquí iría el fetch() al validador de hacienda y la firma criptográfica
        await new Promise(resolve => setTimeout(resolve, 1500));

        await registrarLogAuditoria(
            'Facturación', 
            'EMISIÓN ELECTRÓNICA', 
            `Documento ${datosFactura.tipoDocumento} procesado. Clave: ${payloadHacienda.clave}`
        );

        return { 
            success: true, 
            claveHacienda: payloadHacienda.clave, 
            estado: 'Aceptado' 
        };

    } catch (err) {
        console.error('[ERROR EMISIÓN HACIENDA]:', err.message);
        return { success: false, error: err.message };
    }
}