import { MongoClient, Db, Collection } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/quakes";

let client: MongoClient | null = null;
let db: Db | null = null;

interface QuakeDoc {
  _id: string;
  lat: number;
  lon: number;
  depth: number;
  mag: number;
  locationName: string;
  time: number;
  isUpdate: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface UserDoc {
  _id: string; // email
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: "admin" | "user";
  createdAt: number;
}

async function getClient(): Promise<MongoClient> {
  if (!client) {
    client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
    });
    await client.connect();
  }
  return client;
}

export async function getDb(): Promise<Db> {
  if (!db) {
    const c = await getClient();
    db = c.db();
  }
  return db;
}

export async function getQuakesCollection(): Promise<Collection<QuakeDoc>> {
  const database = await getDb();
  return database.collection<QuakeDoc>("quakes");
}

export async function getUsersCollection(): Promise<Collection<UserDoc>> {
  const database = await getDb();
  return database.collection<UserDoc>("users");
}

// Upsert a quake event — inserts new or updates existing by ID
export async function upsertQuake(quake: {
  id: string;
  lat: number;
  lon: number;
  depth: number;
  mag: number;
  locationName: string;
  time: number;
  isUpdate: boolean;
}): Promise<void> {
  try {
    const col = await getQuakesCollection();
    await col.updateOne(
      { _id: quake.id },
      {
        $set: {
          lat: quake.lat,
          lon: quake.lon,
          depth: quake.depth,
          mag: quake.mag,
          locationName: quake.locationName,
          time: quake.time,
          isUpdate: quake.isUpdate,
          updatedAt: Date.now(),
        },
        $setOnInsert: {
          _id: quake.id,
          createdAt: Date.now(),
        },
      },
      { upsert: true }
    );
  } catch (err) {
    console.error("[MONGODB] Failed to upsert quake:", err);
  }
}

// Fetch recent quakes (last N hours), sorted by time descending
export async function getRecentQuakes(hours?: number, limit: number = 30): Promise<any[]> {
  try {
    const col = await getQuakesCollection();
    const query: any = {};
    if (hours && hours > 0) {
      const cutoff = Date.now() - hours * 60 * 60 * 1000;
      query.time = { $gte: cutoff };
    }
    const docs = await col
      .find(query)
      .sort({ time: -1 })
      .limit(limit)
      .toArray();

    return docs.map((doc) => ({
      id: doc._id,
      lat: doc.lat,
      lon: doc.lon,
      depth: doc.depth,
      mag: doc.mag,
      locationName: doc.locationName,
      time: doc.time,
      isUpdate: doc.isUpdate,
      updatedAt: doc.updatedAt,
    }));
  } catch (err) {
    console.error("[MONGODB] Failed to fetch recent quakes:", err);
    return [];
  }
}

// Find user by email
export async function findUserByEmail(email: string): Promise<UserDoc | null> {
  try {
    const col = await getUsersCollection();
    return col.findOne({ _id: email.toLowerCase() });
  } catch (err) {
    console.error("[MONGODB] Failed to find user:", err);
    return null;
  }
}

// Create user
export async function createUser(user: {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: "admin" | "user";
}): Promise<boolean> {
  try {
    const col = await getUsersCollection();
    await col.insertOne({
      _id: user.email.toLowerCase(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email.toLowerCase(),
      passwordHash: user.passwordHash,
      role: user.role,
      createdAt: Date.now(),
    });
    return true;
  } catch (err: any) {
    if (err.code === 11000) {
      console.error("[MONGODB] User already exists:", user.email);
    } else {
      console.error("[MONGODB] Failed to create user:", err);
    }
    return false;
  }
}
