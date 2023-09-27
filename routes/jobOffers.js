const mongoose = require('mongoose');
const express = require('express');
const verifyToken = require('../middlewares/verifyToken');

const ClientsModel = require('../models/ClientModel');
const JobOffersModel = require('../models/JobOfferModel');

const jobOffer = express.Router();

//creazione jobOffer
jobOffer.post('/joboffers/create', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'Client') {
            return res.status(403).json({ message: 'Only clients can create job offers' });
        }

        const { title, tags, budget, description, deadline } = req.body;
        const clientId = req.user._id;

        const newJobOffer = new JobOffersModel({
            client: clientId,
            title,
            tags,
            budget,
            description,
            deadline
        });

        const client = await ClientsModel.findById(clientId);
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }

        client.job_offers.push({ job_offer_id: newJobOffer._id });
        await client.save();

        const createdJobOffer = await newJobOffer.save();

        res.status(201).json({
            message: 'Job offer created successfully',
            jobOffer: createdJobOffer
        });
    } catch (error) {
        res.status(500).json({
            message: 'Internal server error',
            error
        });
    }
});

//patch della joboffer per il client che l'ha creata
jobOffer.patch('/joboffers/:jobOfferId/update', verifyToken, async (req, res) => {
    try {
        const { jobOfferId } = req.params;
        const clientId = req.user._id;

        const jobOffer = await JobOffersModel.findById(jobOfferId);

        if (!jobOffer) {
            return res.status(404).json({ message: 'Job offer not found' });
        }

        const jobOfferClientToString = jobOffer.client.toString();
        const clientIdToString = clientId.toString();
        if (req.user.role !== 'Client' || jobOfferClientToString !== clientIdToString) {
            return res.status(403).json({ message: 'Only the client who created the job offer can update it' });
        }

        const dataToUpdate = req.body;
        const options = { new: true };
        const result = await JobOffersModel.findByIdAndUpdate(jobOfferId, dataToUpdate, options);

        res.status(200).json({
            message: `Job offer with id ${jobOfferId} updated successfully`,
            result
        });
    } catch (error) {
        res.status(500).json({
            message: 'Internal server error',
            error
        });
    }
});

// Get di una singola job offer
jobOffer.get('/joboffers/:jobOfferId', async (req, res) => {
    try {
        const { jobOfferId } = req.params;
        const jobOffer = await JobOffersModel.findById(jobOfferId);

        if (!jobOffer) {
            return res.status(404).json({ message: 'Job offer not found' });
        }

        res.status(200).json({ 
            statusCode: 200,
            message: 'Job Offer fetched successfully',
            jobOffer });
    } catch (error) {
        res.status(500).json({
            message: 'Internal server error',
            error
        });
    }
});

//jobOffers get da id designer

jobOffer.get('/joboffers/client/:clientId', async (req, res) => {
    const { clientId } = req.params;
  
    try {
      const client = await ClientsModel.findById(clientId);
  
      if (!client) {
        return res.status(404).json({
          statusCode: 404,
          message: 'Client not found',
        });
      }

      const jobOffers = await JobOffersModel.find({ client: clientId });
  
      res.status(200).json({
        statusCode: 200,
        message: 'All client job offers fetched successfully',
        jobOffers,
      });
    } catch (error) {
      res.status(500).json({
        message: 'Internal server error',
        error,
      });
    }
  });

// Get di tutte le job offers
jobOffer.get('/joboffers', async (req, res) => {
    try {
        const jobOffers = await JobOffersModel.find();
        res.status(200).json({ jobOffers });
    } catch (error) {
        res.status(500).json({
            message: 'Internal server error',
            error
        });
    }
});

// Delete di una job offer da parte di un cliente loggato
jobOffer.delete('/joboffers/:jobOfferId/delete', verifyToken, async (req, res) => {
    try {
        const { jobOfferId } = req.params;
        
        if (req.user.role !== 'Client') {
            return res.status(403).json({ message: 'Only clients can delete job offers' });
        }

        const client = await ClientsModel.findById(req.user._id);
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }

        const jobOffer = await JobOffersModel.findById(jobOfferId);
        if (!jobOffer) {
            return res.status(404).json({ message: 'Job offer not found' });
        }

        if (!client.job_offers.some(offer => offer.job_offer_id.equals(jobOfferId))) {
            return res.status(403).json({ message: 'You can only delete your own job offers' });
        }

        client.job_offers = client.job_offers.filter(offer => !offer.job_offer_id.equals(jobOfferId));
        await client.save();

        await JobOffersModel.findByIdAndDelete(jobOfferId);

        res.status(200).json({ message: 'Job offer deleted successfully' });

    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
});

module.exports = jobOffer;