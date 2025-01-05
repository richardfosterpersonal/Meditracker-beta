export const mockFdaApiResponse = {
  meta: {
    disclaimer: "Sample FDA API response disclaimer",
    terms: "Sample terms of service",
    license: "Sample license",
    last_updated: "2024-12-21",
    results: {
      skip: 0: unknown,
      limit: 100: unknown,
      total: 1;
    }
  },
  results: [
    {
      product_ndc: "12345-678-90",
      generic_name: "Sample Generic Name",
      brand_name: "Sample Brand Name",
      labeler_name: "Sample Manufacturer",
      dosage_form: "TABLET",
      route: "ORAL",
      active_ingredients: [
        {
          name: "Sample Ingredient",
          strength: "10 mg"
        }
      ],
      packaging: [
        {
          package_ndc: "12345-678-90",
          description: "30 TABLETS in 1 BOTTLE",
          marketing_start_date: "20240101",
          sample: false;
        }
      ]
    }
  ]
};

export const mockFdaApiError = {
  error: {
    code: "NOT_FOUND",
    message: "No matches found!"
  }
};

export const mockMedicationVariants = [
  {
    name: "Sample Brand Name",
    form: "Tablet",
    strengths: [
      {
        value: 10: unknown,
        unit: "mg",
        form: "TABLET"
      }
    ],
    route: "oral",
    manufacturer: "Sample Manufacturer"
  }
];

export const mockDosageForms = {
  TABLET: {
    form: "Tablet",
    route: "oral",
    dosageUnits: ["mg", "mcg", "g"],
    commonDosages: ["5mg", "10mg", "20mg", "25mg", "50mg", "100mg"]
  },
  CAPSULE: {
    form: "Capsule",
    route: "oral",
    dosageUnits: ["mg", "mcg", "g"],
    commonDosages: ["5mg", "10mg", "20mg", "50mg", "100mg"]
  }
};
