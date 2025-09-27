import express from "express";
import dotenv from "dotenv";
import { callVertex } from "./vertex";

dotenv.config();

const app = express();
app.use(express.json());

// Endpoint LangGraph can call
app.post("/predict", async (req, res) => {
  try {
    const input = req.body;
    const predictions = await callVertex(input);
    res.json({ output: predictions });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.BACKEND_PORT || 5000;
app.listen(PORT, () => {
  console.log(`Vertex AI backend running on port ${PORT}`);
});
