'use server'
import { poolPromise, sql } from '@/lib/db';
 
import { verificarSesionActiva } from './trabajadoresActions'; 

export async function verificarCajaAbierta() {
    try {
        const pool = await poolPromise;
        
        const result = await pool.request().execute('sp_VerificarCajaAbierta');
        return { success: true, datos: result.recordset[0] || null };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function abrirCajaTransaccional(fondoInicial) {
    try {
        const sesion = await verificarSesionActiva();
        const responsable = sesion?.autenticado ? sesion.usuario.nombre : 'Operador POS';

        const pool = await poolPromise;
        const result = await pool.request()
            .input('fondo_inicial', sql.Decimal(10, 2), parseFloat(fondoInicial))
            .input('abierta_por', sql.VarChar(100), responsable)
            .execute('sp_AbrirCaja');  
            
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function cerrarCajaTransaccional(cajaId, montoFisicoReal) {
    try {
        const sesion = await verificarSesionActiva();
        const responsable = sesion?.autenticado ? sesion.usuario.nombre : 'Operador POS';

        const pool = await poolPromise;
        await pool.request()
            .input('caja_id', sql.Int, parseInt(cajaId))
            .input('monto_final_real', sql.Decimal(10, 2), parseFloat(montoFisicoReal))
            .input('cerrada_por', sql.VarChar(100), responsable)
            .execute('sp_CerrarCaja'); // Asegúrate de tener este SP o cámbialo por un UPDATE
            
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

export async function obtenerDesgloseMetodosTurno(cajaId) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('caja_id', sql.Int, parseInt(cajaId))
            .execute('sp_ObtenerDesgloseMetodosTurno');
            
        return { success: true, datos: result.recordset || [] };
    } catch (err) {
        return { success: false, error: err.message };
    }
}