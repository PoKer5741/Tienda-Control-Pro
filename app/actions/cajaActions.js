'use server'
import { poolPromise, sql } from '@/lib/db';

export async function verificarCajaAbierta() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().execute('sp_VerificarCajaAbierta');
        return { success: true, caja: result.recordset[0] || null };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function abrirCajaTransaccional(montoApertura) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('monto_apertura', sql.Decimal(10, 2), parseFloat(montoApertura))
            .execute('sp_AbrirCaja');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function obtenerVentasTurno(cajaTurnoId) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('caja_turno_id', sql.Int, parseInt(cajaTurnoId))
            .execute('sp_ObtenerVentasTurnoActual');
        return { success: true, datos: result.recordset };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function cerrarCajaTransaccional(cajaTurnoId, efectivoReal) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('caja_turno_id', sql.Int, parseInt(cajaTurnoId))
            .input('monto_efectivo_real', sql.Decimal(10, 2), parseFloat(efectivoReal))
            .execute('sp_CerrarCaja');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}
export async function obtenerHistorialArqueos() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().execute('sp_ObtenerHistorialCajas');
        return { success: true, datos: result.recordset || [] };
    } catch (err) {
        return { success: false, error: err.message };
    }
}