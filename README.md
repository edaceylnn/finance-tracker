# Finance Tracker

React Native expense and investment tracker with a Node.js (Express + MongoDB) API and JWT authentication.

## Project layout

| Path | Role |
|------|------|
| [App.js](App.js) | App entry: navigation, auth, tabs |
| [src/services/api.js](src/services/api.js) | HTTP client (`fetch`) |
| [src/config/api.js](src/config/api.js) | API base URL (emulator defaults + optional override) |
| [backend/index.js](backend/index.js) | Express entry: mounts routes |
| [backend/models/](backend/models/) | Mongoose `User`, `Record` |
| [backend/routes/](backend/routes/) | `/auth`, `/records` routers |
| [backend/middleware/auth.js](backend/middleware/auth.js) | JWT `authMiddleware` |
| [backend/utils/date.js](backend/utils/date.js) | `normalizeRecordDate` |

Metro registers the app from [index.js](index.js) (`import App from './App'` resolves to `App.js`).

## Prerequisites

- Node.js 22+
- MongoDB (local or Atlas)
- Xcode / Android Studio for simulators or physical devices

## Backend

```sh
cd backend
cp .env.example .env
# Edit .env: set MONGO_URI and JWT_SECRET
npm install
node index.js
```

Server listens on **port 3001**.

## Mobile app

Install dependencies from the repository root:

```sh
npm install
```

### API URL (simulator vs physical device)

By default the client uses:

- **Android emulator:** `http://10.0.2.2:3001`
- **iOS simulator:** `http://127.0.0.1:3001` (see [src/config/api.js](src/config/api.js))

### Cold start on a physical phone (everything stopped)

Do this order:

1. **MongoDB** running (local or Atlas in `backend/.env`).
2. **Wi-Fi** — Phone and Mac on the same network.
3. **[src/config/api.js](src/config/api.js)** — `DEV_API_HOST` = your Mac’s Wi-Fi IP (run `ipconfig getifaddr en0` or `en1` if empty).
4. **Terminal 1 (project root):** `npm run dev:phone` — starts **backend :3001** and **Metro :8081** on all interfaces. Leave it open.
5. **Terminal 2 (project root):** connect iPhone via USB, trust the Mac, then:
   ```sh
   npx react-native run-ios --device
   ```
   Do **not** use `--device true` (wrong). For Android: `npx react-native run-android` with USB debugging.
6. If the app shows a red “could not connect to Metro” screen: **Dev Menu** → **Configure Bundler** / debug server → `YOUR_MAC_IP:8081`.
7. **Firewall** — allow Node/Metro if macOS blocks incoming connections.

**iOS signing:** Xcode → project → **Signing & Capabilities** → select your **Team** so the app installs on device. **Android:** enable **USB debugging** on the phone.

### Run Metro and the app (simulator / everyday)

```sh
npm start
# other terminal:
npm run ios
# or
npm run android
```

On a **physical device**, use `npm run dev:phone` (backend + Metro on LAN) or `npm run start:lan` (Metro only, if backend is already running elsewhere).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run lint` | ESLint |
| `npm test` | Jest |
| `npm run start:lan` | Metro bound to `0.0.0.0` (phone can load JS over Wi-Fi) |
| `npm run dev:phone` | Backend (3001) + Metro (8081, `0.0.0.0`) together |

## CI

GitHub Actions runs ESLint and Jest on push and pull requests (see [.github/workflows/ci.yml](.github/workflows/ci.yml)).

## Authentication

- JWT is stored in AsyncStorage; on launch the app checks the session with `GET /auth/me`.
- Invalid or expired tokens clear local storage and show the login screen.

## Record dates

Records store `date` as UTC in MongoDB. The API returns ISO strings. The app parses and displays dates in Turkish locale where needed.
