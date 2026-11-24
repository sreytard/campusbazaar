# CampusBazaar

A student marketplace for your campus. Buy and sell books, gear and services, message sellers, save items, and moderate from an admin panel.

## Run it

Needs Node.js 18 or newer. There is nothing to install.

```
npm start
```

Open http://localhost:3000

## Demo logins

| Role    | Email              | Password   |
|---------|--------------------|------------|
| Admin   | admin@campus.edu   |provided separately to the teacher (the online site uses a private password, not the default one in the code). |
| Student | riya@campus.edu    | student123 |
| Student | aman@campus.edu    | student123 |

Change these before you deploy anywhere public.

## Features

- Cinematic homepage: parallax hero, pinned scroll story with crossfading scenes, live "fresh on campus" listings
- Sign up and sign in (scrypt password hashing, signed HttpOnly session cookie)
- Browse with search, category filter and sorting
- Sell page with photo upload (PNG, JPEG, WebP up to 3.5 MB)
- Listing page: save to wishlist, mark as sold, delete
- Private chat between buyer and seller, with unread badge
- Admin panel: stats, suspend or unsuspend students, delete any listing
- Rate limits on login, signup, posting and messaging

## Project layout

```
server.js        API, auth, static file server (no dependencies)
public/          index.html, style.css, app.js (single-page app)
data/db.json     created on first run (your database)
uploads/         listing photos
```

## Make the homepage yours

The three scroll scenes are CSS gradients in `public/style.css` (`.s0 .bg`, `.s1 .bg`, `.s2 .bg`). Replace each with a real campus photo:

```css
.s0 .bg { background: url("/campus-books.jpg") center/cover; }
```

Put the image files inside `public/`.

## Reset the data

Stop the server, delete `data/db.json`, start again. Demo data is re-created.

## Before going live

- Serve it over HTTPS and add the `Secure` flag to the session cookie
- Back up `data/db.json` and `uploads/`
- For thousands of users, move the JSON store to SQLite or Postgres
