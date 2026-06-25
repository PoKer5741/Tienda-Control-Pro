'use server'
import { poolPromise, sql } from '@/lib/db';

export async function procesarVentaTransaccional(clienteId, tipoDocumento, metodoPago, subtotal, totalDescuentos, totalImpuestos, totalFinal, montoEfectivo, montoSinpe, montoTarjeta, notas, carrito) {
    try {
        const pool = await poolPromise;
        const carritoJson = JSON.stringify(carrito);

        const result = await pool.request()
            .input('cliente_id', sql.Int, parseInt(clienteId))
            .input('tipo_documento', sql.VarChar(50), tipoDocumento)
            .input('metodo_pago', sql.VarChar(50), metodoPago)
            .input('subtotal', sql.Decimal(10, 2), parseFloat(subtotal))
            .input('total_descuentos', sql.Decimal(10, 2), parseFloat(totalDescuentos))
            .input('total_impuestos', sql.Decimal(10, 2), parseFloat(totalImpuestos))
            .input('total_final', sql.Decimal(10, 2), parseFloat(totalFinal))
            .input('monto_efectivo', sql.Decimal(10, 2), parseFloat(montoEfectivo))
            .input('monto_sinpe', sql.Decimal(10, 2), parseFloat(montoSinpe))
            .input('monto_tarjeta', sql.Decimal(10, 2), parseFloat(montoTarjeta))
            .input('notas', sql.VarChar(255), notas || '')
            .input('carrito_json', sql.NVarChar(sql.MAX), carritoJson)
            .execute('sp_ProcesarVentaTransaccional');

        return { success: true, facturaId: result.recordset[0].facturaId };
    } catch (err) {
        console.error('[MOTOR SQL ERROR]:', err.message);
        return { success: false, error: err.message };
    }
}

export async function obtenerHistorialVentas(pagina = 1, tamanoPagina = 50) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('pagina', sql.Int, parseInt(pagina))
            .input('tamano_pagina', sql.Int, parseInt(tamanoPagina))
            .execute('sp_ObtenerHistorialVentas');

        const datosParseados = result.recordset.map(fila => ({
            ...fila,
            detalles: fila.detalles_json ? JSON.parse(fila.detalles_json) : []
        }));
        return { success: true, datos: datosParseados };
    } catch (err) {
        return { success: false, error: err.message };
    }
}