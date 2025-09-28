// Sample medical data for testing the MedicalDataDisplay component

export const sampleMedicalData = {
  "patient": {
    "firstName": "John",
    "lastName": "Doe",
    "sex": "Male",
    "ethnicity": "Caucasian", 
    "dob": "1985-03-15",
    "bloodType": "A+",
    "age": 38
  },
  "medicalHistory": {
    "prescriptions": [
      {
        "medication": [
          {
            "name": "Lisinopril",
            "dosageForm": "Tablet",
            "strength": "10mg"
          }
        ],
        "instructions": "Take once daily with food",
        "startDate": "2023-01-15",
        "endDate": "2024-01-15"
      },
      {
        "name": "Metformin", 
        "dosage": "500mg twice daily",
        "instructions": "Take with meals to reduce stomach upset",
        "startDate": "2022-06-01"
      }
    ],
    "emergencyContacts": [
      {
        "name": "Jane Doe",
        "relationship": "Spouse",
        "phone": "555-123-4567",
        "email": "jane.doe@email.com"
      },
      {
        "name": "Dr. Sarah Smith",
        "relationship": "Primary Care Physician", 
        "phone": "555-987-6543",
        "email": "s.smith@medical.com"
      }
    ],
    "allergies": [
      {
        "name": "Penicillin",
        "reaction": "Rash, difficulty breathing",
        "severity": "Severe",
        "treatment": "Epinephrine, antihistamines",
        "notes": "Developed allergy in childhood"
      },
      {
        "name": "Shellfish",
        "reaction": "Hives, swelling",
        "severity": "Moderate", 
        "treatment": "Antihistamines"
      }
    ],
    "visits": [
      {
        "date": "2023-12-15",
        "reason": "Annual checkup",
        "notes": "Blood pressure slightly elevated, continue medication"
      },
      {
        "date": "2023-06-20", 
        "reason": "Follow-up for diabetes",
        "notes": "A1C levels improving, continue current regimen"
      }
    ],
    "insurance": [
      {
        "providerName": "Blue Cross Blue Shield",
        "policyNumber": "ABC123456789",
        "groupNumber": "GRP001",
        "coverageStart": "2023-01-01",
        "coverageEnd": "2023-12-31"
      }
    ]
  }
};

// Alternative flat structure sample
export const sampleFlatMedicalData = {
  "firstName": "Mary",
  "lastName": "Johnson", 
  "sex": "Female",
  "dob": "1990-07-22",
  "bloodType": "O-",
  "prescriptions": [
    {
      "medication": "Birth Control",
      "dosage": "One pill daily",
      "instructions": "Take at the same time each day"
    }
  ],
  "emergencyContacts": [
    {
      "name": "Robert Johnson",
      "relationship": "Father", 
      "phone": "555-456-7890"
    }
  ],
  "allergies": [
    {
      "name": "Latex",
      "severity": "Mild",
      "reaction": "Skin irritation"
    }
  ]
};