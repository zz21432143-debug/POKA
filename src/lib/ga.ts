export const DEFAULT_GA_ID = "G-MW7F9CY9XD";

function parseGaId(id: string) {
  return /^G-[A-Z0-9]+$/i.test(id) ? id : null;
}

export function gaMeasurementId(): string | null {
  return parseGaId(process.env.NEXT_PUBLIC_GA_ID?.trim() ?? "") ?? parseGaId(DEFAULT_GA_ID);
}
