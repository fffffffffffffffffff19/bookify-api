import { env } from '../config/env.js';
import { LocalStorageAdapter } from './local-storage-adapter.js';
import type { StorageAdapter } from './storage-adapter.js';

export const storage: StorageAdapter = new LocalStorageAdapter(env.UPLOAD_DIR);