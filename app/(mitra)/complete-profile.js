import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, ActivityIndicator, Platform, Image, KeyboardAvoidingView, Alert
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-root-toast';
import { Ionicons } from '@expo/vector-icons';
import API from '../../utils/api';
import { storage } from '../../utils/storage';
import { useRouter } from 'expo-router';

// Inisialisasi MapView untuk Mobile
let MapView, Marker;
if (Platform.OS !== 'web') {
    try {
        MapView = require('react-native-maps').default;
        Marker = require('react-native-maps').Marker;
    } catch (e) {
        console.warn("Maps tidak dapat dimuat:", e);
    }
}

const BASE_URL = 'https://backend.tangerangfast.online';
const TANGERANG_DEFAULT = {
    latitude: -6.178306,
    longitude: 106.631889,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
};

export default function CompleteProfileScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [mapLoading, setMapLoading] = useState(true);

    const [form, setForm] = useState({
        identity_number: '',
        store_name: '',
        category: 'ac',
        description: '',
        store_logo_url: '',
        address: '',
        bank_name: '',
        bank_account_number: '',
        latitude: null,
        longitude: null,
    });

    const [workDays, setWorkDays] = useState([
        { day: 'Senin', active: true, open: '08:00', close: '17:00' },
        { day: 'Selasa', active: true, open: '08:00', close: '17:00' },
        { day: 'Rabu', active: true, open: '08:00', close: '17:00' },
        { day: 'Kamis', active: true, open: '08:00', close: '17:00' },
        { day: 'Jumat', active: true, open: '08:00', close: '17:00' },
        { day: 'Sabtu', active: true, open: '08:00', close: '17:00' },
        { day: 'Minggu', active: false, open: '08:00', close: '17:00' },
    ]);

    const [region, setRegion] = useState(TANGERANG_DEFAULT);

    const timeOptions = Array.from({ length: 24 }, (_, i) => {
        const hour = i.toString().padStart(2, '0');
        return [`${hour}:00`, `${hour}:30`];
    }).flat();

    const categories = [
        { label: 'Servis AC', value: 'ac' },
        { label: 'Cleaning Service', value: 'cleaning' },
    ];

    useEffect(() => {
        initData();
    }, []);

    const initData = async () => {
        try {
            const user = await storage.get('userData');
            if (user?.store_id || user?.id) {
                await fetchExistingProfile(user.store_id || user.id);
            } else {
                await getCurrentLocation();
            }
        } catch (e) {
            await getCurrentLocation();
        } finally {
            setFetching(false);
        }
    };

    const fetchExistingProfile = async (storeId) => {
        try {
            const token = await storage.get('userToken');
            const res = await API.get(`/mitra/profile/${storeId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.data;

            // Handle Jam Kerja
            if (data.operating_hours) {
                try {
                    const parsed = typeof data.operating_hours === 'string'
                        ? JSON.parse(data.operating_hours)
                        : data.operating_hours;
                    if (Array.isArray(parsed)) setWorkDays(parsed);
                } catch (e) { console.log("Gagal parse jam kerja"); }
            }

            const lat = data.latitude ? parseFloat(data.latitude) : null;
            const lng = data.longitude ? parseFloat(data.longitude) : null;

            setForm({
                identity_number: data.identity_number || '',
                store_name: data.store_name || '',
                category: data.category || 'ac',
                description: data.description || '',
                store_logo_url: data.store_logo_url || '',
                address: data.address || '',
                bank_name: data.bank_name || '',
                bank_account_number: data.bank_account_number || '',
                latitude: lat,
                longitude: lng,
            });

            if (lat && lng) {
                setRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.005, longitudeDelta: 0.005 });
            } else {
                await getCurrentLocation();
            }
        } catch (err) {
            console.error("Fetch Profile Error:", err);
            await getCurrentLocation();
        } finally {
            setMapLoading(false);
        }
    };

    const getCurrentLocation = async () => {
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            let location = await Location.getCurrentPositionAsync({});
            const loc = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
            };
            setRegion(loc);
            setForm(p => ({ ...p, latitude: loc.latitude, longitude: loc.longitude }));
        } catch (e) {
            console.log("GPS Error");
        } finally {
            setMapLoading(false);
        }
    };

    const updateAddressFromCoords = async (lat, lng) => {
        try {
            let result = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
            if (result.length > 0) {
                const item = result[0];
                const cleanAddress = [item.street, item.district, item.city].filter(Boolean).join(', ');
                setForm(prev => ({ ...prev, address: cleanAddress, latitude: lat, longitude: lng }));
            }
        } catch (e) { }
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });
        if (!result.canceled) {
            setForm({ ...form, store_logo_url: result.assets[0].uri });
        }
    };

    // --- FIX LOGIKA GAMBAR ---
    const getFormattedImageUrl = (url) => {
        if (!url) return null;
        // Jika baru pilih dari galeri, langsung pakai URI nya
        if (url.startsWith('file') || url.startsWith('content')) return url;

        let path = url;
        // Penyesuaian folder backend (Sesuai kode Anda yang sudah jalan)
        if (path.includes('/uploads/') && !path.includes('/services/')) {
            path = path.replace('/uploads/', '/uploads/services/');
        }

        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${BASE_URL}${cleanPath}`;
    };

    const handleLogout = () => {
        Alert.alert("Logout", "Apakah Anda yakin ingin keluar?", [
            { text: "Batal", style: "cancel" },
            {
                text: "Ya, Keluar", style: "destructive", onPress: async () => {
                    await storage.clearAll();
                    router.replace('/(auth)/login');
                }
            }
        ]);
    };

    const handleSubmit = async () => {
        if (!form.store_name || !form.identity_number || !form.latitude) {
            return Toast.show("Nama, NIK, dan Lokasi Map wajib diisi!", { backgroundColor: '#E11D48' });
        }
        setLoading(true);
        try {
            const user = await storage.get('userData');
            const token = await storage.get('userToken');
            const formData = new FormData();

            // Append data teks
            formData.append('store_name', form.store_name);
            formData.append('identity_number', form.identity_number);
            formData.append('category', form.category);
            formData.append('description', form.description || '');
            formData.append('address', form.address || '');
            formData.append('latitude', String(form.latitude));
            formData.append('longitude', String(form.longitude));
            formData.append('bank_name', form.bank_name || '');
            formData.append('bank_account_number', form.bank_account_number || '');
            formData.append('operating_hours', JSON.stringify(workDays));

            // Append gambar jika user memilih gambar baru
            if (form.store_logo_url && (form.store_logo_url.startsWith('file') || form.store_logo_url.startsWith('content'))) {
                const fileName = form.store_logo_url.split('/').pop();
                formData.append('image', {
                    uri: form.store_logo_url,
                    name: fileName || 'profile.jpg',
                    type: 'image/jpeg',
                });
            }

            await API.put(`/mitra/profile/${user.store_id || user.id}`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            Toast.show("Profil Berhasil Diperbarui!");
            setTimeout(() => router.replace('/(mitra)'), 1000);
        } catch (e) {
            console.error("Update Error:", e);
            Toast.show("Gagal menyimpan profil.");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <View style={styles.center}><ActivityIndicator size="large" color="#633594" /></View>;

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={styles.header}>
                    <Text style={styles.title}>Data Profil Mitra</Text>
                    <Text style={styles.subtitle}>Informasi ini akan dilihat oleh calon pelanggan Anda.</Text>
                </View>

                <View style={styles.form}>
                    {/* FOTO */}
                    <Text style={styles.label}>Foto Toko / Logo</Text>
                    <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                        {form.store_logo_url ? (
                            <Image
                                source={{ uri: getFormattedImageUrl(form.store_logo_url) }}
                                style={styles.previewImage}
                            />
                        ) : (
                            <View style={styles.placeholder}>
                                <Ionicons name="camera" size={32} color="#cbd5e1" />
                                <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>Tambah Foto</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* IDENTITAS */}
                    <Text style={styles.label}>Nama Usaha / Workshop</Text>
                    <TextInput style={styles.input} placeholder="Contoh: Berkah AC Tangerang" value={form.store_name} onChangeText={v => setForm({ ...form, store_name: v })} />

                    <Text style={styles.label}>NIK Pemilik (Sesuai KTP)</Text>
                    <TextInput style={styles.input} placeholder="16 Digit NIK" keyboardType="numeric" value={form.identity_number} onChangeText={v => setForm({ ...form, identity_number: v })} />

                    <Text style={styles.label}>Kategori Spesialisasi</Text>
                    <View style={styles.pickerBox}>
                        <Picker selectedValue={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                            {categories.map(c => <Picker.Item key={c.value} label={c.label} value={c.value} />)}
                        </Picker>
                    </View>

                    <Text style={styles.label}>Deskripsi Singkat Layanan</Text>
                    <TextInput
                        style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                        multiline
                        placeholder="Contoh: Ahli cuci AC, bongkar pasang, dan isi freon..."
                        value={form.description}
                        onChangeText={v => setForm({ ...form, description: v })}
                    />

                    {/* JAM OPERASIONAL */}
                    <Text style={styles.label}>Jam Operasional</Text>
                    <View style={styles.workDaysContainer}>
                        {workDays.map((item, index) => (
                            <View key={index} style={styles.dayRow}>
                                <TouchableOpacity style={styles.dayCheck} onPress={() => {
                                    const d = [...workDays]; d[index].active = !d[index].active; setWorkDays(d);
                                }}>
                                    <Ionicons name={item.active ? "checkbox" : "square-outline"} size={22} color={item.active ? "#633594" : "#cbd5e1"} />
                                    <Text style={[styles.dayText, !item.active && { color: '#cbd5e1' }]}>{item.day}</Text>
                                </TouchableOpacity>

                                {item.active ? (
                                    <View style={styles.timeWrapper}>
                                        <View style={styles.pickerItem}>
                                            <Picker
                                                selectedValue={item.open}
                                                onValueChange={(v) => { const d = [...workDays]; d[index].open = v; setWorkDays(d); }}
                                                mode="dropdown"
                                            >
                                                {timeOptions.map(t => <Picker.Item key={t} label={t} value={t} style={{ fontSize: 12 }} />)}
                                            </Picker>
                                        </View>
                                        <Text style={{ marginHorizontal: 5, color: '#94a3b8' }}>-</Text>
                                        <View style={styles.pickerItem}>
                                            <Picker
                                                selectedValue={item.close}
                                                onValueChange={(v) => { const d = [...workDays]; d[index].close = v; setWorkDays(d); }}
                                                mode="dropdown"
                                            >
                                                {timeOptions.map(t => <Picker.Item key={t} label={t} value={t} style={{ fontSize: 12 }} />)}
                                            </Picker>
                                        </View>
                                    </View>
                                ) : <Text style={styles.closedText}>Tutup / Libur</Text>}
                            </View>
                        ))}
                    </View>

                    {/* REKENING */}
                    <Text style={styles.label}>Data Rekening Bank</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Nama Bank" value={form.bank_name} onChangeText={v => setForm({ ...form, bank_name: v })} />
                        <TextInput style={[styles.input, { flex: 2 }]} placeholder="No. Rekening" keyboardType="numeric" value={form.bank_account_number} onChangeText={v => setForm({ ...form, bank_account_number: v })} />
                    </View>

                    {/* ALAMAT & MAP */}
                    <Text style={styles.label}>Alamat Lengkap & Lokasi</Text>
                    <TextInput style={[styles.input, { marginBottom: 10 }]} placeholder="Nama jalan, RT/RW, No. Rumah" value={form.address} onChangeText={v => setForm({ ...form, address: v })} />
                    <View style={styles.mapWrapper}>
                        {!mapLoading && MapView && (
                            <MapView style={styles.map} region={region}>
                                {form.latitude && (
                                    <Marker
                                        coordinate={{ latitude: form.latitude, longitude: form.longitude }}
                                        draggable
                                        pinColor="#633594"
                                        onDragEnd={(e) => updateAddressFromCoords(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)}
                                    />
                                )}
                            </MapView>
                        )}
                        {mapLoading && <ActivityIndicator style={{ marginTop: 60 }} />}
                    </View>
                    <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 5 }}>* Tahan dan geser pin ungu untuk mengubah lokasi presisi</Text>

                    {/* SUBMIT */}
                    <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Simpan Data Profil</Text>}
                    </TouchableOpacity>

                    {/* LOGOUT */}
                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
                        <Text style={styles.logoutText}>Keluar dari Akun</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 25, backgroundColor: '#633594' },
    title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    subtitle: { fontSize: 13, color: '#d8b4fe', marginTop: 5 },
    form: { padding: 20 },
    label: { fontSize: 11, fontWeight: 'bold', color: '#64748b', marginBottom: 8, marginTop: 18, textTransform: 'uppercase' },
    input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, backgroundColor: '#f8fafc', fontSize: 14, color: '#334155' },
    pickerBox: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, backgroundColor: '#f8fafc', overflow: 'hidden' },

    // Foto
    imagePicker: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#f1f5f9', borderStyle: 'dashed', borderWidth: 1, borderColor: '#cbd5e1', alignSelf: 'center', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 10 },
    previewImage: { width: '100%', height: '100%' },
    placeholder: { alignItems: 'center' },

    // Jam Kerja
    workDaysContainer: { backgroundColor: '#f8fafc', borderRadius: 15, padding: 10, borderWidth: 1, borderColor: '#e2e8f0' },
    dayRow: { flexDirection: 'row', alignItems: 'center', height: 50, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    dayCheck: { flexDirection: 'row', alignItems: 'center', width: 100 },
    dayText: { marginLeft: 8, fontSize: 14, fontWeight: '500', color: '#475569' },
    timeWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
    pickerItem: {
        width: 100,
        height: 40,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        justifyContent: 'center',
        overflow: 'hidden'
    },
    closedText: { flex: 1, textAlign: 'right', color: '#cbd5e1', fontStyle: 'italic', fontSize: 12 },

    // Maps
    mapWrapper: { height: 180, borderRadius: 15, overflow: 'hidden', marginTop: 10, borderWidth: 1, borderColor: '#e2e8f0' },
    map: { flex: 1 },

    // Buttons
    btn: { backgroundColor: '#633594', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 35, elevation: 3 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 25, padding: 15, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#fee2e2' },
    logoutText: { color: '#FF3B30', fontWeight: 'bold', marginLeft: 10, fontSize: 14 }
});