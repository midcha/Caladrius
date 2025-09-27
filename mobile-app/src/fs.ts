// src/fs.ts
import * as FileSystem from 'expo-file-system/legacy';

export const DOC_ROOT = FileSystem.documentDirectory!;   // persistent app sandbox
export const CACHE_ROOT = FileSystem.cacheDirectory!;     // temp

export type Node = { path: string; isDir: boolean; size?: number };

export async function ensureDir(uri: string) {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
}

export async function readJson<T = any>(path: string): Promise<T | null> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) return null;
  const raw = await FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.UTF8 });
  return JSON.parse(raw);
}

export async function writeJson(path: string, obj: any) {
  await FileSystem.writeAsStringAsync(path, JSON.stringify(obj, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

export function bytes(n?: number) {
  if (n == null) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export async function listTree(root: string, maxDepth = 3, depth = 0): Promise<Node[]> {
  const out: Node[] = [];
  const info = await FileSystem.getInfoAsync(root, { size: true });
  if (!info.exists) return out;
  if (!info.isDirectory) return [{ path: root, isDir: false, size: info.size || 0 }];

  const names = await FileSystem.readDirectoryAsync(root);
  for (const name of names) {
    const child = root + (root.endsWith('/') ? '' : '/') + name;
    const ci = await FileSystem.getInfoAsync(child, { size: true });
    out.push({ path: child, isDir: !!ci.isDirectory, size: ci.size || 0 });
    if (ci.isDirectory && depth < maxDepth) {
      out.push(...(await listTree(child + (child.endsWith('/') ? '' : '/'), maxDepth, depth + 1)));
    }
  }
  return out;
}

export function guessExt(name?: string, uri?: string) {
  const src = (name || uri || '').split('?')[0];
  const m = src.match(/\.([A-Za-z0-9]+)$/);
  return m ? m[1].toLowerCase() : 'bin';
}

export async function copyDirRecursive(src: string, dst: string) {
  const srcInfo = await FileSystem.getInfoAsync(src);
  if (!srcInfo.exists || !srcInfo.isDirectory) return;
  await ensureDir(dst);
  const entries = await FileSystem.readDirectoryAsync(src);
  for (const name of entries) {
    const s = src + (src.endsWith('/') ? '' : '/') + name;
    const d = dst + (dst.endsWith('/') ? '' : '/') + name;
    const info = await FileSystem.getInfoAsync(s);
    if (info.isDirectory) {
      await copyDirRecursive(s + (s.endsWith('/') ? '' : '/'), d + (d.endsWith('/') ? '' : '/'));
    } else {
      await FileSystem.copyAsync({ from: s, to: d });
    }
  }
}
