const CONTACT_KEYS = new Set([
  "email",
  "e-mail",
  "mail",
  "phone",
  "telefon",
  "telephone",
  "mobile",
  "name",
  "fullName",
  "full_name",
  "firstName",
  "lastName",
  "first_name",
  "last_name",
  "address",
  "street",
  "city",
  "postalCode",
  "postal_code",
  "zip",
  "ssn",
  "personnummer",
  "customer",
  "customerEmail",
  "customerPhone",
  "customerName",
  "contact",
  "contacts",
]);

export function stripContactFields(
  payload: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (CONTACT_KEYS.has(key) || CONTACT_KEYS.has(key.toLowerCase())) {
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = stripContactFields(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}
