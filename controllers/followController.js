const User = require("../Models/user");

exports.toggleFollow = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id.toString();

    if (targetUserId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself",
      });
    }

    const [me, targetUser] = await Promise.all([
      User.findById(currentUserId),
      User.findById(targetUserId),
    ]);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isFollowing = me.following.some(
      id => id.toString() === targetUserId
    );

    if (isFollowing) {
      // UNFOLLOW
      me.following.pull(targetUserId);
      me.followingCount = Math.max(0, me.followingCount - 1);

      targetUser.followers.pull(currentUserId);
      targetUser.followersCount = Math.max(
        0,
        targetUser.followersCount - 1
      );
    } else {
      // FOLLOW
      me.following.addToSet(targetUserId);
      me.followingCount += 1;

      targetUser.followers.addToSet(currentUserId);
      targetUser.followersCount += 1;
    }

    await Promise.all([me.save(), targetUser.save()]);

    return res.json({
      success: true,
      isFollowing: !isFollowing,
      followersCount: targetUser.followersCount,
      followingCount: me.followingCount,
    });
  } catch (err) {
    console.error("Toggle follow error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

exports.getFollowers = async (req, res) => {
  try {
    const profileUser = await User.findById(req.params.id)
      .populate("followers", "fullName profileImageUrl");

    if (!profileUser) {
      return res.status(404).json({ success: false });
    }

    const currentUser = await User.findById(req.user._id);

    const users = profileUser.followers
      .filter(u => u._id.toString() !== req.user._id.toString()) // optional
      .map(u => ({
        _id: u._id.toString(), 
        fullName: u.fullName,
        profileImageUrl: u.profileImageUrl,
        isFollowing: currentUser.following.some(
          id => id.toString() === u._id.toString()
        )
      }));

    res.json({
      success: true,
      users
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};


exports.getFollowing = async (req, res) => {
  try {
    const profileUser = await User.findById(req.params.id)
      .populate("following", "fullName profileImageUrl");

    if (!profileUser) {
      return res.status(404).json({ success: false });
    }

    const currentUser = await User.findById(req.user._id);

    const users = profileUser.following
      .filter(u => u._id.toString() !== req.user._id.toString()) // optional
      .map(u => ({
        _id: u._id.toString(), 
        fullName: u.fullName,
        profileImageUrl: u.profileImageUrl,
        isFollowing: currentUser.following.some(
          id => id.toString() === u._id.toString()
        )
      }));

    res.json({
      success: true,
      users
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};



