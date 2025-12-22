const { Schema, model } = require("mongoose");

const deviceSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    deviceId: {
      type: String,
      required: true,
    },

    publicKey: {
      type: Object, // JWK
      required: true,
    },

    lastSeen: Date,
  },
  { timestamps: true }
);

module.exports = model("device", deviceSchema);
