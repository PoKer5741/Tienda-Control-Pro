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

export async function obtenerExoneracionesCliente(clienteId) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('cliente_id', sql.Int, parseInt(clienteId))
            .execute('sp_ObtenerExoneracionesCliente');
        return { success: true, datos: result.recordset || [] };
    } catch (err) {
        return { success: false, error: err.message };
    }
}


export async function guardarExoneracion(clienteId, exo) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('cliente_id', sql.Int, parseInt(clienteId))
            .input('tipo_documento', sql.VarChar(2), exo.tipo_documento)
            .input('numero_documento', sql.VarChar(50), exo.numero_documento)
            .input('porcentaje_exonerado', sql.Decimal(5, 2), parseFloat(exo.porcentaje_exonerado))
            .input('fecha_emision', sql.Date, exo.fecha_emision)
            .input('fecha_vencimiento', sql.Date, exo.fecha_vencimiento ? exo.fecha_vencimiento : null)
            .execute('sp_GuardarExoneracionCliente');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}