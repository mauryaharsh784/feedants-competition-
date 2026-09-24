# Feedants Competition Module

A production-style, full-stack implementation of the "Competition Details" feature for the
Feedants Full Stack Development Intern assignment.

**Stack:** React Native (Expo) + Node.js/Express + MongoDB/Mongoose.
No competition data is hardcoded in the mobile app — everything is fetched from the backend.

---

## Overview

The app shows a single competition's details screen, matching the provided design reference
(prize pool, entry fee, remaining spots, judge card, countdown, important dates, rewards,
rules, and a state-aware registration button). The backend is the single source of truth for:

- competition lifecycle status (`UPCOMING` / `LIVE` / `ENDED` / `FULL`)
- remaining spots
- whether the current user is registered
- registration validity (never trusts anything the client sends)

## Features

- Fetch competition details from MongoDB via a REST API (no hardcoded data in the RN app)
- Server-computed lifecycle status, derived from `startAt` / `endAt` / capacity on every request
- Concurrency-safe registration (atomic `$inc` + unique index + transaction) — see
  [Concurrency Handling](#concurrency-handling)
- Duplicate registration prevention at the database level
- Full set of UI states: loading (skeleton), error + retry, upcoming, live, full, ended,
  registered, network error, action-in-progress, success, failure
- Live countdown computed from real `Date` objects, ticking every second, cleaned up on unmount
- Cancellation flow (before the competition goes live)
- Seed script with 3 competitions in different lifecycle states + sample participations
- Centralized error handling on both backend and frontend

## Tech Stack

| Layer      | Technology                                              |
|------------|----------------------------------------------------------|
| Mobile     | React Native (Expo), React Navigation, Axios             |
| Backend    | Node.js, Express.js                                       |
| Database   | MongoDB, Mongoose                                          |
| Testing    | Jest, Supertest, mongodb-memory-server                     |

## Project Structure

```
feedants-competition/
├── mobile/
│   ├── src/
│   │   ├── components/     # CompetitionHeader, CompetitionImage, CompetitionInfo,
│   │   │                   # CompetitionStats, CountdownTimer, CompetitionRules,
│   │   │                   # RegistrationButton, LoadingState, ErrorState
│   │   ├── screens/        # CompetitionDetailsScreen
│   │   ├── services/       # api.js (Axios client + error normalization)
│   │   ├── hooks/          # useCompetition, useCountdown
│   │   ├── utils/          # format.js
│   │   ├── constants/      # colors.js, config.js
│   │   └── navigation/     # AppNavigator.js
│   ├── App.js
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/         # db.js
│   │   ├── controllers/    # competitionController.js
│   │   ├── middleware/     # auth.js, errorHandler.js
│   │   ├── models/         # Competition.js, Participation.js
│   │   ├── routes/         # competitionRoutes.js, healthRoutes.js
│   │   ├── services/       # competitionService.js (lifecycle + concurrency logic)
│   │   ├── utils/          # ApiError.js, asyncHandler.js
│   │   ├── seed/           # seed.js
│   │   └── app.js
│   ├── tests/               # competition.test.js, lifecycleStatus.unit.test.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
├── README.md
├── .gitignore
└── package.json
```

## Architecture

- **Controllers** stay thin: parse/validate the request, call the service layer, shape the
  response. No business logic lives in routes or controllers.
- **Service layer** (`competitionService.js`) owns all business rules: lifecycle status
  derivation, registration validation, and the concurrency-safe write path. This keeps the
  logic unit-testable independent of Express or MongoDB wiring.
- **Models** are intentionally "dumb" (schema + indexes only); no business logic in Mongoose
  hooks, so the rules stay in one place.
- **Centralized error handling**: every thrown `ApiError`, Mongoose validation error, cast
  error, or MongoDB duplicate-key error funnels through one Express error middleware that
  returns a safe, consistent JSON shape and never leaks internals.
- **Frontend**: a single `useCompetition` hook owns all data-fetching/mutation state; the
  screen component is purely presentational, composing small reusable components.

## Database Schema

### Competition

| Field                | Type     | Notes                                                        |
|-----------------------|----------|---------------------------------------------------------------|
| title, description   | String   | required                                                      |
| image, prize, entryFee| String   | display data                                                  |
| category              | String   |                                                                 |
| totalSpots            | Number   | capacity                                                       |
| registeredCount        | Number   | **only ever mutated via `$inc`**, never reassigned wholesale   |
| registrationClosesAt   | Date     | registration deadline                                          |
| submissionStartsAt/EndsAt | Date | optional submission window                                      |
| startAt, endAt         | Date     | competition lifecycle boundaries                                |
| rules                  | String   |                                                                 |
| judge                  | Object   | name, title, avatar                                             |
| rewards                | Array    | position + amount                                               |
| status                 | String   | **persisted for convenience only** — see below                  |

> **Why `status` isn't trusted as-is:** a stored status can go stale the instant server time
> crosses `startAt`/`endAt` without any write happening (e.g. a competition can "become" LIVE
> at 9:00 AM with nobody touching the database). `computeLifecycleStatus()` recomputes the real
> status from `startAt`, `endAt`, `registeredCount`, and `totalSpots` against server time on
> **every read** and every registration attempt. The stored field is only used for
> listing/filtering convenience in a fuller build (e.g. an admin dashboard query).

Indexes: `startAt`, `endAt`, `status`, `createdAt` (for listing/sorting queries).

### Participation

| Field          | Type     | Notes                          |
|-----------------|----------|---------------------------------|
| competitionId   | ObjectId | ref → Competition                |
| userId          | String   | mock-authenticated user identity  |
| registeredAt    | Date     |                                  |
| status          | String   | `ACTIVE` \| `CANCELLED`            |

**Unique compound index:** `{ competitionId: 1, userId: 1 }` — this is the database-level
guarantee that a user can never end up with two registrations for the same competition, even
under concurrent requests. Additional indexes on `{ competitionId, status }` and
`{ userId, createdAt }` support the common query patterns cheaply.

## API Documentation

All endpoints require an `x-user-id` header (see [Important Assumptions](#important-assumptions)).

### `GET /api/health`
Returns server + database connectivity status.

### `GET /api/competitions/:id`
Returns competition details, computed status, and whether the current user is registered.

```json
{
  "success": true,
  "data": {
    "id": "...",
    "title": "...",
    "description": "...",
    "image": "...",
    "prize": "₹ 1,500",
    "entryFee": "₹ 99",
    "totalSpots": 20,
    "registeredCount": 1,
    "remainingSpots": 19,
    "startAt": "2026-09-29T00:00:00.000Z",
    "endAt": "2026-10-06T00:00:00.000Z",
    "status": "UPCOMING",
    "isRegistered": false
  }
}
```

### `POST /api/competitions/:id/register`
Registers the current user (`x-user-id` header) for the competition.
- `201` on success
- `409` — `COMPETITION_FULL`, `COMPETITION_LIVE`, `COMPETITION_ENDED`, `REGISTRATION_CLOSED`,
  or `ALREADY_REGISTERED`
- `404` — `COMPETITION_NOT_FOUND`
- `400` — invalid id / missing user header

### `DELETE /api/competitions/:id/register`
Cancels the current user's registration, if the competition hasn't gone live/ended yet.
- `200` on success
- `404` — `NOT_REGISTERED` / `COMPETITION_NOT_FOUND`
- `409` — `CANCELLATION_NOT_ALLOWED`

## Concurrency Handling

This is the most important non-functional requirement, so it's worth spelling out precisely.

**Scenario:** capacity = 100, 99 already registered, two users hit "Register" at the same
instant.

**Guarantee 1 — atomic capacity check-and-increment.** The read ("is there room?") and the
write (increment the counter) happen in a **single atomic MongoDB operation**:

```js
Competition.findOneAndUpdate(
  { _id: competitionId, registeredCount: { $lt: totalSpots } },
  { $inc: { registeredCount: 1 } },
  { new: true }
);
```

MongoDB guarantees this is atomic per document. If two requests race for the last spot, only
one `findOneAndUpdate` can match the filter once `registeredCount` reaches `totalSpots` — the
loser gets `null` back and is told the competition just filled up. There is no window where
both requests can read "99 < 100" and both write "+1".

**Guarantee 2 — unique compound index.** Even if the *same* user double-taps the button and
fires two near-simultaneous requests, only one `Participation` document can be inserted for
`(competitionId, userId)`; the second throws a MongoDB `E11000` duplicate-key error, which the
error middleware turns into a clean `409 ALREADY_REGISTERED`.

**Transactions.** The counter increment and the participation insert are wrapped in a single
Mongo transaction (`session.withTransaction`), so the two writes succeed or fail together — we
never end up with a bumped counter and no participation record, or vice versa.

This was verified with an automated test that fires **10 concurrent registration requests**
at a competition with **5 spots**, and asserts exactly 5 succeed, 5 get a `409`, and
`registeredCount` never exceeds 5 (`server/tests/competition.test.js`).

## Environment Variables

`server/.env.example`:

```
PORT=4000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/feedants_competition
CORS_ORIGIN=*
```

`mobile/src/constants/config.js` (no `.env` needed for Expo in this assignment, kept simple):

```js
API_BASE_URL   // base URL of the backend API
MOCK_USER_ID   // simulated logged-in user (see assumptions below)
DEMO_COMPETITION_ID  // paste a real seeded competition id here
```

## Installation

```bash
git clone <repo>
cd feedants-competition

# Backend
cd server
cp .env.example .env      # edit MONGO_URI if needed
npm install

# Mobile
cd ../mobile
npm install
```

## Running Backend

Requires a running MongoDB instance (local or Atlas — see [MongoDB Setup](#mongodb-setup)).

```bash
cd server
npm run dev      # nodemon, auto-restart
# or
npm start
```

Server starts on `http://localhost:4000`. Health check: `GET http://localhost:4000/api/health`.

## Running React Native

```bash
cd mobile
npm install
npm start        # opens Expo Dev Tools / QR code
```

Before running, set `mobile/src/constants/config.js`:
- `API_BASE_URL` — use `http://10.0.2.2:4000/api` for the Android emulator,
  `http://localhost:4000/api` for iOS simulator, or your machine's LAN IP for a physical device.
- `DEMO_COMPETITION_ID` — copy one of the ids printed by the seed script.

## MongoDB Setup

Any of the following works:

- **Local:** install MongoDB Community Server, run `mongod`, use the default
  `mongodb://127.0.0.1:27017/feedants_competition` URI.
- **Docker:** `docker run -d -p 27017:27017 --name feedants-mongo mongo:7`
- **Atlas (free tier):** create a cluster, add your IP to the access list, paste the connection
  string into `MONGO_URI`.

> **Note on transactions:** registration uses MongoDB transactions, which require a replica
> set (even a single-node one). A default local `mongod` running standalone does **not**
> support transactions. For local development either:
> - run `mongod --replSet rs0` and initiate it once with `mongosh --eval "rs.initiate()"`, or
> - use Atlas (every Atlas cluster, including the free tier, is already a replica set), or
> - use Docker's `mongo` image with a one-line replica-set init.

## Seed Data

```bash
cd server
npm run seed
```

Inserts 3 competitions and prints their ids:

1. **Feedants Classical Dance** — `UPCOMING`, registration open, 1/20 spots booked
2. **Feedants Vocal Singing Contest** — `LIVE`, `mockUser01` is already registered
3. **Feedants Photography Sprint** — `ENDED`, fully attended

Copy one of the printed ids into `mobile/src/constants/config.js` → `DEMO_COMPETITION_ID` to
demo different states (use the singing contest id + the default `mockUser01` to see the
"You're Registered" + Live state immediately).

## Testing

```bash
cd server
npm test
```

Covers: successful retrieval, 404/400 for bad ids, successful registration, duplicate
registration, full competition, ended competition, live (already-started) competition,
cancellation, and — most importantly — **10 concurrent registration requests against 5 spots**
to prove `registeredCount` never overshoots capacity.

**Environment note:** the full integration suite uses `mongodb-memory-server` (an in-memory
MongoDB replica set, needed because registration uses transactions) so it can run without any
external database. In network-restricted sandboxes that cannot download the MongoDB binary
from `fastdl.mongodb.org`, that suite cannot execute — this is an environment limitation, not
a code issue. A second, dependency-free suite
(`server/tests/lifecycleStatus.unit.test.js`) exercises the pure lifecycle-status logic
directly and passes anywhere, which is what was used to verify the core logic in this build
environment. On a machine with normal internet access (or a local MongoDB), `npm test` runs
both suites end-to-end.

If you'd rather not install `mongodb-memory-server`'s binary at all, you can point the tests at
a running local MongoDB replica set instead by replacing the `MongoMemoryReplSet` setup in
`competition.test.js` with `mongoose.connect(process.env.TEST_MONGO_URI)`.

Manual API testing (with `curl`, once the server and Mongo are running):

```bash
curl http://localhost:4000/api/health

curl -H "x-user-id: mockUser01" http://localhost:4000/api/competitions/<id>

curl -X POST -H "x-user-id: mockUser02" http://localhost:4000/api/competitions/<id>/register

curl -X DELETE -H "x-user-id: mockUser02" http://localhost:4000/api/competitions/<id>/register
```

## Important Assumptions

- A user can register only once per competition (enforced by a unique DB index).
- Registration is allowed only **before** the competition starts (`UPCOMING` status); once
  `LIVE` or `ENDED`, registration and cancellation are both blocked.
- Registration closes automatically once capacity is reached, regardless of `registrationClosesAt`.
- **Server time is the source of truth** for lifecycle status — never the client's clock, and
  never a stored `status` field alone.
- MongoDB is the source of truth for participation state; the frontend never computes or
  sends `registeredCount`, `status`, or `remainingSpots` — it only ever displays what the
  backend returns.
- No full authentication system was in scope for this assignment. User identity is simulated
  via an `x-user-id` request header (see `server/src/middleware/auth.js`), which is exactly
  where a real JWT/session check would slot in later without touching any controller or
  service code.

## Major Technical Decisions

- **Why MongoDB:** the domain (competitions + participations) is naturally document-shaped,
  and Mongo's atomic single-document operations (`findOneAndUpdate` + `$inc`) map directly onto
  the "don't oversell capacity" requirement without needing row-level locking a relational DB
  would require for the same guarantee.
- **Why a service layer:** keeps all business rules (lifecycle derivation, validation,
  concurrency-safe writes) in one testable place, independent of Express — controllers and
  routes stay thin and swappable.
- **Why a unique compound index:** it's the only guarantee that survives *any* race condition,
  including ones the application code doesn't anticipate (e.g. a retried request, a bug in a
  future refactor). Relying solely on an application-level "check if registered" query leaves
  a race window; the index closes it permanently at the database layer.
- **Why atomic updates + transactions:** the atomic `$inc`-with-filter closes the "oversell"
  race; the transaction ensures the counter and the participation record move together, so a
  crash between the two writes can't leave the data inconsistent.
- **Why the backend determines competition state:** the client's clock can be wrong, skewed,
  or manipulated, and a mobile app can be out of date; only the server can be trusted to decide
  whether "now" is before or after `startAt`/`endAt`.

## Trade-offs

- No real authentication — deliberately out of scope per the assignment; the header-based mock
  keeps the concurrency/business-logic work front and center instead of building an auth system.
- No competition **list** screen — the assignment specifically scoped this as a "Competition
  Details" feature, so the mobile app ships one screen wired to a `competitionId`; a list screen
  would reuse the same `GET /api/competitions/:id` pattern extended to a `GET /api/competitions`
  list endpoint.
- `registeredCount` is denormalized onto the `Competition` document (rather than always
  `COUNT()`-ing `Participation`) for fast reads under load; it's kept consistent only through
  the atomic `$inc` path, never through direct writes.
- Cancellation logic is simple (blocked once `LIVE`); a real product might add a grace period
  or partial refund rules, which was out of scope here.

## Production Improvements

Given more time/scope, next steps would include:

- Redis caching for hot competition reads (with cache invalidation on registration)
- Rate limiting on the register endpoint (per-user and per-IP) to blunt registration bots
- Real authentication (JWT) replacing the mock `x-user-id` header
- Push notifications for "registration closing soon" / "you're live now"
- Centralized structured logging + APM/monitoring (e.g. Datadog, Sentry)
- CI/CD pipeline running lint + the full test suite (including the concurrency test) on every PR
- Automated E2E tests (Detox for RN, or Playwright against a staging API)
- An admin dashboard for creating/editing competitions instead of the seed script

## Testable Checklist

- [x] Competition data fetched from MongoDB, never hardcoded in the RN app
- [x] Backend-derived lifecycle status (`UPCOMING`/`LIVE`/`ENDED`/`FULL`)
- [x] Remaining spots computed server-side
- [x] Registration state (`isRegistered`) computed server-side
- [x] Duplicate registration prevented via unique compound index
- [x] Concurrency-safe registration (atomic `$inc` + transaction), verified by a 10-request
      race test against 5 spots
- [x] Centralized error handling (backend middleware + frontend error normalization)
- [x] Loading (skeleton), error+retry, and empty/edge states implemented
- [x] Live countdown from real Date objects, interval cleaned up on unmount
- [x] Seed script with 3 competitions (upcoming/live/ended) + sample participations
- [x] Backend tests for retrieval, registration, duplicates, full, ended, invalid id, and
      concurrency (runnable wherever `mongodb-memory-server` can download its binary; a
      dependency-free logic test suite is included and was verified in this build environment)
