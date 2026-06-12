'use server'
import { poolPromise, sql } from '@/lib/db';

export async function procesarVentaTransaccional(clienteId, clienteNombre, tipoDocumento, metodoPago, subtotal, impuestos, total, montoPagado, vuelto, carrito) {
    try {
        const pool = await poolPromise;
        
        const result = await pool.request()
            .input('cliente_id', sql.Int, parseInt(clienteId) || 1)
            .input('cliente_nombre', sql.VarChar(100), clienteNombre || 'CLIENTE CONTADO')
            .input('tipo_documento', sql.VarChar(20), tipoDocumento || 'Tiquete')
            .input('metodo_pago', sql.VarChar(50), metodoPago)
            .input('total_neto', sql.Decimal(10, 2), parseFloat(subtotal))
            .input('impuesto', sql.Decimal(10, 2), parseFloat(impuestos))
            .input('total_final', sql.Decimal(10, 2), parseFloat(total))
            .input('monto_pagado', sql.Decimal(10, 2), parseFloat(montoPagado)) 
            .input('vuelto', sql.Decimal(10, 2), parseFloat(vuelto))            
            .input('carrito_json', sql.NVarChar(sql.MAX), JSON.stringify(carrito))
            .execute('sp_ProcesarFacturaCompleta');
            
        const facturaId = result.recordset[0].nueva_factura_id;
            
        return { success: true, facturaId: facturaId };
    } catch (err) {
        console.error('[SERVER ACTION ERROR] Fallo al asentar factura:', err.message);
        return { success: false, error: err.message };
    }
}
export async function obtenerHistorialVentas() {
    try {
        const pool = await poolPromise;
        
        const result = await pool.request().execute('sp_ObtenerHistorialVentas');

        const resFacturas = result.recordsets[0] || [];
        const resDetalles = result.recordsets[1] || [];

        const facturasEstructuradas = resFacturas.map(factura => {
            return {
                ...factura,
                detalles: resDetalles.filter(d => String(d.factura_id) === String(factura.id))
            };
        });

        return { success: true, datos: facturasEstructuradas };
    } catch (err) {
        console.error('[SERVER ACTION ERROR] Fallo al recuperar historial:', err.message);
        return { success: false, error: err.message };
    }
}