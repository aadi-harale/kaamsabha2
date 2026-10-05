import type { ProofMedia } from "./domain.ts";

export interface MediaRepository {
  put(file: File): Promise<ProofMedia>;
  get(assetId: string): Promise<Blob | undefined>;
  remove(assetId: string): Promise<void>;
}
export async function sha256(value: string | ArrayBuffer) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  if(!crypto.subtle){const response=await fetch("/api/proof/digest",{method:"POST",body:bytes});if(!response.ok)throw new Error("Proof fingerprint could not be saved. Check the local server.");return (await response.json() as {digest:string}).digest;}
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2, "0")).join("");
}
function openStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error("This browser cannot save proof files. Use a supported browser."));
    const request = indexedDB.open("kaamsabha2-proof", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("media");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Proof storage is unavailable. Free device space and try again."));
  });
}
async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("media", mode), request = action(tx.objectStore("media"));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onabort = tx.onerror = () => { db.close(); reject(new Error("Proof could not be saved. Check device storage and retry.")); };
  });
}
export class IndexedDbMediaRepository implements MediaRepository {
  async put(file: File) {
    if (!/^(image\/(jpeg|png|webp)|video\/(mp4|webm))$/.test(file.type) || !file.size || file.size > 2 * 1024 * 1024) throw new Error("Choose a JPG, PNG, WebP, MP4 or WebM file up to 2 MB.");
    const digest = await sha256(await file.arrayBuffer()), assetId = Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,"0")).join("");
    await transaction("readwrite", store => store.put(file, assetId));
    return { assetId, name: file.name.slice(0,160), mimeType: file.type, size: file.size, digest };
  }
  async get(assetId: string) { return await transaction<Blob | undefined>("readonly", store => store.get(assetId)); }
  async remove(assetId: string) { await transaction("readwrite", store => store.delete(assetId)); }
}
export const mediaRepository: MediaRepository = new IndexedDbMediaRepository();
