require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors()); // allow cross-origin requests from frontend

const Patient = require("./models/Patient");

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch(err => console.error("MongoDB connection error:", err));

// GET all patients, sorted by priority
app.get("/api/patients", async (req, res) => {
  try {
    const patients = await Patient.find().sort({ priority: 1 });
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH reorder patients
// Expects: { orderedIds: ["id1", "id2", ...] }
app.patch("/api/patients/reorder", async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ error: "orderedIds must be an array" });

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { priority: index + 1 },
      },
    }));

    await Patient.bulkWrite(bulkOps);
    res.json({ message: "Patient order updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
