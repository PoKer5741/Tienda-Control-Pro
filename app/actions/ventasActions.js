'use server'
import { poolPromise, sql } from '@/lib/db';

export async function procesarVentaTransaccional(
    cajaId, clienteId, tipoDocumento, metodoPago, subtotal, totalDescuentos, totalImpuestos, totalFinal, montoEfectivo, montoSinpe, montoTarjeta, notas, carrito
) {
    try {
        const pool = await poolPromise; 
        
        const resultado = await pool.request()
            .input('caja_id', sql.Int, cajaId)
            .input('cliente_id', sql.Int, clienteId)
            .input('tipo_documento', sql.VarChar(50), tipoDocumento)
            .input('metodo_pago', sql.VarChar(50), metodoPago)
            .input('subtotal', sql.Decimal(18, 2), subtotal)
            .input('total_descuentos', sql.Decimal(18, 2), totalDescuentos)
            .input('total_impuestos', sql.Decimal(18, 2), totalImpuestos)
            .input('total_final', sql.Decimal(18, 2), totalFinal)
            .input('monto_efectivo', sql.Decimal(18, 2), montoEfectivo)
            .input('monto_sinpe', sql.Decimal(18, 2), montoSinpe)
            .input('monto_tarjeta', sql.Decimal(18, 2), montoTarjeta)
            .input('notas', sql.VarChar(sql.MAX), notas || '')
            .input('carrito_json', sql.NVarChar(sql.MAX), JSON.stringify(carrito))
            .execute('sp_ProcesarVentaTransaccional');

        return { success: true, facturaId: resultado.recordset[0].facturaId };
    } catch (error) {
        return { success: false, error: error.message };
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