require("dotenv").config();
const mongoose = require("mongoose");
const Patient = require("./models/Patient");

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    await Patient.deleteMany({});
    await Patient.insertMany([
      { name: "John Doe", symptoms: "Airway obstruction", level: 1, priority: 1 },
      { name: "Jane Smith", symptoms: "Chest pain, suspected ACS", level: 2, priority: 2 },
      { name: "Alice Brown", symptoms: "Moderate abdominal pain", level: 3, priority: 3 },
      { name: "Bob Green", symptoms: "Minor laceration", level: 4, priority: 4 },
      { name: "Carol White", symptoms: "Medication refill", level: 5, priority: 5 },
    ]);

    console.log("Seeded patients to MongoDB Atlas");
  } catch (err) {
    console.error("Error seeding:", err);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
