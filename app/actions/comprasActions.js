// app/actions/comprasActions.js
'use server'
import { poolPromise, sql } from '@/lib/db';

/**
 * Invoca el procedimiento almacenado sp_RegistrarCompra.
 * Actualiza el inventario y registra la compra en un solo paso transaccional.
 */
export async function procesarCompraTransaccional(productoId, cantidad, proveedorId) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('producto_id', sql.Int, parseInt(productoId))
            .input('cantidad', sql.Int, parseInt(cantidad))
            .input('proveedor_id', sql.Int, parseInt(proveedorId))
            .execute('sp_RegistrarCompra');
            
        return { success: true, mensaje: 'Compra y reposicion de stock procesadas correctamente.' };
    } catch (err) {
        console.error('[SERVER ACTION ERROR] Fallo al registrar compra:', err.message);
        return { success: false, error: err.message };
    }
}