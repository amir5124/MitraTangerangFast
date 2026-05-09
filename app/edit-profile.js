import { storage } from './utils/storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const BASE_URL = 'https://backend.tangerangfast.online';

export default function EditProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    user_id: '',
  });

  useEffect(() => {
    loadCurrentData();
  }, []);

  const loadCurrentData = async () => {
    console.log('[EditProfile] Memuat data dari storage...');
    try {
      const rawData = await storage.get('userData');
      if (rawData) {
        const userData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

        setForm({
          full_name: userData.full_name || '',
          email: userData.email || '',
          phone_number: userData.phone_number || '',
          user_id: String(userData.id),
        });

        if (userData.profile_picture) {
          const fullUrl = userData.profile_picture.startsWith('http')
            ? userData.profile_picture
            : `${BASE_URL}${userData.profile_picture}`;
          setSelectedImage(fullUrl);
          console.log('[EditProfile] Foto profil dimuat:', fullUrl);
        } else {
          console.log('[EditProfile] Tidak ada foto profil, tampilkan inisial');
        }

        console.log('[EditProfile] Data berhasil dimuat:', userData.full_name);
      } else {
        console.warn('[EditProfile] Tidak ada userData di storage');
      }
    } catch (error) {
      console.error('[EditProfile] Gagal memuat data:', error?.message || error);
    }
  };

  const pickImage = async () => {
    console.log('[EditProfile] Meminta izin galeri...');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[EditProfile] Izin galeri ditolak');
      Alert.alert('Izin Ditolak', 'Maaf, kami butuh izin galeri untuk mengubah foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setSelectedImage(uri);
      console.log('[EditProfile] Gambar dipilih dari galeri:', uri);
    } else {
      console.log('[EditProfile] Pemilihan gambar dibatalkan');
    }
  };

  const handleSave = async () => {
    const notify = (title, message) => {
      if (Platform.OS === 'web') {
        window.alert(`${title}: ${message}`);
      } else {
        Alert.alert(title, message);
      }
    };

    if (!form.full_name || !form.email) {
      console.warn('[EditProfile] Validasi gagal: nama atau email kosong');
      notify('Error', 'Nama dan email wajib diisi!');
      return;
    }

    setLoading(true);
    console.log('[EditProfile] Memulai proses simpan profil...');

    try {
      const token = await storage.get('userToken');
      const formData = new FormData();

      formData.append('user_id', form.user_id);
      formData.append('full_name', form.full_name);
      formData.append('email', form.email);
      formData.append('phone_number', form.phone_number);

      console.log('[EditProfile] Data teks disiapkan:', {
        user_id: form.user_id,
        full_name: form.full_name,
        email: form.email,
        phone_number: form.phone_number,
      });

      const isLocalUri =
        selectedImage &&
        (selectedImage.startsWith('blob:') ||
          selectedImage.startsWith('file:') ||
          selectedImage.startsWith('content:') ||
          selectedImage.startsWith('/'));

      if (selectedImage && isLocalUri) {
        console.log('[EditProfile] Gambar lokal terdeteksi, platform:', Platform.OS);

        if (Platform.OS === 'web') {
          const responseBlob = await fetch(selectedImage);
          const blob = await responseBlob.blob();
          const file = new File([blob], `profile-${Date.now()}.jpg`, {
            type: blob.type,
          });
          formData.append('image', file);
          console.log('[EditProfile] File web dibuat:', { name: file.name, size: file.size, type: file.type });
        } else {
          const uri = selectedImage;
          const uriParts = uri.split('.');
          const fileType = uriParts[uriParts.length - 1];

          formData.append('image', {
            uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
            name: `profile-${Date.now()}.${fileType}`,
            type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
          });

          console.log('[EditProfile] Gambar native disiapkan:', uri);
        }
      } else {
        const existingPath = selectedImage?.replace(BASE_URL, '');
        formData.append('profile_picture', existingPath || '');
        console.log('[EditProfile] Tidak ada gambar baru, pakai path lama:', existingPath);
      }

      console.log('[EditProfile] Mengirim request ke server...');
      const response = await fetch(`${BASE_URL}/api/auth/update-profile`, {
        method: 'PUT',
        body: formData,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      console.log('[EditProfile] Response server:', result);

      if (response.ok && result.success) {
        await storage.save('userData', JSON.stringify(result.user));
        console.log('[EditProfile] Profil berhasil diperbarui dan disimpan ke storage');
        setShowSuccessModal(true);
      } else {
        console.error('[EditProfile] Update gagal:', result.message);
        notify('Gagal', result.message || 'Terjadi kesalahan pada server.');
      }
    } catch (error) {
      console.error('[EditProfile] Fatal error:', error?.message || error);
      notify('Koneksi Gagal', 'Gagal terhubung ke server. Periksa konsol untuk detail.');
    } finally {
      setLoading(false);
      console.log('[EditProfile] Proses simpan selesai');
    }
  };

  const handleCloseSuccess = () => {
    console.log('[EditProfile] Modal sukses ditutup, kembali ke halaman profil');
    setShowSuccessModal(false);
    router.replace('/(mitra)/profile');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profil</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#633594" />
          ) : (
            <Text style={styles.saveText}>Simpan</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
            {selectedImage ? (
              <Image source={{ uri: selectedImage }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {form.full_name.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <View style={styles.cameraIconBadge}>
              <Ionicons name="camera" size={16} color="#FFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.changePhotoText}>Ubah Foto Profil</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nama Lengkap</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={form.full_name}
              onChangeText={txt => setForm({ ...form, full_name: txt })}
              placeholder="Nama lengkap Anda"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Alamat Email</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={txt => setForm({ ...form, email: txt })}
              placeholder="email@anda.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nomor Telepon</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={form.phone_number}
              onChangeText={txt => setForm({ ...form, phone_number: txt })}
              placeholder="0812xxxx"
              keyboardType="phone-pad"
            />
          </View>
        </View>
      </ScrollView>

      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.iconCircle}>
              <Ionicons name="checkmark" size={40} color="#FFF" />
            </View>
            <Text style={styles.modalTitle}>Berhasil!</Text>
            <Text style={styles.modalSub}>Profil telah diperbarui.</Text>
            <TouchableOpacity style={styles.modalButton} onPress={handleCloseSuccess}>
              <Text style={styles.modalButtonText}>Oke</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 64,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  saveText: { fontSize: 16, fontWeight: '700', color: '#633594' },
  content: { padding: 24 },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    position: 'relative',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#F1F5F9',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#633594',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFF',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#633594',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  changePhotoText: {
    marginTop: 12,
    fontSize: 14,
    color: '#633594',
    fontWeight: '600',
  },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    height: 55,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    backgroundColor: '#FFF',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    paddingVertical: Platform.OS === 'web' ? 0 : 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    elevation: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 10,
  },
  modalSub: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});