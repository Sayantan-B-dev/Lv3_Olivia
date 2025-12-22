const express = require("express");
const chatController = require("../controller/chat.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.post(
  "/",
  authMiddleware.authUser,
  chatController.createChat
);

router.get(
  "/",
  authMiddleware.authUser,
  chatController.getUserChats
);

router.get(
  "/:chatId/messages",
  authMiddleware.authUser,
  chatController.getMessages
);
router.put(
  "/:chatId/rename",
  authMiddleware.authUser,
  chatController.renameChat
);
router.delete(
  "/:chatId",
  authMiddleware.authUser,
  chatController.deleteChat
);

module.exports = router;
