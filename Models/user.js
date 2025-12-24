const { Schema, model } = require('mongoose');
const { createHmac, randomBytes } = require("crypto");
const { createTokenForUser } = require('../services/authentication');
const userSchema = new Schema(
    {
        fullName:
        {
            type: String,
            required: true,
        },
        email:
        {
            type: String,
            required: true,
            unique: true,
        },
        salt:
        {
            type: String,

        },
        password:
        {
            type: String,
            required: true,
        },
        profileImageUrl:
        {
            type: String,
            default: "/images/default.jpg"
        },
        role:
        {
            type: String,
            enum: ["USER", "ADMIN"],
            default: "USER"
        },
        followers: [
            {
                type: Schema.Types.ObjectId,
                ref: "user",
                default: []
            }
        ],
        following: [
            {
                type: Schema.Types.ObjectId,
                ref: "user",
                default: []
            }
        ],
        followersCount: {
            type: Number,
            default: 0
        },
        followingCount: {
            type: Number,
            default: 0
        },
        reportCount: {
            type: Number,
            default: 0
        },
        reportedBy: [
            {
                type: Schema.Types.ObjectId,
                ref: "user",
                default: []
            }
        ],
        isOnline: {
            type: Boolean,
            default: false
        },

        lastSeen: {
            type: Date,
            default: null
        },
        activeSessionId: {
  type: String,
  default: null
},
        isEmailVerified: {
  type: Boolean,
  default: false
},

emailVerificationOTP: {type:String},     
emailVerificationExpiry: {type:Date},
otpPurpose: {type: String}

    }, { timestamps: true }
);

userSchema.pre("save", function (next) {
    const user = this;

    if (!user.isModified("password")) return next();

    const salt = randomBytes(16).toString();
    const hashedPassword = createHmac('sha256', salt)
        .update(user.password)
        .digest("hex");

    this.salt = salt;
    this.password = hashedPassword;

    next();
})

userSchema.static("matchPassword", async function (email, password) {
    const user = await this.findOne({ email });
    if (!user) throw new Error('User not found');

    const salt = user.salt;
    const hashedPassword = user.password;

    const userProvidedHash = createHmac('sha256', salt)
        .update(password)
        .digest("hex");

    if (hashedPassword !== userProvidedHash) throw new Error('Incorrect Password');

    const sessionId = crypto.randomUUID();
    user.activeSessionId = sessionId;
    await user.save();

    // Convert to plain object & hide sensitive fields
    const userObj = user.toObject();


    return token = createTokenForUser(userObj, sessionId);
});

const User = model('user', userSchema);
module.exports = User;