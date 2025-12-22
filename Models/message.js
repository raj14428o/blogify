const { Schema, model } = require("mongoose");

const messageSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "conversation",
      required: true,
      index: true,
    },

    sender: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    //  Encrypted message payload
    ciphertext: {
      type: String, // base64 encoded encrypted message
      required: true,
    },

    nonce: {
      type: String, // base64 nonce used during encryption
      required: true,
    },

    // Optional but very useful
    messageType: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },

    // Delivery metadata (NOT encryption-related)
    deliveredAt: {
      type: Date,
      default: null,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const Message = model("message", messageSchema);
module.exports = Message;
