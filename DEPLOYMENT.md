# Deploying Pnapana

Everything in this guide is host-agnostic. Where your host's control panel names
things differently, the concept is the same.

---

## 1. Requirements

| Need | Minimum | Why |
|---|---|---|
| PHP | **8.1+** | 7.4 has had no security patches since Nov 2022 |
| PHP extensions | `pdo_mysql`, `fileinfo`, `curl`, `mbstring`, `openssl`, `json` | Already verified against this codebase |
| MySQL / MariaDB | 5.7+ / 10.3+ | |
| Node.js | Only if you deploy the frontend as a server app — see step 5 | |

The PHP code was scanned for 8.x breaking changes (`each()`, `create_function()`,
curly string offsets, `mysql_*`, `ereg`) — none are present. It should move to
8.1 unchanged. Confirm with:

```bash
docker run --rm -v "$PWD:/app" -w /app php:8.2-cli sh -c "find backend -name '*.php' -exec php -l {} \;"
```

---

## 2. Database (via phpMyAdmin — no SSH needed)

In cPanel → **MySQL Databases**:

1. Create a database (cPanel prefixes it, e.g. `youracct_pnapana`).
2. Create a user with a strong password.
3. Add the user to the database with **ALL PRIVILEGES**.

Write down the *prefixed* names — those are what go in `config.php`.

Then cPanel → **phpMyAdmin** → select the database → **Import** → upload
`backend/install.sql` → Go.

That one file creates all 13 tables and seeds the plans and default settings.
It is safe to import twice. You do **not** need the CLI migration scripts in
`backend/migrations/` — those exist for servers where you have SSH.

## 3. Backend configuration

Copy the template and fill it in:

```bash
cp backend/config.example.php backend/config.php
```

Set every value. The app **refuses to start** in production if the database user
is still `root` or the password is blank or `CHANGE_ME` — that is deliberate.

| Setting | Value |
|---|---|
| `APP_ENV` | `production` (hides PHP errors from visitors) |
| `DB_USER` / `DB_PASS` | The dedicated user from step 2 |
| `ALLOWED_ORIGINS` | Your exact frontend origins, comma-separated. **No wildcards.** |
| `JWT_SECRET` | `php -r "echo bin2hex(random_bytes(32));"` — changing it logs everyone out |
| `GEMINI_API_KEY` | Your key from aistudio.google.com |

`backend/config.php` is gitignored and must never be committed.

---

## 4. File permissions

```bash
mkdir -p backend/storage/payment_screenshots
chmod 750 backend/storage backend/storage/payment_screenshots
chown -R <web-user>:<web-group> backend/storage
```

Payment screenshots are private: they are served only through
`get_payment_screenshot.php`, which checks that the requester is the owner or an
admin. The `.htaccess` files block direct URL access as a second layer.

**Verify both layers after deploying** (step 7).

---

## 5. Frontend (static export — confirmed working)

The app is a pure client-side SPA, so it builds to plain HTML/CSS/JS with **no
Node.js required on the server**. `next.config.ts` is already set to
`output: "export"`.

```bash
cd frontend
cp .env.production.example .env.production
#   NEXT_PUBLIC_API_URL=https://your-domain.com/backend/api
npm ci
npm run build
```

That writes ~255 files (~2.5 MB) to `frontend/out/`.

### Where the files go

The exported HTML references assets with **root-absolute** paths
(`/_next/static/...`), so it must be served from the **domain root** — not a
subfolder. On cPanel:

```
public_html/
├── index.html          <- everything from frontend/out/
├── _next/
├── login/
├── dashboard/
├── ...
└── backend/            <- the backend/ folder from this repo
    ├── api/
    ├── config.php
    ├── .htaccess
    └── storage/
```

Upload the **contents** of `frontend/out/` into `public_html/`, then the whole
`backend/` folder alongside it. The API then lives at
`https://your-domain.com/backend/api/...`, matching `NEXT_PUBLIC_API_URL`.

> If you must serve from a subfolder, set `basePath` in `next.config.ts` and
> rebuild — otherwise every asset 404s.

`NEXT_PUBLIC_API_URL` is baked into the bundle at build time. Changing it later
means rebuilding and re-uploading. An `https` page cannot call an `http` API, so
enable SSL (cPanel: AutoSSL / Let's Encrypt) before going live.

### Client-side routing

Because this is a static export with `trailingSlash: true`, every route is a real
directory with its own `index.html` — so deep links like `/dashboard/` work
without any rewrite rules. Plant pages use `/plant?id=5`.

## 6. Create your admin (browser, no SSH needed)

`install.sql` deliberately creates no admin account.

1. Open `backend/config.php` and note your `SETUP_KEY` (generate a fresh random
   one for production).
2. Visit `https://your-domain.com/backend/setup_admin.php?key=YOUR_SETUP_KEY`
3. Fill in name, email, and a password of at least 12 characters.
4. **Delete `backend/setup_admin.php` from the server.**

The page guards itself three ways: it refuses to run once any admin exists, it
requires the key, and it tells you to delete it. Deleting it is still the right
move — do not leave it on a live site.

## 7. Post-deploy verification

Run these against the live domain. The first five **must** fail.

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://your-domain.com/backend/config.php          # 403
curl -s -o /dev/null -w "%{http_code}\n" https://your-domain.com/backend/db.php              # 403
curl -s -o /dev/null -w "%{http_code}\n" https://your-domain.com/backend/schema.sql          # 403
curl -s -o /dev/null -w "%{http_code}\n" https://your-domain.com/backend/api/auth.php        # 403
curl -s -o /dev/null -w "%{http_code}\n" https://your-domain.com/backend/storage/            # 403
curl -s -o /dev/null -w "%{http_code}\n" https://your-domain.com/backend/api/get_site_status.php  # 200
```

Confirm CORS is locked — the second command must return **no** allow header:

```bash
curl -sD- -o /dev/null https://your-domain.com/backend/api/get_site_status.php -H "Origin: https://your-domain.com"
curl -sD- -o /dev/null https://your-domain.com/backend/api/get_site_status.php -H "Origin: https://evil.example.com"
```

---

## 8. Before you take real payments

- **Set your UPI ID.** Admin → Settings → Payments. It ships blank on purpose:
  until it is set, the subscription page refuses to accept payments rather than
  showing customers a wrong address to pay.
- **Check that email actually sends.** Password reset uses PHP `mail()`, which
  works on most cPanel hosts but is sometimes disabled. Test it with a real
  address after deploying; if nothing arrives, ask your host whether `mail()` is
  enabled or switch `backend/mailer.php` to SMTP.
- **Set `APP_URL`** in `config.php` to your real domain — reset links are built
  from it, so a wrong value sends users to a dead page.

## 9. Still outstanding

Known gaps, not oversights:

- **No email verification.** Anyone can register with any address.
- **One shared Gemini key.** Every AI call bills your key. There is no per-user
  quota or spend cap, so a heavy user (or an abusive one) runs up your bill.
- **Backups.** Set up `mysqldump` on a schedule. Also back up
  `backend/storage/payment_screenshots/` — those files exist nowhere else.
- **Rate limiting is per-server, file-based.** Fine for one host; it does not
  coordinate across multiple web servers.
