# CampusBazaar

A student marketplace for your campus. Buy and sell books, gear and services, message sellers, rate them, save items, and moderate from an admin panel.

**Live site:** https://campusbazaar-us8i.onrender.com/

**GitHub repository:** https://github.com/sreytard/campusbazaar

> The live site runs on a free plan, so the first load may take up to a minute.

## Demo logins

| Role    | Email            | Password   |
|---------|------------------|------------|
| Admin   | admin@campus.edu | Shared separately with the teacher |
| Student | riya@campus.edu  | student123 |
| Student | aman@campus.edu  | student123 |
| Student | kabir@campus.edu | student123 |

The live site uses a private admin password, not the default one in the code. Locally, the admin password is `admin123` unless you set `ADMIN_PASSWORD`.

## Features

- Cinematic homepage with parallax hero, scroll story and live "fresh on campus" listings
- Sign up and sign in (scrypt password hashing, signed HttpOnly session cookie)
- Browse with search, category filter and sorting
- Sell page with photo upload (PNG, JPEG, WebP up to 4 MB)
- Listing page: save to wishlist, mark as sold, edit, delete
- Private chat between buyer and seller, with unread badge
- Seller ratings (1 to 5 stars, only after messaging the seller) and a Report button on every listing
- Account page to change name, hostel and password
- Admin panel: stats, reports (open or dismiss), suspend students, reset a student's password, delete any listing
- Exam night mode (dark theme with playful "Prof aaya!" screen)
- Mobile menu and responsive layout
- Rate limits on login, signup, posting and messaging

## Tech stack

- **Backend:** Node.js (built-in `http` module, no framework)
- **Frontend:** HTML, CSS and vanilla JavaScript (single-page app)
- **Database:** MongoDB Atlas online, or a local JSON file when run locally
- **Photos:** Cloudinary online, or the local `uploads/` folder when run locally
- **Hosting:** Render, with the code deployed from this GitHub repository

## Run it locally

Needs Node.js 18 or newer.

```
npm start
```

Open http://localhost:3000

With no environment variables set, the app stores data in `data/db.json` and photos in `uploads/`, so nothing else is needed. Demo data is created on the first run.

To reset local data, stop the server, delete `data/db.json`, and start again.

## Environment variables (for deployment)

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB Atlas connection string. If set, data is stored in Atlas |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | If all three are set, photos are stored in Cloudinary |
| `ADMIN_PASSWORD` | Admin password, used when the database is first created |
| `NODE_ENV` | Set to `production` to add the Secure flag to the session cookie |

Do not put these values in the code or in this repository. Set them in the host's environment settings. See `DEPLOY.md` for the deployment steps.

## Project layout

```
server.js        API, auth, storage and static file server
public/          index.html, style.css, app.js (single-page app)
DEPLOY.md        deployment steps
Dockerfile       container setup
```

Locally, `data/db.json` and `uploads/` are created on first run.
