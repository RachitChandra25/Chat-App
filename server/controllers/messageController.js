import Message from "../models/Message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../server.js";

//get all users except logged in users
export const getUsersForSidebar = async (req, res) => {
  try {
    const userId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: userId } }).select(
      "-password",
    );
    //count number of unseen messages
    const unseenMessages = {};
    const promises = filteredUsers.map(async (user) => {
      const messages = await Message.find({
        senderId: user._id,
        receiverId: userId,
        seen: false,
      });
      if (messages.length > 0) {
        unseenMessages[user._id] = messages.length;
      }
    });

    await Promise.all(promises);
    res.json({ success: true, users: filteredUsers, unseenMessages });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// get all msgs for selected user
export const getMessages = async (req, res) => {
  try {
    const { id: selectedUserId } = req.params;
    const myId = req.user._id;

    // Validate that selectedUserId is different from myId
    if (myId.toString() === selectedUserId) {
      return res.json({
        success: false,
        message: "Cannot get messages with yourself",
      });
    }

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: selectedUserId },
        { senderId: selectedUserId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    // Mark received messages as seen
    await Message.updateMany(
      { senderId: selectedUserId, receiverId: myId, seen: false },
      { seen: true },
    );

    res.json({ success: true, messages });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

//api to mark msg as seen using msg id
export const markMessageAsSeen = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await Message.findByIdAndUpdate(
      id,
      { seen: true },
      { new: true },
    );

    if (!message) {
      return res.json({ success: false, message: "Message not found" });
    }

    res.json({ success: true, message });
  } catch (error) {
    console.error(error.message);
    res.json({ success: false, message: error.message });
  }
};

//send msg to selected user
export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const receiverId = req.params.id;
    const senderId = req.user._id;

    // Validate that either text or image is provided
    if (!text?.trim() && !image) {
      return res.json({ success: false, message: "Message cannot be empty" });
    }

    // Validate that sender is not sending to themselves
    if (senderId.toString() === receiverId) {
      return res.json({
        success: false,
        message: "Cannot send message to yourself",
      });
    }

    let imageUrl;
    if (image) {
      try {
        // Validate image is a data URL
        if (!image.startsWith("data:image/")) {
          return res.json({ success: false, message: "Invalid image format" });
        }

        // Check image size (base64 encoded)
        if (image.length > 5 * 1024 * 1024) {
          return res.json({ success: false, message: "Image is too large" });
        }

        const uploadResponse = await cloudinary.uploader.upload(image, {
          resource_type: "auto",
          folder: "chat-app/messages",
        });
        imageUrl = uploadResponse.secure_url;
      } catch (cloudinaryError) {
        console.log("Cloudinary upload error:", cloudinaryError.message);
        return res.json({
          success: false,
          message: "Failed to upload image. Please try again.",
        });
      }
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text: text?.trim() || null,
      image: imageUrl || null,
    });

    //emit the new msg to receiver's sockets
    const receiverSocketIds = userSocketMap[receiverId];
    if (receiverSocketIds && receiverSocketIds.length > 0) {
      //ie the receiver is online
      receiverSocketIds.forEach((socketId) => {
        io.to(socketId).emit("newMessage", newMessage); //send msg to receiver
      });
    }

    res.json({ success: true, newMessage });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
