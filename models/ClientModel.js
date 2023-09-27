const mongoose = require('mongoose');

const ClientModelSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    surname:{
        type: String,
        required: true
    },
    company:{
        type: String,
        required: true
    },
    description:{
        type: String,
        required: true
    },
    address:{
        type: String,
        required: true
    },
    vatOrCf:{
        type: String,
        required: true
    },
    avatar:{
        type: String,
        required: true
    },
    website:{
        type: String,
        required: false
    },
    email:{
        type: String,
        required: true
    },
    password:{
        type: String,
        required: true
    },
    job_offers:[
        {
            job_offer_id:{
                type: mongoose.Schema.Types.ObjectId,
                ref: "JOBOFFER",
                //default: []
            }
        }
    ],
    liked_projects: [
        {
            project_id: {
                type: mongoose.Schema.Types.ObjectId,
                refPath: 'liked_projects.user_role'
            },
            user_role: {
                type: String,
                enum: ['Client', 'Designer']
            }
        }
    ],
    deals:[
        {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DEAL",
        default: []
        }
    ],
    invoices:[
        {
        type: mongoose.Schema.Types.ObjectId,
        ref: "INVOICE",
        default: []
        }
    ]
}, { timestamps: true, strict: true });

module.exports = mongoose.model("CLIENT", ClientModelSchema, "clients");