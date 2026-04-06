import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import Toast from 'react-native-root-toast';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Image
} from 'react-native';
import API from '../utils/api';
import { storage } from '../utils/storage';

export default function RegisterScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [fcmToken, setFcmToken] = useState('');
    const [secureText, setSecureText] = useState(true);
    const [secureConfirm, setSecureConfirm] = useState(true);

    const [form, setForm] = useState({
        full_name: '',
        email: '',
        phone_number: '',
        password: '',
        confirmPassword: '',
        role: 'mitra',
    });

    // Validasi tombol aktif
    const isFormValid =
        form.full_name !== '' &&
        form.email !== '' &&
        form.phone_number !== '' &&
        form.password.length >= 6 &&
        form.confirmPassword !== '';

    useEffect(() => {
        getDeviceToken();
    }, []);

    const getDeviceToken = async () => {
        try {
            if (Platform.OS === 'web') return;
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') return;
            const tokenData = await Notifications.getDevicePushTokenAsync();
            setFcmToken(tokenData.data);
        } catch (error) {
            console.log("ℹ️ [FCM] Gagal ambil token:", error.message);
        }
    };

    const handleRegister = async () => {
        if (!isFormValid) return;

        if (form.password !== form.confirmPassword) {
            return Toast.show("Kata sandi tidak cocok!", {
                backgroundColor: '#E11D48',
                position: Toast.positions.BOTTOM,
            });
        }

        setLoading(true);
        try {
            const payload = {
                full_name: form.full_name,
                email: form.email,
                phone_number: form.phone_number,
                password: form.password,
                role: form.role,
                fcm_token: fcmToken
            };

            const response = await API.post('/auth/register', payload);

            if (response.status === 201 || response.status === 200) {
                const { token, user } = response.data;
                await storage.save('userToken', token);
                await storage.save('userData', JSON.stringify(user));

                router.replace('/(mitra)/complete-profile');
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Gagal mendaftar, silakan coba lagi";

            // Logika spesifik jika email atau phone sudah ada
            if (errorMsg.toLowerCase().includes('email')) {
                Toast.show("Email atau Nomor sudah terdaftar!", { backgroundColor: '#E11D48' });
            } else if (errorMsg.toLowerCase().includes('phone') || errorMsg.toLowerCase().includes('telepon')) {
                Toast.show("Nomor WA sudah digunakan!", { backgroundColor: '#E11D48' });
            } else {
                Toast.show(errorMsg, { backgroundColor: '#FF9500' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.title}>Daftar</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nama Lengkap Pendaftar</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Masukan nama lengkap"
                        placeholderTextColor="#cbd5e1"
                        value={form.full_name}
                        onChangeText={(v) => setForm({ ...form, full_name: v })}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="contoh@gmail.com"
                        placeholderTextColor="#cbd5e1"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={form.email}
                        onChangeText={(v) => setForm({ ...form, email: v.toLowerCase().trim() })}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nomor WhatsApp</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="0812..."
                        placeholderTextColor="#cbd5e1"
                        keyboardType="phone-pad"
                        value={form.phone_number}
                        onChangeText={(v) => setForm({ ...form, phone_number: v })}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Kata Sandi</Text>
                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={[styles.input, { flex: 1, borderBottomWidth: 0 }]}
                            secureTextEntry={secureText}
                            placeholder="Minimal 6 karakter"
                            value={form.password}
                            onChangeText={(v) => setForm({ ...form, password: v })}
                        />
                        <TouchableOpacity onPress={() => setSecureText(!secureText)}>
                            <Ionicons name={secureText ? "eye-outline" : "eye-off-outline"} size={22} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Konfirmasi Kata Sandi</Text>
                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={[styles.input, { flex: 1, borderBottomWidth: 0 }]}
                            secureTextEntry={secureConfirm}
                            value={form.confirmPassword}
                            onChangeText={(v) => setForm({ ...form, confirmPassword: v })}
                        />
                        <TouchableOpacity onPress={() => setSecureConfirm(!secureConfirm)}>
                            <Ionicons name={secureConfirm ? "eye-outline" : "eye-off-outline"} size={22} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity
                    style={[
                        styles.btnDaftar,
                        isFormValid && !loading ? styles.btnActive : styles.btnInactive
                    ]}
                    onPress={handleRegister}
                    disabled={!isFormValid || loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={[styles.btnText, isFormValid ? { color: '#fff' } : { color: '#94a3b8' }]}>
                            Daftar
                        </Text>
                    )}
                </TouchableOpacity>

              

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    scrollContainer: { padding: 30, paddingTop: 60, paddingBottom: 100 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#334155', marginBottom: 30 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 15, color: '#64748b', marginBottom: 2 },
    input: { borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingVertical: 8, fontSize: 16, color: '#1e293b' },
    passwordContainer: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    btnDaftar: { padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 25 },
    btnInactive: { backgroundColor: '#f1f5f9' },
    btnActive: { backgroundColor: '#633594', elevation: 3 },
    btnText: { fontWeight: 'bold', fontSize: 16 },
    dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 35 },
    line: { flex: 1, height: 1, backgroundColor: '#f1f5f9' },
    dividerText: { marginHorizontal: 10, color: '#94a3b8', fontSize: 13 },
    socialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9', padding: 12, borderRadius: 10, marginBottom: 15 },
    socialIcon: { width: 22, height: 22, marginRight: 12 },
    socialText: { fontSize: 16, color: '#334155', fontWeight: '500' }
});