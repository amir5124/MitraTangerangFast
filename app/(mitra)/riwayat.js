import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ActivityIndicator,
    TouchableOpacity, FlatList, Alert, StatusBar, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import API from '../utils/api';
import { storage } from '../utils/storage';

const THEME_COLOR = '#633594';

export default function RiwayatPesanan() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [orders, setOrders] = useState([]);
    const [userData, setUserData] = useState(null);

    // Gunakan ref untuk mencegah double fetch saat mount
    const isFirstRun = useRef(true);

    useEffect(() => {
        if (isFirstRun.current) {
            loadUserData();
            isFirstRun.current = false;
        }
    }, []);

    const loadUserData = async () => {
        try {
            const rawUser = await storage.get('userData');
            if (rawUser) {
                const parsedUser = typeof rawUser === 'string' ? JSON.parse(rawUser) : rawUser;
                setUserData(parsedUser);
                await fetchHistory(parsedUser.store_id);
            } else {
                router.replace('/(auth)/login');
            }
        } catch (error) {
            console.error("User data load error", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async (storeId) => {
        try {
            // Gunakan limit yang lebih besar untuk halaman riwayat
            const response = await API.get(`/mitra/orders-history/${storeId}?limit=100`);
            if (response.data.success) {
                setOrders(response.data.data);
            }
        } catch (error) {
            console.error("❌ Error Riwayat:", error.message);
            Alert.alert("Gagal", "Tidak dapat mengambil riwayat pesanan.");
        } finally {
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        if (userData?.store_id) {
            fetchHistory(userData.store_id);
        }
    }, [userData]);

    const formatIDR = (val) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(val || 0);
    };

    const getStatusStyle = (order) => {
        // --- LOGIKA SYNC 24 JAM ---
        const updatedAt = new Date(order.updated_at);
        const now = new Date();
        const isExpired = (now - updatedAt) > (24 * 60 * 60 * 1000);

        // Jika working + ada bukti + sudah lewat 24 jam (sebelum cron berjalan)
        if (order.status === 'working' && order.proof_image_url && isExpired) {
            return { label: 'SELESAI (SISTEM)', color: '#4CAF50' };
        }

        if (order.status === 'working' && order.proof_image_url) {
            return { label: 'MENUNGGU KONFIRMASI', color: '#F2994A' };
        }

        const config = {
            unpaid: { label: 'MENUNGGU PEMBAYARAN', color: '#757575' },
            pending: { label: 'DIBAYAR', color: '#FFC107' },
            accepted: { label: 'DITERIMA', color: '#2196F3' },
            on_the_way: { label: 'DI JALAN', color: '#3b82f6' },
            working: { label: 'PENGERJAAN', color: '#8b5cf6' },
            completed: { label: 'SELESAI', color: '#4CAF50' },
            cancelled: { label: 'DIBATALKAN', color: '#E53935' }
        };
        return config[order.status] || { label: order.status.toUpperCase(), color: '#757575' };
    };

    const renderOrderItem = ({ item }) => {
        const status = getStatusStyle(item);
        return (
            <TouchableOpacity
                style={styles.orderCard}
                onPress={() => router.push(`/(mitra)/orders/${item.id}`)}
            >
                <View style={styles.orderInfo}>
                    <Text style={styles.customerName}>{item.customer_name || 'Pelanggan'}</Text>
                    <Text style={styles.serviceName}>
                        {item.service_name || 'Layanan'} {item.total_items > 1 ? `(+${item.total_items - 1} lainnya)` : ''}
                    </Text>
                    <Text style={styles.orderDate}>
                        {new Date(item.scheduled_date).toLocaleDateString('id-ID')} • {item.scheduled_time}
                    </Text>
                </View>
                <View style={styles.orderStatusCol}>
                    <Text style={styles.orderPrice}>{formatIDR(item.total_price)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                        <Text style={styles.statusText}>{status.label}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME_COLOR} />
        </View>
    );

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />



            <View style={styles.header}>
                <Text style={styles.title}>Riwayat Pesanan</Text>
                <Text style={styles.subtitle}>Daftar riwayat pesanan Anda.</Text>
            </View>



            <FlatList
                data={orders}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderOrderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME_COLOR]} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="clipboard-outline" size={80} color="#DDD" />
                        <Text style={styles.emptyText}>Belum ada riwayat</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#FDFDFD' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    headerRow: { flexDirection: 'row', alignItems: 'center' },
    backBtn: { marginRight: 15 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    headerSub: { fontSize: 13, color: '#999' },
    listContent: { padding: 20, paddingBottom: 40 },
    orderCard: {
        backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 12,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderWidth: 1, borderColor: '#EEE',
        elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5
    },
    orderInfo: { flex: 1, marginRight: 10 },
    customerName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
    serviceName: { fontSize: 12, color: '#633594', marginVertical: 2 },
    orderDate: { fontSize: 11, color: '#999' },
    orderStatusCol: { alignItems: 'flex-end' },
    orderPrice: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 5 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { color: '#fff', fontSize: 9, fontWeight: 'bold', textAlign: 'center' },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { color: '#BBB', marginTop: 10, fontSize: 16 },
    header: { padding: 25, backgroundColor: '#633594' },
    title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    subtitle: { fontSize: 13, color: '#d8b4fe', marginTop: 5 },
});