const mongoose = require("mongoose");
require("dotenv").config();

mongoose
  .connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/dropout_auth")
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error:", err.message));

// Minimal user schema — only what auth needs.
// Note: we no longer store the JWT on the user document (see README for why).
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["student", "mentor", "admin"],
      default: "student",
    },
  },
  { timestamps: true }
);

const Collection = mongoose.model("User", userSchema);

module.exports = Collection;
