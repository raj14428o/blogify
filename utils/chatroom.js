function getRoomId(userA, userB) {
  return [userA.toString(), userB.toString()].sort().join("_");
}

module.exports = getRoomId;
