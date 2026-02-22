import {
  ExplanationSchemaV1,
  EXPLANATION_SCHEMA_VERSION,
} from "./explanation-schema";

export class ExplanationBuilder {
  static create(
    explanation: string,
    metadata?: ExplanationSchemaV1["data"]["metadata"],
  ): ExplanationSchemaV1 {
    return {
      version: EXPLANATION_SCHEMA_VERSION,
      data: {
        explanation,
        ...(metadata && { metadata }),
      },
    };
  }
}
