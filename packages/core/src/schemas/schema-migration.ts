import { ExplanationSchemaV1 } from "./explanation-schema";

// Future: when v2 comes, add migration function
export function migrateToLatest(response: any): ExplanationSchemaV1 {
  // If already v1, return as-is
  if (response.version === "v1") {
    return response as ExplanationSchemaV1;
  }

  // Handle legacy responses without version
  if (!response.version && typeof response === "string") {
    return {
      version: "v1",
      data: {
        explanation: response,
      },
    };
  }

  throw new Error(`Unsupported schema version: ${response.version}`);
}
