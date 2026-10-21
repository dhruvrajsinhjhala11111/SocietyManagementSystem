const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod = null;

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/society_management';
  
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log(`✅ MongoDB Connected to host: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.log(`⚠️ Local MongoDB at ${uri} was not reachable (${error.message}).`);
    console.log(`⚡ Initializing embedded in-memory MongoDB server...`);
    try {
      mongod = await MongoMemoryServer.create();
      const memUri = mongod.getUri();
      const conn = await mongoose.connect(memUri);
      console.log(`✅ In-Memory MongoDB Connected at ${memUri}`);
      return conn;
    } catch (memError) {
      console.error(`❌ Fatal MongoDB Error: ${memError.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;

