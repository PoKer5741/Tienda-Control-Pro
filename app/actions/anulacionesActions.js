'use server'
import { poolPromise, sql } from '@/lib/db';

export async function anularFacturaTransaccional(facturaId) {
    try {
        const pool = await poolPromise;
        
        await pool.request()
            .input('factura_id', sql.Int, parseInt(facturaId))
            .execute('sp_AnularFacturaConNotaCredito');
            
        return { success: true };
    } catch (err) {
        console.error('[SERVER ACTION ERROR] Fallo al anular factura:', err.message);
        return { success: false, error: err.message };
    }
}