import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform, Alert } from 'react-native';
import { storage } from './utils/storage';

export default function Index() {
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            // Ambil data dari SecureStore/LocalStorage
            const token = await storage.get('userToken');
            const userData = await storage.get('userData');

            // Simulasi loading sebentar agar transisi tidak kasar
            setTimeout(() => {
                if (token && userData) {
                    // Jika sudah login, arahkan ke Dashboard Mitra
                    router.replace('/(mitra)');
                } else {
                    // Jika belum login, beri tahu user (Hanya jika perlu)
                    // arahkan ke halaman Login
                    router.replace('/(auth)/login');
                }
                setIsChecking(false);
            }, 1000);

        } catch (error) {
            console.error("Error checking session:", error);
            router.replace('/(auth)/login');
        }
    };

    // Tampilan loading saat mengecek sesi
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#633594" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
});