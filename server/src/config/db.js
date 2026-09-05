import mongoose from 'mongoose';
import { config } from './index.js';

let memoryServer = null;

export async function connectDB() {
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 2500 });
    console.log('MongoDB connected:', config.mongoUri);
    return;
  } catch (err) {
    console.warn('Local MongoDB unavailable:', err.message);
    console.warn('Starting in-memory MongoDB for demo…');
  }

  const { MongoMemoryServer } = await import('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create();
  const uri = memoryServer.getUri();
  await mongoose.connect(uri);
  console.log('In-memory MongoDB ready');
}

export async function stopMemoryDB() {
  if (memoryServer) {
    await mongoose.disconnect();
    await memoryServer.stop();
  }
}
