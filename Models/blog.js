const { Schema, model } = require("mongoose");

const blogSchema = new Schema(
{
    title: {
        type: String,
        required: true,
        trim: true,
    },

   
    description: {
        type: String,
        default: "",
        trim: true,
        maxlength: 90,
    },

    body: {
        type: String,
        required: true,
    },

    coverImageURL: {
        type: String,
        default: "/images/default-blog.jpg",
    },

    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },

    
    likesCount: {
        type: Number,
        default: 0,
    },
    commentsCount: {
        type: Number,
        default: 0,
    }
},
{ timestamps: true }
);


const Blog = model("blog", blogSchema);
module.exports = Blog;
