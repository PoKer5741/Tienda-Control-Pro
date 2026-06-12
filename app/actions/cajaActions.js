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

export async function abrirCajaTransaccional(correo, contrasena, montoApertura) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('correo', sql.VarChar(100), correo)
            .input('contrasena', sql.VarChar(255), contrasena)
            .input('monto_apertura', sql.Decimal(10, 2), parseFloat(montoApertura))
            .execute('sp_AbrirCajaConAutenticacion');
        return { success: true };
    } catch (err) {
        console.error('[AUTH ERROR] Fallo en apertura de caja:', err.message);
        return { success: false, error: err.message };
    }
}

export async function obtenerVentasTurno(cajaTurnoId) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('caja_turno_id', sql.Int, parseInt(cajaTurnoId))
            .execute('sp_ObtenerVentasTurno');
        return { success: true, datos: result.recordset || [] };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function cerrarCajaTransaccional(cajaTurnoId, montoReal) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('caja_turno_id', sql.Int, parseInt(cajaTurnoId))
            .input('monto_efectivo_real', sql.Decimal(10, 2), parseFloat(montoReal))
            .execute('sp_CerrarCaja');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function obtenerHistorialArqueos() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().execute('sp_ObtenerHistorialArqueos');
        return { success: true, datos: result.recordset || [] };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function obtenerDesgloseMetodosTurno(cajaTurnoId) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('caja_turno_id', sql.Int, parseInt(cajaTurnoId))
            .execute('sp_ObtenerDesgloseMetodosTurno');
        return { success: true, datos: result.recordset || [] };
    } catch (err) {
        return { success: false, error: err.message };
    }
}