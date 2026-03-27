import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Alert, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, StatusBar, Modal, FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import API from '../../utils/api';
import { storage } from '../../utils/storage';

const BANK_LIST = [
    { label: 'Bank BCA', code: '014' },
    { label: 'Bank Mandiri', code: '008' },
    { label: 'Bank BNI', code: '009' },
    { label: 'Bank BRI', code: '002' },
    { label: 'Bank Tabungan Negara (BTN)', code: '200' },
    { label: 'Bank Syariah Indonesia (BSI)', code: '451' },
    { label: 'Bank Muamalat', code: '147' },
    { label: 'Bank CIMB Niaga', code: '022' },
    { label: 'Bank Permata', code: '013' },
    { label: 'Bank Danamon', code: '011' },
    { label: 'Bank Panin', code: '019' },
    { label: 'Bank Maybank', code: '016' },
    { label: 'Bank OCBC NISP', code: '028' },
    { label: 'Bank Artha Graha', code: '037' },
    { label: 'Bank Bukopin', code: '441' },
    { label: 'Bank DBS Indonesia', code: '046' },
    { label: 'Bank Jago', code: '542' },
    { label: 'Bank Neo Commerce (BNC)', code: '490' },
    { label: 'Bank Aladin Syariah', code: '947' },
    { label: 'SeaBank Indonesia', code: '535' },
    { label: 'Blu by BCA Digital', code: '501' },
    { label: 'Jenius (Bank BTPN)', code: '213' },
    { label: 'Allo Bank', code: '567' },
    { label: 'Bank DKI', code: '111' },
    { label: 'Bank Jabar Banten (BJB)', code: '110' },
    { label: 'Bank Jawa Tengah (Jateng)', code: '113' },
    { label: 'Bank Jawa Timur (Jatim)', code: '114' }
].sort((a, b) => a.label.localeCompare(b.label)); // Urutkan abjad

export default function WithdrawPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState(null);
    const [balance, setBalance] = useState(0);

    // Form States
    const [amount, setAmount] = useState('');
    const [selectedBank, setSelectedBank] = useState(null);
    const [accountNumber, setAccountNumber] = useState('');
    const [bankInfo, setBankInfo] = useState({ holder: '', inquiryReff: '' });

    // Dropdown Modal States
    const [showBankModal, setShowBankModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const filteredBanks = BANK_LIST.filter(bank =>
        bank.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const ADMIN_FEE = 3000;
    const THEME_COLOR = '#633594';

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const raw = await storage.get('userData');
            if (raw) {
                const user = typeof raw === 'string' ? JSON.parse(raw) : raw;
                setUserData(user);
                fetchCurrentBalance(user.store_id || user.id);
            }
        } catch (e) { console.error(e); }
    };

    const fetchCurrentBalance = async (id) => {
        try {
            const res = await API.get(`/mitra/dashboard/${id}`);
            if (res.data.success) {
                setBalance(res.data.data.stats.balance);
            }
        } catch (e) { console.error(e); }
    };

    const formatIDR = (val) => new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(val || 0);

    const handleInquiry = async () => {
        const val = parseInt(amount);
        const totalNeeded = val + ADMIN_FEE;

        if (!val || val < 10000) return Alert.alert("Error", "Minimal penarikan Rp 10.000");
        if (!selectedBank) return Alert.alert("Error", "Pilih bank tujuan");
        if (!accountNumber) return Alert.alert("Error", "Isi nomor rekening");
        if (totalNeeded > balance) return Alert.alert("Error", "Saldo tidak mencukupi");

        setLoading(true);
        try {
            const res = await API.post('/withdraw/inquiry', {
                user_id: userData.id,
                amount: val,
                bank_code: selectedBank.code,
                account_number: accountNumber
            });
            if (res.data.success) {
                setBankInfo({
                    holder: res.data.data.accountname,
                    inquiryReff: res.data.data.inquiry_reff
                });
                setStep(2);
            }
        } catch (e) {
            Alert.alert("Gagal", e.response?.data?.message || "Rekening tidak ditemukan.");
        } finally { setLoading(false); }
    };

    const handleWithdraw = async () => {
        setLoading(true);
        try {
            const res = await API.post('/withdraw/execute', {
                user_id: userData.id,
                inquiry_reff: bankInfo.inquiryReff,
                admin_fee: ADMIN_FEE
            });
            if (res.data.success) {
                Alert.alert("Berhasil", "Penarikan diproses.", [{ text: "OK", onPress: () => router.replace('/(mitra)') }]);
            }
        } catch (e) {
            Alert.alert("Gagal", e.response?.data?.message || "Gagal memproses.");
        } finally { setLoading(false); }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#FDFDFD' }}>
            <StatusBar barStyle="light-content" backgroundColor={THEME_COLOR} />

            {/* Modal Dropdown Bank */}
            <Modal visible={showBankModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Pilih Bank Tujuan</Text>
                            <TouchableOpacity onPress={() => setShowBankModal(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.searchBar}
                            placeholder="Cari bank..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        <FlatList
                            data={filteredBanks}
                            keyExtractor={(item) => item.code}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.bankOption}
                                    onPress={() => {
                                        setSelectedBank(item);
                                        setShowBankModal(false);
                                        setSearchQuery('');
                                    }}
                                >
                                    <Text style={styles.bankOptionText}>{item.label}</Text>
                                    <Ionicons name="chevron-forward" size={16} color="#DDD" />
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={[styles.headerCard, { backgroundColor: THEME_COLOR }]}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.headerTextRow}>
                            <View>
                                <Text style={styles.balanceText}>{formatIDR(balance)}</Text>
                                <Text style={styles.saldoLabel}>Saldo Tersedia</Text>
                            </View>
                            <Ionicons name="wallet-outline" size={32} color="rgba(255,255,255,0.4)" />
                        </View>
                    </View>

                    {step === 1 ? (
                        <View style={styles.formContainer}>
                            <Text style={styles.label}>Nominal Tarik</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Min. 10.000"
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={setAmount}
                            />

                            <Text style={styles.label}>Bank Tujuan</Text>
                            <TouchableOpacity
                                style={styles.dropdownTrigger}
                                onPress={() => setShowBankModal(true)}
                            >
                                <Text style={{ color: selectedBank ? '#333' : '#999' }}>
                                    {selectedBank ? selectedBank.label : 'Pilih Bank'}
                                </Text>
                                <Ionicons name="caret-down" size={16} color={THEME_COLOR} />
                            </TouchableOpacity>

                            <Text style={styles.label}>Nomor Rekening</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Contoh: 71228394"
                                keyboardType="numeric"
                                value={accountNumber}
                                onChangeText={setAccountNumber}
                            />

                            <TouchableOpacity
                                style={[styles.primaryBtn, { backgroundColor: THEME_COLOR }]}
                                onPress={handleInquiry}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Cek Rekening</Text>}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.formContainer}>
                            <Text style={styles.confirmTitle}>Konfirmasi Penerima</Text>
                            <View style={styles.detailBox}>
                                <DetailRow label="Nama" value={bankInfo.holder} bold />
                                <DetailRow label="Bank" value={selectedBank.label} />
                                <DetailRow label="Rekening" value={accountNumber} />
                                <View style={styles.line} />
                                <DetailRow label="Nominal" value={formatIDR(parseInt(amount))} />
                                <DetailRow label="Admin" value={formatIDR(ADMIN_FEE)} />
                                <DetailRow label="Total" value={formatIDR(parseInt(amount) + ADMIN_FEE)} color={THEME_COLOR} bold />
                            </View>
                            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#4CAF50' }]} onPress={handleWithdraw}>
                                <Text style={styles.btnText}>Tarik Sekarang</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setStep(1)} style={styles.backLink}>
                                <Text style={{ color: '#666' }}>Kembali</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const DetailRow = ({ label, value, bold, color }) => (
    <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, bold && { fontWeight: 'bold' }, color && { color }]}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    content: { paddingBottom: 40 },
    headerCard: { padding: 25, borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
    backBtn: { marginBottom: 15 },
    headerTextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    balanceText: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
    saldoLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
    formContainer: { padding: 20 },
    label: { fontSize: 13, fontWeight: 'bold', color: '#633594', marginTop: 20, marginBottom: 8 },
    input: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#EEE', padding: 10, fontSize: 16 },
    dropdownTrigger: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderBottomWidth: 1, borderColor: '#EEE', paddingVertical: 12, paddingHorizontal: 5
    },
    primaryBtn: { padding: 16, borderRadius: 12, marginTop: 30, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: 'bold' },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '70%', padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    searchBar: { backgroundColor: '#F5F5F5', padding: 12, borderRadius: 10, marginBottom: 15 },
    bankOption: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', flexDirection: 'row', justifyContent: 'space-between' },
    bankOptionText: { fontSize: 15, color: '#333' },

    confirmTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
    detailBox: { backgroundColor: '#F9F9F9', padding: 15, borderRadius: 15 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    detailLabel: { color: '#888', fontSize: 12 },
    detailValue: { fontSize: 14 },
    line: { height: 1, backgroundColor: '#EEE', marginVertical: 10 },
    backLink: { marginTop: 20, alignItems: 'center' }
});