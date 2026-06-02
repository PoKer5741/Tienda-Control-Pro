'use server'
import { poolPromise, sql } from '@/lib/db';

/**
 * Ejecuta la transacción de venta llamando al procedimiento almacenado de la base de datos.
 * Automatiza el registro del asiento de facturación y la deducción de existencias en un solo paso.
 */
export async function procesarVentaTransaccional(productoId, cantidad, precioUnitario) {
    try {
        const pool = await poolPromise;
        
        // Ejecución segura y parametrizada del Stored Procedure del motor relacional
        await pool.request()
            .input('producto_id', sql.Int, parseInt(productoId))
            .input('cantidad', sql.Int, parseInt(cantidad))
            .input('precio_unitario', sql.Decimal(10, 2), parseFloat(precioUnitario))
            .execute('sp_RegistrarVenta');
            
        return { success: true, mensaje: 'Transacción asentada correctamente en el motor SQL.' };
    } catch (err) {
        console.error('[SERVER ACTION ERROR] Fallo en ejecución de procedimiento sp_RegistrarVenta:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Recupera el historial completo de facturación.
 * Combina la cabecera de la factura con el detalle de productos adquiridos.
 */
export async function obtenerHistorialVentas() {
    try {
        const pool = await poolPromise;
        
        // Extracción concurrente de cabeceras y detalles para optimizar los tiempos de lectura
        const [resFacturas, resDetalles] = await Promise.all([
            pool.request().query(`
                SELECT id, CONVERT(varchar, fecha, 120) AS fecha, total_neto, impuesto, total_final 
                FROM Facturas 
                ORDER BY fecha DESC
            `),
            pool.request().query(`
                SELECT df.factura_id, p.nombre AS producto, df.cantidad, df.precio_unitario, (df.cantidad * df.precio_unitario) AS subtotal
                FROM DetalleFacturas df
                INNER JOIN Productos p ON df.producto_id = p.id
            `)
        ]);

        // Estructuración de los datos en memoria (Mapeo Maestro-Detalle)
        const facturasEstructuradas = resFacturas.recordset.map(factura => {
            return {
                ...factura,
                detalles: resDetalles.recordset.filter(d => d.factura_id === factura.id)
            };
        });

        return { success: true, datos: facturasEstructuradas };
    } catch (err) {
        console.error('[SERVER ACTION ERROR] Fallo al recuperar historial de ventas:', err.message);
        return { success: false, error: err.message };
    }
}