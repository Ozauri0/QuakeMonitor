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
export async function getRecentQuakes(hours: number = 2): Promise<any[]> {
  try {
    const col = await getQuakesCollection();
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const docs = await col
      .find({ time: { $gte: cutoff } })
      .sort({ time: -1 })
      .limit(200)
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
