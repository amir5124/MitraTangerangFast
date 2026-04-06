import API from './utils/api'; // Sesuaikan path jika @/ tidak terkonfigurasi di JS
import { storage } from './utils/storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

export default function EditProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
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
    const rawData = await storage.get('userData');
    if (rawData) {
      const userData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

      setForm({
        full_name: userData.full_name || '',
        email: userData.email || '',
        phone_number: userData.phone_number || '',
        user_id: String(userData.id || ''),
      });
    }
  };

  const handleSave = async () => {
    if (!form.full_name || !form.email) return;

    setLoading(true);
    try {
      const response = await API.put('/auth/update-profile', form);

      if (response.data.success) {
        const updatedUser = { ...form, id: form.user_id };
        await storage.save('userData', JSON.stringify(updatedUser));

        // Tampilkan Modal sukses
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('❌ Gagal update profil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    router.replace('/(mitra)/profile');
  };
  

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
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

      {/* Form */}
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nama Lengkap</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={form.full_name}
              onChangeText={(txt) => setForm({ ...form, full_name: txt })}
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
              onChangeText={(txt) => setForm({ ...form, email: txt })}
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
              onChangeText={(txt) => setForm({ ...form, phone_number: txt })}
              placeholder="0812xxxx"
              keyboardType="phone-pad"
            />
          </View>
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.iconCircle}>
              <Ionicons name="checkmark" size={40} color="#FFF" />
            </View>
            <Text style={styles.modalTitle}>Berhasil!</Text>
            <Text style={styles.modalSub}>Profil telah diperbarui.</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleCloseSuccess}>
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
    ...Platform.select({
      web: { outlineWidth: 0 },
      default: {},
    }),
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