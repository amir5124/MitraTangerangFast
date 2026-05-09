
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter,router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import API from '../utils/api';
import { storage } from '../utils/storage';

const BASE_URL = 'https://backend.tangerangfast.online';

const getInitials = (name) => {
  if (!name || name.trim() === '') return 'U';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

const handleLogout = () => {
  Alert.alert(
    "Konfirmasi Keluar",
    "Apakah Anda yakin ingin keluar?",
    [
      {
        text: "Batal",
        onPress: () => console.log("Logout dibatalkan"),
        style: "cancel"
      },
      {
        text: "Keluar",
        style: "destructive",
        onPress: async () => {
          try {
            // 1. Hapus semua session/token di storage
            await storage.clearAll();

            // 2. Reset state (opsional jika kamu pakai state lokal untuk foto)
            if (typeof setStoreLogo === 'function') {
                setStoreLogo(null);
            }

            console.log("Berhasil keluar dan menghapus session");

            // 3. Arahkan balik ke halaman login menggunakan expo-router
            // Gunakan path file kamu, misal '/login' atau sesuai struktur app/ kamu
            router.replace('/login'); 

          } catch (error) {
            console.error("Gagal saat proses logout:", error);
            Alert.alert("Error", "Gagal keluar dari akun. Silakan coba lagi.");
          }
        }
      }
    ],
    { cancelable: true }
  );
};
const getProfileImageUri = (user) => {
  if (!user?.profile_picture || user.profile_picture === 'null' || user.profile_picture === '') {
    return null;
  }

  const path = user.profile_picture;

  if (path.startsWith('http')) {
    return path.replace('http://', 'https://');
  }

  const hasFolder = path.includes('uploads/profiles');
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;

  return hasFolder
    ? `${BASE_URL}/${cleanPath}`
    : `${BASE_URL}/uploads/profiles/${cleanPath}`;
};

const AvatarView = ({ user }) => {
  const [imageError, setImageError] = useState(false);
  const imageUri = getProfileImageUri(user);
  const showImage = imageUri && !imageError;

  if (showImage) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={styles.avatar}
        onError={() => {
          console.warn('[Avatar] Gagal memuat gambar profil, fallback ke inisial:', imageUri);
          setImageError(true);
        }}
        onLoad={() => console.log('[Avatar] Berhasil memuat gambar profil:', imageUri)}
      />
    );
  }

  const initials = getInitials(user?.full_name || '');
  console.log('[Avatar] Menampilkan inisial:', initials, '| Nama:', user?.full_name);

  return (
    <View style={styles.avatarInitials}>
      <Text style={styles.avatarInitialsText}>{initials}</Text>
    </View>
  );
};

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [walletData, setWalletData] = useState(null);

  const formatRupiah = (value) => {
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(numericValue || 0);
  };

  const fetchUserProfile = async () => {
    console.log('[Profile] Memulai fetch data profil...');
    try {
      const response = await API.get('/auth/profile');

      if (response.data.success) {
        const userData = response.data.user;
        setUser(userData);
        await storage.save('userData', JSON.stringify(userData));
        console.log('[Profile] Data profil berhasil dimuat:', userData?.full_name);
      } else {
        console.warn('[Profile] Response tidak sukses:', response.data);
      }
    } catch (error) {
      console.error('[Profile] Gagal ambil data dari server:', error?.message || error);
      const cached = await storage.get('userData');
      if (cached) {
        const parsedCache = JSON.parse(cached);
        setUser(parsedCache);
        console.log('[Profile] Menggunakan data cache:', parsedCache?.full_name);
      } else {
        console.warn('[Profile] Tidak ada cache tersedia');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchWalletData = async () => {
    console.log('[Wallet] Memulai fetch data wallet...');
    try {
      const response = await API.get('/balance');
      if (response.data.success) {
        setWalletData(response.data.data);
        console.log('[Wallet] Saldo berhasil dimuat:', response.data.data?.wallet?.balance);
      } else {
        console.warn('[Wallet] Response tidak sukses:', response.data);
      }
    } catch (error) {
      console.error('[Wallet] Gagal memuat data wallet:', error?.message || error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      console.log('[Profile] Screen difokuskan, memuat ulang data...');
      fetchUserProfile();
      fetchWalletData();
    }, []),
  );

  const onRefresh = () => {
    console.log('[Profile] Pull-to-refresh dipicu');
    setRefreshing(true);
    fetchUserProfile();
    fetchWalletData();
  };

  const logoutAction = async () => {
    console.log('[Auth] Memulai proses logout...');
    try {
      const fcmToken = await storage.get('fcmToken');
      await API.post('/auth/logout', { fcm_token: fcmToken });
      console.log('[Auth] Logout berhasil dari server');
    } catch (error) {
      console.warn('[Auth] Logout error (bypass):', error?.message || error);
    } finally {
      await storage.delete('userToken');
      await storage.delete('userData');
      console.log('[Auth] Token dan userData dihapus, redirect ke login');
      router.replace('/(auth)/login');
    }
  };

  const handleWhatsApp = async () => {
    const phoneNumber = '628211074757';
    const message = 'Halo Admin, saya butuh bantuan terkait layanan TangerangFast.';
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    console.log('[WhatsApp] Membuka kontak admin:', phoneNumber);
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        console.log('[WhatsApp] Dibuka via app');
      } else {
        await Linking.openURL(`https://wa.me/${phoneNumber}`);
        console.log('[WhatsApp] Dibuka via browser fallback');
      }
    } catch (error) {
      console.error('[WhatsApp] Gagal membuka WhatsApp:', error?.message || error);
      Alert.alert('Error', 'Tidak dapat membuka WhatsApp');
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#633594" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.mainWrapper}>
      <View style={styles.customHeader}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profil Saya</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#633594']}
          />
        }>
        <View style={styles.heroSection}>
          <View style={styles.avatarWrapper}>
            <AvatarView user={user} />
            <TouchableOpacity
              style={styles.editBadge}
              onPress={() => router.push('/edit-profile')}>
              <Ionicons name="pencil" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userNameText}>{user?.full_name || 'User'}</Text>
        </View>

        <View style={styles.infoCard}>
          <InfoItem icon="call" label="Nomor Telepon" value={user?.phone_number || '-'} />
          <View style={styles.infoDivider} />
          <InfoItem icon="mail" label="Alamat Email" value={user?.email || '-'} />
        </View>

        <View style={styles.fullStatsContainer}>
          <TouchableOpacity
            onPress={() => router.push('/withdraw')}
            style={styles.wideStatItem}
            activeOpacity={0.8}>
            <View style={styles.statIconCircle}>
              <Ionicons name="wallet-outline" size={20} color="#633594" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.wideStatLabel}>Saldo Wallet</Text>
              <Text style={styles.wideStatValue}>
                {walletData ? formatRupiah(walletData.wallet.balance) : 'Rp 0'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        <View style={styles.menuGroup}>
          <Text style={styles.groupLabel}>Aktivitas & Keamanan</Text>

          <MenuItem
            icon="person-outline"
            label="Edit Profil"
            onPress={() => router.push('/edit-profile')}
          />
          <MenuItem
            icon="time-outline"
            label="Riwayat Transaksi"
            onPress={() => router.push('/(mitra)/riwayat')}
          />
          <MenuItem
            icon="shield-checkmark-outline"
            label="Ubah Password"
            onPress={() => router.push('/change-password')}
          />
          <MenuItem
            icon="help-buoy-outline"
            label="Pusat Bantuan"
            onPress={handleWhatsApp}
          />

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout} // Memanggil fungsi alert konfirmasi
          >
            <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
            <Text style={styles.logoutText}>Keluar dari Akun</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>TangerangFast • v1.1.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const InfoItem = ({ icon, label, value }) => (
  <View style={styles.infoItem}>
    <View style={styles.iconCircle}>
      <Ionicons name={icon} size={18} color="#633594" />
    </View>
    <View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const MenuItem = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.menuItem} activeOpacity={0.6} onPress={onPress}>
    <View style={styles.menuLeft}>
      <View style={styles.menuIconBg}>
        <Ionicons name={icon} size={20} color="#633594" />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#FFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  customHeader: {
    backgroundColor: '#FFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerContent: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    justifyContent: 'space-between',
  },
  backButton: { padding: 5 },
  headerTitle: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
    marginRight: 10,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#FFF',
  },
  avatarWrapper: { position: 'relative', marginBottom: 15 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#F8FAFC',
    backgroundColor: '#F1F5F9',
  },
  avatarInitials: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#F8FAFC',
    backgroundColor: '#633594',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitialsText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 1,
  },
  editBadge: {
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
  userNameText: { fontSize: 22, fontWeight: '800', color: '#1E293B' },
  infoCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 5,
  },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3E5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginTop: 2 },
  infoDivider: { height: 1, backgroundColor: '#F8FAFC', marginVertical: 15 },
  menuGroup: { paddingHorizontal: 20, marginTop: 30, backgroundColor: '#FFF' },
  groupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  menuIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#334155' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 40,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFF1F0',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#FF3B30' },
  fullStatsContainer: { paddingHorizontal: 20, marginTop: 25 },
  wideStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  wideStatLabel: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  wideStatValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#633594',
    marginTop: 2,
  },
  versionText: {
    textAlign: 'center',
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: 40,
    fontWeight: '500',
  },
});