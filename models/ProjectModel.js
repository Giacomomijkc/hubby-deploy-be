const mongoose = require('mongoose');

function arrayTagsLimit(val) {
    return val.length >= 3;
  }

function arrayImagesLimit(val) {
    return val.length >= 3;
}

const ProjectModelSchema = new mongoose.Schema({
    title:{
        type: String,
        required: true
    },
    description:{
        type: String,
        required: true
    },
    cover:{
        type: String,
        required: true
    },
    images:{
        type: [String],
        required: true,
        validate: [arrayImagesLimit, '{PATH} deve avere almeno 3 elementi']
    },
    author:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"DESIGNER"
    },
    tags:{
        type: [String],
        required: true,
        validate: [arrayTagsLimit, '{PATH} deve avere almeno 3 elementi']
    },
    comments: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "COMMENT",
          default: []
        }
    ],
    likes: [
        {
            author_id: {
                type: mongoose.Schema.Types.ObjectId,
                refPath: 'likes.author_role'
            },
            author_role: {
                type: String,
                enum: ['Client', 'Designer']
            }
        }
    ]
},  { timestamps: true, strict: true });

module.exports = mongoose.model("PROJECT", ProjectModelSchema, "projects");