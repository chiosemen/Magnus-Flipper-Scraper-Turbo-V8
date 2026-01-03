import { vi } from 'vitest';

export class MockFirestore {
  private data: Record<string, any> = {};

  collection(path: string) {
    return new MockCollectionReference(path, this.data);
  }

  async runTransaction(updateFunction: (transaction: any) => Promise<any>) {
    const transaction = {
      get: async (ref: any) => ref.get(),
      update: (ref: any, data: any) => ref.set(data, { merge: true }),
      set: (ref: any, data: any) => ref.set(data),
      delete: (ref: any) => ref.delete(),
    };
    return updateFunction(transaction);
  }
}

class MockCollectionReference {
  constructor(private path: string, private db: any) {}

  doc(id?: string) {
    const docId = id || `doc_${Math.random().toString(36).substr(2, 9)}`;
    return new MockDocumentReference(this.path, docId, this.db);
  }

  where(field: string, op: string, value: any) {
    // Return a query object (simplified)
    return {
      get: async () => {
        const collectionData = this.db[this.path] || {};
        const docs = Object.values(collectionData).filter((d: any) => d[field] === value);
        return {
          empty: docs.length === 0,
          docs: docs.map(d => ({ data: () => d, id: (d as any).id })),
          size: docs.length
        };
      }
    };
  }
}

class MockDocumentReference {
  constructor(private collectionPath: string, private id: string, private db: any) {}

  async get() {
    const docData = this.db[this.collectionPath]?.[this.id];
    return {
      exists: !!docData,
      data: () => docData,
      id: this.id,
    };
  }

  async set(data: any, options?: { merge: boolean }) {
    if (!this.db[this.collectionPath]) this.db[this.collectionPath] = {};
    
    if (options?.merge && this.db[this.collectionPath][this.id]) {
        this.db[this.collectionPath][this.id] = { ...this.db[this.collectionPath][this.id], ...data, id: this.id };
    } else {
        this.db[this.collectionPath][this.id] = { ...data, id: this.id };
    }
  }

  async update(data: any) {
      await this.set(data, { merge: true });
  }

  async delete() {
    if (this.db[this.collectionPath]) {
        delete this.db[this.collectionPath][this.id];
    }
  }
}

export const mockFirebaseAdmin = {
  auth: () => ({
    verifyIdToken: vi.fn().mockResolvedValue({ uid: 'test_user_123', email: 'test@example.com' }),
    getUser: vi.fn().mockResolvedValue({ 
        uid: 'test_user_123', 
        email: 'test@example.com', 
        displayName: 'Test User' 
    }),
  }),
  firestore: () => new MockFirestore(),
};
