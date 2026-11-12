/// <reference types="node" />

/** Sustituto en memoria de expo-file-system para los tests: guarda cada archivo
 * como bytes en un Map indexado por su URI. El Map vive en globalThis para que
 * lo compartan todas las copias del módulo (jest.isolateModules crea una nueva). */
const shared = globalThis as { __fakeDisk?: Map<string, Uint8Array> };
export const disk = (shared.__fakeDisk ??= new Map<string, Uint8Array>());

function join(parent: string, name: string): string {
  return `${parent.replace(/\/$/, '')}/${name}`;
}

export class Directory {
  uri: string;

  constructor(parent: Directory | string, name?: string) {
    const base = typeof parent === 'string' ? parent : parent.uri;
    this.uri = name ? join(base, name) : base;
  }

  /** Las carpetas no se guardan: basta con que exista la ruta. */
  get exists(): boolean {
    return true;
  }

  create(): void {}
}

export class File {
  uri: string;

  constructor(parent: Directory | string, name?: string) {
    const base = typeof parent === 'string' ? parent : parent.uri;
    this.uri = name ? join(base, name) : base;
  }

  get exists(): boolean {
    return disk.has(this.uri);
  }

  async bytes(): Promise<Uint8Array> {
    const data = disk.get(this.uri);
    if (!data) throw new Error(`No existe ${this.uri}`);
    return new Uint8Array(data);
  }

  create(options?: { overwrite?: boolean }): void {
    if (this.exists && !options?.overwrite) throw new Error(`Ya existe ${this.uri}`);
    disk.set(this.uri, new Uint8Array());
  }

  write(content: Uint8Array | string): void {
    disk.set(
      this.uri,
      typeof content === 'string' ? new TextEncoder().encode(content) : new Uint8Array(content),
    );
  }

  delete(): void {
    if (!disk.delete(this.uri)) throw new Error(`No existe ${this.uri}`);
  }

  copy(destination: File): void {
    disk.set(destination.uri, new Uint8Array(this.bytesSync()));
  }

  private bytesSync(): Uint8Array {
    const data = disk.get(this.uri);
    if (!data) throw new Error(`No existe ${this.uri}`);
    return data;
  }
}

export const Paths = {
  document: new Directory('file:///documentos'),
  cache: new Directory('file:///cache'),
};
