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
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import API from '../utils/api';
import { storage } from '../utils/storage';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mengambil data dari DATABASE (API)
  const fetchUserProfile = async () => {
    try {
      const response = await API.get('/auth/profile');

      if (response.data.success) {
        const userData = response.data.user;
        setUser(userData);
        await storage.save('userData', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('❌ Gagal ambil data dari DB:', error);
      const cached = await storage.get('userData');
      if (cached) {
        setUser(JSON.parse(cached));
        console.log('📦 Using cached data instead.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserProfile();
  };

  const logoutAction = async () => {
    try {
      const fcmToken = await storage.get('fcmToken');
      await API.post('/auth/logout', { fcm_token: fcmToken });
    } catch (error) {
      console.log('Logout error bypass...');
    } finally {
      await storage.delete('userToken');
      await storage.delete('userData');
      router.replace('/(auth)/login');
    }
  };

  const handleWhatsApp = async () => {
    const phoneNumber = '6282323907426';
    const message = 'Halo Admin, saya butuh bantuan terkait layanan TangerangFast.';
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      supported
        ? await Linking.openURL(url)
        : await Linking.openURL(`https://wa.me/${phoneNumber}`);
    } catch (error) {
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
      <View style={styles.header}>
        <Text style={styles.title}>Akun Profile</Text>
        <Text style={styles.subtitle}>Informasi akun profile Anda</Text>
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
            <Image
              source={{
                uri: `https://ui-avatars.com/api/?name=${user?.full_name}&background=633594&color=fff&size=128`,
              }}
              style={styles.avatar}
            />
            <TouchableOpacity
              style={styles.editBadge}
              onPress={() => router.push('/edit-profile')}>
              <Ionicons name="pencil" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userNameText}>{user?.full_name || 'User'}</Text>
        </View>

        <View style={styles.infoCard}>
          <InfoItem
            icon="call"
            label="Nomor Telepon"
            value={user?.phone_number || '-'}
          />
          <View style={styles.infoDivider} />
          <InfoItem
            icon="mail"
            label="Alamat Email"
            value={user?.email || '-'}
          />
        </View>



        <View style={styles.menuGroup}>
          <Text style={styles.groupLabel}>Aktivitas & Keamanan</Text>

          <MenuItem
            icon="person-outline"
            label="Edit Profil"
            onPress={() => router.push('/edit-profile')}
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

          <TouchableOpacity style={styles.logoutBtn} onPress={logoutAction}>
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            <Text style={styles.logoutText}>Keluar dari Akun</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>TangerangFast • v1.1.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Sub-components
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
  <TouchableOpacity
    style={styles.menuItem}
    activeOpacity={0.6}
    onPress={onPress}>
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
  mainWrapper: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  header: { padding: 25, backgroundColor: '#633594' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 13, color: '#d8b4fe', marginTop: 5 },
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
  btn: { backgroundColor: '#633594', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 35, elevation: 3 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 25, padding: 15, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#fee2e2' },
  logoutText: { color: '#FF3B30', fontWeight: 'bold', marginLeft: 10, fontSize: 14 }
});