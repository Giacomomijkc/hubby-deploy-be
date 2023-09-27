const mongoose = require('mongoose');
const express = require('express');
const verifyToken = require('../middlewares/verifyToken');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');


const ProjectsModel = require('../models/ProjectModel');
const DesignersModel = require('../models/DesignerModel');
const ClientsModel = require('../models/ClientModel');
const CommentsModel = require('../models/CommentModel');

const project = express.Router();

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
        public_id: (req, file) => file.name
    }
});

const cloudUpload = multer({ storage: cloudStorage });

//project post cover
project.post('/projects/cover/upload', cloudUpload.single('cover'), async (req, res) => {
    try {
        res.status(200).json({ cover: req.file.path });
    } catch (error) {
        console.error('File upload failed', error);
        res.status(500).json({ error: 'File upload failed' });
    }
});

//project patch cover
project.patch('/projects/:projectId/cover/update', cloudUpload.single('cover'), async (req, res) => {
    const { projectId } = req.params;

    try {
        const updatedCoverUrl = req.file.path;
        const dataToUpdate = { cover: updatedCoverUrl };
        const options = { new: true };
        const result = await ProjectsModel.findByIdAndUpdate(projectId, dataToUpdate, options);

        res.status(200).json({
            result,
            statusCode: 202,
            message: `Project cover with id ${projectId} successfully updated`
        });
    } catch (error) {
        console.error('File update failed', error);
        res.status(500).json({ error: 'File update failed' });
    }
});

//project post images
project.post('/projects/images/upload', cloudUpload.array('images', 5), async (req, res) => {
    try {
        const imageUrls = req.files.map(file => file.path);
        res.status(200).json({ images: imageUrls });
    } catch (error) {
        console.error('File upload failed', error);
        res.status(500).json({ error: 'File upload failed' });
    }
});

//project patch images
project.patch('/projects/:projectId/images/update', cloudUpload.array('images', 5), async (req, res) => {
    const { projectId } = req.params;

    try {
        if (!req.files) {
            throw new Error('No files were uploaded');
        }
        const updatedImageUrls = req.files.map(file => file.path);
        const dataToUpdate = { images: updatedImageUrls };
        const options = { new: true };
        const result = await ProjectsModel.findByIdAndUpdate(projectId, dataToUpdate, options);

        res.status(200).json({
            result,
            statusCode: 202,
            message: `Project images with id ${projectId} successfully updated`
        });
    } catch (error) {
        console.error('File update failed', error);
        res.status(500).json({ error: 'File update failed' });
    }
});

//project creation
project.post('/projects/create', verifyToken, async (req, res) =>{

    try {

        const { title, description, cover, images, tags } = req.body;

        if (req.user.role !== 'Designer') {
            return res.status(403).json({ message: 'Only designers accounts can create projects' });
        }

        const { _id } = req.user;

        const designer = await DesignersModel.findById(_id);
        if (!designer) {
            return res.status(404).json({ message: "Designer not found" });
        }

        const newProject = new ProjectsModel({
            author: _id,
            title,
            description,
            cover,
            images,
            tags
        });

        designer.projects.push(newProject._id);
        await designer.save();
        
        const createdProject = await newProject.save();

        res.status(201).json({
            message: "Project created successfully",
            project: createdProject
        });

    } catch (error) {
        res.status(500).send({
            statusCode: 500,
            message:'Internal server Error ',
            error
        });
    }
})

//project single get
project.get('/projects/:projectId', async (req, res) => {
    const { projectId } = req.params;
    try {
        const project = await ProjectsModel.findById(projectId);
        if (!project) {
            return res.status(404).json({ 
                statusCode: 404,
                message: 'Project not found' 
            });
        }
        res.status(200).json({
            statusCode: 200,
            message: `Project with id ${projectId} fetched successfully`,
            project
        });
    } catch (error) {
        res.status(500).json({
            message: 'Internal server error',
            error
        });
    }
});

//projects get da id designer

project.get('/projects/designer/:designerId', async (req, res) => {
    const { designerId } = req.params;
  
    try {
      // Trova il designer con l'ID specificato
      const designer = await DesignersModel.findById(designerId);
  
      if (!designer) {
        return res.status(404).json({
          statusCode: 404,
          message: 'Designer not found',
        });
      }
  
      // Ottieni tutti i progetti associati a questo designer
      const projects = await ProjectsModel.find({ author: designerId });
  
      res.status(200).json({
        statusCode: 200,
        message: 'All projects by designer fetched successfully',
        projects,
      });
    } catch (error) {
      res.status(500).json({
        message: 'Internal server error',
        error,
      });
    }
  });

  //project all get
project.get('/projects', async (req, res) => {
    try {
        const projects = await ProjectsModel.find();
        res.status(200).json({
            statusCode: 200,
            message: 'All projects fetched successfully',
            projects
        });
    } catch (error) {
        res.status(500).json({
            message: 'Internal server error',
            error
        });
    }
});


//patch di project
project.patch('/projects/:projectId/update', verifyToken, async (req, res) => {
    const { projectId } = req.params;

    if (req.user.role !== 'Designer') {
        return res.status(403).json({ 
            statusCode: 403,
            message: 'Only designers can update projects' 
        });
    }

    try {
        const project = await ProjectsModel.findById(projectId);
        if (!project) {
            return res.status(404).json({ 
                statusCode: 404,
                message: 'Project not found' 
            });
        }

        const projectAuthorToString = project.author.toString();
        const reqUserIdToString = req.user._id.toString();
        if (projectAuthorToString !== reqUserIdToString ) {
            return res.status(403).json({ 
                statusCode: 403,
                message: 'You can only update your own projects' 
            });
        }

        const dataToUpdate = req.body;
        const options = { new: true };

        const result = await ProjectsModel.findByIdAndUpdate(projectId, dataToUpdate, options);

        res.status(200).json({
            statusCode: 200,
            message: `Project with id ${projectId} updated successfully`,
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

// Aggiunta e rimozione di like da un progetto
project.post('/projects/:projectId/like', verifyToken, async (req, res) => {
    try {
        const projectId = req.params.projectId;

        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const project = await ProjectsModel.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const { _id, role } = req.user;

        const hasLiked = project.likes.some(like => like.author_id.equals(_id));

        if (hasLiked) {
            project.likes = project.likes.filter(like => !like.author_id.equals(_id));
        } else {
            project.likes.push({
                author_id: _id,
                author_role: role
            });
        }

        await project.save();

        if (role === 'Client') {
            const client = await ClientsModel.findById(_id);
            if (client) {
                if (hasLiked) {
                    client.liked_projects = client.liked_projects.filter(like => !like.project_id.equals(projectId));
                } else {
                    client.liked_projects.push({
                        project_id: projectId,
                        user_role: role
                    });
                }
                await client.save();
            }
        } else if (role === 'Designer') {
            const designer = await DesignersModel.findById(_id);
            if (designer) {
                if (hasLiked) {
                    designer.liked_projects = designer.liked_projects.filter(like => !like.project_id.equals(projectId));
                } else {
                    designer.liked_projects.push({
                        project_id: projectId,
                        user_role: role
                    });
                }
                await designer.save();
            }
        }

        res.status(200).json({
            message: 'Like updated successfully',
            updatedProject: project
          });

    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: 'Internal server error',
            error
        });
    }
});

//delete projetc consentita solo a un designer
project.delete('/projects/:projectId', verifyToken, async (req, res) =>{
    const {projectId} = req.params;

    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== 'Designer') {
        return res.status(403).json({ 
            statusCode: 403,
            message: 'Only designers can delete projects' 
        });
    }

    const project = await ProjectsModel.findById(projectId);
    if (!project) {
        return res.status(404).json({ message: 'Project not found' });
    }

    const projectAuthorToString = project.author.toString();
        const reqUserIdToString = req.user._id.toString();
        if (projectAuthorToString !== reqUserIdToString ) {
            return res.status(403).json({ 
                statusCode: 403,
                message: 'You can only delete your own projects' 
            });
        }

    try {

        await CommentsModel.deleteMany({ project: projectId });

        await ClientsModel.updateMany({}, { $pull: { liked_projects: { project_id: projectId } } });
        await DesignersModel.updateMany({}, { $pull: { liked_projects: { project_id: projectId } } });
        
        await ProjectsModel.findByIdAndDelete(projectId);

        res.status(200).json({ message: `Project with id ${projectId} deleted successfully` });
        
    } catch (error) {
        console.log(error),
        res.status(500).json({ message: 'Internal server error', error });
    }

})


module.exports = project;