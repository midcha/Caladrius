// vertex.ts (CRITICAL OVERHAUL: Bypassing PredictionServiceClient)
import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

// Helper function to get the access token using Application Default Credentials
async function getAccessToken(): Promise<string> {
    const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    if (!tokenResponse.token) {
        throw new Error("Failed to retrieve Google access token for prediction.");
    }
    return tokenResponse.token;
}

// Revert to accepting instances AND parameters for the standard API structure
export async function callVertex(instances: any[], parameters: any = {}) {
    const project = process.env.PROJECT_ID!;
    const location = process.env.LOCATION_ID || "us-central1";
    const endpointId = process.env.VERTEX_ENDPOINT_ID!;
    const dedicatedDomain = process.env.DEDICATED_ENDPOINT_DOMAIN!; // Use the dedicated domain

    const accessToken = await getAccessToken();

    // 1. Construct the REST API URL using the dedicated domain
    // Example: https://1303188460240109568.us-central1-487795773163.prediction.vertexai.goog/v1/projects/...
    const apiUrl = `https://${dedicatedDomain}/v1/projects/${project}/locations/${location}/endpoints/${endpointId}:predict`;

    // 2. Construct the standard prediction request body
    const requestBody = {
        instances: instances,
        parameters: parameters,
    };

    console.log('--- MANUAL HTTP REQUEST ---');
    console.log('API URL:', apiUrl);
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));

    try {
        const response = await axios.post(apiUrl, requestBody, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            // The timeout should be generous for LLMs, e.g., 30s
            timeout: 30000 
        });
        
        console.log('Raw response:', JSON.stringify(response.data, null, 2));
        return response.data.predictions;

    } catch (error: any) {
        console.error('Error calling Vertex AI via Axios:', error.message);
        // Log the specific error response from the server if available
        if (error.response) {
            console.error('Vertex AI Response Status:', error.response.status);
            console.error('Vertex AI Response Data:', JSON.stringify(error.response.data, null, 2));
        }
        throw new Error(`Vertex AI Prediction Failed: ${error.message}`);
    }
}