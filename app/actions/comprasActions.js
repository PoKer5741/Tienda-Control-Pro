'use server'
import { poolPromise, sql } from '@/lib/db';
import nodemailer from 'nodemailer';

// Configuración segura del Servidor de Correos usando variables de entorno
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export async function obtenerCompras() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().execute('sp_ObtenerCompras');
        return { success: true, datos: result.recordset || [] };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function registrarCompraConFirma(proveedorId, codigo, nombre, categoriaId, cantidad, costoUnitario, precioVenta, cedulaEmpleado, contrasenaEmpleado) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('proveedor_id', sql.Int, parseInt(proveedorId))
            .input('codigo', sql.VarChar(50), codigo)
            .input('nombre', sql.VarChar(150), nombre)
            .input('categoria_id', sql.Int, parseInt(categoriaId))
            .input('cantidad', sql.Int, parseInt(cantidad))
            .input('costo_unitario', sql.Decimal(10, 2), parseFloat(costoUnitario))
            .input('precio_venta', sql.Decimal(10, 2), parseFloat(precioVenta))
            .input('cedula_empleado', sql.VarChar(20), cedulaEmpleado)
            .input('contrasena_empleado', sql.VarChar(255), contrasenaEmpleado)
            .execute('sp_RegistrarCompraConFirma');
            
        
        const nombreAutorizado = result.recordset[0].nombre_autorizado;
        const totalInvertido = (parseInt(cantidad) * parseFloat(costoUnitario)).toLocaleString(undefined, {minimumFractionDigits: 2});
        const costoUnitarioFormateado = parseFloat(costoUnitario).toLocaleString(undefined, {minimumFractionDigits: 2});

     //correo
        const htmlTemplate = `
        <div style="font-family: Arial, sans-serif; background-color: #0B0E14; color: #F1F5F9; padding: 40px 20px; max-width: 600px; margin: 0 auto; border-radius: 8px;">
            <div style="text-align: center; border-bottom: 2px solid #EF4444; padding-bottom: 20px; margin-bottom: 20px;">
                <h1 style="color: #F1F5F9; margin: 0;">Tienda Control Pro</h1>
                <p style="color: #94A3B8; margin: 5px 0 0 0;">Alerta de Auditoría Logística</p>
            </div>
            
            <div style="margin-bottom: 30px;">
                <h2 style="color: #EF4444; margin-bottom: 5px;">NUEVO ABASTECIMIENTO ASENTADO</h2>
                <p style="margin: 0; color: #94A3B8;">Firma Verificada: <strong style="color: #10B981;">${nombreAutorizado}</strong> (CI: ${cedulaEmpleado})</p>
                <p style="margin: 5px 0 0 0; color: #94A3B8;">Fecha: ${new Date().toLocaleString('es-CR')}</p>
            </div>

            <div style="background-color: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                <h3 style="color: #3B82F6; margin-top: 0; margin-bottom: 15px;">Detalle del Lote Ingresado</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tbody>
                        <tr>
                            <td style="padding: 8px 0; color: #94A3B8; border-bottom: 1px solid #2d3748;">Código/SKU:</td>
                            <td style="padding: 8px 0; color: #E2E8F0; border-bottom: 1px solid #2d3748; font-family: monospace; text-align: right;">${codigo}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #94A3B8; border-bottom: 1px solid #2d3748;">Artículo:</td>
                            <td style="padding: 8px 0; color: #E2E8F0; border-bottom: 1px solid #2d3748; text-align: right; font-weight: bold;">${nombre}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #94A3B8; border-bottom: 1px solid #2d3748;">Volumen:</td>
                            <td style="padding: 8px 0; color: #E2E8F0; border-bottom: 1px solid #2d3748; text-align: right;">${cantidad} unidades</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #94A3B8;">Costo Unitario:</td>
                            <td style="padding: 8px 0; color: #E2E8F0; text-align: right;">₡${costoUnitarioFormateado}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div style="text-align: right; border-top: 1px dashed #4A5568; padding-top: 20px;">
                <p style="margin: 5px 0; color: #94A3B8;">Impacto Financiero del Lote:</p>
                <h3 style="margin: 5px 0 0 0; color: #EF4444; font-size: 24px;">₡${totalInvertido}</h3>
            </div>

            <div style="text-align: center; color: #718096; font-size: 11px; border-top: 1px solid #2d3748; padding-top: 20px; margin-top: 30px;">
                <p>Este documento es generado automáticamente tras la validación de una Firma Electrónica en el sistema.</p>
            </div>
        </div>
        `;

        const mailOptions = {
            from: `"Tienda Control Pro" <${process.env.EMAIL_USER}>`,
            to: 'pokeranimu@gmail.com',
            subject: ` ALERTA GERENCIAL: Abastecimiento por ₡${totalInvertido}`,
            html: htmlTemplate
        };

        // Enviar correo sin bloquear el hilo principal
        transporter.sendMail(mailOptions).catch(console.error);

        return { success: true };
    } catch (err) {
        console.error('[AUTH ERROR] Fallo al procesar compra con firma:', err.message);
        return { success: false, error: err.message };
    }
}