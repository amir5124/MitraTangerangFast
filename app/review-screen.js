import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    Image, ActivityIndicator, Animated, TextInput, Modal,
    Alert, StatusBar, Dimensions, FlatList, Platform,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
    primary:      '#633594',
    primaryLight: '#A78BFA',
    primaryDark:  '#5B21B6',
    primaryGlow:  '#EDE9FE',
    accent:       '#EC4899',
    accentLight:  '#FBCFE8',
    bg:           '#FFF',
    surface:      '#1A1030',
    card:         '#231848',
    border:       '#3B2D6B',
    text:         '#F5F3FF',
    textSub:      '#C4B5FD',
    textMuted:    '#7C6FAA',
    gold:         '#F59E0B',
    success:      '#10B981',
    white:        '#FFFFFF',
};

const API_BASE_URL = 'https://backend.tangerangfast.online/api';

// ── Helper: pastikan nilai selalu number sebelum toFixed() ──────────────────
const toNum = (val) => parseFloat(val) || 0;
const fmt   = (val) => isNaN(parseFloat(val)) ? '–' : parseFloat(val).toFixed(1);

// ─── STAR COMPONENT ──────────────────────────────────────────────────────────
const StarRating = ({ rating, size = 14, interactive = false, onRate }) => (
    <View style={{ flexDirection: 'row', gap: 3 }}>
        {[1, 2, 3, 4, 5].map(i => (
            <TouchableOpacity key={i} disabled={!interactive}
                onPress={() => interactive && onRate && onRate(i)} activeOpacity={0.7}>
                <Text style={{ fontSize: size, color: i <= rating ? COLORS.gold : COLORS.border }}>★</Text>
            </TouchableOpacity>
        ))}
    </View>
);

// ─── SCORE BAR ────────────────────────────────────────────────────────────────
const ScoreBar = ({ label, score, animDelay = 0 }) => {
    const num  = toNum(score);
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(anim, {
            toValue: num / 5, duration: 900, delay: animDelay, useNativeDriver: false,
        }).start();
    }, [num]);

    return (
        <View style={styles.scoreBarRow}>
            <Text style={styles.scoreBarLabel}>{label}</Text>
            <View style={styles.scoreBarTrack}>
                <Animated.View style={[styles.scoreBarFill, {
                    width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                }]} />
            </View>
            <Text style={styles.scoreBarValue}>{fmt(score)}</Text>
        </View>
    );
};

// ─── AVATAR ───────────────────────────────────────────────────────────────────
const Avatar = ({ uri, name, size = 42 }) => {
    const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
    const palette  = ['#7C3AED', '#EC4899', '#3B82F6', '#10B981', '#F59E0B'];
    const color    = palette[name ? name.charCodeAt(0) % palette.length : 0];

    if (uri) return (
        <Image source={{ uri }}
            style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: COLORS.primary }} />
    );
    return (
        <View style={{
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: color, alignItems: 'center', justifyContent: 'center',
            borderWidth: 2, borderColor: COLORS.primaryLight,
        }}>
            <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: size * 0.38 }}>{initials}</Text>
        </View>
    );
};

// ─── REVIEW CARD ─────────────────────────────────────────────────────────────
const ReviewCard = ({ item, index }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(anim, { toValue: 1, delay: index * 80, tension: 60, friction: 8, useNativeDriver: true }).start();
    }, []);

    const formatDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

    // Parsing detail_jasa — bisa berupa string JSON, array, atau null
    const getJasaLabel = (jasa) => {
        if (typeof jasa === 'string') return jasa;
        return jasa?.nama || jasa?.name || jasa?.title || jasa?.service_name || JSON.stringify(jasa);
    };

    return (
        <Animated.View style={[styles.reviewCard, {
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }]
        }]}>
            {/* Header */}
            <View style={styles.reviewCardHeader}>
                <Avatar uri={item.profile_picture} name={item.full_name} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.reviewerName}>{item.full_name ?? 'Pelanggan'}</Text>
                    <Text style={styles.reviewDate}>{formatDate(item.created_at)}</Text>
                </View>
                <View style={styles.ratingBadge}>
                    {/* fmt() agar aman walau rating berupa string */}
                    <Text style={styles.ratingBadgeText}>★ {fmt(item.rating)}</Text>
                </View>
            </View>

            {/* Jasa Tags */}
            {item.detail_jasa?.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                    {item.detail_jasa.map((jasa, idx) => (
                        <View key={idx} style={styles.jasaTag}>
                            <Text style={styles.jasaTagText}>{getJasaLabel(jasa)}</Text>
                        </View>
                    ))}
                </ScrollView>
            )}

            {/* Comment */}
            <Text style={[styles.reviewComment, !item.comment && { fontStyle: 'italic', color: COLORS.textMuted }]}>
                {item.comment ? `"${item.comment}"` : 'Tidak ada komentar.'}
            </Text>

            {/* Stars */}
            <View style={{ marginTop: 10 }}>
                <StarRating rating={Math.round(toNum(item.rating))} size={13} />
            </View>
        </Animated.View>
    );
};

// ─── ADD REVIEW MODAL ────────────────────────────────────────────────────────
const AddReviewModal = ({ visible, onClose, storeId, onSuccess }) => {
    const [rating, setRating]                 = useState(5);
    const [ratingQuality, setRatingQuality]   = useState(5);
    const [ratingPunctuality, setRatingPunct] = useState(5);
    const [ratingComm, setRatingComm]         = useState(5);
    const [comment, setComment]               = useState('');
    const [loading, setLoading]               = useState(false);
    const slideAnim = useRef(new Animated.Value(600)).current;

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: visible ? 0 : 600, tension: 65, friction: 10, useNativeDriver: true,
        }).start();
    }, [visible]);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const token = await SecureStore.getItemAsync('userToken');
            const res = await fetch(`${API_BASE_URL}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    store_id: storeId, rating,
                    rating_quality: ratingQuality,
                    rating_punctuality: ratingPunctuality,
                    rating_communication: ratingComm,
                    comment,
                }),
            });
            const data = await res.json();
            if (data.success) {
                Alert.alert('Berhasil ✅', 'Ulasan berhasil dikirim!');
                setComment('');
                onSuccess?.();
                onClose();
            } else {
                Alert.alert('Gagal', data.message);
            }
        } catch (err) {
            Alert.alert('Error', 'Gagal mengirim review. Coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    const fields = [
        { label: 'Rating Keseluruhan', val: rating,          set: setRating },
        { label: 'Kualitas',           val: ratingQuality,   set: setRatingQuality },
        { label: 'Ketepatan Waktu',    val: ratingPunctuality, set: setRatingPunct },
        { label: 'Komunikasi',         val: ratingComm,      set: setRatingComm },
    ];

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <Animated.View style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.modalHandle} />
                    <Text style={styles.modalTitle}>Tulis Ulasan</Text>
                    <Text style={styles.modalSubtitle}>Bagikan pengalaman Anda</Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {fields.map(({ label, val, set }) => (
                            <View key={label} style={styles.ratingRow}>
                                <Text style={styles.ratingRowLabel}>{label}</Text>
                                <StarRating rating={val} size={28} interactive onRate={set} />
                                <Text style={styles.ratingRowValue}>{val}/5</Text>
                            </View>
                        ))}
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.commentInput}
                                placeholder="Ceritakan pengalaman Anda..."
                                placeholderTextColor={COLORS.textMuted}
                                multiline numberOfLines={4}
                                value={comment} onChangeText={setComment}
                                textAlignVertical="top"
                            />
                        </View>
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                                <Text style={styles.cancelBtnText}>Batal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                                onPress={handleSubmit} disabled={loading}>
                                {loading
                                    ? <ActivityIndicator color={COLORS.white} size="small" />
                                    : <Text style={styles.submitBtnText}>Kirim Ulasan</Text>}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
};

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
const ReviewScreen = ({ route }) => {
    const storeIdFromRoute = route?.params?.store_id ?? null;

    const [storeId, setStoreId]     = useState(storeIdFromRoute);
    const [data, setData]           = useState(null);
    const [loading, setLoading]     = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [activeTab, setActiveTab] = useState('semua');

    const headerAnim = useRef(new Animated.Value(0)).current;
    const scoreAnim  = useRef(new Animated.Value(0)).current;

    const fetchProfile = async () => {
        try {
            const token = await SecureStore.getItemAsync('userToken');
            if (!token) return null;
            const res  = await fetch(`${API_BASE_URL}/auth/profile`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            const user = json?.user ?? json?.data ?? json;
            return user?.store_id ?? user?.storeId ?? user?.store?.id ?? null;
        } catch (err) {
            console.error('[ReviewScreen] fetchProfile error:', err.message);
            return null;
        }
    };

    const fetchReviews = async (id) => {
        if (!id) return;
        try {
            const res  = await fetch(`${API_BASE_URL}/reviews/store/${id}`);
            const json = await res.json();
            if (json.success) {
                setData(json);
                Animated.parallel([
                    Animated.timing(headerAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
                    Animated.timing(scoreAnim,  { toValue: 1, duration: 900, delay: 300, useNativeDriver: true }),
                ]).start();
            } else {
                Alert.alert('Gagal', json.message ?? 'Gagal memuat ulasan');
            }
        } catch (err) {
            Alert.alert('Error', 'Gagal memuat ulasan: ' + err.message);
        }
    };

    const init = async () => {
        setLoading(true);
        try {
            let id = storeIdFromRoute;
            if (!id) {
                id = await fetchProfile();
                setStoreId(id);
            }
            await fetchReviews(id);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { init(); }, []);

    const getRatingLabel = (avg) => {
        const n = toNum(avg);
        if (n >= 4.5) return { text: 'Luar Biasa',         color: COLORS.success };
        if (n >= 4.0) return { text: 'Sangat Baik',        color: COLORS.primaryLight };
        if (n >= 3.0) return { text: 'Cukup Baik',         color: COLORS.gold };
        if (n > 0)    return { text: 'Perlu Ditingkatkan', color: COLORS.accent };
        return              { text: 'Belum Ada Rating',   color: COLORS.textMuted };
    };

    const filteredComments = () => {
        if (!data?.latest_comments) return [];
        if (activeTab === 'semua') return data.latest_comments;
        const min = parseInt(activeTab);
        return data.latest_comments.filter(c => Math.round(toNum(c.rating)) === min);
    };

    if (loading) {
        return (
            <View style={styles.loadingScreen}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Memuat ulasan...</Text>
            </View>
        );
    }

    // Konversi semua nilai summary ke number sebelum dipakai
    const summary = {
        total_reviews:     data?.summary?.total_reviews     ?? 0,
        avg_rating:        toNum(data?.summary?.avg_rating),
        avg_quality:       toNum(data?.summary?.avg_quality),
        avg_punctuality:   toNum(data?.summary?.avg_punctuality),
        avg_communication: toNum(data?.summary?.avg_communication),
    };
    const ratingLabel = getRatingLabel(summary.avg_rating);

    return (
        <View style={styles.screen}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

            {/* ── HEADER ── */}
            <Animated.View style={[styles.header, {
                opacity: headerAnim,
                transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
            }]}>
                <View style={styles.headerGlow} />
                <Text style={styles.headerLabel}>ULASAN TOKO</Text>
                <Text style={styles.headerTitle}>Penilaian Pelanggan</Text>
            </Animated.View>

            <FlatList
                data={filteredComments()}
                keyExtractor={(item) => String(item.review_id)}
                renderItem={({ item, index }) => <ReviewCard item={item} index={index} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 110 }}
                ListHeaderComponent={
                    <>
                        {/* ── HERO CARD ── */}
                        <Animated.View style={[styles.heroCard, {
                            opacity: scoreAnim,
                            transform: [{ scale: scoreAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
                        }]}>
                            <View style={styles.heroLeft}>
                                {/* fmt() aman untuk string/number/null */}
                                <Text style={styles.avgRatingBig}>
                                    {summary.avg_rating > 0 ? fmt(summary.avg_rating) : '–'}
                                </Text>
                                <StarRating rating={Math.round(summary.avg_rating)} size={18} />
                                <View style={[styles.ratingLabelBadge, { backgroundColor: ratingLabel.color + '22' }]}>
                                    <Text style={[styles.ratingLabelText, { color: ratingLabel.color }]}>
                                        {ratingLabel.text}
                                    </Text>
                                </View>
                                <Text style={styles.totalReviews}>{summary.total_reviews} Ulasan</Text>
                            </View>
                            <View style={styles.heroDivider} />
                            <View style={styles.heroRight}>
                                <ScoreBar label="Kualitas"   score={summary.avg_quality}       animDelay={400} />
                                <ScoreBar label="Ketepatan"  score={summary.avg_punctuality}   animDelay={550} />
                                <ScoreBar label="Komunikasi" score={summary.avg_communication} animDelay={700} />
                            </View>
                        </Animated.View>

                        {/* ── TABS ── */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}
                            style={styles.tabScroll}
                            contentContainerStyle={{ paddingHorizontal: 18, gap: 8 }}>
                            {['semua', '5', '4', '3', '2', '1'].map(tab => (
                                <TouchableOpacity key={tab}
                                    style={[styles.tab, activeTab === tab && styles.tabActive]}
                                    onPress={() => setActiveTab(tab)}>
                                    <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                        {tab === 'semua' ? 'Semua' : `${tab} ★`}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.sectionTitle}>{filteredComments().length} Ulasan Terbaru</Text>
                    </>
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>💬</Text>
                        <Text style={styles.emptyText}>Belum ada ulasan di kategori ini</Text>
                    </View>
                }
            />

            {/* ── FAB ── */}
            {/* <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)} activeOpacity={0.85}>
                <Text style={styles.fabIcon}>✏️</Text>
                <Text style={styles.fabText}>Beri Ulasan</Text>
            </TouchableOpacity> */}

            <AddReviewModal
                visible={showModal}
                onClose={() => setShowModal(false)}
                storeId={storeId}
                onSuccess={init}
            />
        </View>
    );
};

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    screen:        { flex: 1, backgroundColor: COLORS.bg },
    loadingScreen: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', gap: 16 },
    loadingText:   { color: COLORS.textSub, fontSize: 15, letterSpacing: 0.5 },

    header: {
        paddingTop: Platform.OS === 'ios' ? 54 : 36,
        paddingBottom: 20, paddingHorizontal: 20,
        position: 'relative', overflow: 'hidden',
    },
    headerGlow: {
        position: 'absolute', top: -60, right: -40,
        width: 200, height: 200, borderRadius: 100,
        backgroundColor: COLORS.primary, opacity: 0.18,
    },
    headerLabel: { color: COLORS.primaryLight, fontSize: 11, fontWeight: '700', letterSpacing: 3, marginBottom: 4 },
    headerTitle: { color: COLORS.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },

    heroCard: {
        marginHorizontal: 18, marginBottom: 16,
        backgroundColor: COLORS.card, borderRadius: 24,
        borderWidth: 1, borderColor: COLORS.border,
        padding: 22, flexDirection: 'row', alignItems: 'center', gap: 16,
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
    },
    heroLeft:        { alignItems: 'center', width: 110, gap: 6 },
    avgRatingBig:    { color: COLORS.white, fontSize: 52, fontWeight: '900', letterSpacing: -2, lineHeight: 56 },
    ratingLabelBadge:{ borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginTop: 4 },
    ratingLabelText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
    totalReviews:    { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
    heroDivider:     { width: 1, height: '90%', backgroundColor: COLORS.border },
    heroRight:       { flex: 1, gap: 12 },

    scoreBarRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
    scoreBarLabel:{ color: COLORS.textSub, fontSize: 11, width: 65, fontWeight: '500' },
    scoreBarTrack:{ flex: 1, height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
    scoreBarFill: { height: '100%', backgroundColor: COLORS.primaryLight, borderRadius: 3 },
    scoreBarValue:{ color: COLORS.text, fontSize: 11, fontWeight: '700', width: 26, textAlign: 'right' },

    tabScroll: { marginBottom: 8 },
    tab:       { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primaryLight },
    tabText:   { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
    tabTextActive: { color: COLORS.white },

    sectionTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginHorizontal: 18, marginBottom: 12, letterSpacing: -0.3 },

    reviewCard: {
        marginHorizontal: 18, marginBottom: 14,
        backgroundColor: COLORS.card, borderRadius: 20,
        borderWidth: 1, borderColor: COLORS.border, padding: 18,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2, shadowRadius: 12, elevation: 5,
    },
    reviewCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    reviewerName:     { color: COLORS.text, fontSize: 14, fontWeight: '700' },
    reviewDate:       { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
    ratingBadge:      { backgroundColor: COLORS.gold + '22', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    ratingBadgeText:  { color: COLORS.gold, fontSize: 13, fontWeight: '800' },
    jasaTag:          { backgroundColor: '#EDE9FE15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, borderWidth: 1, borderColor: COLORS.primary + '40' },
    jasaTagText:      { color: COLORS.primaryLight, fontSize: 11, fontWeight: '600' },
    reviewComment:    { color: COLORS.textSub, fontSize: 13, lineHeight: 20, fontStyle: 'italic' },

    emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
    emptyIcon:  { fontSize: 48 },
    emptyText:  { color: COLORS.textMuted, fontSize: 15 },

    fab: {
        position: 'absolute', bottom: 28, right: 20,
        backgroundColor: COLORS.primary, borderRadius: 30,
        paddingHorizontal: 22, paddingVertical: 14,
        flexDirection: 'row', alignItems: 'center', gap: 8,
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5, shadowRadius: 16, elevation: 12,
    },
    fabIcon: { fontSize: 16 },
    fabText: { color: COLORS.white, fontWeight: '700', fontSize: 14, letterSpacing: 0.3 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalSheet: {
        backgroundColor: COLORS.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        borderTopWidth: 1, borderColor: COLORS.border, padding: 24, maxHeight: '90%',
    },
    modalHandle:    { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    modalTitle:     { color: COLORS.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    modalSubtitle:  { color: COLORS.textMuted, fontSize: 13, marginTop: 4, marginBottom: 24 },
    ratingRow:      { marginBottom: 20, gap: 8 },
    ratingRowLabel: { color: COLORS.textSub, fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
    ratingRowValue: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
    inputWrapper:   { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 24 },
    commentInput:   { color: COLORS.text, fontSize: 14, padding: 16, minHeight: 110, lineHeight: 22 },
    modalActions:   { flexDirection: 'row', gap: 12, paddingBottom: Platform.OS === 'ios' ? 20 : 8 },
    cancelBtn:      { flex: 1, backgroundColor: COLORS.card, borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    cancelBtnText:  { color: COLORS.textSub, fontWeight: '700', fontSize: 15 },
    submitBtn:      { flex: 2, backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
    submitBtnText:  { color: COLORS.white, fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
});

export default ReviewScreen;