'use server'
import { poolPromise, sql } from '@/lib/db';

export async function obtenerCompras() {
    try {
        const pool = await poolPromise;
        // Llamada limpia sin consultas quemadas
        const result = await pool.request().execute('sp_ObtenerCompras');
        
        return { success: true, datos: result.recordset || [] };
    } catch (err) {
        console.error('[SERVER ACTION ERROR] Fallo al leer historial de compras:', err.message);
        return { success: false, error: err.message };
    }
}

export async function registrarNuevaCompra(proveedorId, codigo, nombre, categoriaId, cantidad, costoUnitario, precioVenta) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('proveedor_id', sql.Int, parseInt(proveedorId))
            .input('codigo', sql.VarChar(50), codigo)
            .input('nombre', sql.VarChar(150), nombre)
            .input('categoria_id', sql.Int, parseInt(categoriaId))
            .input('cantidad', sql.Int, parseInt(cantidad))
            .input('costo_unitario', sql.Decimal(10, 2), parseFloat(costoUnitario))
            .input('precio_venta', sql.Decimal(10, 2), parseFloat(precioVenta))
            .execute('sp_RegistrarCompra');
            
        return { success: true };
    } catch (err) {
        console.error('[SERVER ACTION ERROR] Fallo al asentar nueva compra:', err.message);
        return { success: false, error: err.message };
    }
}