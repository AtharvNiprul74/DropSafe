# Dropout Prediction Portal — Auth Backend

A minimal Express backend covering the authentication slice of the Student
Dropout Prediction System SRS (JWT auth, RBAC for Admin/Mentor/Student,
password hashing). It's deliberately small — this is the auth foundation
you can build the dashboard/mentor/chatbot features on top of.

## What changed vs. your draft, and why

1. **No token stored in the database.** Your draft saved the JWT on the
   user document and re-used the *same token forever* on every login.
   That means a token never truly expires (login always resets the same
   value) and there's no way to invalidate just one session. Now a fresh
   JWT is signed on every login/signup with a real expiry
   (`JWT_EXPIRES_IN`, default 1h), and nothing is persisted for it.

2. **Blocklist for logout.** Since JWTs are stateless, logging out
   normally can't truly kill a token before it expires. `utils/blocklist.js`
   keeps an in-memory `Set` of tokens that have been explicitly logged
   out; `middleware/auth.js` checks it on every request. This matches
   your "blocklist using simple js list" requirement. It's process-local,
   which is fine for one server instance — see Limitations below.

3. **Role field (RBAC).** The SRS (3.6.3) calls for Admin / Mentor /
   Student roles. `mongo.js` adds a `role` enum, signup lets you pick one,
   and the JWT payload carries it so `requireRole(...)` can gate routes
   later (e.g. only mentors/admins hitting a `/dashboard` API).

4. **Validation & error messages.** Signup now checks required fields,
   matching passwords, and duplicate username/email, and renders the
   form again with an inline error instead of a bare `res.send(...)`.

5. **Protected routes via middleware** (`requireAuth`) instead of
   checking `req.cookies.jwt` inline in the route handler — `/home` and
   `/logout` use it, and it's reusable for future protected pages
   (dashboard, mentor portal, etc).

## Project structure

```
dropout-auth-backend/
├── server.js              # routes: /, /login, /signup, /home, /logout
├── mongo.js                # Mongo connection + User model
├── middleware/auth.js       # requireAuth, attachUserIfPresent, requireRole
├── utils/blocklist.js       # in-memory logged-out-token store
├── templates/
│   ├── login.hbs
│   ├── signup.hbs
│   └── home.hbs             # shows a different section per role
├── public/style.css
├── package.json
└── .env.example
```

## Running it

```bash
npm install
cp .env.example .env      # then set JWT_KEY to a long random string
# make sure MongoDB is running locally, or set MONGO_URI to your instance
npm start
```

Visit `http://localhost:3000`.

## Limitations / next steps (be aware of these)

- **Blocklist is in-memory.** If you run multiple server instances
  (behind a load balancer) or restart the process, the blocklist resets.
  For production, move it to Redis or a Mongo collection with a TTL
  index equal to `JWT_EXPIRES_IN` — the interface in `blocklist.js`
  (`blockToken`, `isBlocked`) is intentionally small so it's a drop-in
  swap.
- **No rate limiting** on `/login` yet — the SRS mentions 100 req/min on
  the API; add `express-rate-limit` when you wire up the rest of the API.
- **No password reset / email verification** — out of scope for this
  minimal auth slice.
- **`secure: true` on the cookie is commented out** — enable it once
  you're serving over HTTPS (required in production).
