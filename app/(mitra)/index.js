import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ActivityIndicator,
    TouchableOpacity, ScrollView, Alert, Image, StatusBar, RefreshControl, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import API from '../utils/api';
import { storage } from '../utils/storage';

export default function DashboardMitra() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false); // State untuk refresh
    const [dashboardData, setDashboardData] = useState(null);
    const [userData, setUserData] = useState(null);
    const [storeLogo, setStoreLogo] = useState(null);

    const THEME_COLOR = '#633594';

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Fungsi fetch data yang bisa dipanggil berulang
    const fetchDashboardData = async () => {
        try {
            const rawUser = await storage.get('userData');
            if (!rawUser) {
                router.replace('/(auth)/login');
                return null;
            }
            const parsedUser = typeof rawUser === 'string' ? JSON.parse(rawUser) : rawUser;
            setUserData(parsedUser);

            if (parsedUser.store_id) {
                const response = await API.get(`/mitra/dashboard/${parsedUser.store_id}`);
                if (response.data.success) {
                    setDashboardData(response.data.data);
                }
                return parsedUser.store_id; // Tambahkan ini
            }
        } catch (error) {
            console.error("❌ Error Dashboard:", error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
        return null;
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        const storeId = await fetchDashboardData();
        if (storeId) {
            fetchStorePhoto(storeId);
        }
    }, []);

    useEffect(() => {
        const initData = async () => {
            // Ambil data dashboard dulu
            const storeId = await fetchDashboardData();
            // Jika storeId ada, baru ambil fotonya
            if (storeId) {
                fetchStorePhoto(storeId);
            }
        };
        initData();
    }, []);

   const fetchStorePhoto = async (storeId) => {
    try {
        const token = await storage.get('userToken');
        const res = await API.get(`/mitra/profile/${storeId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data && res.data.store_logo_url) {
            let url = res.data.store_logo_url;
            const baseUrl = 'https://backend.tangerangfast.online';

            // Samakan logikanya dengan halaman Complete Profile
            // Jika ada '/uploads/' tapi belum ada '/services/', selipkan '/services/'
            if (url.includes('/uploads/') && !url.includes('/services/')) {
                url = url.replace('/uploads/', '/uploads/services/');
            }

            const cleanPath = url.startsWith('/') ? url : `/${url}`;
            const fullUrl = `${baseUrl}${cleanPath}`;

            console.log("Full Logo URL (Corrected):", fullUrl);
            setStoreLogo(fullUrl);
        }
    } catch (err) {
        console.error("Gagal ambil foto toko:", err);
    }
};
    const formatIDR = (val) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(val || 0);
    };



    const getStatusColor = (order) => {
        // Jika sedang menunggu konfirmasi pelanggan
        if (order.status === 'working' && order.proof_image_url) {
            return '#F2994A'; // Warna Oranye/Kuning
        }

        switch (order.status) {
            case 'completed': return '#4CAF50';
            case 'accepted': return '#2196F3';
            case 'on_the_way': return '#3b82f6';
            case 'working': return '#8b5cf6';
            case 'pending': return '#FFC107';
            default: return '#757575';
        }
    };

    const getStatusLabel = (order) => {
        // Jika status working tapi sudah ada foto bukti
        if (order.status === 'working' && order.proof_image_url) {
            return 'MENUNGGU KONFIRMASI';
        }

        const map = {
            unpaid: 'MENUNGGU PEMBAYARAN',
            pending: 'DIBAYAR',
            accepted: 'DITERIMA',
            on_the_way: 'DI JALAN',
            working: 'PENGERJAAN',
            completed: 'SELESAI',
            cancelled: 'DIBATALKAN'
        };
        return map[order.status] || order.status.toUpperCase();
    };

    const openWhatsApp = () => {
        const phoneNumber = '628211074757';
        const message = 'Halo CS Mitra Fast, saya mitra ingin bertanya terkait kendala sistem...';
        const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;

        Linking.canOpenURL(url)
            .then((supported) => {
                if (supported) {
                    return Linking.openURL(url);
                } else {
                    // Fallback jika aplikasi WA tidak terinstall, buka via browser
                    return Linking.openURL(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`);
                }
            })
            .catch((err) => console.error('An error occurred', err));
    };

    if (loading) return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME_COLOR} />
        </View>
    );

    return (
        <View style={{ flex: 1, backgroundColor: '#FDFDFD' }}>
            <StatusBar barStyle="light-content" backgroundColor={THEME_COLOR} />

            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 30 }}
                // --- PULL TO REFRESH ---
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[THEME_COLOR]} // Android
                        tintColor={THEME_COLOR} // iOS
                    />
                }
            >
                {/* 1. Header Profile & Saldo */}
                <View style={[styles.headerCard, { backgroundColor: THEME_COLOR }]}>
                    <View style={styles.profileRow}>
                        <View style={styles.avatarContainer}>
                            {storeLogo ? (
                                <Image
                                    source={{ uri: storeLogo }}
                                    style={styles.avatarImage}
                                    resizeMode="cover"
                                />
                            ) : (
                                <Ionicons name="person" size={40} color={THEME_COLOR} />
                            )}
                        </View>
                        <View style={styles.profileText}>
                            <Text style={styles.balanceText}>{formatIDR(dashboardData?.stats?.balance)}</Text>
                            <Text style={styles.saldoLabel}>Saldo Dompet Mitra</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.iconCircle}
                            onPress={() => router.push('/(mitra)/withdraw')} // Arahkan ke halaman tarik saldo
                        >
                            <Ionicons name="wallet-outline" size={24} color="#fff" />


                        </TouchableOpacity>
                    </View>
                </View>

                {/* 2. Statistik Section */}
                <View style={styles.contentPadding}>
                    <Text style={styles.sectionTitle}>Statistik {dashboardData?.store_name}</Text>

                    <View style={styles.statsGrid}>
                        <StatBox
                            title="Total Pendapatan"
                            value={formatIDR(dashboardData?.stats?.revenue)}
                            image="https://cdn-icons-png.flaticon.com/512/2489/2489756.png"
                        />
                        <StatBox
                            title="Pekerjaan Aktif"
                            value={dashboardData?.stats?.active_jobs || 0}
                            image="https://cdn-icons-png.flaticon.com/512/10384/10384161.png"
                        />
                        <StatBox
                            title="Rating Mitra"
                            value={dashboardData?.stats?.rating || "0.0"}
                            stars={true}
                        />
                        <StatBox
                            title="Pekerjaan Selesai"
                            value={dashboardData?.stats?.completed_jobs || 0}
                            image="https://cdn-icons-png.flaticon.com/512/3062/3062534.png"
                        />
                    </View>

                    {/* 3. Recent Orders Section */}
                    <View style={styles.orderHeaderRow}>
                        <Text style={styles.sectionTitle}>Pesanan Terbaru</Text>
                        <TouchableOpacity onPress={() => router.push('/(mitra)/riwayat')}
                            activeOpacity={0.7}
                        >
                            <Text style={{ color: THEME_COLOR, fontWeight: 'bold' }}>Lihat Semua</Text>
                        </TouchableOpacity>
                    </View>

                    {/* --- LOGIKA PENGECEKAN PESANAN --- */}
                    {dashboardData?.recent_orders && dashboardData.recent_orders.length > 0 ? (
                        dashboardData.recent_orders.map((order, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.orderCard}
                                onPress={() => router.push(`/(mitra)/orders/${order.id}`)}
                            >
                                <View style={styles.orderInfo}>
                                    <Text style={styles.customerName}>{order.customer_name}</Text>
                                    <Text style={styles.serviceName}>
                                        {order.service_name} {order.total_items > 1 ? `(+${order.total_items - 1} lainnya)` : ''}
                                    </Text>
                                    <Text style={styles.orderDate}>
                                        {new Date(order.scheduled_date).toLocaleDateString('id-ID')} • {order.scheduled_time}
                                    </Text>
                                </View>
                                {/* Cari bagian ini di render kamu */}
                                <View style={styles.orderStatusCol}>
                                    <Text style={styles.orderPrice}>{formatIDR(order.total_price)}</Text>

                                    {/* GANTI DUA BARIS DI BAWAH INI */}
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order) }]}>
                                        <Text style={styles.statusText}>{getStatusLabel(order)}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        // Tampilan Jika Belum Ada Pesanan
                        <View style={styles.emptyContainer}>
                            <Ionicons name="clipboard-outline" size={60} color="#DDD" />
                            <Text style={styles.emptyText}>Belum ada pesanan terbaru</Text>
                            <Text style={styles.emptySubText}>Pesanan yang masuk akan muncul di sini.</Text>
                        </View>
                    )}

                    {/* 4. Help Banner */}
                    <View style={styles.helpBanner}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.helpTitle}>Butuh Bantuan?</Text>
                            <Text style={styles.helpSub}>Hubungi CS untuk kendala sistem</Text>

                            {/* Tambahkan onPress di sini */}
                            <TouchableOpacity
                                style={styles.btnBantuan}
                                onPress={openWhatsApp}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.btnBantuanText}>Chat Support</Text>
                            </TouchableOpacity>
                        </View>
                        <Image
                            source={{ uri: 'https://img.freepik.com/free-vector/hijab-woman-pointing-something-cartoon-character_1308-161706.jpg' }}
                            style={styles.helpImage}
                        />
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

// Komponen StatBox tetap sama...
const StatBox = ({ title, value, image, stars }) => (
    <View style={styles.statBox}>
        {stars ? (
            <View style={styles.starRow}>
                <View style={{ flexDirection: 'row', marginRight: 5 }}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Ionicons name="star" size={14} color="#FFD700" />
                </View>
                <Text style={{ color: '#777', fontSize: 10 }}>Rata-rata</Text>
            </View>
        ) : (
            <Image source={{ uri: image }} style={styles.statIcon} />
        )}
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{title}</Text>
    </View>
);

const styles = StyleSheet.create({
    // ... Style sebelumnya tetap ada ...
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerCard: { paddingTop: 20, paddingBottom: 20, paddingHorizontal: 15 },
    profileRow: { flexDirection: 'row', alignItems: 'center' },
    avatarContainer: {
        width: 50, height: 50, borderRadius: 25,
        backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center'
    },
    profileText: { marginLeft: 15, flex: 1 },
    balanceText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
    saldoLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
    iconCircle: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
    badge: {
        position: 'absolute', top: -2, right: -2,
        backgroundColor: '#FF5252', borderRadius: 9,
        width: 18, height: 18, justifyContent: 'center', alignItems: 'center',
        borderWidth: 1.5, borderColor: '#633594'
    },
    badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
    contentPadding: { padding: 20 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
    statBox: {
        backgroundColor: '#fff', width: '48%', marginBottom: 15,
        padding: 15, borderRadius: 15, alignItems: 'center',
        elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5
    },
    statIcon: { width: 30, height: 30, marginBottom: 8, resizeMode: 'contain' },
    statValue: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    statLabel: { fontSize: 10, color: '#999', marginTop: 2 },
    orderHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 10 },
    orderCard: {
        backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 12,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderWidth: 1, borderColor: '#EEE'
    },
    customerName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
    serviceName: { fontSize: 12, color: '#633594', marginVertical: 2 },
    orderDate: { fontSize: 11, color: '#999' },
    orderStatusCol: { alignItems: 'flex-end' },
    orderPrice: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 5 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },

    // --- STYLES BARU UNTUK EMPTY STATE ---
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9F9F9',
        borderRadius: 15,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#DDD',
        marginTop: 10
    },
    emptyText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#666',
        marginTop: 10
    },
    emptySubText: {
        fontSize: 12,
        color: '#AAA',
        marginTop: 5,
        textAlign: 'center'
    },

    helpBanner: {
        backgroundColor: '#F3E5F5', borderRadius: 15, padding: 20,
        flexDirection: 'row', marginTop: 20, alignItems: 'center'
    },
    helpTitle: { fontSize: 15, fontWeight: 'bold', color: '#633594' },
    helpSub: { fontSize: 12, color: '#666', marginBottom: 12 },
    btnBantuan: { backgroundColor: '#633594', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, alignSelf: 'flex-start' },
    btnBantuanText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
    helpImage: { width: 60, height: 80, resizeMode: 'contain' },
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 40,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#fff'
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
});