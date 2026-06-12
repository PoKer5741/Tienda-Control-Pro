'use server'
import { poolPromise, sql } from '@/lib/db';

export async function obtenerClientes() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().execute('sp_ObtenerClientes');
        return { success: true, datos: result.recordset };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function registrarCliente(nombre, cedula, correo, telefono) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('nombre', sql.VarChar(100), nombre)
            .input('cedula', sql.VarChar(50), cedula || '')
            .input('correo', sql.VarChar(100), correo || '')
            .input('telefono', sql.VarChar(20), telefono || '')
            .execute('sp_RegistrarCliente');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function actualizarCliente(id, nombre, cedula, correo, telefono) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, parseInt(id))
            .input('nombre', sql.VarChar(100), nombre)
            .input('cedula', sql.VarChar(50), cedula || '')
            .input('correo', sql.VarChar(100), correo || '')
            .input('telefono', sql.VarChar(20), telefono || '')
            .execute('sp_ActualizarCliente');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}