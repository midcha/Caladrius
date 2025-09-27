import { PredictionServiceClient } from "@google-cloud/aiplatform";

export async function callVertex(input: any) {
  const client = new PredictionServiceClient();

  const project = process.env.GOOGLE_PROJECT_ID!;
  const location = process.env.GOOGLE_LOCATION || "us-central1";
  const endpointId = process.env.VERTEX_ENDPOINT_ID!;

  const request = {
    endpoint: `projects/${project}/locations/${location}/endpoints/${endpointId}`,
    instances: [input],
  };

  const [response] = await client.predict(request);
  return response.predictions;
}
