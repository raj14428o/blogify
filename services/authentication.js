const JWT = require('jsonwebtoken');

const secret = process.env.JWT_SECRET;

const crypto = require('crypto');

function createTokenForUser(user,sessionId)
{
    const payload =
    {
        _id:user._id,
        email:user.email,
        profileImageUrl: user.profileImageUrl,
        role:user.role,
        sessionId: sessionId,
    }
    const token = JWT.sign(payload,secret);
    return token;
}

function validateToken(token)
{
    const payload = JWT.verify(token,secret);
    return payload;
}

module.exports = {createTokenForUser, validateToken}