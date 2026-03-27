import { Stack, useRouter } from 'expo-router';
import { RootSiblingParent } from 'react-native-root-siblings';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// --- 1. KONFIGURASI HANDLER ---
// Ini memastikan HP tetap bunyi "Ting!" meskipun Mitra sedang buka aplikasi
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export default function RootLayout() {
    const router = useRouter();
    const notificationListener = useRef();
    const responseListener = useRef();

    useEffect(() => {
        // --- 2. DAFTARKAN PERANGKAT & CHANNEL ---
        registerForPushNotificationsAsync().then(token => {
            if (token) {
                console.log("✅ FCM Token Mitra:", token);
                // TIPS: Jangan lupa kirim token ini ke database backend kamu
                // agar backend tahu ke mana harus mengirim notif.
            }
        });

        // --- 3. LISTENER SAAT APP TERBUKA (Foreground) ---
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log("🔔 Notif diterima (Foreground):", notification);
        });

        // --- 4. LISTENER SAAT NOTIF DIKLIK (Background/Quit) ---
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            console.log("📩 Notif diklik, data:", data);

            // Jika ada data orderId dari backend, langsung arahkan ke detail
            if (data.orderId) {
                router.push(`/(mitra)/orders/${data.orderId}`);
            }
        });

        return () => {
            if (notificationListener.current) notificationListener.current.remove();
            if (responseListener.current) responseListener.current.remove();
        };
    }, []);

    return (
        <SafeAreaProvider>
            <RootSiblingParent>
                <StatusBar style="light" backgroundColor="#633594" translucent={true} />
                <SafeAreaView style={{ flex: 1, backgroundColor: '#633594' }}>
                    <Stack
                        screenOptions={{
                            headerShown: false,
                            contentStyle: { backgroundColor: '#fff' }
                        }}
                    >
                        <Stack.Screen name="index" />
                        <Stack.Screen name="(auth)" />
                        <Stack.Screen name="(mitra)" />
                        <Stack.Screen name="withdraw" />
                    </Stack>
                </SafeAreaView>
            </RootSiblingParent>
        </SafeAreaProvider>
    );
}

// --- 5. FUNGSI HELPER TOKEN & CHANNEL (ROBUST VERSION) ---
async function registerForPushNotificationsAsync() {
    let token;

    // A. SETUP CHANNEL (PENTING AGAR BUNYI DI ANDROID)
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('orders', {
            name: 'Pesanan Baru',
            importance: Notifications.AndroidImportance.MAX, // Muncul melayang di atas
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
            sound: 'default', // Menggunakan suara default sistem
            lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
    }

    if (Device.isDevice) {
        // B. MINTA IZIN
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            alert('Aktifkan izin notifikasi di pengaturan agar tidak ketinggalan pesanan!');
            return;
        }

        // C. AMBIL NATIVE FCM TOKEN
        try {
            // Gunakan getDevicePushTokenAsync agar kompatibel dengan Firebase Admin SDK di backend
            const deviceToken = await Notifications.getDevicePushTokenAsync();
            token = deviceToken.data;
        } catch (e) {
            console.log("❌ Gagal ambil Native Token, mencoba Expo Token:", e);
            // Fallback ke Expo Token jika native gagal
            const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
            token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        }
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}