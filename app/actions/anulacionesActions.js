'use server'
import { poolPromise, sql } from '@/lib/db';

export async function anularFacturaTransaccional(facturaId, motivo) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('factura_id', sql.Int, parseInt(facturaId))
            .input('motivo', sql.VarChar(255), motivo || '')
            .execute('sp_AnularFacturaTransaccional');
            
        return { 
            success: true, 
            notaCreditoId: result.recordset[0].notaCreditoId 
        };
    } catch (err) {
        console.error('[SQL ERROR - ANULACIÓN]:', err.message);
        return { success: false, error: err.message };
    }
}