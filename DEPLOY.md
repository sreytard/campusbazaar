# Putting CampusBazaar online

CampusBazaar is one Node process, so it runs on any host that can run `npm start`. Check your host's current docs for exact button names, since dashboards change.

## Environment variables

| Name | What it does |
|------|--------------|
| `PORT` | Set automatically by most hosts |
| `NODE_ENV=production` | Adds the Secure flag to the login cookie (needs HTTPS) |
| `ADMIN_PASSWORD` | Admin password used when the database is first created |
| `DATA_DIR` | Folder for `db.json`. Point this at a persistent disk |
| `UPLOAD_DIR` | Folder for listing photos. Also a persistent disk |

## Steps (Render, Railway, Fly and similar)

1. Put the project in a GitHub repository. The `.gitignore` already keeps your database and photos out.
2. Create a new Web Service from that repository. Build command: `npm install` (it installs nothing, that is fine). Start command: `npm start`.
3. Add the environment variables above.
4. Attach a persistent disk or volume, for example mounted at `/var/data`, then set `DATA_DIR=/var/data` and `UPLOAD_DIR=/var/data/uploads`.
5. Deploy and open the URL your host gives you.

## Important

Free tiers usually wipe the disk on every restart, which deletes accounts, listings and photos. That is fine for a demo, not for real users. For real use, pay for a persistent disk, or move the data to a hosted database.

Set `ADMIN_PASSWORD` before the first start. If the site already ran once, delete `db.json` on the server so the admin is re-created with the new password.
