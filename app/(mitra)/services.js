import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, Alert, Image, ActivityIndicator, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import API from '../../utils/api';
import { storage } from '../../utils/storage';

export default function ServicesScreen() {
    const [services, setServices] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [image, setImage] = useState(null);
    const [editId, setEditId] = useState(null);

    const [form, setForm] = useState({
        service_name: '',
        price_type: 'fixed',
        base_price: '',
        description: '',
    });

    useEffect(() => {
        fetchMyServices();
    }, []);

    const getFullImageUrl = (url) => {
        if (!url) return 'https://via.placeholder.com/150';
        if (url.startsWith('http')) return url;
        const BASE_URL_SERVER = API.defaults.baseURL.replace('/api', '');
        return `${BASE_URL_SERVER}${url}`;
    };

    const fetchMyServices = async () => {
        setLoading(true);
        try {
            const user = await storage.get('userData');
            const res = await API.get(`/services/store/${user?.store_id}`);
            setServices(res.data);
        } catch (err) {
            console.error("Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Izin Ditolak", "Butuh akses galeri.");
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.6,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleEdit = (item) => {
        setEditId(item.id);
        setForm({
            service_name: item.service_name,
            price_type: item.price_type,
            base_price: String(item.base_price).split('.')[0],
            description: item.description || '', // Ambil deskripsi dari DB
        });
        setImage(getFullImageUrl(item.image_url));
        setShowForm(true);
    };

    const handleSaveService = async () => {
        if (!form.service_name || !form.base_price) {
            Alert.alert("Error", "Nama dan harga wajib diisi!");
            return;
        }

        setUploading(true);
        try {
            const user = await storage.get('userData');
            const token = await storage.get('userToken');

            if (!token) {
                Alert.alert("Error", "Sesi berakhir, silakan login ulang.");
                return;
            }

            const formData = new FormData();
            formData.append('store_id', user?.store_id);
            formData.append('service_name', form.service_name);
            formData.append('price_type', form.price_type);
            formData.append('price', form.base_price);
            formData.append('description', form.description); // Kirim deskripsi ke backend

            if (image && !image.startsWith('http')) {
                const filename = image.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image`;

                formData.append('image', {
                    uri: Platform.OS === 'ios' ? image.replace('file://', '') : image,
                    name: filename,
                    type: type,
                });
            }

            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                },
            };

            if (editId) {
                await API.put(`/services/${editId}`, formData, config);
                Alert.alert("Sukses", "Layanan berhasil diperbarui!");
            } else {
                if (!image) {
                    Alert.alert("Error", "Foto jasa wajib ada.");
                    setUploading(false);
                    return;
                }
                await API.post('/services', formData, config);
                Alert.alert("Sukses", "Layanan berhasil ditambahkan!");
            }

            // Reset UI
            setShowForm(false);
            setEditId(null);
            setImage(null);
            setForm({ service_name: '', price_type: 'fixed', base_price: '', description: '' });
            fetchMyServices();

        } catch (err) {
            const errMsg = err.response?.data?.error || err.message;
            Alert.alert("Gagal Simpan", errMsg);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = (id) => {
        Alert.alert("Hapus Jasa", "Yakin ingin menghapus ini?", [
            { text: "Batal", style: "cancel" },
            {
                text: "Hapus",
                style: "destructive",
                onPress: async () => {
                    try {
                        const token = await storage.get('userToken'); // AMBIL TOKEN

                        await API.delete(`/services/${id}`, {
                            headers: {
                                'Authorization': `Bearer ${token}` // KIRIM TOKEN
                            }
                        });

                        Alert.alert("Sukses", "Layanan berhasil dihapus.");
                        fetchMyServices(); // Refresh list
                    } catch (e) {
                        console.error("Delete Error:", e.response?.data || e.message);
                        Alert.alert("Gagal", "Gagal menghapus data. Jasa mungkin sedang digunakan dalam pesanan.");
                    }
                }
            }
        ]);
    };
    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Manajemen Layanan</Text>
                <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: showForm ? '#64748b' : '#633594' }]}
                    onPress={() => {
                        setShowForm(!showForm);
                        setEditId(null);
                        setImage(null);
                        setForm({ service_name: '', price_type: 'fixed', base_price: '', description: '' });
                    }}
                >
                    <Ionicons name={showForm ? "close" : "add"} size={20} color="#fff" />
                    <Text style={styles.addBtnText}>{showForm ? "Batal" : "Jasa Baru"}</Text>
                </TouchableOpacity>
            </View>

            {showForm && (
                <View style={styles.formCard}>
                    <Text style={styles.formTitle}>{editId ? "Edit Layanan" : "Tambah Layanan Baru"}</Text>
                    <TouchableOpacity style={styles.imagePlaceholder} onPress={pickImage}>
                        {image ? (
                            <Image source={{ uri: image }} style={styles.fullImg} />
                        ) : (
                            <View style={{ alignItems: 'center' }}>
                                <Ionicons name="camera-outline" size={40} color="#ccc" />
                                <Text style={{ color: '#ccc' }}>Pilih Foto Jasa</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.label}>Nama Layanan</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Contoh: Cuci AC Split 1 PK"
                        value={form.service_name}
                        onChangeText={v => setForm({ ...form, service_name: v })}
                    />

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, marginRight: 5 }}>
                            <Text style={styles.label}>Tipe</Text>
                            <View style={styles.pickerBox}>
                                <Picker selectedValue={form.price_type} onValueChange={v => setForm({ ...form, price_type: v })}>
                                    <Picker.Item label="Tetap" value="fixed" />
                                    <Picker.Item label="Mulai" value="starting_at" />
                                    <Picker.Item label="Survey" value="survey_required" />
                                </Picker>
                            </View>
                        </View>
                        <View style={{ flex: 1, marginLeft: 5 }}>
                            <Text style={styles.label}>Harga Dasar (Rp)</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                placeholder="75000"
                                value={form.base_price}
                                onChangeText={v => setForm({ ...form, base_price: v })}
                            />
                        </View>
                    </View>

                    {/* INPUT DESKRIPSI JASA */}
                    <Text style={styles.label}>Deskripsi Layanan</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Jelaskan apa saja yang didapat pelanggan..."
                        value={form.description}
                        onChangeText={v => setForm({ ...form, description: v })}
                        multiline={true}
                        numberOfLines={4}
                    />

                    <TouchableOpacity style={styles.saveBtn} onPress={handleSaveService} disabled={uploading}>
                        {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editId ? "Update Data" : "Simpan Jasa"}</Text>}
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.listSection}>
                {loading ? <ActivityIndicator color="#633594" size="large" /> : services.map((item) => (
                    <View key={item.id} style={styles.serviceItem}>
                        <Image source={{ uri: getFullImageUrl(item.image_url) }} style={styles.img} />
                        <View style={styles.info}>
                            <Text style={styles.name}>{item.service_name}</Text>
                            <Text style={styles.price}>Rp {parseInt(item.base_price).toLocaleString('id-ID')}</Text>
                        </View>
                        <View style={styles.actions}>
                            <TouchableOpacity onPress={() => handleEdit(item)} style={{ marginRight: 15 }}>
                                <Ionicons name="create-outline" size={24} color="#3b82f6" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(item.id)}>
                                <Ionicons name="trash-outline" size={24} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#633594', elevation: 2 },
    title: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    addBtn: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, alignItems: 'center' },
    addBtnText: { color: '#fff', marginLeft: 5, fontWeight: 'bold' },
    formCard: { backgroundColor: '#fff', margin: 15, padding: 20, borderRadius: 15, elevation: 5 },
    formTitle: { fontSize: 16, fontWeight: 'bold', color: '#633594', marginBottom: 15 },
    imagePlaceholder: { width: '100%', height: 150, backgroundColor: '#f8fafc', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed' },
    fullImg: { width: '100%', height: '100%', borderRadius: 10 },
    label: { fontSize: 12, fontWeight: 'bold', color: '#475569', marginBottom: 5 },
    input: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', color: '#334155' },
    textArea: { height: 100, textAlignVertical: 'top' }, // Supaya teks mulai dari atas
    pickerBox: { backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12, overflow: 'hidden' },
    saveBtn: { backgroundColor: '#10b981', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 5 },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    listSection: { padding: 15 },
    serviceItem: { backgroundColor: '#fff', flexDirection: 'row', padding: 12, borderRadius: 15, marginBottom: 12, alignItems: 'center', elevation: 2 },
    img: { width: 55, height: 55, borderRadius: 10, backgroundColor: '#f1f5f9' },
    info: { flex: 1, marginLeft: 12 },
    name: { fontWeight: 'bold', fontSize: 15, color: '#1e293b' },
    price: { color: '#633594', fontSize: 13, fontWeight: 'bold', marginTop: 2 },
    actions: { flexDirection: 'row', alignItems: 'center' }
});