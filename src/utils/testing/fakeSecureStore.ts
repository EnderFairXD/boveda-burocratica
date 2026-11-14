/** Sustituto en memoria de expo-secure-store para los tests, compartido entre
 * copias del módulo igual que el disco falso. */
const shared = globalThis as { __fakeSecureStore?: Map<string, string> };
export const items = (shared.__fakeSecureStore ??= new Map<string, string>());

export async function getItemAsync(key: string): Promise<string | null> {
  return items.get(key) ?? null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  items.set(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  items.delete(key);
}
