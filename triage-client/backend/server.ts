// server.ts (Re-introducing parameters extraction)
import express from "express";
import dotenv from "dotenv";
import { callVertex } from "./vertex";

dotenv.config();

const app = express();
app.use(express.json());

// Single endpoint for all Vertex AI queries
app.post("/predict", async (req, res) => {
  try {
    console.log('Received request body:', JSON.stringify(req.body, null, 2));
    
    // 💡 Pass both instances and parameters
    const { instances, parameters } = req.body;
    
    if (!instances || !Array.isArray(instances) || instances.length === 0) {
      return res.status(400).json({ error: "Missing or invalid instances array" });
    }
    
    const predictionParams = parameters || {}; 
    
    // Pass both instances and parameters to the new callVertex
    const predictions = await callVertex(instances, predictionParams);
    
    res.json({ predictions });
  } catch (err: any) {
    // The error message now comes from the custom throw in vertex.ts
    console.error('Server error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.BACKEND_PORT || 5000;
app.listen(PORT, () => {
  console.log(`Vertex AI backend running on port ${PORT}`);
});