const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const createApp = require('../src/app');
const Competition = require('../src/models/Competition');
const Participation = require('../src/models/Participation');

// Transactions require a replica set, even an in-memory single-node one,
// so we spin up MongoMemoryReplSet rather than plain MongoMemoryServer.
let replSet;
let app;

const USER_HEADER = 'x-user-id';

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  const uri = replSet.getUri();
  await mongoose.connect(uri);
  app = createApp();
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

afterEach(async () => {
  await Competition.deleteMany({});
  await Participation.deleteMany({});
});

const DAY = 24 * 60 * 60 * 1000;

function makeCompetition(overrides = {}) {
  const now = Date.now();
  return Competition.create({
    title: 'Test Competition',
    description: 'A test competition',
    image: 'https://example.com/image.jpg',
    prize: '₹ 100',
    totalSpots: 2,
    registeredCount: 0,
    registrationClosesAt: new Date(now + 1 * DAY),
    startAt: new Date(now + 2 * DAY),
    endAt: new Date(now + 5 * DAY),
    ...overrides,
  });
}

describe('GET /api/competitions/:id', () => {
  it('returns competition details with computed status and remaining spots', async () => {
    const competition = await makeCompetition();

    const res = await request(app)
      .get(`/api/competitions/${competition._id}`)
      .set(USER_HEADER, 'userA');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('UPCOMING');
    expect(res.body.data.remainingSpots).toBe(2);
    expect(res.body.data.isRegistered).toBe(false);
  });

  it('returns 404 for a non-existent competition', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/competitions/${fakeId}`).set(USER_HEADER, 'userA');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for an invalid competition id', async () => {
    const res = await request(app).get('/api/competitions/not-a-valid-id').set(USER_HEADER, 'userA');
    expect(res.status).toBe(400);
  });

  it('returns 400 when the x-user-id header is missing', async () => {
    const competition = await makeCompetition();
    const res = await request(app).get(`/api/competitions/${competition._id}`);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/competitions/:id/register', () => {
  it('successfully registers a user and increments registeredCount', async () => {
    const competition = await makeCompetition();

    const res = await request(app)
      .post(`/api/competitions/${competition._id}/register`)
      .set(USER_HEADER, 'userA');

    expect(res.status).toBe(201);
    expect(res.body.data.isRegistered).toBe(true);
    expect(res.body.data.registeredCount).toBe(1);
    expect(res.body.data.remainingSpots).toBe(1);
  });

  it('rejects a duplicate registration from the same user', async () => {
    const competition = await makeCompetition();
    await request(app).post(`/api/competitions/${competition._id}/register`).set(USER_HEADER, 'userA');

    const res = await request(app)
      .post(`/api/competitions/${competition._id}/register`)
      .set(USER_HEADER, 'userA');

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_REGISTERED');
  });

  it('rejects registration once the competition is full', async () => {
    const competition = await makeCompetition({ totalSpots: 1 });
    await request(app).post(`/api/competitions/${competition._id}/register`).set(USER_HEADER, 'userA');

    const res = await request(app)
      .post(`/api/competitions/${competition._id}/register`)
      .set(USER_HEADER, 'userB');

    expect(res.status).toBe(409);
    expect(['COMPETITION_FULL']).toContain(res.body.error.code);
  });

  it('rejects registration for an ended competition', async () => {
    const now = Date.now();
    const competition = await makeCompetition({
      registrationClosesAt: new Date(now - 3 * DAY),
      startAt: new Date(now - 2 * DAY),
      endAt: new Date(now - 1 * DAY),
    });

    const res = await request(app)
      .post(`/api/competitions/${competition._id}/register`)
      .set(USER_HEADER, 'userA');

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('COMPETITION_ENDED');
  });

  it('rejects registration for a competition that already started (LIVE)', async () => {
    const now = Date.now();
    const competition = await makeCompetition({
      registrationClosesAt: new Date(now - 1 * DAY),
      startAt: new Date(now - 1 * DAY),
      endAt: new Date(now + 3 * DAY),
    });

    const res = await request(app)
      .post(`/api/competitions/${competition._id}/register`)
      .set(USER_HEADER, 'userA');

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('COMPETITION_LIVE');
  });

  it('returns 404 when registering for a non-existent competition', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).post(`/api/competitions/${fakeId}/register`).set(USER_HEADER, 'userA');
    expect(res.status).toBe(404);
  });

  it('never allows registeredCount to exceed totalSpots under concurrent requests', async () => {
    // Capacity = 5, but 10 different users attempt registration at (nearly) the same time.
    const competition = await makeCompetition({ totalSpots: 5 });
    const users = Array.from({ length: 10 }, (_, i) => `concurrentUser${i}`);

    const responses = await Promise.all(
      users.map((u) => request(app).post(`/api/competitions/${competition._id}/register`).set(USER_HEADER, u))
    );

    const successes = responses.filter((r) => r.status === 201);
    const conflicts = responses.filter((r) => r.status === 409);

    expect(successes.length).toBe(5);
    expect(conflicts.length).toBe(5);

    const final = await Competition.findById(competition._id).lean();
    expect(final.registeredCount).toBe(5);

    const participationCount = await Participation.countDocuments({ competitionId: competition._id, status: 'ACTIVE' });
    expect(participationCount).toBe(5);
  }, 30000);
});

describe('DELETE /api/competitions/:id/register', () => {
  it('cancels an active registration before the competition starts', async () => {
    const competition = await makeCompetition();
    await request(app).post(`/api/competitions/${competition._id}/register`).set(USER_HEADER, 'userA');

    const res = await request(app)
      .delete(`/api/competitions/${competition._id}/register`)
      .set(USER_HEADER, 'userA');

    expect(res.status).toBe(200);
    expect(res.body.data.isRegistered).toBe(false);
    expect(res.body.data.registeredCount).toBe(0);
  });

  it('returns 404 when cancelling a registration that does not exist', async () => {
    const competition = await makeCompetition();
    const res = await request(app)
      .delete(`/api/competitions/${competition._id}/register`)
      .set(USER_HEADER, 'userA');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_REGISTERED');
  });
});

describe('GET /api/health', () => {
  it('reports ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });
});
