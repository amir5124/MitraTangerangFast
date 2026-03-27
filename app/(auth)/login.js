import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import Toast from 'react-native-root-toast'; // Import Toast
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
import API from '../../utils/api';
import { storage } from '../../utils/storage';

const LoginScreen = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [fcmToken, setFcmToken] = useState(null);
    const [form, setForm] = useState({ email: '', password: '' });

    const TARGET_ROLE = 'mitra';

    const isFormValid = form.email.length > 0 && form.password.length > 0;

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
            console.log("ℹ️ [FCM] Skip token");
        }
    };

    // Fungsi pembantu untuk mempermudah pemanggilan Toast
    const showToast = (message, type = 'error') => {
        Toast.show(message, {
            duration: Toast.durations.LONG,
            position: Toast.positions.BOTTOM,
            shadow: true,
            animation: true,
            hideOnPress: true,
            delay: 0,
            backgroundColor: type === 'success' ? '#633594' : '#E11D48', // Ungu untuk sukses, Merah untuk error
            textColor: '#ffffff',
        });
    };

    const handleLogin = async () => {
        if (!isFormValid) return;
        setLoading(true);

        try {
            const payload = {
                email: form.email.toLowerCase().trim(),
                password: form.password,
                fcm_token: fcmToken,
                targetRole: TARGET_ROLE
            };

            const response = await API.post('/auth/login', payload);

            if (response.status === 200) {
                const { token, user } = response.data;

                if (user.role !== TARGET_ROLE) {
                    setLoading(false);
                    return showToast(`Akses Ditolak. Akun Anda adalah ${user.role}.`);
                }

                await storage.save('userToken', token);
                await storage.save('userData', JSON.stringify(user));


                router.replace('/(mitra)');
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Email atau password salah";
            showToast(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#fff' }}>
            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                <Text style={styles.title}>Masuk</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Maukan email</Text>
                    <TextInput
                        style={styles.input}
                        autoCapitalize="none"
                        placeholder="Masukkan email"
                        placeholderTextColor="#cbd5e1"
                        value={form.email}
                        onChangeText={(v) => setForm({ ...form, email: v })}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Kata Sandi</Text>
                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={[styles.input, { flex: 1, borderBottomWidth: 0 }]}
                            secureTextEntry={!showPassword}
                            placeholder="Masukkan kata sandi"
                            placeholderTextColor="#cbd5e1"
                            value={form.password}
                            onChangeText={(v) => setForm({ ...form, password: v })}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity style={styles.forgotBtn}>
                    <Text style={styles.forgotText}>Lupa kata sandi?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.btnLogin,
                        isFormValid && !loading ? styles.btnActive : styles.btnInactive
                    ]}
                    onPress={handleLogin}
                    disabled={!isFormValid || loading}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.btnLoginText, !isFormValid && { color: '#94a3b8' }]}>Masuk</Text>}
                </TouchableOpacity>

                <View style={styles.dividerContainer}>
                    <View style={styles.line} />
                    <Text style={styles.dividerText}>atau masuk dengan</Text>
                    <View style={styles.line} />
                </View>

                <TouchableOpacity style={styles.socialBtn}>
                    <Image source={{ uri: 'https://img.icons8.com/color/48/000000/google-logo.png' }} style={styles.socialIcon} />
                    <Text style={styles.socialText}>Google</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.socialBtn}>
                    <Image source={{ uri: 'https://img.icons8.com/color/48/000000/facebook-new.png' }} style={styles.socialIcon} />
                    <Text style={styles.socialText}>Facebook</Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Belum punya akun? </Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                        <Text style={styles.registerText}>Daftar</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    scrollContainer: { padding: 30, paddingTop: 60, paddingBottom: 40 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#334155', marginBottom: 30 },
    inputGroup: { marginBottom: 25 },
    label: { fontSize: 15, color: '#64748b', marginBottom: 5 },
    input: { borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingVertical: 8, fontSize: 16, color: '#1e293b' },
    passwordContainer: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    forgotBtn: { alignSelf: 'flex-end', marginTop: 5 },
    forgotText: { color: '#633594', fontWeight: '600', fontSize: 14 },
    btnLogin: { height: 55, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 30 },
    btnActive: { backgroundColor: '#633594', elevation: 3 },
    btnInactive: { backgroundColor: '#f1f5f9' },
    btnLoginText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 35 },
    line: { flex: 1, height: 1, backgroundColor: '#f1f5f9' },
    dividerText: { marginHorizontal: 10, color: '#94a3b8', fontSize: 13 },
    socialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9', padding: 12, borderRadius: 10, marginBottom: 15 },
    socialIcon: { width: 22, height: 22, marginRight: 12 },
    socialText: { fontSize: 16, color: '#334155', fontWeight: '500' },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 },
    footerText: { color: '#64748b', fontSize: 14 },
    registerText: { color: '#633594', fontWeight: 'bold', fontSize: 14 }
});

export default LoginScreen;