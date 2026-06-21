export const EXIT_SUCCESS = 0;
export const EXIT_API_ERROR = 1;
export const EXIT_INPUT_ERROR = 2;

export const EXIT_CODE = {
  OK: EXIT_SUCCESS,
  ERROR: EXIT_API_ERROR,
  INVALID_INPUT: EXIT_INPUT_ERROR,
} as const;
