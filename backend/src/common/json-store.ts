import * as fs from 'fs';
import * as path from 'path';

/**
 * Persistência em arquivo JSON (1 arquivo por coleção) — o suficiente pro MVP
 * sobreviver a restart sem exigir Postgres. Escrita atômica (tmp + rename).
 * Troca por banco de verdade quando o domínio estabilizar (ver README).
 */
export function dataDir(): string {
  const dir = process.env.DATA_DIR ?? path.resolve(process.cwd(), 'data');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export class JsonCollection<T extends { id: string }> {
  private readonly file: string;
  private items: T[];

  constructor(name: string) {
    this.file = path.join(dataDir(), `${name}.json`);
    this.items = fs.existsSync(this.file) ? JSON.parse(fs.readFileSync(this.file, 'utf8')) : [];
  }

  all(): T[] {
    return this.items;
  }

  find(id: string): T | undefined {
    return this.items.find((i) => i.id === id);
  }

  insert(item: T): T {
    this.items.push(item);
    this.flush();
    return item;
  }

  replace(item: T): T {
    const idx = this.items.findIndex((i) => i.id === item.id);
    if (idx < 0) throw new Error(`id ${item.id} não encontrado`);
    this.items[idx] = item;
    this.flush();
    return item;
  }

  remove(id: string): boolean {
    const before = this.items.length;
    this.items = this.items.filter((i) => i.id !== id);
    if (this.items.length === before) return false;
    this.flush();
    return true;
  }

  removeWhere(pred: (i: T) => boolean): void {
    this.items = this.items.filter((i) => !pred(i));
    this.flush();
  }

  private flush(): void {
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.items, null, 2));
    fs.renameSync(tmp, this.file);
  }
}
