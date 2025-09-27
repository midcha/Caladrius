// test.js (FIXED FOR ROBUST OUTPUT)
async function testPredict() {
    const payload = {
        instances: [
            {
                // **CRITICAL FIX: Robust Prompt**
                "prompt": "Patient presents with fever, cough, and shortness of breath. You are a highly thorough medical expert. Suggest a comprehensive list of **at least five** possible diagnoses. For each diagnosis, provide a **detailed explanation of the rationale**, the **specific symptoms that support it**, and **one key next diagnostic step** to confirm it. Format the entire response as a structured, detailed clinical report."
            }
        ],
        parameters: {
            "maxOutputTokens": 1000, // Ensure maximum room for long output
            "temperature": 0.8,      // **CRITICAL FIX: Increase temperature for creativity/detail**
            // "topP": 0.8,           // Can optionally include other sampling parameters
            // "topK": 40
        }
    };

    try {
        console.log('Testing Vertex AI with Robust Prompt...');
        console.log('Sending payload:', JSON.stringify(payload, null, 2));

        // Assuming your server is running on http://localhost:5000
        const res = await fetch('http://localhost:5000/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        
        if (res.ok) {
            console.log('SUCCESS: Response received. Checking output length and detail...');
            console.log('Response:', JSON.stringify(data, null, 2));
            // You should now see a significantly longer, more structured output in the log
        } else {
            console.error('API Error:', data.error);
        }
    } catch (err) {
        console.error('Fetch Error:', err);
    }
}

testPredict();