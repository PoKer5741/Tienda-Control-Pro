'use server'
import { poolPromise, sql } from '@/lib/db';

export async function adminObtenerTrabajadores() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().execute('sp_AdminObtenerTrabajadores');
        return { success: true, datos: result.recordset || [] };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function adminObtenerHistorialArqueos(trabajadorId, fechaDesde, fechaHasta) {
    try {
        const pool = await poolPromise;
        const request = pool.request();

        if (trabajadorId && trabajadorId !== 'Todos') {
            request.input('trabajador_id', sql.Int, parseInt(trabajadorId));
        }
        if (fechaDesde) {
            request.input('fecha_desde', sql.Date, fechaDesde);
        }
        if (fechaHasta) {
            request.input('fecha_hasta', sql.Date, fechaHasta);
        }

        const result = await request.execute('sp_AdminObtenerHistorialArqueos');
        return { success: true, datos: result.recordset || [] };
    } catch (err) {
        console.error('[ADMIN AUDIT ERROR] Fallo al consultar bitácora maestra:', err.message);
        return { success: false, error: err.message };
    }
}