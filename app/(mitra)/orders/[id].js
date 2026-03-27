import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    ScrollView, Image, Alert, Linking, Platform, RefreshControl, StatusBar
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import API from '../../../utils/api';
import Toast from 'react-native-root-toast';

export default function DetailOrder() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [workImage, setWorkImage] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const THEME_PURPLE = '#633594';

    // Helper Translate Status
    const translateStatus = (status) => {
        const dictionary = {
            'pending': 'MENUNGGU KONFIRMASI',
            'accepted': 'PESANAN DITERIMA',
            'on_the_way': 'DALAM PERJALANAN',
            'working': 'SEDANG DIKERJAKAN',
            'completed': 'SELESAI',
            'cancelled': 'DIBATALKAN'
        };
        return dictionary[status] || status.toUpperCase();
    };

    const fetchOrderDetail = useCallback(async () => {
        // Proteksi jika ID belum terbaca oleh Expo Router
        if (!id || id === '[id]' || id === 'undefined') {
            return;
        }

        try {
            console.log(`[DEBUG] Fetching: /orders/detail/${id}`);
            const response = await API.get(`/orders/detail/${id}`);


            if (response.data && response.data.success) {
                setOrder(response.data.data);
            }
        } catch (error) {
            console.error("❌ API Error Detail:", error.response?.status, error.message);
            if (error.response?.status === 404) {
                Alert.alert("Data Tidak Ditemukan", "Pesanan tidak ditemukan di server. Pastikan ID benar.");
            } else {
                Alert.alert("Gagal", "Koneksi ke server bermasalah.");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) fetchOrderDetail();
    }, [fetchOrderDetail]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchOrderDetail();
    };

    // Fungsi untuk mengambil foto dari Kamera
    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Izin Kamera", "Aplikasi butuh izin kamera untuk mengambil foto.");
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            setWorkImage(result.assets[0].uri);
        }
    };

    // Fungsi untuk memilih foto dari Galeri
    const pickFromGallery = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Izin Galeri", "Aplikasi butuh izin galeri untuk memilih foto.");
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            setWorkImage(result.assets[0].uri);
        }
    };

    const handleImagePick = () => {
        Alert.alert(
            "Unggah Foto",
            "Pilih sumber foto bukti kerja",
            [
                {
                    text: "Kamera",
                    onPress: takePhoto,
                    icon: "camera" // Opsional jika pakai library custom
                },
                {
                    text: "Galeri",
                    onPress: pickFromGallery
                },
                {
                    text: "Batal",
                    style: "cancel"
                }
            ],
            { cancelable: true }
        );
    };

    /**
 * Fungsi untuk memformat nomor telepon ke standar internasional (62)
 */
    const formatPhoneNumber = (phone) => {
        if (!phone) return '';

        // 1. Hapus semua karakter yang bukan angka
        let cleaned = phone.toString().replace(/\D/g, '');

        // 2. Jika diawali '0', ganti dengan '62'
        if (cleaned.startsWith('0')) {
            cleaned = '62' + cleaned.substring(1);
        }

        // 3. Jika diawali '8' (langsung ke nomor inti), tambahkan '62'
        else if (cleaned.startsWith('8')) {
            cleaned = '62' + cleaned;
        }

        return cleaned;
    };

    const processUpdate = async (newStatus) => {
        setActionLoading(true);
        try {
            const formData = new FormData();
            formData.append('status', newStatus);

            if (newStatus === 'completed') {
                if (!workImage) {
                    // Ganti showToast menjadi Toast.show
                    Toast.show("Harap ambil foto bukti pengerjaan.", {
                        duration: Toast.durations.LONG,
                        position: Toast.positions.BOTTOM,
                        backgroundColor: "#f59e0b", // Oranye untuk peringatan
                    });
                    setActionLoading(false);
                    return;
                }

                const fileName = workImage.split('/').pop();
                const fileType = fileName.split('.').pop();
                formData.append('image', {
                    uri: Platform.OS === 'ios' ? workImage.replace('file://', '') : workImage,
                    name: fileName || `finish_${id}.jpg`,
                    type: `image/${fileType === 'png' ? 'png' : 'jpeg'}`,
                });
            }

            await API.post(`/orders/${id}/update-status`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                transformRequest: (data) => data,
                timeout: 60000
            });

            if (newStatus === 'cancelled') {
                Toast.show("Pesanan dibatalkan", {
                    backgroundColor: "#64748b",
                    position: Toast.positions.BOTTOM
                });
                router.replace('/(mitra)/home');
            } else {
                setWorkImage(null);
                fetchOrderDetail();

                // Tentukan pesan berdasarkan status
                const successMsg = newStatus === 'completed'
                    ? "Laporan selesai dikirim! Menunggu konfirmasi pelanggan."
                    : `Status diperbarui ke ${newStatus.replace('_', ' ')}`;

                // Ganti showToast menjadi Toast.show
                Toast.show(successMsg, {
                    duration: Toast.durations.SHORT,
                    position: Toast.positions.BOTTOM,
                    shadow: true,
                    animation: true,
                    backgroundColor: "#633594", // Ungu Tema
                    textColor: "#ffffff",
                });
            }
        } catch (error) {
            console.error("Update Error:", error.response?.data || error.message);

            // Ganti showToast menjadi Toast.show
            Toast.show(error.response?.data?.message || "Terjadi kesalahan server.", {
                duration: Toast.durations.LONG,
                position: Toast.positions.BOTTOM,
                backgroundColor: "#ef4444", // Merah untuk error
            });
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={THEME_PURPLE} /></View>;
    if (!order) return <View style={styles.center}><Text>Data tidak ditemukan</Text></View>;

    const isAccepted = order.status !== 'pending' && order.status !== 'cancelled';
    const services = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);

    return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
            <StatusBar barStyle="light-content" backgroundColor={getStatusColor(order.status)} />
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Header Status */}
                <View style={[styles.headerStatus, { backgroundColor: getStatusColor(order.status) }]}>
                    <Text style={styles.headerStatusText}>
                        {translateStatus(order.status)}
                    </Text>
                    <Text style={styles.headerSubText}>ID PESANAN: #{order.id}</Text>
                </View>

                {/* Info Pekerjaan */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <MaterialCommunityIcons name="toolbox" size={22} color={THEME_PURPLE} />
                        <Text style={styles.cardTitle}>Rincian Layanan</Text>
                    </View>
                    {services.map((item, index) => (
                        <View key={index} style={styles.serviceRow}>
                            <Text style={styles.serviceName}>{item.nama} x{item.qty}</Text>
                            <Text style={styles.servicePrice}>Rp {(item.hargaSatuan * item.qty).toLocaleString('id-ID')}</Text>
                        </View>
                    ))}
                    <View style={styles.divider} />
                    <View style={{
                        backgroundColor: '#fff7ed', // Oranye sangat muda (memberi kesan penting/alert)
                        padding: 10,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: '#ffedd5',
                        marginTop: 8,
                        flexDirection: 'row',
                        alignItems: 'center'
                    }}>
                        <Ionicons name="alarm-outline" size={20} color="#ea580c" />

                        <View style={{ marginLeft: 10 }}>
                            <Text style={{ fontSize: 10, color: '#9a3412', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                Jadwal Kebutuhan Pelanggan:
                            </Text>
                            <Text style={{ fontSize: 14, color: '#1e293b', fontWeight: 'bold' }}>
                                {order.scheduled_date} <Text style={{ fontWeight: 'normal', color: '#64748b' }}>pada</Text> {order.scheduled_time} WIB
                            </Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                        <MaterialCommunityIcons name="note-text-outline" size={16} color="#64748B" />
                        <Text style={{ fontSize: 11, color: '#64748B', fontWeight: 'bold', marginLeft: 5, letterSpacing: 0.5 }}>
                            CATATAN DARI PELANGGAN:
                        </Text>
                    </View>
                    <Text style={{ fontSize: 13, color: '#1E293B', fontStyle: 'italic', lineHeight: 18, marginTop: 5 }}>
                        "{order.customer_notes}"
                    </Text>
                </View>

                {/* Box Konfirmasi (Hanya Pending) */}
                {order.status === 'pending' && (
                    <View style={styles.confirmBox}>
                        <Text style={styles.confirmTitle}>Terima Pekerjaan?</Text>
                        <View style={styles.rowBtn}>
                            <TouchableOpacity style={[styles.halfBtn, styles.btnOutline]} onPress={() => processUpdate('cancelled')} disabled={actionLoading}>
                                <Text style={styles.btnTextDanger}>Abaikan</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.halfBtn, styles.btnPrimary]} onPress={() => processUpdate('accepted')} disabled={actionLoading}>
                                {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTextWhite}>Terima</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Kontak Pelanggan */}
                {isAccepted ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Informasi Pelanggan</Text>
                        <Text style={styles.label}>Nama</Text>
                        <Text style={styles.value}>{order.customer_name}</Text>
                        <Text style={styles.label}>Lokasi</Text>
                        <Text style={styles.value}>{order.address_customer}</Text>

                        <View style={styles.rowBtn}>
                            {/* Tombol WhatsApp */}
                            <TouchableOpacity
                                style={styles.waBtn}
                                onPress={() => {
                                    const formatted = formatPhoneNumber(order.customer_phone);
                                    Linking.openURL(`https://wa.me/${formatted}`);
                                }}
                            >
                                <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                                <Text style={styles.waBtnText}>WhatsApp</Text>
                            </TouchableOpacity>

                            {/* Tombol Rute Maps */}
                            <TouchableOpacity
                                style={styles.mapBtn}
                                onPress={() => {
                                    const lat = order.lat_customer;
                                    const lng = order.lng_customer;

                                    if (!lat || !lng) {
                                        alert("Koordinat lokasi tidak ditemukan");
                                        return;
                                    }

                                    const url = Platform.select({
                                        ios: `maps://app?daddr=${lat},${lng}`,
                                        android: `google.navigation:q=${lat},${lng}`,
                                        web: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
                                    });

                                    Linking.openURL(url);
                                }}
                            >
                                <Ionicons name="map" size={18} color="#fff" />
                                <Text style={styles.waBtnText}>Rute Maps</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={styles.lockedCard}>
                        <Ionicons name="lock-closed" size={24} color="#cbd5e1" />
                        <Text style={styles.lockedText}>Terima pesanan untuk melihat detail pelanggan</Text>
                    </View>
                )}

                {/* Action Buttons (Dinamis) */}
                {/* Action Buttons (Dinamis) */}
                {isAccepted && order.status !== 'completed' && (
                    <View style={styles.actionContainer}>
                        {actionLoading ? (
                            <ActivityIndicator color={THEME_PURPLE} size="large" />
                        ) : (
                            <>
                                {order.status === 'accepted' && (
                                    <TouchableOpacity style={styles.primaryBtnLarge} onPress={() => processUpdate('on_the_way')}>
                                        <Text style={styles.btnTextWhite}>Berangkat Sekarang </Text>
                                    </TouchableOpacity>
                                )}
                                {order.status === 'on_the_way' && (
                                    <TouchableOpacity style={[styles.primaryBtnLarge, { backgroundColor: '#3b82f6' }]} onPress={() => processUpdate('working')}>
                                        <Text style={styles.btnTextWhite}>Mulai Pengerjaan </Text>
                                    </TouchableOpacity>
                                )}

                                {/* LOGIKA BARU: Jika status working */}
                                {order.status === 'working' && (
                                    <View style={styles.workBox}>
                                        {/* KONDISI A: Mitra sudah upload bukti tapi pelanggan belum konfirmasi */}
                                        {order.proof_image_url ? (
                                            <View style={{ alignItems: 'center', padding: 10 }}>
                                                <MaterialCommunityIcons name="clock-check-outline" size={50} color="#f59e0b" />
                                                <Text style={[styles.workTitle, { marginTop: 10, color: '#f59e0b' }]}>
                                                    Laporan Terkirim
                                                </Text>
                                                <Text style={{ color: '#64748b', textAlign: 'center', lineHeight: 20 }}>
                                                    Menunggu konfirmasi penyelesaian dari pelanggan atau otomatis selesai dalam 24 jam.
                                                </Text>

                                                {/* Opsional: Tampilkan foto yang sudah diupload */}
                                                <Image
                                                    source={{ uri: order.proof_image_url }}
                                                    style={[styles.previewImage, { marginTop: 15, opacity: 0.7 }]}
                                                />
                                            </View>
                                        ) : (
                                            /* KONDISI B: Mitra sedang bekerja dan BELUM upload bukti */
                                            <>
                                                <Text style={styles.workTitle}>Selesaikan Pekerjaan</Text>
                                                {workImage ? (
                                                    <View style={{ width: '100%' }}>
                                                        <Image source={{ uri: workImage }} style={styles.previewImage} />
                                                        <TouchableOpacity onPress={() => setWorkImage(null)} style={styles.retakeBtn}>
                                                            <Text style={styles.retakeText}>Hapus & Foto Ulang</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                ) : (
                                                    <TouchableOpacity style={styles.cameraBtn} onPress={handleImagePick}>
                                                        <Ionicons name="camera" size={40} color={THEME_PURPLE} />
                                                        <Text style={styles.cameraText}>Ambil Foto Bukti Selesai</Text>
                                                    </TouchableOpacity>
                                                )}
                                                <TouchableOpacity
                                                    style={[styles.primaryBtnLarge, { marginTop: 15, opacity: workImage ? 1 : 0.5 }]}
                                                    disabled={!workImage}
                                                    onPress={() => processUpdate('completed')}
                                                >
                                                    <Text style={styles.btnTextWhite}>Kirim Laporan Selesai</Text>
                                                </TouchableOpacity>
                                            </>
                                        )}
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                )}
                {order.status === 'completed' && (
                    <View style={styles.finishBadge}>

                        <Text style={styles.finishText}>Tugas Selesai!</Text>
                        <Text style={{ color: '#64748b', textAlign: 'center' }}>Dana akan segera diteruskan ke saldo Anda.</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const getStatusColor = (status) => {
    switch (status) {
        case 'pending': return '#f59e0b';
        case 'accepted': return '#633594';
        case 'on_the_way': return '#3b82f6';
        case 'working': return '#8b5cf6';
        case 'completed': return '#633594';
        case 'cancelled': return '#ef4444';
        default: return '#64748b';
    }
};

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerStatus: { padding: 30, alignItems: 'center' },
    headerStatusText: { color: '#fff', fontWeight: 'bold', fontSize: 18, letterSpacing: 1 },
    headerSubText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 5 },
    card: { backgroundColor: '#fff', margin: 16, padding: 18, borderRadius: 18, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginLeft: 8 },
    serviceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    serviceName: { fontSize: 14, color: '#475569', flex: 1 },
    servicePrice: { fontSize: 14, fontWeight: 'bold', color: '#633594' },
    divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },
    infoRowSmall: { flexDirection: 'row', alignItems: 'center' },
    valueSmall: { fontSize: 13, color: '#64748b', marginLeft: 6 },
    confirmBox: { backgroundColor: '#fff', margin: 16, padding: 20, borderRadius: 18, alignItems: 'center', borderWidth: 2, borderColor: '#633594' },
    confirmTitle: { fontSize: 18, fontWeight: 'bold', color: '#633594', marginBottom: 15 },
    rowBtn: { flexDirection: 'row', width: '100%', gap: 12, marginTop: 10 },
    halfBtn: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
    btnPrimary: { backgroundColor: '#633594' },
    btnOutline: { borderWidth: 1, borderColor: '#ef4444' },
    btnTextWhite: { color: '#fff', fontWeight: 'bold' },
    btnTextDanger: { color: '#ef4444', fontWeight: 'bold' },
    lockedCard: { padding: 30, alignItems: 'center', opacity: 0.6 },
    lockedText: { color: '#64748b', fontSize: 13, marginTop: 10, textAlign: 'center' },
    label: { fontSize: 12, color: '#94a3b8', marginTop: 12 },
    value: { fontSize: 15, fontWeight: '600', color: '#1e293b', marginTop: 2 },
    waBtn: { flex: 1, backgroundColor: '#633594', flexDirection: 'row', padding: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    mapBtn: { flex: 1, backgroundColor: '#633594', flexDirection: 'row', padding: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    waBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
    actionContainer: { paddingHorizontal: 16, marginBottom: 40 },
    primaryBtnLarge: { backgroundColor: '#633594', padding: 20, borderRadius: 15, alignItems: 'center', width: '100%', elevation: 3 },
    workBox: { backgroundColor: '#fff', padding: 20, borderRadius: 18, elevation: 2, alignItems: 'center' },
    workTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 15 },
    cameraBtn: { width: '100%', height: 160, borderRadius: 15, borderStyle: 'dashed', borderWidth: 2, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
    cameraText: { marginTop: 10, color: '#64748b', fontWeight: '500' },
    previewImage: { width: '100%', height: 220, borderRadius: 15 },
    retakeBtn: { padding: 12 },
    retakeText: { color: '#ef4444', fontWeight: 'bold', textAlign: 'center' },
    finishBadge: { alignItems: 'center', padding: 10 },
    finishText: { fontSize: 22, fontWeight: 'bold', color: '#10b981', marginTop: 10 }
});