const mongoose = require('mongoose');
const express = require('express');
const bcrypt = require('bcrypt');
const cloudinary = require ('cloudinary').v2;
const {CloudinaryStorage} = require('multer-storage-cloudinary');
const multer = require('multer');
const verifyToken = require('../middlewares/verifyToken');
const {designersBodyParams, validatePostDesigner} = require('../middlewares/designerPostValidations')

const DesignersModel = require('../models/DesignerModel');
const ProjectsModel = require('../models/ProjectModel');
const DealsModel = require('../models/DealModel');
const InvoicesModel = require('../models/InvoiceModel');
const CommentModel = require('../models/CommentModel');

const designer = express.Router();

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

//designer post avatar
designer.post('/designers/cloudUpload', cloudUpload.single('avatar'), async (req,res)=> {
    try {
        res.status(200).json({avatar: req.file.path})
        console.log(req.file.path)
    } catch (error) {
        console.error('File upload failed',error);
        res.status(500).json({error: 'File upload failed'});
    }
})

//designer patch avatar
designer.patch('/designers/:designerId/cloudUpdateImg', cloudUpload.single('avatar'), async (req, res) => {
    const { designerId } = req.params;

    try {
        const updatedAvatarUrl = req.file.path; 
        const dataToUpdate = { avatar: updatedAvatarUrl };
        const options = {new: true}
        const result = await DesignersModel.findByIdAndUpdate(designerId, dataToUpdate, options);

        res.status(200).json({ 
            result,
            statusCode: 202,
            message: `Post with id ${designerId} successfully updated`,
        });
            result
    } catch (error) {
        console.error('File update failed', error);
        res.status(500).json({ error: 'File update failed' });
    }
});


//designer creation
designer.post('/designers/create', validatePostDesigner, async (req, res) =>{

    const { nickname } = req.body;
    const {email} = req.body;

    try {

        const existingDesigner = await DesignersModel.findOne({ nickname });

        if (existingDesigner) {
            return res.status(400).json({
                statusCode: 400,
                message: `${nickname} already exists!`,
            });
        }

        const existingEmail = await DesignersModel.findOne({email});

        if (existingEmail) {
            return res.status(400).json({
                statusCode: 400,
                message:`${email} already exists!`
            })
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        const newDesigner = new DesignersModel({
            name: req.body.name,
            surname: req.body.surname,
            nickname: req.body.nickname,
            description: req.body.description,
            tags: req.body.tags,
            website: req.body.website,
            instagram: req.body.instagram,
            avatar: req.body.avatar,
            address: req.body.address,
            vatOrCf: req.body.vatOrCf,
            email: req.body.email,
            password: hashedPassword,
        })

        const designer = await newDesigner.save();

        res.status(201).send({
            statusCode: 201,
            message: 'Account as designer successfully created',
            payload: designer
        })
    } catch (error) {
        console.log(error);
        res.status(500).send({
            statusCode: 500,
            message:'Internal server Error ',
            error
        });
    }
})

//designer single get
designer.get('/designers/:designerId', async (req, res) => {
    const { designerId } = req.params;
    
    try {
        const designer = await DesignersModel.findById(designerId);
        if (!designer) {
            return res.status(404).json({ message: `Designer with id ${designerId} not found` });
        }
        res.status(200).json({
            statusCode: 200,
            message: `Designer with id ${designerId} fetched successfully`,
            designer
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Internal server error',
            error
        });
    }
});

//liked project designer
designer.get('/designers/:designerId/liked_projects', verifyToken, async (req, res) => {
    try {
        const { designerId } = req.params;
    
        const designer = await DesignersModel.findById(designerId);
    
        if (!designer) {
          return res.status(404).json({ message: `Designer with id ${designerId} not found` });
        }
    
        const likedProjects = designer.liked_projects;
    
        res.status(200).json({ 
            statusCode: 200,
            message: `Projects liked by Designer with id ${designerId} fetched successfully`,
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


//all designer get
designer.get('/designers', async (req, res) => {
    try {
        const designers = await DesignersModel.find();
        res.status(200).json({
            statusCode: 200,
            message: 'All designers fetched successfully',
            designers
        });
    } catch (error) {
        res.status(500).json({
            statusCode: 500,
            message: 'Internal server error',
            error
        });
    }
});

//designer patch
designer.patch('/designers/:designerId/update', verifyToken, async (req, res) => {
    const { designerId } = req.params;

    if (req.user.role !== 'Designer') {
        return res.status(403).json({ message: 'Only designers can update their own profile' });
    }

    const reqUserIdToString = req.user._id.toString();
    const designerIdToString = designerId.toString();
    if (reqUserIdToString !== designerIdToString) {
        return res.status(403).json({ message: 'You can only update your own profile' });
    }

    try {
        const designer = await DesignersModel.findById(designerId);
        if (!designer) {
            return res.status(404).json({ message: 'Designer not found' });
        }

        if (req.body.nickname && req.body.nickname !== designer.nickname) {
            const existingDesignerWithNickname = await DesignersModel.findOne({ nickname: req.body.nickname });
            if (existingDesignerWithNickname) {
                return res.status(400).json({
                    message: `${nickname} already exists. Please choose a different nickname.`,
                });
            }
        }

        const id = designerId;
        const dataToUpdate = req.body;
        const options = {new: true}

        const result = await DesignersModel.findByIdAndUpdate(id, dataToUpdate, options);

        res.status(200).json({
            statusCode: 200,
            message: `Designer with id ${id} information updated successfully`,
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

//eliminazione designer (valutare impatto eliminazione invoices anche lato client)
designer.delete('/designers/:designerId', verifyToken, async (req, res) => {
    const { designerId } = req.params;

    if (req.user.role !== 'Designer') {
        return res.status(403).json({ message: 'Only designers can delete their own profile' });
    }

    const reqUserIdToString = req.user._id.toString();
    const designerIdToString = designerId.toString();
    if (reqUserIdToString !== designerIdToString) {
        return res.status(403).json({ message: 'You can only delete your own profile' });
    }

    try {
        const designer = await DesignersModel.findById(designerId);
        if (!designer) {
            return res.status(404).json({ message: 'Designer not found' });
        }

        await ProjectsModel.deleteMany({ author: designerId });
        await DealsModel.deleteMany({ designer: designerId });
        await InvoicesModel.deleteMany({ designer: designerId });
        
        for (const likedProject of designer.liked_projects) {
            const project = await ProjectsModel.findById(likedProject.project_id);
            if (project) {
                project.likes = project.likes.filter(like => !like.author_id.equals(designerId));
                await project.save();
            }
        }
        
        await CommentModel.deleteMany({ author: designerId, authorType: 'Designer' });

        await DesignersModel.findByIdAndDelete(designerId);

        res.status(200).json({
            statusCode: 200,
            message: `Designer with id ${designerId} and associated data deleted successfully`,
        });
    } catch (error) {
        console.log(error),
        res.status(500).json({
            statusCode: 500,
            message: 'Internal server error',
            error
        });
    }
});

module.exports = designer;