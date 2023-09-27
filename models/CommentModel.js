const mongoose = require('mongoose');

const CommentModelSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'authorType',
        required: true
    },
    authorType: {
        type: String,
        enum: ['Client', 'Designer'],
        required: true
    },
    project:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "PROJECT"
    },
    text: {
        type: String,
        required: true
    },
    rate: {
        type: Number,
        required: true
    }
}, { timestamps: true, strict: true });

module.exports = mongoose.model("COMMENT", CommentModelSchema, "comments");