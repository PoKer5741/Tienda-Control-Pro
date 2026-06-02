// lib/db.js
import sql from 'mssql/msnodesqlv8';

const config = {
    connectionString: 'Driver={ODBC Driver 17 for SQL Server};Server=POKER;Database=mi-tienda;Trusted_Connection=yes;',
    options: {
        trustServerCertificate: true
    },
    connectionTimeout: 60000,
    requestTimeout: 0,
    pool: {
        max: 20,
        min: 5,
        idleTimeoutMillis: 30000
    }
};

let poolPromise;

if (!global.poolPromise) {
    global.poolPromise = new sql.ConnectionPool(config)
        .connect()
        .then(pool => {
            console.log('[DB] Conectado exitosamente a SQL Server.');
            return pool;
        })
        .catch(err => {
            console.error('[ERROR DB] Fallo critico en la conexion de la instancia:', err.message);
            throw err;
        });
}

poolPromise = global.poolPromise;

export { sql, poolPromise };