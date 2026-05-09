import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import API from './utils/api';
import { storage } from './utils/storage';

export default function StatistikDetail() {
    const router = useRouter();
    const THEME_COLOR = '#633594';

    // States Data
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [rawOrders, setRawOrders] = useState([]);
    const [staticStats, setStaticStats] = useState({ balance: 0, rating: "0.0" });

    // States Filter
    const [timeRange, setTimeRange] = useState('hari_ini');
    const [statusFilter, setStatusFilter] = useState('all'); // FILTER STATUS BARU
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState({ start: false, end: false });
    const formatIDR = (val) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(val || 0);
    };

    const fetchData = async () => {
        try {
            const rawUser = await storage.get('userData');
            const parsedUser = typeof rawUser === 'string' ? JSON.parse(rawUser) : rawUser;
            if (!parsedUser?.store_id) return;

            const storeId = parsedUser.store_id;
            const [dashRes, historyRes] = await Promise.all([
                API.get(`/mitra/dashboard/${storeId}`),
                API.get(`/mitra/orders-history/${storeId}?limit=500`)
            ]);

            if (dashRes.data.success) {
                setStaticStats({
                    balance: dashRes.data.data.stats.balance,
                    rating: dashRes.data.data.stats.rating
                });
            }
            if (historyRes.data.success) {
                setRawOrders(historyRes.data.data);
            }
        } catch (error) {
            console.error("❌ Fetch Error:", error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, []);

    // Helper untuk Warna Status
    const getStatusStyle = (status) => {
        switch (status.toLowerCase()) {
            case 'completed': return { bg: '#E8F5E9', text: '#2E7D32', label: 'Selesai' };
            case 'cancelled': return { bg: '#FFEBEE', text: '#C62828', label: 'Batal' };
            case 'working': return { bg: '#E3F2FD', text: '#1565C0', label: 'Proses' };
            case 'pending': return { bg: '#FFF3E0', text: '#EF6C00', label: 'Menunggu' };
            default: return { bg: '#F5F5F5', text: '#616161', label: status };
        }
    };

    /**
     * LOGIKA FILTER & KALKULASI
     */
    const filteredData = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.setHours(0, 0, 0, 0));
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());

        const filtered = rawOrders.filter(order => {
            const orderDate = new Date(order.scheduled_date);

            // 1. Filter Waktu
            let matchTime = true;
            if (timeRange === 'hari_ini') matchTime = orderDate >= startOfToday;
            else if (timeRange === 'minggu_ini') matchTime = orderDate >= startOfWeek;
            else if (timeRange === 'bulan_ini') matchTime = orderDate.getMonth() === new Date().getMonth();
            else if (timeRange === 'custom') {
                matchTime = orderDate >= new Date(startDate).setHours(0, 0, 0, 0) &&
                    orderDate <= new Date(endDate).setHours(23, 59, 59);
            }

            // 2. Filter Status
            let matchStatus = statusFilter === 'all' || order.status === statusFilter;

            return matchTime && matchStatus;
        });

        // Hitung Ringkasan
        let rev = 0, comp = 0, act = 0;
        filtered.forEach(o => {
            if (o.status === 'completed') {
                comp++;
                rev += (parseFloat(o.total_price) * 0.7);
            }
            if (['pending', 'accepted', 'on_the_way', 'working'].includes(o.status)) act++;
        });

        return { list: filtered, revenue: rev, completedCount: comp, activeCount: act };
    }, [rawOrders, timeRange, statusFilter, startDate, endDate]);

    if (loading) return <ActivityIndicator size="large" color={THEME_COLOR} style={{ flex: 1 }} />;

    return (
        <View style={styles.container}>
            <View style={[styles.header, { backgroundColor: THEME_COLOR }]}>
                <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
                <Text style={styles.headerTitle}>Detail Statistik & Transaksi</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                {/* FILTER BOX */}
                <View style={styles.filterBox}>
                    <Text style={styles.label}>Periode Waktu:</Text>
                    <View style={styles.chipRow}>
                        {['hari_ini', 'minggu_ini', 'bulan_ini', 'custom'].map((v) => (
                            <TouchableOpacity key={v} style={[styles.chip, timeRange === v && { backgroundColor: THEME_COLOR }]} onPress={() => setTimeRange(v)}>
                                <Text style={[styles.chipText, timeRange === v && { color: '#fff' }]}>{v.replace('_', ' ').toUpperCase()}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={[styles.label, { marginTop: 15 }]}>Status Pekerjaan:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                        {[
                            { id: 'all', name: 'SEMUA' },
                            { id: 'completed', name: 'SELESAI' },
                            { id: 'working', name: 'PROSES' },
                            { id: 'pending', name: 'PENDING' },
                            { id: 'cancelled', name: 'BATAL' }
                        ].map((s) => (
                            <TouchableOpacity key={s.id} style={[styles.chip, statusFilter === s.id && { backgroundColor: '#4CAF50' }]} onPress={() => setStatusFilter(s.id)}>
                                <Text style={[styles.chipText, statusFilter === s.id && { color: '#fff' }]}>{s.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {timeRange === 'custom' && (
                        <View style={styles.dateRow}>
                            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowPicker({ ...showPicker, start: true })}><Text>{startDate.toLocaleDateString('id-ID')}</Text></TouchableOpacity>
                            <Text>s/d</Text>
                            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowPicker({ ...showPicker, end: true })}><Text>{endDate.toLocaleDateString('id-ID')}</Text></TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* SUMMARY CARDS */}
                <View style={styles.content}>
                    <View style={styles.mainCard}>
                        <Text style={styles.cardLabel}>Pendapatan Bersih (Terfilter)</Text>
                        <Text style={[styles.cardValue, { color: THEME_COLOR }]}>{formatIDR(filteredData.revenue)}</Text>
                    </View>

                    <View style={styles.grid}>
                        <View style={styles.smallCard}><Text style={styles.smallLabel}>Selesai</Text><Text style={styles.smallValue}>{filteredData.completedCount}</Text></View>
                        <View style={styles.smallCard}><Text style={styles.smallLabel}>Aktif</Text><Text style={[styles.smallValue, { color: 'orange' }]}>{filteredData.activeCount}</Text></View>
                        <View style={styles.smallCard}><Text style={styles.smallLabel}>Data</Text><Text style={styles.smallValue}>{filteredData.list.length}</Text></View>
                    </View>

                    {/* LIST TRANSAKSI */}
                    <Text style={[styles.label, { marginTop: 25, marginBottom: 10 }]}>Daftar Transaksi</Text>
                    {filteredData.list.length === 0 ? (
                        <Text style={styles.emptyText}>Tidak ada data pada periode/status ini</Text>
                    ) : (
                        filteredData.list.map((item, index) => {
                            const st = getStatusStyle(item.status);
                            return (
                                <View key={index} style={styles.orderItem}>
                                    <View style={styles.orderInfo}>
                                        <Text style={styles.customerName}>{item.customer_name}</Text>
                                        <Text style={styles.serviceName}>{item.service_name}</Text>
                                        <Text style={styles.orderDate}>{item.scheduled_date} • {item.scheduled_time}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.orderPrice}>{formatIDR(item.total_price)}</Text>
                                        <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                                            <Text style={[styles.statusText, { color: st.text }]}>{st.label}</Text>
                                        </View>
                                    </View>
                                </View>
                            )
                        })
                    )}
                </View>

                {showPicker.start && <DateTimePicker value={startDate} mode="date" onChange={(e, d) => { setShowPicker({ ...showPicker, start: false }); if (d) setStartDate(d); }} />}
                {showPicker.end && <DateTimePicker value={endDate} mode="date" onChange={(e, d) => { setShowPicker({ ...showPicker, end: false }); if (d) setEndDate(d); }} />}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 30 },
    headerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    filterBox: { padding: 15, backgroundColor: '#fff', elevation: 2 },
    label: { fontSize: 13, fontWeight: 'bold', color: '#333' },
    chipRow: { flexDirection: 'row', marginTop: 8, gap: 8 },
    chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15, backgroundColor: '#F0F0F0' },
    chipText: { fontSize: 10, fontWeight: 'bold', color: '#666' },
    dateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 10 },
    dateBtn: { flex: 1, padding: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', borderRadius: 5, alignItems: 'center' },
    content: { padding: 15 },
    mainCard: { padding: 20, borderRadius: 12, backgroundColor: '#fff', elevation: 3, alignItems: 'center' },
    cardLabel: { fontSize: 12, color: '#888' },
    cardValue: { fontSize: 24, fontWeight: 'bold', marginTop: 5 },
    grid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, gap: 10 },
    smallCard: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 10, elevation: 2, alignItems: 'center' },
    smallLabel: { fontSize: 10, color: '#999' },
    smallValue: { fontSize: 15, fontWeight: 'bold' },
    // Order List Styles
    orderItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 1 },
    customerName: { fontSize: 14, fontWeight: 'bold' },
    serviceName: { fontSize: 12, color: '#666', marginVertical: 2 },
    orderDate: { fontSize: 10, color: '#999' },
    orderPrice: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 5 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    emptyText: { textAlign: 'center', color: '#999', marginTop: 20 },
});