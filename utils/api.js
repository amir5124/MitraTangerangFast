import axios from 'axios';
import { storage } from '../utils/storage'; // Pastikan path benar

const API = axios.create({
    baseURL: 'https://backend.tangerangfast.online/api',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Tambahkan Interceptor untuk Token Otomatis
API.interceptors.request.use(
    async (config) => {
        const token = await storage.get('userToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export default API;