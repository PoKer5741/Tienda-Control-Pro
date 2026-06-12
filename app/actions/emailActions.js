'use server'
import nodemailer from 'nodemailer';

export async function enviarFacturaCorreo(correoDestino, clienteNombre, tipoDocumento, numeroFactura, carrito, totalNeto, totalImpuesto, totalFinal) {
    if (!correoDestino || correoDestino === '' || correoDestino === 'sin@correo.com') {
        return { success: false, mensaje: 'No hay correo destino.' };
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

       // CORREO No toquen 
        const filasArticulos = carrito.map(item => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #2d3748; color: #a0aec0; font-family: monospace;">${item.codigo}</td>
                <td style="padding: 10px; border-bottom: 1px solid #2d3748; color: #e2e8f0;">${item.cantidad}x ${item.nombre}</td>
                <td style="padding: 10px; border-bottom: 1px solid #2d3748; text-align: right; color: #e2e8f0;">C ${(item.precio * item.cantidad).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
        `).join('');

       
        const htmlTemplate = `
        <div style="font-family: Arial, sans-serif; background-color: #0B0E14; color: #F1F5F9; padding: 40px 20px; max-width: 600px; margin: 0 auto; border-radius: 8px;">
            <div style="text-align: center; border-bottom: 2px solid #3B82F6; padding-bottom: 20px; margin-bottom: 20px;">
                <h1 style="color: #F1F5F9; margin: 0;">Tienda Control</h1>
                <p style="color: #94A3B8; margin: 5px 0 0 0;">Comprobante Electrónico</p>
            </div>
            
            <div style="margin-bottom: 30px;">
                <h2 style="color: #3B82F6; margin-bottom: 5px;">${tipoDocumento.toUpperCase()} N° FAC-${numeroFactura.toString().padStart(5, '0')}</h2>
                <p style="margin: 0; color: #94A3B8;">Cliente: <strong style="color: #F1F5F9;">${clienteNombre}</strong></p>
                <p style="margin: 5px 0 0 0; color: #94A3B8;">Fecha: ${new Date().toLocaleString()}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px;">
                <thead>
                    <tr>
                        <th style="text-align: left; padding: 10px; border-bottom: 2px solid #4a5568; color: #94A3B8;">CÓDIGO</th>
                        <th style="text-align: left; padding: 10px; border-bottom: 2px solid #4a5568; color: #94A3B8;">DESCRIPCIÓN</th>
                        <th style="text-align: right; padding: 10px; border-bottom: 2px solid #4a5568; color: #94A3B8;">SUBTOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasArticulos}
                </tbody>
            </table>

            <div style="text-align: right; margin-bottom: 40px;">
                <p style="margin: 5px 0; color: #94A3B8;">Subtotal Neto: <span style="color: #F1F5F9; display: inline-block; width: 100px;">C ${totalNeto.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></p>
                <p style="margin: 5px 0; color: #94A3B8;">Impuestos: <span style="color: #F1F5F9; display: inline-block; width: 100px;">C ${totalImpuesto.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></p>
                <h3 style="margin: 15px 0 0 0; color: #10B981; font-size: 20px;">TOTAL: C ${totalFinal.toLocaleString(undefined, {minimumFractionDigits: 2})}</h3>
            </div>

            <div style="text-align: center; color: #718096; font-size: 12px; border-top: 1px solid #2d3748; padding-top: 20px;">
                <p>Este documento es una representación impresa de un comprobante electrónico.</p>
                <p>Gracias por su preferencia.</p>
            </div>
        </div>
        `;

        await transporter.sendMail({
            from: `"Tienda Control Pro" <${process.env.EMAIL_USER}>`,
            to: correoDestino,
            subject: `${tipoDocumento} N° FAC-${numeroFactura.toString().padStart(5, '0')} - Tienda Control Pro`,
            html: htmlTemplate
        });

        return { success: true };
    } catch (error) {
        console.error('[EMAIL ERROR]:', error);
        return { success: false, error: error.message };
    }
}