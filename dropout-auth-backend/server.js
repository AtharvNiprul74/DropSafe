const express = require("express");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const hbs = require("hbs");
require("dotenv").config();

// Template helper used by home.hbs to show role-specific sections
hbs.registerHelper("eq", (a, b) => a === b);

const Collection = require("./mongo");
const { requireAuth, attachUserIfPresent } = require("./middleware/auth");
const { blockToken } = require("./utils/blocklist");

const app = express();

const JWT_KEY = process.env.JWT_KEY;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
const COOKIE_MAX_AGE_MS = Number(process.env.COOKIE_MAX_AGE_MS) || 3600000;

if (!JWT_KEY) {
  console.warn("WARNING: JWT_KEY is not set in .env — set it before running in production.");
}

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));

const templatePath = path.join(__dirname, "templates");
const publicPath = path.join(__dirname, "public");

app.set("view engine", "hbs");
app.set("views", templatePath);
app.use(express.static(publicPath));

// ---------- helpers ----------

async function hashPass(password) {
  return bcrypt.hash(password, 10);
}

async function compare(userPass, hash) {
  return bcrypt.compare(userPass, hash);
}

function issueTokenCookie(res, user) {
  const token = jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    JWT_KEY,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.cookie("jwt", token, {
    maxAge: COOKIE_MAX_AGE_MS,
    httpOnly: true,
    sameSite: "lax",
    // secure: true, // enable once served over HTTPS
  });

  return token;
}

// ---------- routes ----------

// Landing page: if logged in show home, otherwise show login
app.get("/", attachUserIfPresent, (req, res) => {
  if (req.user) return res.render("home", { user: req.user });
  res.render("login");
});

app.get("/signup", (req, res) => {
  res.render("signup", { roles: ["student", "mentor", "admin"] });
});

app.post("/signup", async (req, res) => {
  try {
    const { username, email, password, confirmPassword, role } = req.body;

    if (!username || !email || !password) {
      return res.render("signup", {
        error: "Username, email and password are required.",
        roles: ["student", "mentor", "admin"],
      });
    }

    if (password !== confirmPassword) {
      return res.render("signup", {
        error: "Passwords do not match.",
        roles: ["student", "mentor", "admin"],
      });
    }

    const existing = await Collection.findOne({
      $or: [{ username }, { email }],
    });

    if (existing) {
      return res.render("signup", {
        error: "A user with that username or email already exists.",
        roles: ["student", "mentor", "admin"],
      });
    }

    const user = await Collection.create({
      username,
      email,
      password: await hashPass(password),
      role: ["student", "mentor", "admin"].includes(role) ? role : "student",
    });

    issueTokenCookie(res, user);

    console.log(`Signup successful: ${user.username} (${user.role})`);
    res.redirect("/home");
  } catch (err) {
    console.error(err);
    res.render("signup", {
      error: "Something went wrong while creating your account.",
      roles: ["student", "mentor", "admin"],
    });
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await Collection.findOne({ username });

    if (!user) {
      return res.render("login", { error: "Invalid username or password." });
    }

    const passOk = await compare(password, user.password);
    if (!passOk) {
      return res.render("login", { error: "Invalid username or password." });
    }

    issueTokenCookie(res, user);
    res.redirect("/home");
  } catch (err) {
    console.error(err);
    res.render("login", { error: "Something went wrong. Please try again." });
  }
});

app.get("/home", requireAuth, (req, res) => {
  res.render("home", { user: req.user });
});

app.post("/logout", requireAuth, (req, res) => {
  blockToken(req.token); // token can never be reused, even before it expires
  res.clearCookie("jwt");
  res.redirect("/login");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
