const mongoose = require('mongoose');
const express = require('express');
const verifyToken = require('../middlewares/verifyToken');

const ClientsModel = require('../models/ClientModel');
const DesignersModel = require('../models/DesignerModel');
const DealsModel = require('../models/DealModel');

const deal = express.Router();

//creazione deal
deal.post('/deals/create', verifyToken, async (req, res) => {
    const { client, tags, amount, description, rework_limit, timing} = req.body;

    if (req.user.role !== 'Designer') {
        return res.status(403).json({ message: 'Only designers can create deals' });
    }

    const designerId = req.user._id; 

    const designer = await DesignersModel.findById(designerId);
    if (!designer) {
        return res.status(404).json({ message: 'Designer not found' });
    }

    if (!client) {
        return res.status(400).json({ message: 'Client ID is required' });
    }

    try {
        const existingClient = await ClientsModel.findById(client);
        if (!existingClient) {
            return res.status(404).json({ message: 'Client not found' });
        }
    
        const newDeal = new DealsModel({
            designer: designerId,
            client: existingClient,
            tags,
            amount,
            description,
            rework_limit,
            timing
        });

        const savedDeal = await newDeal.save();

        designer.deals.push(savedDeal._id);
        existingClient.deals.push(savedDeal._id);
        await designer.save();
        await existingClient.save();

        res.status(201).json({
            message: 'Deal successfully created ',
            savedDeal
        }); 
    } catch (error) {
        console.error(error); 
        res.status(500).json({ message: 'Error creating a new deal' });
    }
});

deal.get('/deals/:dealId', verifyToken, async (req, res) => {
    const { dealId } = req.params;

    try {
        const deal = await DealsModel.findById(dealId);

        if (!deal) {
            return res.status(404).json({
                statusCode: 404,
                message: 'Deal not found',
            });
        }

        res.status(200).json({
            statusCode: 200,
            message: 'Deal fetched successfully',
            deal,
        });
    } catch (error) {
        res.status(500).json({
            message: 'Internal server error',
            error,
        });
    }
});


// accettazione deal lato client
deal.patch('/deals/:dealId/accept', verifyToken, async (req, res) => {
    const { dealId } = req.params;

    try {
        const deal = await DealsModel.findById(dealId);
        if (!deal) {
            return res.status(404).json({ message: 'Deal not found' });
        }

        const clientIdToString = deal.client.toString();
        const reqUserIdToString = req.user._id.toString();

        if (req.user.role !== 'Client' || clientIdToString !== reqUserIdToString) {
            return res.status(403).json({ message: 'Only the client of the deal can accept it' });
        }

        if (deal.status !== 'offered') {
            return res.status(400).json({ message: 'Deal must be in "offered" status to accept it' });
        }

        deal.status = 'accepted';
        await deal.save();

        res.status(200).json({ message: 'Deal accepted successfully', deal });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error accepting the deal' });
    }
});

// declinazione deal lato client
deal.patch('/deals/:dealId/deny', verifyToken, async (req, res) => {
    const { dealId } = req.params;

    try {
        const deal = await DealsModel.findById(dealId);
        if (!deal) {
            return res.status(404).json({ message: 'Deal not found' });
        }

        const clientIdToString = deal.client.toString();
        const reqUserIdToString = req.user._id.toString();

        if (req.user.role !== 'Client' || clientIdToString !== reqUserIdToString) {
            return res.status(403).json({ message: 'Only the client of the deal can deny it' });
        }

        if (deal.status !== 'offered') {
            return res.status(400).json({ message: 'Deal must be in "offered" status to deny it' });
        }

        deal.status = 'denied';
        await deal.save();

        res.status(200).json({ message: 'Deal denied successfully', deal });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error denying the deal' });
    }
});

//messa in lavorazione del deal da parte del designer solo se lo status è "accepted"
deal.patch('/deals/:dealId/start', verifyToken, async (req, res) => {
    const { dealId } = req.params;

    try {
        const deal = await DealsModel.findById(dealId);
        if (!deal) {
            return res.status(404).json({ message: 'Deal not found' });
        }

        const desginerIdToString = deal.designer.toString();
        const reqUserIdToString = req.user._id.toString();

        if (req.user.role !== 'Designer' || desginerIdToString !== reqUserIdToString) {
            return res.status(403).json({ message: 'Only the designer of the deal can start it' });
        }

        if (deal.status !== 'accepted') {
            return res.status(400).json({ message: 'Deal must be in "accepted" status to start it' });
        }

        deal.status = 'in progress';
        await deal.save();

        res.status(200).json({ message: 'Deal started successfully', deal });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error starting the deal' });
    }
});

//completamento del deal da parte del designer solo se lo status è "in progress"
deal.patch('/deals/:dealId/end', verifyToken, async (req, res) => {
    const { dealId } = req.params;

    try {
        const deal = await DealsModel.findById(dealId);
        if (!deal) {
            return res.status(404).json({ message: 'Deal not found' });
        }

        const desginerIdToString = deal.designer.toString();
        const reqUserIdToString = req.user._id.toString();

        if (req.user.role !== 'Designer' || desginerIdToString !== reqUserIdToString) {
            return res.status(403).json({ message: 'Only the designer of the deal can start it' });
        }

        if (deal.status !== 'in progress') {
            return res.status(400).json({ message: 'Deal must be in "in progress" status to start it' });
        }

        deal.status = 'completed';
        await deal.save();

        res.status(200).json({ message: 'Deal completed successfully', deal });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error starting the deal' });
    }
});

deal.delete('/deals/:dealId/delete', verifyToken, async (req, res) => {
    const { dealId } = req.params;

    try {
        const deal = await DealsModel.findById(dealId);
        if (!deal) {
            return res.status(404).json({ message: 'Deal not found' });
        }

        const designerIdToString = deal.designer.toString();
        const reqUserIdToString = req.user._id.toString();

        if (req.user.role !== 'Designer' || designerIdToString !== reqUserIdToString) {
            return res.status(403).json({ message: 'Only the designer of the deal can delete it' });
        }

        const designer = await DesignersModel.findById(deal.designer);
        const client = await ClientsModel.findById(deal.client);

        if (designer) {
            designer.deals.pull(dealId);
            await designer.save();
        }

        if (client) {
            client.deals.pull(dealId);
            await client.save();
        }

        await DealsModel.findByIdAndDelete(dealId);

        res.status(200).json({ 
            statusCode: 200,
            message: 'Deal deleted successfully',
            dealDeleted: deal
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting the deal' });
    }
});



deal.get('/deals/designer/:designerId', async (req, res) => {
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
      const deals = await DealsModel.find({ designer: designerId });
  
      res.status(200).json({
        statusCode: 200,
        message: 'All designer deals fetched successfully',
        deals,
      });
    } catch (error) {
      res.status(500).json({
        message: 'Internal server error',
        error,
      });
    }
  });

  deal.get('/deals/client/:clientId', async (req, res) => {
    const { clientId } = req.params;
  
    try {
      // Trova il designer con l'ID specificato
      const client = await ClientsModel.findById(clientId);
  
      if (!client) {
        return res.status(404).json({
          statusCode: 404,
          message: 'Client not found',
        });
      }
  
      // Ottieni tutti i progetti associati a questo designer
      const deals = await DealsModel.find({ client: clientId });
  
      res.status(200).json({
        statusCode: 200,
        message: 'All client deals fetched successfully',
        deals,
      });
    } catch (error) {
      res.status(500).json({
        message: 'Internal server error',
        error,
      });
    }
  });

module.exports = deal;
