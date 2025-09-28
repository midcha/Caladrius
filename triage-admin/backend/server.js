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

/**
 * GET all patients
 * Sorted by urgency_level ascending (1 = Emergency, 5 = Routine)
 */
app.get("/api/patients", async (req, res) => {
  try {
    const patients = await Patient.find().sort({ urgency_level: 1 });
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH reorder patients manually
 * Expects: { orderedIds: ["id1", "id2", ...] }
 * Updates a "priority_order" field that you can add to your schema if you want to keep drag-drop order separate from urgency_level.
 */
app.patch("/api/patients/reorder", async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: "orderedIds must be an array" });
    }

    // Optional: Add a field `priority_order` in schema if you want drag-drop override
    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { priority_order: index + 1 }, // <- add this field in schema if you want
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
