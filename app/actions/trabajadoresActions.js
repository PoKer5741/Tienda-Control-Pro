'use server'
import { poolPromise, sql } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { registrarLogAuditoria } from './auditoriaActions';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'clave_secreta_provisional_tienda_control');

export async function obtenerTrabajadores() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().execute('sp_ObtenerTrabajadoresCRUD');
        return { success: true, datos: result.recordset || [] };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function registrarTrabajador(nombre, correo, contrasena, rol, cedula) {
    try {
        const contrasenaHash = await bcrypt.hash(contrasena, 10);

        const pool = await poolPromise;
        await pool.request()
            .input('nombre', sql.VarChar(100), nombre)
            .input('correo', sql.VarChar(100), correo)
            .input('contrasena', sql.VarChar(255), contrasenaHash)
            .input('rol', sql.VarChar(50), rol)
            .input('cedula', sql.VarChar(20), cedula)
            .execute('sp_RegistrarTrabajador');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function actualizarTrabajador(id, nombre, correo, rol, cedula, contrasena) {
    try {
        const pool = await poolPromise;
        const request = pool.request()
            .input('id', sql.Int, parseInt(id))
            .input('nombre', sql.VarChar(100), nombre)
            .input('correo', sql.VarChar(100), correo)
            .input('rol', sql.VarChar(50), rol)
            .input('cedula', sql.VarChar(20), cedula);
            
        if (contrasena && contrasena.trim() !== '') {
            const contrasenaHash = await bcrypt.hash(contrasena, 10);
            request.input('contrasena', sql.VarChar(255), contrasenaHash);
        }

        await request.execute('sp_ActualizarTrabajador');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function alternarEstadoTrabajador(id) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, parseInt(id))
            .execute('sp_AlternarEstadoTrabajador');
            
        await registrarLogAuditoria('Recursos Humanos', 'MODIFICACIÓN ACCESO', `Se alternó el estado de suspensión del trabajador ID: ${id}`);
        
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

export async function validarAccesoAdministrador(correo, contrasena) {
    try {
        const pool = await poolPromise;
        
        const result = await pool.request()
            .input('correo', sql.VarChar(100), correo)
            .execute('sp_ObtenerAuthPorCorreo');
            
        const usuario = result.recordset[0];

        if (!usuario) {
            await registrarLogAuditoria('Seguridad', 'INTENTO FALLIDO', `Intento de acceso con correo inexistente: ${correo}`);
            return { success: false, error: 'Credenciales incorrectas o trabajador no encontrado.' };
        }

         
        if (usuario.bloqueado_hasta) {
            const tiempoBloqueo = new Date(usuario.bloqueado_hasta);
            const ahora = new Date();
            const ahoraUTC = new Date(ahora.getTime() + ahora.getTimezoneOffset() * 60000);
            
            if (ahoraUTC < tiempoBloqueo) {
                const minutosRestantes = Math.ceil((tiempoBloqueo - ahoraUTC) / 60000);
                return { success: false, error: `Cuenta bloqueada por múltiples intentos fallidos. Intente de nuevo en ${minutosRestantes} minutos.` };
            }
        }

        if (!usuario.activo) return { success: false, error: 'Acceso denegado: El perfil está suspendido.' };
        if (usuario.rol !== 'Administrador') return { success: false, error: 'Nivel de seguridad insuficiente. Solo Administradores.' };

        
        const esValida = (contrasena === usuario.contrasena) || (await bcrypt.compare(contrasena, usuario.contrasena));
        
        if (!esValida) {
            await pool.request().input('correo', sql.VarChar(100), correo).execute('sp_RegistrarIntentoFallido');
            await registrarLogAuditoria('Seguridad', 'CONTRASEÑA INVÁLIDA', `Contraseña incorrecta para el usuario: ${correo}`);
            
            const intentosRestantes = 4 - usuario.intentos_fallidos;
            if (intentosRestantes <= 0) {
                return { success: false, error: 'Se ha excedido el límite de intentos. Cuenta bloqueada por 15 minutos.' };
            }
            return { success: false, error: `Credenciales incorrectas. Le quedan ${intentosRestantes} intentos antes del bloqueo.` };
        }

        
        await pool.request().input('correo', sql.VarChar(100), correo).execute('sp_ResetearIntentosLogin');

        const token = await new SignJWT({ id: usuario.id, rol: usuario.rol, nombre: usuario.nombre })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('8h')
            .sign(SECRET_KEY);

        cookies().set('admin_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 8, 
            path: '/',
        });
            
        await registrarLogAuditoria('Seguridad', 'LOGIN', `El usuario ${usuario.nombre} inició sesión en la consola administrativa.`);
        return { success: true };
    } catch (err) {
        console.error('[SEGURIDAD] Error en autenticación:', err.message);
        return { success: false, error: err.message };
    }
}

export async function verificarSesionActiva() {
    try {
        const cookieStore = cookies();
        const token = cookieStore.get('admin_session')?.value;

        if (!token) return { autenticado: false };

        const { payload } = await jwtVerify(token, SECRET_KEY);
        return { autenticado: true, usuario: payload };
    } catch (error) {
        return { autenticado: false };
    }
}

export async function bloquearAccesoAdministrador() {
    try {
        cookies().delete('admin_session');
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}