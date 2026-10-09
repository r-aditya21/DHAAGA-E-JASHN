// Creates an admin account, or promotes an existing user to admin.
//
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='min-8-chars' ADMIN_NAME='You' npm run create-admin
//   npm run create-admin -- you@example.com 'min-8-chars' 'Your Name'
//
// (Values can also live in backend/.env.)

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
require("dotenv").config();

const User = require("../models/User");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const run = async () => {
  const [argEmail, argPassword, argName] = process.argv.slice(2);

  const email = (argEmail || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = argPassword || process.env.ADMIN_PASSWORD || "";
  const name = (argName || process.env.ADMIN_NAME || "Admin").trim();

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }

  if (!EMAIL_REGEX.test(email)) {
    throw new Error("Provide a valid ADMIN_EMAIL (or pass it as the first argument)");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await User.findOne({ email });

  if (existing) {
    // Promote only. Never overwrite the password of an existing account.
    if (existing.role === "admin") {
      console.log(`${email} is already an admin. Nothing to do.`);
    } else {
      existing.role = "admin";
      await existing.save();
      console.log(`Promoted existing user ${email} to admin.`);
    }

    return;
  }

  if (password.length < 8 || Buffer.byteLength(password) > 72) {
    throw new Error("ADMIN_PASSWORD must be 8 to 72 characters long");
  }

  await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 12),
    role: "admin",
  });

  console.log(`Created admin ${email}. You can now sign in at /login.`);
};

run()
  .catch((error) => {
    console.error(`create-admin failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
