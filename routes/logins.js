const express = require('express');
const login = express.Router();
const bcrypt = require('bcrypt');
const ClientsModel = require('../models/ClientModel');
const DesignersModel = require('../models/DesignerModel');
const jwt = require('jsonwebtoken');

login.post('/login', async (req, res) =>{
    const { email, password } = req.body;

    const designer = await DesignersModel.findOne({ email });
    if (designer) {
        const validPassword = await bcrypt.compare(password, designer.password);
        if (validPassword) {
            const token = jwt.sign({
                _id: designer._id,
                role: 'Designer'
            }, process.env.JWT_SECRET, { expiresIn: '24h' });

            return res.header('Authorization', token).status(200).send({
                statusCode: 200,
                message:'Login successfully executed',
                token
            });
        }
    } 

    const client = await ClientsModel.findOne({ email });
    if (client) {
        const validPassword = await bcrypt.compare(password, client.password);
        if (validPassword) {
            const token = jwt.sign({
                _id: client._id,
                role: 'Client'
            }, process.env.JWT_SECRET, { expiresIn: '24h' });

            return res.header('Authorization', token).status(200).send({
                statusCode: 200,
                message:'Login successfully executed',
                token
            });
        }
    }

    return res.status(404).send({
        statusCode: 404,
        message: 'Email or password not valid'
    });
});



module.exports = login;