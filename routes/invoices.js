const mongoose = require('mongoose');
const path = require('path');
const express = require('express');
const verifyToken = require('../middlewares/verifyToken');
const PDFDocument = require('pdfkit');
const blobStream = require('blob-stream');
const ClientsModel = require('../models/ClientModel');
const DesignersModel = require('../models/DesignerModel');
const DealsModel = require('../models/DealModel');
const InvoicesModel = require('../models/InvoiceModel');

const invoice = express.Router();

//creazione invoice
invoice.post('/invoices/create', verifyToken, async (req, res) => {
    try {
        const { dealId, description, invoiceNumber, fiscalNotes, VAT, totalAmount } = req.body;

        const deal = await DealsModel.findById(dealId).populate('designer client');

        if (!deal) {
            return res.status(404).json({ message: 'Deal not found' });
        }

        if (deal.status !== 'completed') {
            return res.status(400).json({ message: 'Cannot create invoice for non-completed deals' });
        }

        const designerId = deal.designer._id.toString();
        const clientId = deal.client._id.toString();
        const creatorId = req.user._id.toString();

        if (creatorId !== designerId) {
            return res.status(403).json({ message: 'You can only create invoices for your completed deals' });
        }

        // Qui effettua la fetch delle informazioni del cliente e del designer
        const [designerInfo, clientInfo] = await Promise.all([
            DesignersModel.findById(designerId),
            ClientsModel.findById(clientId)
        ]);

        if (!designerInfo || !clientInfo) {
            return res.status(500).json({ message: 'Error fetching designer or client information' });
        }

        const invoiceData = {
            deal: deal._id,
            designer: designerId,
            client: clientId,
            tags: deal.tags,
            amount: {
                amount_value: deal.amount.amount_value,
                amount_unit: deal.amount.amount_unit
            },
            clientName: clientInfo.name,
            clientSurname: clientInfo.surname,
            clientVatOrCf: clientInfo.vatOrCf,
            clientCompany: clientInfo.company,
            clientAddress: clientInfo.address,
            designerName: designerInfo.name,
            designerSurname: designerInfo.surname,
            designerVatOrCf: designerInfo.vatOrCf,
            designerAddress: designerInfo.address,
            description,
            invoiceNumber,
            fiscalNotes,
            VAT,
            totalAmount,
        };

        const newInvoice = new InvoicesModel(invoiceData);
        await newInvoice.save();

        const designer = await DesignersModel.findById(designerId);
        const client = await ClientsModel.findById(clientId);

        designer.invoices.push(newInvoice._id);
        client.invoices.push(newInvoice._id);

        await Promise.all([designer.save(), client.save()]);

        res.status(201).json({ message: 'Invoice created successfully', invoice: newInvoice });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal server error', error });
    }
});


//patch per consentire al designer di modificare l'invoice
invoice.patch('/invoices/:invoiceId/update', verifyToken, async (req, res) => {
    try {
        const { invoiceId } = req.params;

        const invoice = await InvoicesModel.findById(invoiceId);

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        const invoiceDesignerToString = invoice.designer.toString();
        const reqUserIdToString = req.user._id.toString();
        if (req.user.role !== 'Designer' || invoiceDesignerToString !== reqUserIdToString) {
            return res.status(403).json({ message: 'Only the designer who created the invoice can update it' });
        }

        const dataToUpdate = req.body;
        const options = { new: true };
        const result = await InvoicesModel.findByIdAndUpdate(invoiceId, dataToUpdate, options);

        res.status(200).json({
            statusCode: 200,
            message: `Invoice with id ${invoiceId} updated successfully`,
            result
        });

    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
});

//get di una singola invoice

invoice.get('/invoices/:invoiceId', verifyToken, async (req, res) => {
    try {
        const { invoiceId } = req.params;

        const invoice = await InvoicesModel.findById(invoiceId);

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        // Verifica se l'utente ha il permesso di accedere a questa invoice (es. solo il designer o il cliente associato)
        const reqUserIdToString = req.user._id.toString();
        const designerId = invoice.designer.toString();
        const clientId = invoice.client.toString();

        if (req.user.role === 'Designer' && reqUserIdToString !== designerId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (req.user.role === 'Client' && reqUserIdToString !== clientId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.status(200).json({ statusCode: 200, message: 'Invoice retrieved successfully', invoice });
    } catch (error) {
        console.error(error);
        res.status(500).json({ statusCode: 500, message: 'Internal server error', error });
    }
});

//get di tutte le invoices di un designeer
invoice.get('/invoices/designer/:designerId', verifyToken, async (req, res) => {
    try {
        const { designerId } = req.params;

        // Verifica se l'utente ha il permesso di accedere alle invoice del designer
        const reqUserIdToString = req.user._id.toString();

        if (req.user.role !== 'Designer' || reqUserIdToString !== designerId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const invoices = await InvoicesModel.find({ designer: designerId });

        res.status(200).json({ statusCode: 200, message: 'Designer invoices retrieved successfully', invoices });
    } catch (error) {
        console.error(error);
        res.status(500).json({ statusCode: 500, message: 'Internal server error', error });
    }
});


//get di tutte le invoices di un client
invoice.get('/invoices/client/:clientId', verifyToken, async (req, res) => {
    try {
        const { clientId } = req.params;

        // Verifica se l'utente ha il permesso di accedere alle invoice del cliente
        const reqUserIdToString = req.user._id.toString();

        if (req.user.role !== 'Client' || reqUserIdToString !== clientId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const invoices = await InvoicesModel.find({ client: clientId });

        res.status(200).json({ statusCode: 200, message: 'Client invoices retrieved successfully', invoices });
    } catch (error) {
        console.error(error);
        res.status(500).json({ statusCode: 500, message: 'Internal server error', error });
    }
});


  invoice.get('/invoices/:invoiceId/pdf', verifyToken, async (req, res) => {
    try {
      const { invoiceId } = req.params;
      const invoice = await InvoicesModel.findById(invoiceId);
  
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
  
      const reqUserIdToString = req.user._id.toString();
      const designerId = invoice.designer.toString();
      const clientId = invoice.client.toString();
  
      if (req.user.role === 'Designer' && reqUserIdToString !== designerId) {
        return res.status(403).json({ message: 'Access denied' });
      }
  
      if (req.user.role === 'Client' && reqUserIdToString !== clientId) {
        return res.status(403).json({ message: 'Access denied' });
      }
  
      const doc = new PDFDocument();
  
      const logoImage = path.join(__dirname, '../asset/logo.png');
      const logoWidth = 200;
      const logoHeight = 150;
      const centerX = (doc.page.width - logoWidth) / 2;
      doc.image(logoImage, centerX, 30, { width: logoWidth, height: logoHeight });
  

        let xLeft = 50;
        let xRight = 400; 
        let y = 150;

        const clientY = Math.max(150, y); 

     
        doc.fillColor('black').text('Account Name:', xLeft, y);
        doc.fillColor('#BEBFFB').text(`${invoice.clientName}`, xLeft, y + 20);
        y += 40;

        doc.fillColor('black').text('Account Surname:', xLeft, y);
        doc.fillColor('#BEBFFB').text(`${invoice.clientSurname}`, xLeft, y + 20);
        y += 40;

        doc.fillColor('black').text('Company Fiscal Data:', xLeft, y);
        doc.fillColor('#BEBFFB').text(`${invoice.clientVatOrCf}`, xLeft, y + 20);
        y += 40;

        doc.fillColor('black').text('Company:', xLeft, y);
        doc.fillColor('#BEBFFB').text(`${invoice.clientCompany}`, xLeft, y + 20);
        y += 40;

        doc.fillColor('black').text('Company Address:', xLeft, y);
        doc.fillColor('#BEBFFB').text(`${invoice.clientAddress}`, xLeft, y + 20);
        y += 60; 

        doc.fillColor('black').text('Designer Name:', xRight, clientY);
        doc.fillColor('#BEBFFB').text(`${invoice.designerName}`, xRight, clientY + 20);
        y = clientY + 40;

        doc.fillColor('black').text('Designer Surname:', xRight, y);
        doc.fillColor('#BEBFFB').text(`${invoice.designerSurname}`, xRight, y + 20);
        y += 40;

        doc.fillColor('black').text('Designer Fiscal Data:', xRight, y);
        doc.fillColor('#BEBFFB').text(`${invoice.designerVatOrCf}`, xRight, y + 20);
        y += 40;

        doc.fillColor('black').text('Designer Address:', xRight, y);
        doc.fillColor('#BEBFFB').text(`${invoice.designerAddress}`, xRight, y + 20);



        const initialY = 400;
        const cellWidth = 250;
        const cellHeight = 30;

        doc.lineWidth(1);


        doc.rect(xLeft, initialY, cellWidth, cellHeight).stroke('#BEBFFB');
        doc.fillColor('black').text('Invoice ID', xLeft, initialY);
        doc.rect(xLeft + cellWidth, initialY, cellWidth, cellHeight).stroke('#BEBFFB');
        doc.fillColor('black').text(`${invoice._id}`, xLeft + cellWidth, initialY);


        doc.rect(xLeft, initialY + cellHeight, cellWidth, cellHeight).stroke('#BEBFFB');
        doc.fillColor('black').text('Invoice Number', xLeft, initialY + cellHeight);
        doc.rect(xLeft + cellWidth, initialY + cellHeight, cellWidth, cellHeight).stroke('#BEBFFB');
        doc.fillColor('black').text(`${invoice.invoiceNumber}`, xLeft + cellWidth, initialY + cellHeight);


        doc.rect(xLeft, initialY + cellHeight * 2, cellWidth, cellHeight).stroke('#BEBFFB');
        doc.fillColor('black').text('Invoice Description', xLeft, initialY + cellHeight * 2);
        doc.rect(xLeft + cellWidth, initialY + cellHeight * 2, cellWidth, cellHeight).stroke('#BEBFFB');
        doc.fillColor('black').text(`${invoice.description}`, xLeft + cellWidth, initialY + cellHeight * 2);


        doc.rect(xLeft, initialY + cellHeight * 3, cellWidth, cellHeight).stroke('#BEBFFB');
        doc.fillColor('black').text('Amount Value', xLeft, initialY + cellHeight * 3);
        doc.rect(xLeft + cellWidth, initialY + cellHeight * 3, cellWidth, cellHeight).stroke('#BEBFFB');
        doc.fillColor('black').text(`${invoice.amount.amount_value} ${invoice.amount.amount_unit}`, xLeft + cellWidth, initialY + cellHeight * 3);


        doc.rect(xLeft, initialY + cellHeight * 4, cellWidth, cellHeight).stroke('#BEBFFB');
        doc.fillColor('black').text('VAT:', xLeft, initialY + cellHeight * 4);
        doc.rect(xLeft + cellWidth, initialY + cellHeight * 4, cellWidth, cellHeight).stroke('#BEBFFB');
        doc.fillColor('black').text(`${invoice.VAT} ${invoice.amount.amount_unit}`, xLeft + cellWidth, initialY + cellHeight * 4);

        doc.rect(xLeft, initialY + cellHeight * 5, cellWidth, cellHeight).stroke('#BEBFFB');
        doc.fillColor('black').text('Total Amount', xLeft, initialY + cellHeight * 5);
        doc.rect(xLeft + cellWidth, initialY + cellHeight * 5, cellWidth, cellHeight).stroke('#BEBFFB');
        doc.fillColor('black').text(`${invoice.totalAmount} ${invoice.amount.amount_unit}`, xLeft + cellWidth, initialY + cellHeight * 5);

        doc.rect(xLeft, initialY + cellHeight * 6, cellWidth, cellHeight).stroke('#BEBFFB');
        doc.fillColor('black').text('Fiscal Notes', xLeft, initialY + cellHeight * 6);
        doc.rect(xLeft + cellWidth, initialY + cellHeight * 6, cellWidth, cellHeight).stroke('#BEBFFB');
        doc.fillColor('black').text(`${invoice.fiscalNotes}`, xLeft + cellWidth, initialY + cellHeight * 6);
  

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice.pdf"`);
  

      doc.pipe(res);
      doc.end();
    } catch (error) {
      console.error(error);
      res.status(500).json({ statusCode: 500, message: 'Internal server error', error });
    }
  });
  

module.exports = invoice;