'use server'
import { poolPromise, sql } from '@/lib/db';

export async function procesarVentaTransaccional(clienteId, clienteNombre, tipoDocumento, metodoPago, subtotal, totalImpuestos, totalFinal, montoIngresado, vuelto, carrito) {
    try {
        const pool = await poolPromise;
        
        // Transformamos el array de productos de React a un string JSON puro para SQL
        const carritoJson = JSON.stringify(carrito);

        const result = await pool.request()
            .input('cliente_id', sql.Int, parseInt(clienteId))
            .input('tipo_documento', sql.VarChar(50), tipoDocumento)
            .input('metodo_pago', sql.VarChar(50), metodoPago)
            .input('subtotal', sql.Decimal(10, 2), parseFloat(subtotal))
            .input('total_impuestos', sql.Decimal(10, 2), parseFloat(totalImpuestos))
            .input('total_final', sql.Decimal(10, 2), parseFloat(totalFinal))
            .input('carrito_json', sql.NVarChar(sql.MAX), carritoJson)
            .execute('sp_ProcesarVentaTransaccional');

        // Retornamos el éxito y el ID para que tu page.jsx pueda disparar el recibo por correo
        return { 
            success: true, 
            facturaId: result.recordset[0].facturaId 
        };
    } catch (err) {
        console.error('[MOTOR SQL ERROR]:', err.message);
        return { success: false, error: err.message };
    }
}
// Agrega esta función a tu archivo ventasActions.js existente

export async function obtenerHistorialVentas() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().execute('sp_ObtenerHistorialVentas');

        // Mapeo Estricto: Transforma la cadena JSON de SQL en un Array nativo
        const datosParseados = result.recordset.map(fila => ({
            ...fila,
            detalles: fila.detalles_json ? JSON.parse(fila.detalles_json) : []
        }));

        return { success: true, datos: datosParseados };
    } catch (err) {
        console.error('[MOTOR SQL ERROR - LECTURA VENTAS]:', err.message);
        return { success: false, error: err.message };
    }
}