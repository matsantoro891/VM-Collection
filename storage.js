/* VM Collection persistent storage — IndexedDB */
(() => {
  const DB_NAME = "vmCollectionPersistentDB";
  const DB_VERSION = 1;
  const STORES = ["items", "categories", "settings"];
  let dbPromise;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB não está disponível neste navegador.'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('items')) db.createObjectStore('items', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('categories')) db.createObjectStore('categories', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Não foi possível abrir o banco local.'));
      request.onblocked = () => reject(new Error('O banco local está bloqueado por outra aba do aplicativo.'));
    });
    return dbPromise;
  }

  async function transaction(storeName, mode, action) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let request;
      try { request = action(store); }
      catch (error) { reject(error); return; }
      tx.oncomplete = () => resolve(request?.result);
      tx.onerror = () => reject(tx.error || request?.error || new Error('Falha ao acessar o armazenamento local.'));
      tx.onabort = () => reject(tx.error || new Error('Operação cancelada no armazenamento local.'));
    });
  }

  async function getAll(storeName) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function get(storeName, key) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function put(storeName, value) {
    return transaction(storeName, 'readwrite', (store) => store.put(value));
  }

  async function remove(storeName, key) {
    return transaction(storeName, 'readwrite', (store) => store.delete(key));
  }

  async function replaceAll(storeName, values) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear();
      for (const value of values || []) store.put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Falha ao salvar dados.'));
      tx.onabort = () => reject(tx.error || new Error('Salvamento cancelado.'));
    });
  }

  async function getSetting(key) {
    const record = await get('settings', key);
    return record ? record.value : undefined;
  }

  async function setSetting(key, value) {
    return put('settings', { key, value, updatedAt: new Date().toISOString() });
  }

  async function clearAll() {
    const db = await open();
    return Promise.all(STORES.map((storeName) => new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).clear();
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    })));
  }

  async function requestPersistence() {
    try {
      if (navigator.storage?.persist) return await navigator.storage.persist();
    } catch (_) {}
    return false;
  }

  window.VMStorage = { open, getAll, get, put, remove, replaceAll, getSetting, setSetting, clearAll, requestPersistence };
})();
