export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function validateUsername(value: string) {
  const normalized = normalizeUsername(value);
  if (normalized.length < 3 || normalized.length > 24) {
    return "Username ต้องมี 3-24 ตัวอักษร";
  }
  if (!/^[a-z0-9._-]+$/.test(normalized)) {
    return "Username ใช้ได้เฉพาะ a-z, 0-9, จุด, ขีดล่าง และขีดกลาง";
  }
  return null;
}
