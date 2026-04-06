import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    Alert, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, StatusBar, Modal, FlatList
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import API from '../utils/api';
import { storage } from '../utils/storage';

const BANK_LIST = [
    { label: 'Bank BCA', code: '014' },
    { label: 'Bank Mandiri', code: '008' },
    { label: 'Bank BNI', code: '009' },
    { label: 'Bank BRI', code: '002' },
    { label: 'Bank Tabungan Negara (BTN)', code: '200' },
    { label: 'Bank Syariah Indonesia (BSI)', code: '451' },
    { label: 'Bank CIMB Niaga', code: '022' },
    { label: 'Bank Permata', code: '013' },
    { label: 'Bank Jago', code: '542' },
    { label: 'SeaBank Indonesia', code: '535' },
    { label: 'Blu by BCA Digital', code: '501' },
    { label: 'Jenius (Bank BTPN)', code: '213' },
].sort((a, b) => a.label.localeCompare(b.label));

export default function WithdrawPage() {
    const router = useRouter();
    const THEME_COLOR = '#633594';

    // UI States
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [trxStatus, setTrxStatus] = useState(null);
    const [showBankModal, setShowBankModal] = useState(false);

    // Data States
    const [userData, setUserData] = useState(null);
    const [balance, setBalance] = useState(0);
    const [adminFee, setAdminFee] = useState(0);

    // Form States
    const [amount, setAmount] = useState('');
    const [selectedBank, setSelectedBank] = useState(null);
    const [accountNumber, setAccountNumber] = useState('');
    const [bankInfo, setBankInfo] = useState({ holder: '', inquiryReff: '' });
    const [searchQuery, setSearchQuery] = useState('');

    /**
     * FUNGSI RESET FORM
     * Akan dijalankan setiap kali halaman difokuskan
     */
    const resetForm = useCallback(() => {
        setStep(1);
        setAmount('');
        setSelectedBank(null);
        setAccountNumber('');
        setBankInfo({ holder: '', inquiryReff: '' });
        setTrxStatus(null);
        setLoading(false);
    }, []);

    // Gunakan useFocusEffect agar data ter-reset saat kembali ke halaman ini
    useFocusEffect(
        useCallback(() => {
            resetForm();
            loadData();
            fetchAdminFee();
        }, [])
    );

    const fetchAdminFee = async () => {
        try {
            const res = await API.get('/disburse/withdraw_fee');
            if (res.data.success && res.data.value) {
                setAdminFee(parseInt(res.data.value));
            }
        } catch (e) {
            console.error("❌ Error Fetch Admin Fee:", e.message);
            setAdminFee(0); // Default jika gagal
        }
    };

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
        const totalNeeded = val + adminFee;

        if (!val || val < 50000) {
        return Alert.alert("Minimal Penarikan", "Batas minimal penarikan adalah Rp 50.000");
    }
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
        if (loading) return;
        setLoading(true);
        try {
            const res = await API.post('/withdraw/execute', {
                user_id: userData.id,
                inquiry_reff: bankInfo.inquiryReff,
                admin_fee: adminFee
            });
            if (res.data.success) {
                setTrxStatus('success');
                setShowStatusModal(true);
            }
        } catch (e) {
            setTrxStatus('failed');
            setShowStatusModal(true);
        } finally { setLoading(false); }
    };

    const filteredBanks = BANK_LIST.filter(bank =>
        bank.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <View style={{ flex: 1, backgroundColor: '#FDFDFD' }}>
            <StatusBar barStyle="light-content" backgroundColor={THEME_COLOR} />

            {/* Modal Bank Selection */}
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

            {/* Main Content */}
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
                                placeholder="Masukkan nominal (Contoh: 50000)"
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={setAmount}
                            />

                            <Text style={styles.label}>Bank Tujuan</Text>
                            <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowBankModal(true)}>
                                <Text style={{ color: selectedBank ? '#333' : '#999' }}>
                                    {selectedBank ? selectedBank.label : 'Pilih Bank'}
                                </Text>
                                <Ionicons name="caret-down" size={16} color={THEME_COLOR} />
                            </TouchableOpacity>

                            <Text style={styles.label}>Nomor Rekening</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Isi nomor rekening"
                                keyboardType="numeric"
                                value={accountNumber}
                                onChangeText={setAccountNumber}
                            />

                            <TouchableOpacity
                                style={[styles.primaryBtn, { backgroundColor: THEME_COLOR }]}
                                onPress={handleInquiry}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Lanjutkan</Text>}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.formContainer}>
                            <Text style={styles.confirmTitle}>Konfirmasi Penarikan</Text>
                            <View style={styles.detailBox}>
                                <DetailRow label="Nama Penerima" value={bankInfo.holder} bold />
                                <DetailRow label="Bank" value={selectedBank?.label} />
                                <DetailRow label="Nomor Rekening" value={accountNumber} />
                                <View style={styles.line} />
                                <DetailRow label="Nominal Tarik" value={formatIDR(parseInt(amount))} />
                                <DetailRow label="Biaya Admin" value={formatIDR(adminFee)} />
                                <DetailRow label="Total Potong Saldo" value={formatIDR(parseInt(amount) + adminFee)} color={THEME_COLOR} bold />
                            </View>

                            <TouchableOpacity
                                style={[styles.primaryBtn, { backgroundColor: loading ? '#A5D6A7' : '#4CAF50' }]}
                                onPress={handleWithdraw}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Tarik Sekarang</Text>}
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setStep(1)} style={styles.backLink}>
                                <Text style={{ color: '#666' }}>Ubah Data</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Status Modal */}
            <Modal visible={showStatusModal} transparent animationType="fade">
                <View style={styles.statusOverlay}>
                    <View style={styles.statusCard}>
                        <Ionicons
                            name={trxStatus === 'success' ? "checkmark-circle" : "close-circle"}
                            size={80}
                            color={trxStatus === 'success' ? "#4CAF50" : "#F44336"}
                        />
                        <Text style={styles.statusTitle}>
                            {trxStatus === 'success' ? "Sukses!" : "Gagal"}
                        </Text>
                        <Text style={styles.statusSub}>
                            {trxStatus === 'success'
                                ? "Permintaan penarikan Anda berhasil diproses."
                                : "Maaf, transaksi gagal. Silakan coba lagi nanti."}
                        </Text>

                        <TouchableOpacity
                            style={[styles.primaryBtn, { backgroundColor: THEME_COLOR, width: '100%' }]}
                            onPress={() => {
                                setShowStatusModal(false);
                                router.replace('/(mitra)');
                            }}
                        >
                            <Text style={styles.btnText}>Selesai</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    primaryBtn: { padding: 16, borderRadius: 12, marginTop: 30, alignItems: 'center', minHeight: 55, justifyContent: 'center' },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '80%', padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    searchBar: { backgroundColor: '#F5F5F5', padding: 12, borderRadius: 10, marginBottom: 15 },
    bankOption: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', flexDirection: 'row', justifyContent: 'space-between' },
    bankOptionText: { fontSize: 15, color: '#333' },
    confirmTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: '#333' },
    detailBox: { backgroundColor: '#F9F9F9', padding: 20, borderRadius: 15, borderWidth: 1, borderColor: '#F0F0F0' },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    detailLabel: { color: '#888', fontSize: 13 },
    detailValue: { fontSize: 14, color: '#333' },
    line: { height: 1, backgroundColor: '#EEE', marginVertical: 15 },
    backLink: { marginTop: 20, alignItems: 'center', padding: 10 },
    statusOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    statusCard: { backgroundColor: '#fff', width: '100%', borderRadius: 25, padding: 30, alignItems: 'center' },
    statusTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 15, color: '#333' },
    statusSub: { textAlign: 'center', color: '#666', marginTop: 10, marginBottom: 25, lineHeight: 22 }
});