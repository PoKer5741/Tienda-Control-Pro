'use server'
import { poolPromise, sql } from '@/lib/db';

export async function obtenerProductos() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().execute('sp_ObtenerProductos');
        return { success: true, datos: result.recordset };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function registrarNuevoProducto(codigo, nombre, categoriaId, costo, precio, cantidad, iva, minimo, maximo, fechaVencimiento, estadoComercial) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('codigo', sql.VarChar(50), codigo)
            .input('nombre', sql.VarChar(150), nombre)
            .input('categoria_id', sql.Int, parseInt(categoriaId))
            .input('costo', sql.Decimal(10, 2), parseFloat(costo))
            .input('precio', sql.Decimal(10, 2), parseFloat(precio))
            .input('cantidad', sql.Int, parseInt(cantidad))
            .input('porcentaje_iva', sql.Decimal(5, 2), parseFloat(iva))
            .input('stock_minimo', sql.Int, parseInt(minimo))
            .input('stock_maximo', sql.Int, parseInt(maximo))
            .input('fecha_vencimiento', sql.Date, fechaVencimiento ? new Date(fechaVencimiento) : null)
            .input('estado_comercial', sql.VarChar(20), estadoComercial || 'Activo')
            .execute('sp_RegistrarProducto');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function actualizarProducto(id, codigo, nombre, categoriaId, costo, precio, cantidad, iva, minimo, maximo, fechaVencimiento, estadoComercial) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, parseInt(id))
            .input('codigo', sql.VarChar(50), codigo)
            .input('nombre', sql.VarChar(150), nombre)
            .input('categoria_id', sql.Int, parseInt(categoriaId))
            .input('costo', sql.Decimal(10, 2), parseFloat(costo))
            .input('precio', sql.Decimal(10, 2), parseFloat(precio))
            .input('cantidad', sql.Int, parseInt(cantidad))
            .input('porcentaje_iva', sql.Decimal(5, 2), parseFloat(iva))
            .input('stock_minimo', sql.Int, parseInt(minimo))
            .input('stock_maximo', sql.Int, parseInt(maximo))
            .input('fecha_vencimiento', sql.Date, fechaVencimiento ? new Date(fechaVencimiento) : null)
            .input('estado_comercial', sql.VarChar(20), estadoComercial || 'Activo')
            .execute('sp_ActualizarProducto');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function eliminarProducto(id) {
    try {
        const pool = await poolPromise;
        // Solo para productos que NUNCA han sido facturados (si ya se facturó, SQL lanzará error por integridad referencial)
        await pool.request()
            .input('id', sql.Int, parseInt(id))
            .query('DELETE FROM Productos WHERE id = @id');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}