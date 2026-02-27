import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Region } from 'react-native-maps';

import Colors from '@/constants/Colors';

interface AddressPickerProps {
  visible: boolean;
  currentAddress: string;
  onClose: () => void;
  onSelectAddress: (address: string, coordinates: { latitude: number; longitude: number }) => void;
}

export default function AddressPicker({
  visible,
  currentAddress,
  onClose,
  onSelectAddress,
}: AddressPickerProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState(currentAddress);
  const [searchQuery, setSearchQuery] = useState('');
  const [region, setRegion] = useState<Region>({
    latitude: 33.5731, // Default to Morocco center
    longitude: -7.5898,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    if (visible) {
      getCurrentLocation();
    }
  }, [visible]);

  const getCurrentLocation = async () => {
  try {
    setLoading(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is required to select an address.');
      setLoading(false);
      return;
    }

    const currentLocation = await Location.getCurrentPositionAsync({
      accuracy: Platform.OS === 'android' 
        ? Location.Accuracy.Highest 
        : Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = currentLocation.coords;
    setLocation({ latitude, longitude });
    
    // Update map region
    setRegion({
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });

    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }

    // Reverse geocode to get address
    const address = await reverseGeocode(latitude, longitude);
    setSelectedAddress(address);
  } catch (error) {
    console.error('Error getting location:', error);
    Alert.alert('Error', 'Could not get your location. Please try again.');
  } finally {
    setLoading(false);
  }
};

const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
  try {
    // Try Expo's built-in reverse geocoding first (more reliable)
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lon,
      });
      
      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        const formattedAddress = [
          address.street,
          address.streetNumber,
          address.city,
          address.region,
          address.postalCode,
          address.country,
        ]
          .filter(Boolean)
          .join(', ');
        
        if (formattedAddress) {
          console.log(`[${Platform.OS}] Expo Geocoding success: ${formattedAddress}`);
          return formattedAddress;
        }
      }
    } catch (expoError) {
      console.log(`[${Platform.OS}] Expo Geocoding failed, falling back to Nominatim:`, expoError);
    }

    // Fallback to Nominatim with proper headers
    console.log(`[${Platform.OS}] Using Nominatim for: ${lat}, ${lon}`);
    
    // Add delay to prevent rate limiting
    await new Promise<void>(resolve => setTimeout(resolve, 1000));
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'FoodDeliveryApp/1.0 (contact@foodapp.com)', // REQUIRED for Android
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      }
    );
    
    console.log(`[${Platform.OS}] Response status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      console.log(`[${Platform.OS}] Nominatim error:`, data.error);
      return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    }
    
    const addr = data.address || {};
    
    // Use display_name if available (complete address)
    if (data.display_name) {
      console.log(`[${Platform.OS}] Using display_name: ${data.display_name}`);
      return data.display_name;
    }
    
    // Fallback to constructing address from parts
    const formattedAddress = [
      addr.road || addr.pedestrian || addr.footway,
      addr.house_number,
      addr.neighbourhood || addr.suburb,
      addr.city || addr.town || addr.village || addr.municipality,
      addr.postcode,
      addr.country,
    ]
      .filter(Boolean)
      .join(', ');
    
    const result = formattedAddress || `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    console.log(`[${Platform.OS}] Constructed address: ${result}`);
    return result;
  } catch (error) {
    console.error(`[${Platform.OS}] Reverse geocode error:`, error);
    // Return coordinates as fallback
    return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  }
};

const handleMapPress = async (event: any) => {
  try {
    const { latitude, longitude } = event.nativeEvent.coordinate || {};
    if (latitude && longitude) {
      setLocation({ latitude, longitude });
      const address = await reverseGeocode(latitude, longitude);
      setSelectedAddress(address);
    }
  } catch (error) {
    console.error('Error handling map press:', error);
  }
};

const handleSearch = async () => {
  if (!searchQuery.trim()) return;

  try {
    setLoading(true);
    
    // Add delay and proper headers for Nominatim search
    await new Promise<void>(resolve => setTimeout(resolve, 1000));
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery
      )}&limit=1&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'FoodDeliveryApp/1.0 (contact@foodapp.com)',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();

    if (data && data.length > 0) {
      const result = data[0];
      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);
      const newLocation = { latitude: lat, longitude: lon };
      setLocation(newLocation);
      
      // Use display_name from search result if available
      const address = result.display_name || searchQuery;
      setSelectedAddress(address);
      
      // Update map region
      setRegion({
        latitude: lat,
        longitude: lon,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: lat,
          longitude: lon,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }
    } else {
      Alert.alert('Not Found', 'Address not found. Please try a different search term.');
    }
  } catch (error) {
    console.error('Search error:', error);
    Alert.alert('Error', 'Could not search for address. Please try again.');
  } finally {
    setLoading(false);
  }
};

const handleConfirm = () => {
  if (location) {
    onSelectAddress(selectedAddress, location);
    onClose();
  } else {
    Alert.alert('Error', 'Please select a location on the map.');
  }
};

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Address</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={Colors.text.secondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for an address..."
              placeholderTextColor={Colors.text.secondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Map */}
        {loading && !location ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        ) : (
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={region}
              onPress={handleMapPress}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              {location && (
                <Marker
                  coordinate={location}
                  draggable
                  onDragEnd={async (e) => {
                    const { latitude, longitude } = e.nativeEvent.coordinate;
                    setLocation({ latitude, longitude });
                    const address = await reverseGeocode(latitude, longitude);
                    setSelectedAddress(address);
                  }}
                >
                  <View style={styles.markerContainer}>
                    <View style={styles.markerPin}>
                      <Ionicons name="location" size={16} color="#FFFFFF" />
                    </View>
                  </View>
                </Marker>
              )}
            </MapView>
          </View>
        )}

        {/* Selected Address Display */}
        {selectedAddress && (
          <View style={styles.addressCard}>
            <View style={styles.addressIconContainer}>
              <Ionicons name="location" size={20} color="#8B4B16" />
            </View>
            <View style={styles.addressContent}>
              <Text style={styles.addressLabel}>Selected Address</Text>
              <Text style={styles.addressText} numberOfLines={2}>
                {selectedAddress}
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmButton, !location && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={!location}
          >
            <Text style={styles.confirmButtonText}>Confirm Address</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBF7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFBF7',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    letterSpacing: -0.3,
  },
  headerRightPlaceholder: {
    width: 40,
  },
  searchWrapper: {
    backgroundColor: '#FFFBF7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginLeft: 14,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text.primary,
  },
  searchButton: {
    backgroundColor: '#8B4B16',
    borderRadius: 12,
    padding: 10,
    margin: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8B4B16',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  retryButton: {
    backgroundColor: '#8B4B16',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addressCard: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  addressIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressContent: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 24,
    gap: 12,
    backgroundColor: '#FFFBF7',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#8B4B16',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});