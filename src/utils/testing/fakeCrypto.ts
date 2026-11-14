/// <reference types="node" />

/** Sustituto de la parte AES de expo-crypto para los tests. Cifra de verdad, con
 * AES-256-GCM de Node, y usa el mismo formato combinado (iv | cifrado | tag). */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function toBytes(input: Uint8Array | string): Buffer {
  return typeof input === 'string' ? Buffer.from(input, 'base64') : Buffer.from(input);
}

export class AESEncryptionKey {
  constructor(readonly raw: Buffer) {}

  static async generate(): Promise<AESEncryptionKey> {
    return new AESEncryptionKey(randomBytes(32));
  }

  static async import(input: string, encoding: 'hex' | 'base64'): Promise<AESEncryptionKey> {
    return new AESEncryptionKey(Buffer.from(input, encoding));
  }

  async encoded(encoding: 'hex' | 'base64'): Promise<string> {
    return this.raw.toString(encoding);
  }
}

export class AESSealedData {
  constructor(readonly data: Buffer) {}

  static fromCombined(combined: Uint8Array | string): AESSealedData {
    return new AESSealedData(toBytes(combined));
  }

  async combined(): Promise<Uint8Array> {
    return new Uint8Array(this.data);
  }
}

export async function aesEncryptAsync(
  plaintext: Uint8Array | string,
  key: AESEncryptionKey,
): Promise<AESSealedData> {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key.raw, iv);
  const body = Buffer.concat([cipher.update(toBytes(plaintext)), cipher.final()]);
  return new AESSealedData(Buffer.concat([iv, body, cipher.getAuthTag()]));
}

export async function aesDecryptAsync(
  sealed: AESSealedData,
  key: AESEncryptionKey,
  options?: { output?: 'bytes' | 'base64' },
): Promise<Uint8Array | string> {
  const iv = sealed.data.subarray(0, IV_LENGTH);
  const tag = sealed.data.subarray(sealed.data.length - TAG_LENGTH);
  const body = sealed.data.subarray(IV_LENGTH, sealed.data.length - TAG_LENGTH);
  const decipher = createDecipheriv('aes-256-gcm', key.raw, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(body), decipher.final()]);
  return options?.output === 'base64' ? plain.toString('base64') : new Uint8Array(plain);
}
