const mongoose = require('mongoose');

function arrayLimit(val) {
    return val.length >= 1;
  }

const JobOfferModelSchema = new mongoose.Schema({
    client:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "CLIENT"
    },
    title:{
        type: String,
        required: true
    },
    tags:{
        type: [String],
        required: true,
        validate: [arrayLimit, '{PATH} deve avere almeno 1 elemento']
    },
    budget:{
        budget_value:{
            type: Number,
            required: true
        },
        budget_unit:{
            type: String,
            required: true
        }
    },
    description:{
        type: String,
        required: true
    },
    deadline:{
        type: String,
        required: true
    },
}, { timestamps: true, strict: true });

module.exports = mongoose.model("JOBOFFER", JobOfferModelSchema, "joboffers");
