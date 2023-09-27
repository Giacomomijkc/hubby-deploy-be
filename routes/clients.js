const mongoose = require('mongoose');
const express = require('express');
const bcrypt = require('bcrypt');
const cloudinary = require ('cloudinary').v2;
const {CloudinaryStorage} = require('multer-storage-cloudinary');
const multer = require('multer');
const verifyToken = require('../middlewares/verifyToken');

const ClientsModel = require('../models/ClientModel');

const client = express.Router();

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

const cloudStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'capstone',
        format: async (req, file) => {
            if (file.mimetype === 'image/jpeg') {
                return 'jpg';
            } else if (file.mimetype === 'image/png') {
                return 'png';
            } else {
                return 'jpg'; // Default format if not JPG or PNG
            }
        },
        public_id: (req, file) => file.name,
    },
})

const cloudUpload = multer({storage: cloudStorage});

//client post avatar
client.post('/clients/cloudUpload', cloudUpload.single('avatar'), async (req,res)=> {
    try {
        res.status(200).json({avatar: req.file.path})
    } catch (error) {
        console.error('File upload failed',error);
        res.status(500).json({error: 'File upload failed'});
    }
})

//client patch avatar
client.patch('/clients/:clientId/cloudUpdateImg', cloudUpload.single('avatar'), async (req, res) => {
    const { clientId } = req.params;

    try {
        const updatedAvatarUrl = req.file.path; 
        const dataToUpdate = { avatar: updatedAvatarUrl };
        const options = {new: true}
        const result = await ClientsModel.findByIdAndUpdate(clientId, dataToUpdate, options);

        res.status(200).json({ 
            result,
            statusCode: 202,
            message: `Post with id ${clientId} successfully updated`,
        });
            result
    } catch (error) {
        console.error('File update failed', error);
        res.status(500).json({ error: 'File update failed' });
    }
});

//client creation
client.post('/clients/create', async (req, res) =>{

    const { email } = req.body;

    try {

        const existingEmail = await ClientsModel.findOne({ email });

        if (existingEmail) {
            return res.status(400).json({
                statusCode: 400,
                message: `${email} already exists in database, try to login o use another email`,
            });
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        const newClient = new ClientsModel({
            name: req.body.name,
            surname: req.body.surname,
            company: req.body.company,
            description: req.body.description,
            website: req.body.website,
            avatar: req.body.avatar,
            address: req.body.address,
            vatOrCf: req.body.vatOrCf,
            email: req.body.email,
            password: hashedPassword,
        })

        const client = await newClient.save();

        res.status(201).send({
            statusCode: 201,
            message: 'Account as Client successfully created',
            payload: client
        })
    } catch (error) {
        res.status(500).send({
            statusCode: 500,
            message:'Internal server Error ',
            error
        });
    }
});


//client single get
client.get('/clients/:clientId', async (req, res) => {
    const { clientId } = req.params;
    
    try {
        const client = await ClientsModel.findById(clientId);
        if (!client) {
            return res.status(404).json({ message: `Client with id ${clientId} not found` });
        }
        res.status(200).json({
            statusCode: 200,
            message: `Client with id ${clientId} fetched successfully`,
            client
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Internal server error',
            error
        });
    }
});

//liked project client
client.get('/clients/:clientId/liked_projects', verifyToken, async (req, res) => {
    try {
        const { clientId } = req.params;
    
        const client = await ClientsModel.findById(clientId);
    
        if (!client) {
          return res.status(404).json({ message: `Client with id ${clientId} not found` });
        }
    
        const likedProjects = client.liked_projects;
    
        res.status(200).json({ 
            statusCode: 200,
            message: `Projects liked by Client with id ${clientId} fetched successfully`,
            likedProjects 
        });
      } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Internal server error',
            error
        });
      }
})

//all client get
client.get('/clients', async (req, res) => {
    try {
        const clients = await ClientsModel.find();
        res.status(200).json({
            statusCode: 200,
            message: 'All clients fetched successfully',
            clients
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Internal server error',
            error
        });
    }
});

//client patch
client.patch('/clients/:clientId/update', verifyToken, async (req, res) => {
    const { clientId } = req.params;

    if (req.user.role !== 'Client') {
        return res.status(403).json({ message: 'Only clients can update their own profile' });
    }

    const reqUserIdToString = req.user._id.toString();
    const clientIdToString = clientId.toString()
    if (reqUserIdToString !== clientIdToString) {
        return res.status(403).json({ message: 'You can only update your own profile' });
    }

    try {
        const client = await ClientsModel.findById(clientId);
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }

        const id = clientId;
        const dataToUpdate = req.body;
        const options = {new: true}

        const result = await ClientsModel.findByIdAndUpdate(id, dataToUpdate, options);

        res.status(200).json({
            statusCode: 200,
            message: `Client with id ${id} information updated successfully`,
            result
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Internal server error',
            error
        });
    }
});

//per il momento consentiamo solo ai designer di eliminare il proprio profilo

module.exports = client;