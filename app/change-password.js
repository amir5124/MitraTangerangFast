import API from './utils/api'; 
import { storage } from './utils/storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [secureOld, setSecureOld] = useState(true);
  const [secureNew, setSecureNew] = useState(true);

  const [form, setForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  const handleChangePassword = async () => {
    if (!form.old_password || !form.new_password || !form.confirm_password) {
      alert('Harap isi semua kolom');
      return;
    }

    if (form.new_password !== form.confirm_password) {
      alert('Konfirmasi password tidak cocok');
      return;
    }

    if (form.new_password.length < 6) {
      alert('Password baru minimal 6 karakter');
      return;
    }

    setLoading(true);
    try {
      const rawData = await storage.get('userData');
      const userData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

      const response = await API.put('/auth/change-password', {
        user_id: userData.id,
        old_password: form.old_password,
        new_password: form.new_password,
      });

      if (response.data.success) {
        setShowSuccessModal(true);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal mengubah password');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ubah Password</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.description}>
          Gunakan kombinasi angka, huruf atau simbol agar password kamu aman
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password Lama</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={form.old_password}
              onChangeText={(txt) => setForm({ ...form, old_password: txt })}
              secureTextEntry={secureOld}
              placeholder="Masukkan password saat ini"
            />
            <TouchableOpacity onPress={() => setSecureOld(!secureOld)}>
              <Ionicons
                name={secureOld ? 'eye-off' : 'eye'}
                size={20}
                color="#64748B"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password Baru</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={form.new_password}
              onChangeText={(txt) => setForm({ ...form, new_password: txt })}
              secureTextEntry={secureNew}
              placeholder="Minimal 6 karakter"
            />
            <TouchableOpacity onPress={() => setSecureNew(!secureNew)}>
              <Ionicons
                name={secureNew ? 'eye-off' : 'eye'}
                size={20}
                color="#64748B"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Konfirmasi Password Baru</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={form.confirm_password}
              onChangeText={(txt) => setForm({ ...form, confirm_password: txt })}
              secureTextEntry={true}
              placeholder="Ulangi password baru"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && { opacity: 0.7 }]}
          onPress={handleChangePassword}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Perbarui Password</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed" size={40} color="#FFF" />
            </View>
            <Text style={styles.modalTitle}>Berhasil!</Text>
            <Text style={styles.modalSub}>
              Password Anda telah berhasil diperbarui.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleCloseSuccess}>
              <Text style={styles.modalButtonText}>Kembali</Text>
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
  content: { padding: 24 },
  description: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 30,
    lineHeight: 20,
  },
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
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
  saveButton: {
    backgroundColor: '#633594',
    borderRadius: 14,
    padding: 18,
    marginTop: 20,
    alignItems: 'center',
  },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
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
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#633594',
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
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#1E293B',
    paddingVertical: 14,
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