require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const Competition = require('../models/Competition');
const Participation = require('../models/Participation');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/feedants_competition';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

const competitions = [
  {
    // 1. UPCOMING - registration open, starts in 5 days
    title: 'Feedants Classical Dance',
    description:
      'This is an online classical dance competition open for all age groups. Participate from anywhere and showcase your talent. Express your passion through traditional dance.',
    image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800',
    prize: '₹ 1,500',
    entryFee: '₹ 99',
    category: 'Dance · Multi-Win',
    totalSpots: 20,
    registeredCount: 0, // filled in below with real participations
    registrationClosesAt: new Date(now + 3 * DAY + 11 * 60 * 60 * 1000),
    submissionStartsAt: new Date(now + 1 * DAY + 4 * 60 * 60 * 1000),
    submissionEndsAt: new Date(now + 5 * DAY + 11 * 60 * 60 * 1000),
    startAt: new Date(now + 5 * DAY),
    endAt: new Date(now + 12 * DAY),
    rules: 'Only original performances are allowed. Videos must be under 3 minutes. Judging is based on technique, expression and choreography.',
    judge: {
      name: 'Manju Dubey',
      title: 'Professional Kathak Dancer, 12+ Years of Experience',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200',
    },
    rewards: [
      { position: '1st Winner', amount: '₹ 550' },
      { position: '2nd Winner', amount: '₹ 300' },
      { position: '3rd Winner', amount: '₹ 240' },
      { position: '4th Winner', amount: '₹ 200' },
      { position: '5th Winner', amount: '₹ 130' },
      { position: '6th Winner', amount: '₹ 80' },
    ],
    status: 'UPCOMING',
  },
  {
    // 2. LIVE - currently running
    title: 'Feedants Vocal Singing Contest',
    description:
      'Show off your singing talent in this open-format vocal contest. All genres welcome - classical, playback, indie or fusion.',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
    prize: '₹ 2,000',
    entryFee: '₹ 149',
    category: 'Music · Multi-Win',
    totalSpots: 50,
    registeredCount: 0,
    registrationClosesAt: new Date(now - 1 * DAY),
    submissionStartsAt: new Date(now - 2 * DAY),
    submissionEndsAt: new Date(now + 2 * DAY),
    startAt: new Date(now - 1 * DAY),
    endAt: new Date(now + 6 * DAY),
    rules: 'One entry per participant. Backing tracks are allowed. Submissions must be recorded in a single continuous take.',
    judge: {
      name: 'Arjun Malhotra',
      title: 'Music Producer & Vocal Coach',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    },
    rewards: [
      { position: '1st Winner', amount: '₹ 800' },
      { position: '2nd Winner', amount: '₹ 500' },
      { position: '3rd Winner', amount: '₹ 300' },
    ],
    status: 'LIVE',
  },
  {
    // 3. ENDED - fully completed
    title: 'Feedants Photography Sprint',
    description:
      'A weekend photography sprint themed around "Everyday Colours". Open to mobile and DSLR photographers alike.',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
    prize: '₹ 1,000',
    entryFee: '₹ 49',
    category: 'Photography · Single-Win',
    totalSpots: 30,
    registeredCount: 0,
    registrationClosesAt: new Date(now - 10 * DAY),
    submissionStartsAt: new Date(now - 9 * DAY),
    submissionEndsAt: new Date(now - 6 * DAY),
    startAt: new Date(now - 9 * DAY),
    endAt: new Date(now - 5 * DAY),
    rules: 'Photos must be unedited beyond basic cropping and colour correction. One submission per participant.',
    judge: {
      name: 'Neha Kapoor',
      title: 'Freelance Photographer',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200',
    },
    rewards: [{ position: '1st Winner', amount: '₹ 1,000' }],
    status: 'ENDED',
  },
];

async function seed() {
  await connectDB(MONGO_URI);

  console.log('[seed] Clearing existing data...');
  await Promise.all([Competition.deleteMany({}), Participation.deleteMany({})]);

  console.log('[seed] Inserting competitions...');
  const created = await Competition.insertMany(competitions);

  // Sample participations so the frontend can demonstrate:
  // - "registered" state (mockUser01 on the LIVE competition)
  // - a partially filled UPCOMING competition (spots remaining)
  // - a fully attended ENDED competition
  const [dance, singing, photography] = created;

  const sampleUsers = Array.from({ length: 12 }, (_, i) => `mockUser${String(i + 1).padStart(2, '0')}`);

  const participationDocs = [];

  // Dance (UPCOMING): 1 spot booked out of 20, matches the design reference ("1 / 20 Booked").
  participationDocs.push({ competitionId: dance._id, userId: sampleUsers[0], status: 'ACTIVE' });

  // Singing (LIVE): mockUser01 is registered, so the app can show "You're Registered" + Live state.
  participationDocs.push({ competitionId: singing._id, userId: sampleUsers[0], status: 'ACTIVE' });
  sampleUsers.slice(1, 6).forEach((u) => participationDocs.push({ competitionId: singing._id, userId: u, status: 'ACTIVE' }));

  // Photography (ENDED): fully attended.
  sampleUsers.slice(0, 10).forEach((u) => participationDocs.push({ competitionId: photography._id, userId: u, status: 'ACTIVE' }));

  console.log('[seed] Inserting participations...');
  await Participation.insertMany(participationDocs);

  // Sync registeredCount to match actual ACTIVE participations (keeps DB internally consistent).
  const counts = await Participation.aggregate([
    { $match: { status: 'ACTIVE' } },
    { $group: { _id: '$competitionId', count: { $sum: 1 } } },
  ]);

  await Promise.all(
    counts.map(({ _id, count }) => Competition.updateOne({ _id }, { $set: { registeredCount: count } }))
  );

  console.log('[seed] Done. Seeded competitions:');
  created.forEach((c) => console.log(`  - ${c.title} (${c._id}) [seed status: ${c.status}]`));
  console.log('\n[seed] Try: mockUser01 is registered for the LIVE "Feedants Vocal Singing Contest".');

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
