import { MongoClient } from 'mongodb';

let cachedClient = null;
let cachedDb = null;

export async function getDb() {
  if (cachedDb) return cachedDb;

  // IMPORTANT: read env INSIDE the function so Cloud Build's build-time
  // module evaluation does NOT capture undefined values. Also fail-fast
  // with a clear message instead of an obscure MongoClient TypeError.
  const url = process.env.MONGO_URL;
  const dbName = process.env.DB_NAME || 'cozinha_lucrativa';

  if (!url) {
    throw new Error(
      'MONGO_URL is not configured in the Next.js runtime environment. ' +
      'Add MONGO_URL to the frontend .env / Cloud Build secrets so the Next.js process can reach MongoDB.'
    );
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(url, {
      serverSelectionTimeoutMS: 10000,
    });
    await cachedClient.connect();
  }
  cachedDb = cachedClient.db(dbName);
  return cachedDb;
}
