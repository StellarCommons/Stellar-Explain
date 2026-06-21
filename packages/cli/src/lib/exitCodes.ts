export const EXIT_CODE = {
  OK: 0,
  ERROR: 1,
  INVALID_INPUT: 2,
} as const;

export const EXIT_SUCCESS = EXIT_CODE.OK;
export const EXIT_API_ERROR = EXIT_CODE.ERROR;
export const EXIT_INPUT_ERROR = EXIT_CODE.INVALID_INPUT;

