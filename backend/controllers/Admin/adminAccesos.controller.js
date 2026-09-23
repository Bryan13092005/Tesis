const { pool } = require('../../config/supabase');
const { publicarMQTT } = require('../../service/publicarMQTT.service');

const topicAccesosCodigos = '/accesos/codigos';
const topicAccesosRFID = '/accesos/RFID';

const agregarAcceso = async (req, res) => {
    try {
        const { tipo, valor, usosPermitidos, nombreUsuario } = req.body;

        // 1. Validar que los campos obligatorios vengan en la petición
        if (!tipo || !valor || usosPermitidos === undefined || !nombreUsuario) {
            return res.status(400).json({
                success: false,
                error: 'Los campos tipo, valor, usosPermitidos y nombre de usuario son requeridos.'
            });
        }

        // 2. Validar que la regla de negocio de usosPermitidos sea correcta
        // Si no es null Y tampoco es mayor a 0, significa que es 0 o un número negativo.
        if (usosPermitidos !== null && usosPermitidos <= 0) {
            return res.status(400).json({
                success: false,
                error: 'El campo usosPermitidos debe ser null (ilimitado) o un número entero mayor a 0.'
            });
        }


        if (tipo !== 'rfid' && tipo !== 'pin') {
            return res.status(400).json({
                success: false,
                error: 'Tipo de acceso no válido. Debe ser "rfid" o "pin"'
            });
        }

        let valorFinal;

        switch (tipo) {
            case 'rfid':
                // Validación para RFID (exige los 8 dígitos hexadecimales seguidos)
                if (!/^[0-9A-Fa-f]{8}$/.test(valor)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Formato de RFID no válido. Debe ser un valor hexadecimal de 8 dígitos continuos (ej. 713FB027)'
                    });
                }

                // Formateamos de dos en dos y lo pasamos a mayúsculas
                valorFinal = valor.toUpperCase().match(/.{1,2}/g).join(' ');
                break;

            case 'pin':
                // Validación para PIN (exige al menos 4 dígitos numéricos continuos)
                // Esto ya garantiza que el valor sea puramente numérico (ej: "0000", "123456")
                if (!/^\d{4,}$/.test(valor)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Formato de PIN no válido. Debe contener al menos 4 dígitos numéricos continuos'
                    });
                }
                
                valorFinal = valor; // Mantenemos el PIN como String para no perder ceros a la izquierda
                break;
        }

        const query = `INSERT INTO credenciales (puerta_id, tipo, identificador, activo, "usosPermitidos","nombreUsuario") VALUES ($1, $2, $3, $4, $5,$6) RETURNING *`;
        
        const values = ['aee70eea-9efa-4d1f-9cbe-f94c62a51758', tipo, valorFinal, true, usosPermitidos,nombreUsuario];

        const resultado = await pool.query(query, values);

        if (resultado.rows.length === 0) {
            return res.status(500).json({
                success: false,
                error: 'No se pudo agregar el acceso'
            });
        }
        
        if(tipo==='rfid'){
            publicarMQTT(topicAccesosRFID,`AGREGAR|${valorFinal}`);
        }

        if(tipo==='pin'){
            publicarMQTT(topicAccesosCodigos,`AGREGAR|${valorFinal}`);
        }
        return res.status(201).json({
            success: true,
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error('Error al agregar acceso:', error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
}

const obtenerAccesos = async (req, res) => {
    try {
        //Se obtienen todos porque el admin podrá ver en su panel todos los accesos, sin importar si están activos o no.
        const resultado = await pool.query('SELECT * FROM credenciales');

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No se encontraron accesos disponibles'
            });
        }

        return res.status(200).json({
            success: true,
            data: resultado.rows
        });

    } catch (error) {
        console.error('Error al obtener accesos:', error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
}

const cambiarEstadoAcceso = async (req, res) => {
    try {
        const accesoId = req.params.id;
        const {tipo,activo} = req.body;

        if (!accesoId || !tipo || !(tipo==='pin' || tipo==='rfid')) {
            return res.status(400).json({
                success: false,
                error: 'El ID y tipo del acceso son requeridos'
            });
        }

        if (activo === undefined) {
            return res.status(400).json({
                success: false,
                error: 'El campo activo es requerido'
            });
        }

        if (typeof activo !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: 'El nuevo estado debe ser un valor booleano.'
            });
        }

        const query = `UPDATE credenciales SET activo = $1 WHERE id = $2 AND "usosPermitidos">0 RETURNING identificador`;
        const values = [activo, accesoId];

        const resultado = await pool.query(query, values);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Acceso no encontrado o sin Intentos'
            });
        }

        const valor=resultado.rows[0].identificador;

        if(activo && tipo==='pin'){
            publicarMQTT(topicAccesosCodigos,`DESBLOQUEAR|${valor}`);
        }if(activo && tipo==='rfid'){
            publicarMQTT(topicAccesosRFID,`DESBLOQUEAR|${valor}`);
        }

        if(!activo && tipo==='pin'){
            publicarMQTT(topicAccesosCodigos,`BLOQUEAR|${valor}`);
        }if(!activo && tipo==='rfid'){
            publicarMQTT(topicAccesosRFID,`BLOQUEAR|${valor}`);
        }

        return res.status(200).json({
            success: true,
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error('Error al cambiar estado del acceso:', error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
}

const eliminarAcceso = async (req, res) => {
    try {
        const accesoId = req.params.id;

        const query = `DELETE FROM credenciales WHERE id = $1 RETURNING tipo,identificador`;
        const values = [accesoId];

        const resultado = await pool.query(query, values);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Acceso no encontrado'
            });
        }

        const tipo=resultado.rows[0].tipo;
        const valor=resultado.rows[0].identificador;

        if(tipo==='pin'){
            publicarMQTT(topicAccesosCodigos,`ELIMINAR|${valor}`);
        }else{
            publicarMQTT(topicAccesosRFID,`ELIMINAR|${valor}`);
        }

        return res.status(200).json({
            success: true,
            message: 'Acceso eliminado exitosamente',
            data: resultado.rows[0]
        });

    } catch (error) {
        console.error('Error al eliminar acceso:', error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
}

const actualizarNumeroIntentos = async (req,res)=>{
    const id=req.params.id;
    const {numero}=req.body;

    if (!id || (numero !== null && numero <= 0)){
        return res.status(400).json({
            error:'El numero de intentos debe ser mayor que 0 o null'
        });
    }

    try{
        const query=`UPDATE credenciales SET "usosPermitidos"=$1, activo=TRUE WHERE id=$2 RETURNING identificador`;
        const valores=[numero,id];

        const respuesta=await pool.query(query,valores);

        if(respuesta.rows.length===0){
            return res.status(400).json({
                error:"NO SE ENCONTRO LA CREDENCIAL"
            });
        }

        const identificador=respuesta.rows[0].identificador;

        publicarMQTT(topicAccesosCodigos,`DESBLOQUEAR|${identificador}`);

        return res.status(200).json({
            status:"completado"
        });
    }catch(err){
        console.log(err);
        return res.status(500).json({error:"error interno del servidor"});
    }
}

//no se pueden actualizar accesos, solo se pueden agregar, eliminar y cambiar su estado (activo/inactivo). Por eso no hay un método de actualizar acceso.

module.exports = {
    agregarAcceso,
    obtenerAccesos,
    cambiarEstadoAcceso,
    eliminarAcceso,
    actualizarNumeroIntentos
}