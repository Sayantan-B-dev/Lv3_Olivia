const userModel=require('../models/user.model')
const chatModel=require('../models/chat.model')
const bcrypt=require("bcryptjs")
const jwt=require("jsonwebtoken")

async function registerUser(req, res) {
  try {
    const { fullName: { firstName, lastName }, email, password } = req.body;

    const isUserAlreadyExists = await userModel.findOne({ email });

    if (isUserAlreadyExists) {
      return res.status(400).json({ message: "user already exists" });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      fullName: {
        firstName,
        lastName
      },
      email,
      password: hashPassword
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    return res.status(201).json({
      message: "user registered successfully",
      user: {
        email: user.email,
        _id: user._id,
        fullName: user.fullName
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: "registration failed",
      error: error.message
    });
  }
}


async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "invalid email" });
    }

    const existingChat = await chatModel.findOne({ user: user._id });

    if (!existingChat) {
      await chatModel.create({
        user: user._id,
        title: "Default Chat"
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "invalid password" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.cookie("token", token);

    return res.status(200).json({
      message: "user logged in succesfully",
      user: {
        email: user.email,
        _id: user.id,
        fullName: user.fullName
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: "login failed",
      error: error.message
    });
  }
}



async function logoutUser(req, res) {
  try {
    res.clearCookie("token");

    return res.status(200).json({
      message: "Logged out successfully"
    });
  } catch (err) {
    return res.status(500).json({
      message: "Logout failed"
    });
  }
}



module.exports = {
  registerUser,
  loginUser,
  logoutUser
};
