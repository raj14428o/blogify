const { Schema, model } = require("mongoose");

const conversationSchema = new Schema(
  {
    roomId: {
      type: String,
      unique: true,
      index: true,
      required: true,
    },
    members: [{
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    }],
    lastMessage: {
      text: {
        type: String,
        default: "",
      },
      sender: {
        type: Schema.Types.ObjectId,
        ref: "user",
      },
    },
       lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
      unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
  },

  { timestamps: true }
);
conversationSchema.index({ members: 1, lastMessageAt: -1 });
const Conversation = model("conversation", conversationSchema);
module.exports = Conversation;