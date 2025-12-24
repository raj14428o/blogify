const express = require("express");
const router = express.Router();
const Device = require("../Models/device");

// get latest public key of a user
router.get("/public/:userId", async (req, res) => {
  try {
    const device = await Device.findOne({ userId: req.params.userId })
      .sort({ updatedAt: -1 })
      .lean();

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    res.json({ publicKey: device.publicKey });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch public key" });
  }
});

router.post("/register", async (req, res) => {
  if (!req.user) return res.sendStatus(401);

  const { deviceId, publicKey } = req.body;
  if (!deviceId || !publicKey) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  await Device.findOneAndUpdate(
    { userId: req.user._id, deviceId },
    {
      userId: req.user._id,
      deviceId,
      publicKey,
      lastSeen: new Date(),
    },
    { upsert: true }
  );

  res.json({ success: true });
});

module.exports = router;
