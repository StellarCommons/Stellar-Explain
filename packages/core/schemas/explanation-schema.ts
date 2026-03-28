export const EXPLANATION_SCHEMA_VERSION = "v1" as const;

export interface ExplanationSchemaV1 {
  version: typeof EXPLANATION_SCHEMA_VERSION;
  data: {
    explanation: string;
    metadata?: {
      confidence?: number;
      sources?: string[];
      timestamp?: string;
    };
  };
}

// Type for future versions
export type ExplanationSchema = ExplanationSchemaV1;

// Schema validator
export function isValidExplanationSchema(obj: any): obj is ExplanationSchema {
  return (
    obj &&
    typeof obj === "object" &&
    obj.version === EXPLANATION_SCHEMA_VERSION &&
    obj.data &&
    typeof obj.data.explanation === "string"
  );
}
