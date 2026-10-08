/** 이 값을 올리면 다음 콜드 스타트에서만 ALTER를 다시 돌립니다. */
export const SCHEMA_BOOT_KIND = "SCHEMA_BOOT";
export const SCHEMA_BOOT_VERSION = "1";
export const SCHEMA_BOOT_ID = `schema_boot_v${SCHEMA_BOOT_VERSION}`;

export function isCurrentSchemaBoot(detail: string | null | undefined) {
  return detail === SCHEMA_BOOT_VERSION;
}
