const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const { getCookieOptions, SESSION_MAX_AGE_MS } = require("../utils/cookies");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Compared against when the email is unknown so response time does not
// reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync("dhaaga-dummy-password", 12);

const cookieOptions = getCookieOptions;

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    // Reject non-strings (prevents NoSQL operator injection like {"$ne": null})
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Name, email and password must be strings",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2 || cleanName.length > 80) {
      return res.status(400).json({
        message: "Name must be between 2 and 80 characters",
      });
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({
        message: "Please provide a valid email address",
      });
    }

    // Validated on the plain password. (The schema minlength only ever sees
    // the bcrypt hash, so it cannot enforce this.) bcrypt ignores > 72 bytes.
    if (password.length < 8 || Buffer.byteLength(password) > 72) {
      return res.status(400).json({
        message: "Password must be 8 to 72 characters long",
      });
    }

    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let user;

    try {
      user = await User.create({
        name: cleanName,
        email: cleanEmail,
        password: hashedPassword,
      });
    } catch (error) {
      // Two simultaneous registrations with the same email
      if (error.code === 11000) {
        return res.status(409).json({
          message: "User already exists",
        });
      }

      throw error;
    }

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        message: "Email and password must be strings",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

   const isPasswordCorrect = user?.password
  ? await bcrypt.compare(password, user.password)
  : await bcrypt.compare(password, DUMMY_HASH);

    if (!user || !isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.cookie("token", token, {
      ...cookieOptions(),
      maxAge: SESSION_MAX_AGE_MS,
    });

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};
 
const googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential || typeof credential !== "string") {
      return res.status(400).json({
        message: "Google credential is required",
      });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        message: "Google authentication is not configured",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      return res.status(401).json({
        message: "Invalid Google credential",
      });
    }

    const {
      sub: googleId,
      email,
      email_verified: emailVerified,
      name,
    } = payload;

    if (!googleId || !email || !emailVerified) {
      return res.status(401).json({
        message: "Google account could not be verified",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    let user = await User.findOne({ googleId });

    if (!user) {
      user = await User.findOne({ email: cleanEmail });

      if (user) {
        if (user.googleId && user.googleId !== googleId) {
          return res.status(409).json({
            message: "This email is already linked to another Google account",
          });
        }

        user.googleId = googleId;
        await user.save();
      }
    }

    if (!user) {
      user = await User.create({
        name: name?.trim() || cleanEmail.split("@")[0],
        email: cleanEmail,
        googleId,
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.cookie("token", token, {
      ...cookieOptions(),
      maxAge: SESSION_MAX_AGE_MS,
    });

    res.status(200).json({
      message: "Google login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Tells the frontend who is logged in
const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      user,
    });
  } catch (error) {
    next(error);
  }
};

const logoutUser = (req, res) => {
  res.clearCookie("token", cookieOptions());

  res.status(200).json({
    message: "Logout successful",
  });
};

module.exports = {
  registerUser,
  loginUser,
  googleLogin,
  getCurrentUser,
  logoutUser,
};
