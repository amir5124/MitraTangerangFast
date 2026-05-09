import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, Alert, Image, ActivityIndicator, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import API from '../utils/api';
import { storage } from '../utils/storage';

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
            description: item.description || '', 
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
            formData.append('description', form.description); 

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
                        const token = await storage.get('userToken'); 
                        await API.delete(`/services/${id}`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        Alert.alert("Sukses", "Layanan berhasil dihapus.");
                        fetchMyServices(); 
                    } catch (e) {
                        Alert.alert("Gagal", "Gagal menghapus data.");
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
                    style={[styles.addBtn, { backgroundColor: showForm ? '#475569' : '#fff' }]}
                    onPress={() => {
                        setShowForm(!showForm);
                        setEditId(null);
                        setImage(null);
                        setForm({ service_name: '', price_type: 'fixed', base_price: '', description: '' });
                    }}
                >
                    <Ionicons name={showForm ? "close" : "add"} size={20} color={showForm ? "#fff" : "#633594"} />
                    <Text style={[styles.addBtnText, { color: showForm ? "#fff" : "#633594" }]}>{showForm ? "Batal" : "Jasa Baru"}</Text>
                </TouchableOpacity>
            </View>

            {showForm && (
                <View style={styles.formCard}>
                    <Text style={styles.formTitle}>{editId ? "Edit Layanan" : "Tambah Layanan Baru"}</Text>
                    
                    <View style={styles.imageSection}>
                        <TouchableOpacity 
                            style={[styles.imagePlaceholder, image && styles.imageSelected]} 
                            onPress={pickImage}
                            disabled={uploading}
                        >
                            {image ? (
                                <View style={styles.fullImgContainer}>
                                    <Image source={{ uri: image }} style={styles.fullImg} />
                                    {uploading ? (
                                        <View style={styles.uploadOverlay}>
                                            <View style={styles.progressCircle}>
                                                <ActivityIndicator size="large" color="#633594" />
                                            </View>
                                            <Text style={styles.uploadText}>Mengunggah...</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.changePhotoOverlay}>
                                            <Ionicons name="camera" size={24} color="#fff" />
                                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>GANTI FOTO</Text>
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <View style={{ alignItems: 'center' }}>
                                    <Ionicons name="image-outline" size={40} color="#cbd5e1" />
                                    <Text style={{ color: '#94a3b8', marginTop: 5 }}>Ketuk untuk pilih foto</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        
                        {image && !uploading && (
                            <TouchableOpacity style={styles.removeImgBtn} onPress={() => setImage(null)}>
                                <Text style={styles.removeImgText}>Hapus pilihan</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text style={styles.label}>Nama Layanan</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Nama Jasa"
                        value={form.service_name}
                        onChangeText={v => setForm({ ...form, service_name: v })}
                    />

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, marginRight: 5 }}>
                            <Text style={styles.label}>Tipe Harga</Text>
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
                                placeholder="0"
                                value={form.base_price}
                                onChangeText={v => setForm({ ...form, base_price: v })}
                            />
                        </View>
                    </View>

                    <Text style={styles.label}>Deskripsi Layanan</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Deskripsi jasa..."
                        value={form.description}
                        onChangeText={v => setForm({ ...form, description: v })}
                        multiline={true}
                        numberOfLines={4}
                    />

                    <TouchableOpacity 
                        style={[styles.saveBtn, uploading && { opacity: 0.7 }]} 
                        onPress={handleSaveService} 
                        disabled={uploading}
                    >
                        {uploading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.saveBtnText}>{editId ? "Simpan Perubahan" : "Simpan Jasa"}</Text>
                        )}
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
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#633594' },
    title: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    addBtn: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15, alignItems: 'center' },
    addBtnText: { marginLeft: 4, fontWeight: 'bold', fontSize: 13 },
    formCard: { backgroundColor: '#fff', margin: 15, padding: 20, borderRadius: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    formTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 20 },
    imageSection: { alignItems: 'center', marginBottom: 20 },
    imagePlaceholder: { width: '100%', height: 180, backgroundColor: '#f1f5f9', borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', overflow: 'hidden' },
    imageSelected: { borderStyle: 'solid', borderColor: '#633594' },
    fullImgContainer: { width: '100%', height: '100%' },
    fullImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    uploadOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center' },
    progressCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 3, marginBottom: 10 },
    uploadText: { color: '#633594', fontWeight: 'bold', fontSize: 12 },
    changePhotoOverlay: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(99, 53, 148, 0.8)', flexDirection: 'row', padding: 6, borderRadius: 10, alignItems: 'center' },
    removeImgBtn: { marginTop: 8 },
    removeImgText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
    label: { fontSize: 12, fontWeight: 'bold', color: '#64748b', marginBottom: 6, marginLeft: 2 },
    input: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0', color: '#1e293b' },
    textArea: { height: 80, textAlignVertical: 'top' },
    pickerBox: { backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 15, overflow: 'hidden' },
    saveBtn: { backgroundColor: '#633594', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    listSection: { padding: 15 },
    serviceItem: { backgroundColor: '#fff', flexDirection: 'row', padding: 12, borderRadius: 16, marginBottom: 12, alignItems: 'center', elevation: 2 },
    img: { width: 60, height: 60, borderRadius: 12 },
    info: { flex: 1, marginLeft: 15 },
    name: { fontWeight: 'bold', fontSize: 15, color: '#1e293b' },
    price: { color: '#633594', fontSize: 14, fontWeight: 'bold', marginTop: 2 },
    actions: { flexDirection: 'row' }
});