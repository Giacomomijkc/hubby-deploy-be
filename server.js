const express = require("express");
const mongoose = require("mongoose");
const cors = require('cors');
const PORT = 5050;

require('dotenv').config();

const designersRoute = require('./routes/designers');
const projectsRoute = require('./routes/projects');
const clientsRoute = require('./routes/clients');
const commentsRoute = require('./routes/comments');
const loginsRoute = require('./routes/logins');
const dealsRoute = require('./routes/deals');
const invoicesRoute = require('./routes/invoices');
const jobOffersRoute = require('./routes/jobOffers');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/', designersRoute);
app.use('/', projectsRoute);
app.use('/', clientsRoute);
app.use('/', commentsRoute);
app.use('/', loginsRoute);
app.use('/', dealsRoute);
app.use('/', invoicesRoute);
app.use('/', jobOffersRoute);

mongoose.connect(process.env.MONGO_DB_URL);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Server Connection Error!'));
db.once('open', () => {
    console.log('Database MongoDB connected!')
});



app.listen(PORT, () =>
    console.log(`Server avviato ed in ascolto sulla PORTA ${PORT}`)
);