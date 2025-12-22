const conversationSchema = new Schema(
  {
    members: [{
      type: Schema.Types.ObjectId,
      ref: "user",
    }],
    lastMessageAt: Date,
  },
  { timestamps: true }
);

module.exports = model("conversation", conversationSchema);
