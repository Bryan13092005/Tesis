const {publicarMQTT} = require('../../service/publicarMQTT.service');
const { pool } = require('../../config/supabase');
const client =require('../../config/mqttClient');

const topics = {
    baño: 'casa/luz/baño',
    dormitorio: 'casa/luz/dormitorio',
    sala: 'casa/luz/sala',
    cocina: 'casa/luz/cocina',
    pasillo: 'casa/luz/pasillo'
};

const ids = {
    baño: '79ded62b-55b0-4d69-a435-de6951db09ea',
    dormitorio: '1657eadf-bb4b-48b4-8593-468cea08ccdd',
    sala: 'adaceb18-dc63-4d5f-936b-3433d90563d1',
    cocina: 'a68f2d16-aa6c-48a2-8e6e-7bacf2b9383a',
    pasillo: '34e68874-95f5-4aff-ac96-125cec25a4c3'
};

const topicoComandoGarage = "casa/garaje/comando";
const topicEstadoGarage='casa/garaje/estado';

const topicoEstadoPuerta = "casa/puerta/estado";
const topicoComandoPuerta = "casa/puerta/comando";
const topicoSeguridad = "casa/seguridad";

const cambiarLuz = async(req, res) => {
    const userID = req.user.id; // Obtener el usuario autenticado desde el middleware de autenticación
    const { estado,habitacion } = req.body;

    if (!(habitacion in topics) || !(habitacion in ids)) {
        return res.status(400).json({
        success: false,
        error: 'Habitación no válida'
        });
    }

    if (typeof estado !== 'boolean') {
        return res.status(400).json({
        success: false,
        error: 'El estado debe ser true o false'
        });
    }

    const mensaje = estado ? 'ON' : 'OFF';

    publicarMQTT(topics[habitacion], mensaje);

    try {
        const query = `INSERT INTO "historial_Luces" (user_id, dispositivo, estado, dispositivo_id) VALUES ($1, $2, $3, $4)`;
        const values = [userID, habitacion, estado, ids[habitacion]];
        await pool.query(query, values);
    } catch (error) {
        console.error('Error al insertar en el historial de luces:', error);
    }
    res.status(200).json({
        success: true,
        habitacion,
        estado
    });
}

async function guardarHistorial(id,puerta) {
    try{
        const query='INSERT INTO historial_ingresos(id_usuario,forma_ingreso,puerta) VALUES($1,$2,$3) RETURNING *';
        const valores=[id,'sistema_web',puerta];

        const respuesta=await pool.query(query,valores);

        if(respuesta.rows.length===0){
            return false;
        }

        return true;
    }catch(err){
        console.log(err);
    }
}

const abrirCerrarGarageAutomatico= async(req,res)=>{ //PERMISO: garage
    const id = req.user.id;
    
    publicarMQTT(topicoComandoGarage,'ABRIR_GARAJE');
    
    client.subscribe(topicEstadoGarage, (error) => {

        if (error) {
            console.error('Error al suscribirse al topic:', error);
        } else {
            console.log(`Suscrito al topic: ${topicEstadoGarage}`);
        }

    });

    client.on('message', async (receivedTopic, message) => {

        if (receivedTopic !== topicEstadoGarage) {
            return;
        }

        const estado = message.toString();

        if(estado==='ABIERTO'){ 
            guardarHistorial(id,'GARAGE')? res.status(200).json({status:true,mensaje:'ABIERTO'}) : res.status(400).json({status:false,mensaje:'ERROR AL GUARDAR EL HISTORIAL'})
        }
    });

}

const enviarUltimoDatoSensores= async(req,res)=>{//PERMISO: sensores
    try{
        const query='SELECT * FROM "valorActual_sensores" ORDER BY fecha_hora DESC NULLS LAST LIMIT 1';

        const respuesta=await pool.query(query);

        if (respuesta.rows.length === 0) {
            return res.status(503).json({
                success: false,
                online: false,
                error: 'Sin registros previos'
            });
        }

        const lectura = respuesta.rows[0];
        const fechaLectura = lectura.fecha_hora ? new Date(lectura.fecha_hora) : null;
        const edadLectura = fechaLectura ? Date.now() - fechaLectura.getTime() : Infinity;
        const tieneValorNumerico = [
            lectura.temperatura,
            lectura.humedad,
            lectura.gas,
            lectura.humedad_planta
        ].some((valor) => valor !== null && valor !== undefined && valor !== '' && Number.isFinite(Number(valor)));
        const tieneEstadoGas = ['NORMAL', 'ALERTA'].includes(lectura.estado_gas);
        const fechaValida = fechaLectura && !Number.isNaN(fechaLectura.getTime());
        const online = Boolean(fechaValida && edadLectura >= 0 && edadLectura <= 120000 && (tieneValorNumerico || tieneEstadoGas));

        const respuestaSensores = {
            success: online,
            online,
            ultimaLectura: fechaValida ? fechaLectura.toISOString() : null,
            temAmbiente: lectura.temperatura,
            humAmbiente: lectura.humedad,
            humPlanta: lectura.humedad_planta,
            gas: lectura.gas,
            gasEstado: lectura.estado_gas
        };

        if (!online) {
            return res.status(503).json({
                ...respuestaSensores,
                error: 'No hay datos recientes de sensores'
            });
        }

        return res.status(200).json(respuestaSensores);

    }catch(err){
        console.log(err);
        return res.status(500).json({
            success: false,
            online: false,
            mensaje: 'error del servidor'}
        );
    }
}

const controlPuertaPrincipal=async(req,res)=>{//PERMISO: puertaPrincipal
    const id=req.user.id;
    const {accion}=req.body;

    accion==='ABRIR'?publicarMQTT(topicoComandoPuerta,'ABRIR_PUERTA'):res.status(400).json({mensaje: 'comando incorrecto'});

    client.subscribe(topicoEstadoPuerta, (error) => {

        if (error) {
            console.error('Error al suscribirse al topic:', error);
        } else {
            console.log(`Suscrito al topic: ${topicoEstadoPuerta}`);
        }

    });

    client.on('message', async (receivedTopic, message) => {

        if (receivedTopic !== topicoEstadoPuerta) {
            return;
        }

        const estado = message.toString();

        if(estado==='ABIERTO'){ 
            guardarHistorial(id,'PRINCIPAL')? res.status(200).json({status:true,mensaje:'ABIERTO'}) : res.status(400).json({status:false,mensaje:'ERROR AL GUARDAR EL HISTORIAL'})
        }
    });
}

const modoSeguro=async (req,res)=>{//PERMISO: activarBloqueo
    const id=req.user.id;
    const{accion}=req.body;

    if(accion !== 'ON' && accion !== 'OFF'){
        return res.status(422).json({
            success:false,
            mensaje:'ESTADO DESCONOCIDO'
        });
    }

    accion==='ON'?publicarMQTT(topicoSeguridad,'BLOQUEADO'):publicarMQTT(topicoSeguridad,'DESBLOQUEADO');

    try{
        const query=`INSERT INTO historial_acciones(usuario_id,accion,resultado) values($1,$2,$3) RETURNING 1`;
        const valores=[id,accion,accion==='ON'?'BLOQUEADO':'DESBLOQUEADO'];

        const respuesta=await pool.query(query,valores);

        if(respuesta.rows.length===0){
            console.log('sin resultado');
            return res.status(400).json({
                success:false,
                mensaje:'Sin resultados de BD'
            });
        }

        return res.status(200).json({
            success:true,
            mensaje:respuesta.rows[0]
        });
    }catch(err){
        console.log(err);
        return res.status(500).json({
            success:false,
            mensaje:'error del servidor'
        });
    }
}

module.exports = {
  cambiarLuz,
  abrirCerrarGarageAutomatico,
  enviarUltimoDatoSensores,
  controlPuertaPrincipal,
  modoSeguro
};