import mongoose from 'mongoose';
import { config } from './index.js';

let memoryServer = null;

export async function connectDB() {
  mongoose.set('strictQuery', true);
  // Faster lean reads & avoid buffering surprises under load
  mongoose.set('bufferCommands', false);

  const options = {
    serverSelectionTimeoutMS: config.isProd ? 10000 : 2500,
    maxPoolSize: config.isProd ? 50 : 10,
    minPoolSize: config.isProd ? 5 : 0,
    maxIdleTimeMS: 30000,
    compressors: ['zlib'],
  };

  try {
    await mongoose.connect(config.mongoUri, options);
    console.log('MongoDB connected (pool ready for 1000+ students)');
    return;
  } catch (err) {
    console.warn('Local MongoDB unavailable:', err.message);
    console.warn('Starting in-memory MongoDB for demo…');
  }

  const { MongoMemoryServer } = await import('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create();
  const uri = memoryServer.getUri();
  await mongoose.connect(uri, { maxPoolSize: 10 });
  console.log('In-memory MongoDB ready');
}

export async function stopMemoryDB() {
  if (memoryServer) {
    await mongoose.disconnect();
    await memoryServer.stop();
  }
}
