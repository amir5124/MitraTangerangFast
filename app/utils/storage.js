import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const storage = {
    /**
     * Menyimpan data.
     * Otomatis melakukan JSON.stringify jika nilai adalah Object/Array.
     */
    save: async (key, value) => {
        if (value === null || value === undefined) return;

        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

        if (Platform.OS === 'web') {
            try {
                localStorage.setItem(key, stringValue);
            } catch (e) {
                console.error('Error saving to localStorage', e);
            }
        } else {
            try {
                // Gunakan await untuk memastikan data benar-benar tertulis
                await SecureStore.setItemAsync(key, stringValue);
            } catch (e) {
                console.error('Error saving to SecureStore', e);
            }
        }
    },

    /**
     * Mengambil data.
     * Otomatis melakukan JSON.parse jika data yang tersimpan adalah string JSON.
     */
    get: async (key) => {
        let value = null;

        try {
            if (Platform.OS === 'web') {
                value = localStorage.getItem(key);
            } else {
                value = await SecureStore.getItemAsync(key);
            }

            // Jika data memang tidak ada di storage, kembalikan null (bukan undefined)
            if (value === null) return null;

            // Cek apakah string ini adalah JSON (diawali { atau [)
            if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                return JSON.parse(value);
            }

            return value;
        } catch (e) {
            console.error(`Error getting key "${key}" from storage:`, e);
            return value; // Kembalikan string asli jika gagal parse
        }
    },

    /**
     * Menghapus data berdasarkan key.
     */
    delete: async (key) => {
        try {
            if (Platform.OS === 'web') {
                localStorage.removeItem(key);
            } else {
                await SecureStore.deleteItemAsync(key);
            }
        } catch (e) {
            console.error(`Error deleting key "${key}":`, e);
        }
    },

    /**
     * Menghapus semua data (Opsional: Berguna untuk Logout total)
     */
    clearAll: async () => {
        if (Platform.OS === 'web') {
            localStorage.clear();
        } else {
            // SecureStore tidak punya clearAll, hapus key utama satu per satu
            await SecureStore.deleteItemAsync('userToken');
            await SecureStore.deleteItemAsync('userData');
        }
    }
};