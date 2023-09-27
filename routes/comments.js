const mongoose = require('mongoose');
const express = require('express');
const bcrypt = require('bcrypt');
const verifyToken = require('../middlewares/verifyToken');

const CommentsModel = require('../models/CommentModel');
const ProjectsModel = require('../models/ProjectModel');
const ClientsModel = require('../models/ClientModel');
const DesignersModel = require('../models/DesignerModel');

const comment = express.Router();

//comment creation
comment.post('/comments/create', verifyToken, async (req, res) =>{

    const { text, rate, project_id } = req.body;

    try {

        const author_id = req.user._id;
        const author_role = req.user.role;

        let authorModel;
        if (author_role === 'Designer') {
            authorModel = DesignersModel;
        } else if (author_role === 'Client') {
            authorModel = ClientsModel;
        } else {
            return res.status(400).json({ message: 'Invalid author role' });
        }

        const existingAuthor = await authorModel.findById(author_id);
        if (!existingAuthor) {
            return res.status(404).json({ message: 'Author not found' });
        }

        const existingProject = await ProjectsModel.findById(project_id);
        if (!existingProject) {
            return res.status(404).json({ message: 'Project not found' });
        }

        const newComment = new CommentsModel({
            author: author_id,
            authorType: author_role,
            project: project_id,
            text,
            rate
        });

        existingProject.comments.push(newComment._id);
        await existingProject.save();

        const createdComment = await newComment.save();

        res.status(201).json({
            message: 'Comment created successfully',
            comment: createdComment
        });
        
    } catch (error) {
        res.status(500).json({
            message: 'Internal server error',
            error
        });
    }    
});

//get di un singolo commento
comment.get('/comments/:commentId', async (req, res) => {
    const { commentId } = req.params;
    
    try {
        const comment = await CommentsModel.findById(commentId);
        
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }
        
        res.status(200).json({ comment });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
});

//get di tutti i commenti
comment.get('/comments', async (req, res) => {
    try {
        const comments = await CommentsModel.find();
        res.status(200).json({ comments });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
});

//patch di un commento consentita solo all'autore
comment.patch('/comments/:commentId/update', verifyToken, async (req, res) => {
    const { commentId } = req.params;
    const { text, rate } = req.body;
    
    try {
        const comment = await CommentsModel.findById(commentId);
        
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }
        
        const commentAuthorIdToString = comment.author.toString();
        const reqUserIdToString = req.user._id.toString();
        
        if (commentAuthorIdToString !== reqUserIdToString) {
            return res.status(403).json({ message: 'Only the author of the comment can update it' });
        }

        const dataToUpdate = req.body;
        const options = { new: true };
        const result = await CommentsModel.findByIdAndUpdate(commentId, dataToUpdate, options);

        res.status(200).json({
            statusCode: 200,
            message: `Comment with id ${commentId} updated successfully`,
            result
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
});

//delete di un commento consentita solo all'autore e rimozione dal progetto associato

comment.delete('/comments/:commentId/delete', verifyToken, async (req, res) => {
    const { commentId } = req.params;
    
    try {
        const comment = await CommentsModel.findById(commentId);
        
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }
        
        const commentAuthorIdToString = comment.author.toString();
        const reqUserIdToString = req.user._id.toString();
        
        if (commentAuthorIdToString !== reqUserIdToString) {
            return res.status(403).json({ message: 'Only the author of the comment can delete it' });
        }
        
        const projectId = comment.project;
        
        const project = await ProjectsModel.findById(projectId);
        
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        //VERIFICARE CHE EQUALS FUNZIONIO ANCHE SENZA TRASFORMARE IN STRINGA
        project.comments = project.comments.filter(comment => !comment.equals(commentId));
        await project.save();
        
        await CommentsModel.findByIdAndDelete(commentId);
        
        res.status(200).json({ message: `Comment with id ${commentId} deleted successfully` });
    } catch (error) {
        console.log(error),
        res.status(500).json({ message: 'Internal server error', error });
    }
});


module.exports = comment;