import { Tabs } from 'expo-router';
import { Ionicons, Octicons, FontAwesome } from '@expo/vector-icons';

export default function MitraLayout() {
    return (
        <Tabs screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#633594',
            tabBarInactiveTintColor: '#64748B',
            tabBarStyle: {
                height: 60,
                paddingBottom: 8,
                paddingTop: 8,
            }
        }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dashboard Mitra',
                    tabBarLabel: 'Beranda',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="services"
                options={{
                    title: 'Layanan Saya',
                    tabBarLabel: 'Jasa',
                    tabBarIcon: ({ color, focused }) => (
                        <Octicons name={focused ? "list-ordered" : "list-unordered"} size={24} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="riwayat"
                options={{
                    title: 'Riwayat',
                    tabBarLabel: 'Riwayat',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "receipt" : "receipt-outline"} size={24} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="complete-profile"
                options={{
                    title: 'Toko Saya',
                    tabBarLabel: 'Toko',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? "storefront" : "storefront-outline"} size={24} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="withdraw"
                options={{
                    href: null, // Ini akan menghilangkan ikon dari tab ba
                    title: 'Tarik Saldo',
                    headerStyle: { backgroundColor: '#633594' },
                    headerTintColor: '#fff',
                }}
            />



            {/* Sembunyikan detail order */}
            <Tabs.Screen
                name="orders/[id]"
                options={{
                    title: 'Detail Order',
                    href: null,
                    headerShown: false,
                    headerStyle: { backgroundColor: '#633594' },
                    headerTintColor: '#fff',
                }}
            />
        </Tabs>
    );
}