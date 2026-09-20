const measurementId = import.meta.env.PUBLIC_GA_MEASUREMENT_ID?.trim();
const requested = import.meta.env.PUBLIC_GA_ENABLED === 'true';

if (requested && !/^G-[A-Z0-9]+$/.test(measurementId ?? '')) {
  throw new Error('PUBLIC_GA_ENABLED=true requires a valid PUBLIC_GA_MEASUREMENT_ID.');
}

/** Explicit opt-in keeps dev servers and local preview builds silent by default. */
export const GA = {
  enabled: import.meta.env.PROD && requested,
  measurementId,
} as const;
