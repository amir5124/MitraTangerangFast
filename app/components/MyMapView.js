import React from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';

export default function MyMapView(props) {
    // Jika di Web, langsung kembalikan tampilan kosong/placeholder
    if (Platform.OS === 'web') {
        return (
            <View style={styles.webFallback}>
                <Text style={{ color: '#64748b' }}>Peta tidak tersedia di Web</Text>
            </View>
        );
    }

    // Jika di Mobile (Android/iOS), baru panggil library-nya di sini
    try {
        const MapView = require('react-native-maps').default;
        const { Marker } = require('react-native-maps');

        return (
            <MapView style={styles.map} region={props.region}>
                {props.latitude && props.longitude && (
                    <Marker
                        coordinate={{
                            latitude: parseFloat(props.latitude),
                            longitude: parseFloat(props.longitude)
                        }}
                        draggable
                        pinColor="#633594"
                        onDragEnd={(e) => {
                            const { latitude, longitude } = e.nativeEvent.coordinate;
                            props.onDragEnd(latitude, longitude);
                        }}
                    />
                )}
            </MapView>
        );
    } catch (error) {
        return <ActivityIndicator />;
    }
}

const styles = StyleSheet.create({
    map: { flex: 1 },
    webFallback: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc'
    }
});