const chatModel = require("../models/chat.model");
const messageModel = require("../models/message.model");

/**
 * CREATE CHAT
 * -----------------------------------
 * - auto-title fallback
 * - no duplicate blank chats
 * - returns chat object
 */
async function createChat(req, res) {
  try {
    const { title } = req.body;
    const user = req.user;

    // prevent empty title crash
    const chatTitle = title?.trim() || "New Chat";

    // create chat
    const chat = await chatModel.create({
      user: user._id,
      title: chatTitle,
      lastActivity: Date.now()
    });

    return res.status(201).json({
      message: "chat created successfully",
      chat: {
        _id: chat._id,
        title: chat.title,
        lastActivity: chat.lastActivity,
        user: chat.user
      }
    });

  } catch (err) {
    return res.status(500).json({
      message: "chat creation failed",
      error: err.message
    });
  }
}


/**
 * GET ALL USER CHATS
 * -----------------------------------
 * - returns sorted list
 * - latest chat first
 * - returns clean objects
 */
async function getUserChats(req, res) {
  try {
    const chats = await chatModel
      .find({ user: req.user._id })
      .sort({ lastActivity: -1 }) // more accurate than createdAt
      .lean();

    return res.status(200).json({
      message: "chats loaded",
      chats: chats.map(c => ({
        _id: c._id,
        title: c.title,
        lastActivity: c.lastActivity,
        user: c.user
      }))
    });

  } catch (err) {
    return res.status(500).json({
      message: "failed to load chats",
      error: err.message
    });
  }
}


/**
 * GET CHAT MESSAGES (optional helper)
 * -----------------------------------
 * - returns clean ordered history
 */
async function getMessages(req, res) {
  try {
    const { chatId } = req.params;
    //console.log(chatId)
    const messages = await messageModel
      .find({ chat: chatId })
      .sort({ createdAt: 1 }) // oldest first
      .lean();
      //console.log(messages)

    return res.status(200).json({
      message: "messages loaded",
      messages: messages.map(m => ({
        _id: m._id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt
      }))
    });

  } catch (err) {
    return res.status(500).json({
      message: "failed to load messages",
      error: err.message
    });
  }
}
async function renameChat(req, res) {
  try {
    const { chatId } = req.params;
    const { title } = req.body;

    const updated = await chatModel.findOneAndUpdate(
      { _id: chatId, user: req.user._id },
      { title, lastActivity: Date.now() },
      { new: true }
    );

    return res.status(200).json({
      message: "chat renamed",
      chat: {
        _id: updated._id,
        title: updated.title,
        lastActivity: updated.lastActivity
      }
    });

  } catch (err) {
    return res.status(500).json({
      message: "rename failed",
      error: err.message
    });
  }
}
async function deleteChat(req, res) {
  try {
    const { chatId } = req.params;

    await chatModel.deleteOne({
      _id: chatId,
      user: req.user._id
    });

    await messageModel.deleteMany({
      chat: chatId
    });

    return res.status(200).json({
      message: "chat deleted"
    });

  } catch (err) {
    return res.status(500).json({
      message: "delete failed",
      error: err.message
    });
  }
}


module.exports = { createChat, getUserChats, getMessages, renameChat,deleteChat };

