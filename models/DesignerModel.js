const mongoose = require('mongoose');

function arrayLimit(val) {
    return val.length >= 3;
  }

const DesignerModelSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    surname:{
        type: String,
        required: true
    },
    nickname:{
        type: String,
        required: true,
        unique: true
    },
    description:{
        type: String,
        required: true
    },
    tags:{
        type: [String],
        required: true,
        validate: [arrayLimit, '{PATH} deve avere almeno 3 elementi']
    },
    website:{
        type: String,
        required: false
    },
    instagram:{
        type: String,
        required: false
    },
    avatar:{
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
    email:{
        type: String,
        required: true
    },
    password:{
        type: String,
        required: true
    },
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
    projects:[
        {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PROJECT",
        default: []
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
},  { timestamps: true, strict: true });

module.exports = mongoose.model("DESIGNER", DesignerModelSchema, "designers");