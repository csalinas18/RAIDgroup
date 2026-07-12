import { openDB } from 'idb'

/**
 * DiskStorage — persistencia del clúster en IndexedDB mediante la librería idb.
 *
 * Base de datos: "RAIDGroupDB"
 *   - store "disks":    { id: 0-8, fragment: string|null, alive: boolean }
 *   - store "metadata": { key: 'parity'|'history', value: any }
 */
const DB_NAME = 'RAIDGroupDB'
const DB_VERSION = 1
const DISKS_STORE = 'disks'
const META_STORE = 'metadata'

let dbPromise = null

export async function initDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(DISKS_STORE)) {
          db.createObjectStore(DISKS_STORE, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE, { keyPath: 'key' })
        }
      },
    })
  }
  return dbPromise
}

/** Guarda los 9 fragmentos, todos con alive: true. */
export async function saveFragments(fragments) {
  const db = await initDB()
  const tx = db.transaction(DISKS_STORE, 'readwrite')
  for (let id = 0; id < 9; id++) {
    tx.store.put({ id, fragment: fragments[id], alive: true })
  }
  await tx.done
}

/** Guarda el bloque de paridad. */
export async function saveParity(parityFragment) {
  const db = await initDB()
  await db.put(META_STORE, { key: 'parity', value: parityFragment })
}

/** Guarda el historial de movimientos. */
export async function saveHistory(history) {
  const db = await initDB()
  await db.put(META_STORE, { key: 'history', value: history })
}

/** Devuelve array[9] de {id, fragment, alive}, o null si no hay datos. */
export async function loadDisks() {
  const db = await initDB()
  const all = await db.getAll(DISKS_STORE)
  if (!all || all.length === 0) return null
  const disks = new Array(9).fill(null)
  for (const disk of all) {
    if (disk.id >= 0 && disk.id < 9) disks[disk.id] = disk
  }
  // Rellena huecos por seguridad.
  for (let i = 0; i < 9; i++) {
    if (!disks[i]) disks[i] = { id: i, fragment: null, alive: false }
  }
  return disks
}

/** Devuelve la paridad (string) o null. */
export async function loadParity() {
  const db = await initDB()
  const entry = await db.get(META_STORE, 'parity')
  return entry ? entry.value : null
}

/** Devuelve el historial (string[]) o []. */
export async function loadHistory() {
  const db = await initDB()
  const entry = await db.get(META_STORE, 'history')
  return entry ? entry.value : []
}

/** Marca un disco como destruido: alive: false, fragment: null. */
export async function destroyDisk(index) {
  const db = await initDB()
  await db.put(DISKS_STORE, { id: index, fragment: null, alive: false })
}

/** Repara un disco: alive: true con el fragmento recuperado. */
export async function repairDisk(index, fragment) {
  const db = await initDB()
  await db.put(DISKS_STORE, { id: index, fragment, alive: true })
}

/** Borra todos los datos persistidos (discos y metadata). */
export async function clearAll() {
  const db = await initDB()
  const tx = db.transaction([DISKS_STORE, META_STORE], 'readwrite')
  await tx.objectStore(DISKS_STORE).clear()
  await tx.objectStore(META_STORE).clear()
  await tx.done
}
