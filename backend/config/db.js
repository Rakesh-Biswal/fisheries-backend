const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // use env first, fallback if undefined
    const uri =
      process.env.MONGO_URI ||
      "mongodb+srv://pramod18:pramod85%40biswal@cluster0.cny7fgt.mongodb.net/fisheries_platform";

    console.log("📡 Using Mongo URI:", uri);

    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
