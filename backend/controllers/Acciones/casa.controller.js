const {publicarMQTT} = require('../../service/publicarMQTT.service');

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

const cambiarLuz = async(req, res) => {
    const userID = req.user.id; // Obtener el usuario autenticado desde el middleware de autenticación
    const { habitacion } = req.params;
    const { estado } = req.body;

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
        const query = `INSERT INTO historial_Luces (user_id, dispositivo, estado, dispositivo_id) VALUES ($1, $2, $3, $4)`;
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

module.exports = {
  cambiarLuz
};