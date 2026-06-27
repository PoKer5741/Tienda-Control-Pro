'use server'
import { poolPromise, sql } from '@/lib/db';

export async function obtenerCategorias() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().execute('sp_ObtenerCategorias');
        return { success: true, datos: result.recordset };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function registrarCategoria(nombre) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('nombre', sql.VarChar(50), nombre)
            .execute('sp_RegistrarCategoria');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function actualizarCategoria(id, nombre) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, parseInt(id))
            .input('nombre', sql.VarChar(50), nombre)
            .execute('sp_ActualizarCategoria');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function eliminarCategoria(id) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, parseInt(id))
            .execute('sp_EliminarCategoria');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function desvincularProductoDeCategoria(productoId) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('producto_id', sql.Int, parseInt(productoId))
            .execute('sp_DesvincularProductoCategoria');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function aplicarDescuentoCategoria(categoriaId, porcentaje) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('categoria_id', sql.Int, parseInt(categoriaId))
            .input('porcentaje_descuento', sql.Decimal(5, 2), parseFloat(porcentaje))
            .execute('sp_AplicarDescuentoCategoria');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}