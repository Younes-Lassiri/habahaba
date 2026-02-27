import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Your Google Maps API Key
const GOOGLE_API_KEY = 'AIzaSyCx4qoEgZzG3A7VW9_gxpEWAqMSeNs_DfY';

const EditProfile: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const { userLanguage } = useLocalSearchParams();
  const [client, setClient] = useState<{
    name: string;
    email: string;
    phone: string;
    gender: string;
    birthDate: string;
    bio: string;
    adresses: string;
    image: string;
    lat?: number;
    lon?: number;
  } | null>(null);
  const [adresses, setAdresses] = useState('');
  const [fetchingLocation, setFetchingLocation] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [image, setImage] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [bio, setBio] = useState('');
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const bioCharCount = bio.length;
  const bioMaxChars = 200;

  // Determine if language is Arabic
  const isRTL = userLanguage === 'arabic';

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem('client');
        if (userData) {
          const parsedClient = JSON.parse(userData);
          setClient(parsedClient);

          const nameParts = parsedClient.name ? parsedClient.name.split(' ') : [];
          setFirstName(nameParts[0] || '');
          setLastName(nameParts.slice(1).join(' ') || '');
          setEmail(parsedClient.email || '');
          setPhoneNumber(parsedClient.phone || '');
          setDateOfBirth(parsedClient.birthDate || '');
          setGender(parsedClient.gender || '');
          setBio(parsedClient.bio || '');
          setAdresses(parsedClient.adresses || '');
          setImage(parsedClient.image || '');
        }
      } catch (error) {
        console.log('Error fetching user data', error);
      }
    };

    fetchUserData();
  }, []);

  // UPDATED: Google Maps Location Handling
  const handleSetLocation = async () => {
    setFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          isRTL ? 'تم رفض الإذن' : 'Permission denied',
          isRTL ? 'يجب السماح بالوصول إلى الموقع لتعيين عنوانك.' : 'Location access is required to set your address.'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      const { latitude, longitude } = location.coords;

      console.log('📍 Got coordinates:', { latitude, longitude });

      // Use Google Geocoding API to get address with postal code
      const address = await reverseGeocodeWithGoogle(latitude, longitude);

      if (address) {
        console.log('📍 Address with postal code:', address);
        setAdresses(address);

        // Save address with coordinates to backend
        await saveAddressToBackend(address, latitude, longitude);
      } else {
        // Fallback if Google fails
        const fallbackAddress = await getCityFromCoordinates(latitude, longitude);
        setAdresses(fallbackAddress);
        await saveAddressToBackend(fallbackAddress, latitude, longitude);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        isRTL ? 'خطأ' : 'Error',
        isRTL ? 'تعذر الحصول على موقعك. الرجاء المحاولة مرة أخرى.' : 'Could not get your location. Please try again.'
      );
    } finally {
      setFetchingLocation(false);
    }
  };

  // NEW: Google Geocoding API - Fixed postal code extraction
  const reverseGeocodeWithGoogle = async (latitude: number, longitude: number): Promise<string> => {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}&language=${isRTL ? 'ar' : 'fr'}`
      );

      console.log('📍 Google Geocoding Response:', response.data);

      if (response.data.results && response.data.results.length > 0) {
        const formattedAddress = response.data.results[0].formatted_address;
        console.log('📍 Formatted address with postal code:', formattedAddress);
        return formattedAddress;
      }

      return '';
    } catch (error) {
      console.error('❌ Google Geocoding error:', error);
      return '';
    }
  };

  // Fallback function to get city name from coordinates
  const getCityFromCoordinates = (latitude: number, longitude: number): string => {
    // Morocco city coordinates database
    const moroccoCities = [
      { name: isRTL ? "الدار البيضاء" : "Casablanca", lat: 33.5731, lon: -7.5898, radius: 0.3 },
      { name: isRTL ? "الرباط" : "Rabat", lat: 34.0209, lon: -6.8416, radius: 0.3 },
      { name: isRTL ? "مراكش" : "Marrakech", lat: 31.6295, lon: -7.9811, radius: 0.4 },
      { name: isRTL ? "فاس" : "Fes", lat: 34.0181, lon: -5.0078, radius: 0.3 },
      { name: isRTL ? "طنجة" : "Tangier", lat: 35.7595, lon: -5.8340, radius: 0.3 },
      { name: isRTL ? "مكناس" : "Meknes", lat: 33.8935, lon: -5.5473, radius: 0.3 },
      { name: isRTL ? "أكادير" : "Agadir", lat: 30.4278, lon: -9.5981, radius: 0.4 },
      { name: isRTL ? "وجدة" : "Oujda", lat: 34.6814, lon: -1.9086, radius: 0.3 },
    ];

    // Find the closest city
    for (const city of moroccoCities) {
      const distance = Math.sqrt(
        Math.pow(latitude - city.lat, 2) + Math.pow(longitude - city.lon, 2)
      );

      if (distance <= city.radius) {
        return `${city.name} (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
      }
    }

    return `${isRTL ? 'الموقع' : 'Location'} (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
  };

  // UPDATED: Save address with coordinates to backend
  const saveAddressToBackend = async (address: string, latitude: number, longitude: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert(
          isRTL ? 'خطأ' : 'Error',
          isRTL ? 'أنت غير مسجل الدخول.' : 'You are not logged in.'
        );
        return;
      }

      const formData = new FormData();
      formData.append("adresses", address);
      formData.append("lat", latitude.toString());
      formData.append("lon", longitude.toString());

      console.log('📍 Saving address to backend:', { address, latitude, longitude });

      const response = await fetch("https://haba-haba-api.ubua.cloud/api/auth/update-profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        await AsyncStorage.setItem("client", JSON.stringify(result.client));
        setClient(result.client);
        Alert.alert(
          isRTL ? 'نجاح' : 'Success',
          isRTL ? 'تم حفظ الموقع بنجاح!' : 'Location saved successfully!'
        );
        console.log('✅ Address saved with coordinates');
      } else {
        console.error('Error updating address:', result.message);
        // Still update local state even if backend fails
        if (client) {
          const updatedClient = {
            ...client,
            adresses: address,
            lat: latitude,
            lon: longitude
          };
          await AsyncStorage.setItem('client', JSON.stringify(updatedClient));
          setClient(updatedClient);
        }
      }
    } catch (error) {
      console.error('Error saving address:', error);
      // Update local state even if network fails
      if (client) {
        const updatedClient = {
          ...client,
          adresses: address,
          lat: latitude,
          lon: longitude
        };
        await AsyncStorage.setItem('client', JSON.stringify(updatedClient));
        setClient(updatedClient);
      }
    }
  };
  const formatPhoneNumber = (phoneNumber: any) => {
  if (!phoneNumber) return '';
  
  let formattedPhone = phoneNumber.trim().replace(/\s/g, ''); // Remove spaces
  
  // Handle all possible formats
  if (formattedPhone.startsWith('+2120')) {
    // Case: +2120678543290 → Remove the 0 after +212
    formattedPhone = '+212' + formattedPhone.substring(5);
  } else if (formattedPhone.startsWith('+212')) {
    // Case: +212678543290 → Already correct format
    // Do nothing
  } else if (formattedPhone.startsWith('002120')) {
    // Case: 002120678543290 → Convert to +212 and remove extra 0
    formattedPhone = '+212' + formattedPhone.substring(6);
  } else if (formattedPhone.startsWith('00212')) {
    // Case: 00212678543290 → Convert 00212 to +212
    formattedPhone = '+212' + formattedPhone.substring(5);
  } else if (formattedPhone.startsWith('00')) {
    // Case: 00336678543290 (other country code) → Convert 00 to +
    formattedPhone = '+' + formattedPhone.substring(2);
  } else if (formattedPhone.startsWith('0')) {
    // Case: 0678543290 → Replace 0 with +212
    formattedPhone = '+212' + formattedPhone.substring(1);
  } else if (/^\d+$/.test(formattedPhone) && !formattedPhone.startsWith('+')) {
    // Case: 678543290 (just numbers) → Add +212 prefix
    formattedPhone = '+212' + formattedPhone;
  }
  
  // Remove any non-digit characters except the leading +
  formattedPhone = formattedPhone.replace(/[^\d+]/g, '');
  
  // Final validation: should be exactly 13 characters (+212 + 9 digits)
  if (formattedPhone.length === 13 && formattedPhone.startsWith('+212')) {
    return formattedPhone;
  } else {
    // If invalid, return original but cleaned up
    console.warn('Phone number format may be invalid:', phoneNumber, '->', formattedPhone);
    return formattedPhone;
  }
};
  // UPDATED: HandleSave to include coordinates if available
  const handleSave = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert(
          isRTL ? 'خطأ' : 'Error',
          isRTL ? 'أنت غير مسجل الدخول.' : 'You are not logged in.'
        );
        setLoading(false);
        return;
      }

       // 🔴 USE THE FORMATTING FUNCTION HERE:
      const formattedPhone = formatPhoneNumber(phoneNumber);

      // Optional: Validate the formatted phone
      if (!formattedPhone || formattedPhone.length !== 13) {
        Alert.alert(
          isRTL ? 'رقم الهاتف غير صالح' : 'Invalid Phone Number',
          isRTL ? 'الرجاء إدخال رقم هاتف مغربي صالح (مثال: 0612345678)' : 'Please enter a valid Moroccan phone number (e.g., 0612345678)'
        );
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("name", `${firstName} ${lastName}`);
      formData.append("email", email);
      formData.append("phone", formattedPhone);
      formData.append("birthDate", dateOfBirth);
      formData.append("gender", gender);
      formData.append("bio", bio);
      formData.append("adresses", adresses);

      // Include coordinates if we have them from location detection
      if (client?.lat && client?.lon) {
        formData.append("lat", client.lat.toString());
        formData.append("lon", client.lon.toString());
      }

      // SIMPLIFIED Image handling - No FileSystem operations
      if (image && image.startsWith("file://")) {
        // New image selected - upload directly
        const filename = image.split("/").pop() || `profile_${Date.now()}.jpg`;
        const fileType = filename.split(".").pop() || 'jpg';
        formData.append("image", {
          uri: image,
          name: filename,
          type: `image/${fileType}`,
        } as any);
      } else if (image && !image.startsWith("http")) {
        // Server path - send as string
        formData.append("image", image);
      } else {
        // No image or removed image
        formData.append("image", "");
      }

      const response = await fetch("https://haba-haba-api.ubua.cloud/api/auth/update-profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        const updatedClient = {
          ...result.client,
          phone: formattedPhone
        };
        await AsyncStorage.setItem("client", JSON.stringify(updatedClient));
        
        // Also update local state if you're using it
        setClient(updatedClient);
        Alert.alert(
          isRTL ? "نجاح" : "Success",
          isRTL ? "تم تحديث الملف الشخصي بنجاح!" : "Profile updated successfully!"
        );
        router.back();
      } else {
        Alert.alert(
          isRTL ? "خطأ" : "Error",
          result.message || (isRTL ? "فشل تحديث الملف الشخصي." : "Failed to update profile.")
        );
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert(
        isRTL ? "خطأ" : "Error",
        isRTL ? "حدث خطأ أثناء تحديث الملف الشخصي." : "Something went wrong while updating your profile."
      );
    } finally {
      setLoading(false);
    }
  };

  // ALL YOUR EXISTING CODE REMAINS THE SAME FROM HERE...
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateOfBirth(selectedDate.toISOString().split('T')[0]);
    }
  };

  // SIMPLIFIED Image Picker - No FileSystem operations
  const pickImage = async (source: 'camera' | 'library') => {
    try {
      setAvatarModalVisible(false);

      let result;

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            isRTL ? 'تم رفض الإذن' : 'Permission Denied',
            isRTL ? 'يجب السماح بالوصول إلى الكاميرا لالتقاط صورة.' : 'Camera permission is required to take a photo.'
          );
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            isRTL ? 'تم رفض الإذن' : 'Permission Denied',
            isRTL ? 'يجب السماح بالوصول إلى مكتبة الصور.' : 'Photo library permission is required.'
          );
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        // Use the URI directly - NO FileSystem operations
        const selectedUri = result.assets[0].uri;
        setImage(selectedUri);

        // Update client state and AsyncStorage immediately
        if (client) {
          const updatedClient = { ...client, image: selectedUri };
          setClient(updatedClient);
          await AsyncStorage.setItem('client', JSON.stringify(updatedClient));
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(isRTL ? 'خطأ' : 'Error', isRTL ? 'فشل اختيار الصورة' : 'Failed to pick image');
    }
  };

  // SIMPLIFIED Remove Image - No FileSystem operations
  const removeImage = async () => {
    try {
      setImage('');
      setAvatarModalVisible(false);

      if (client) {
        const updatedClient = { ...client, image: '' };
        setClient(updatedClient);
        await AsyncStorage.setItem('client', JSON.stringify(updatedClient));
      }
    } catch (error) {
      console.error('Error removing image:', error);
      Alert.alert(isRTL ? 'خطأ' : 'Error', isRTL ? 'فشل إزالة الصورة' : 'Failed to remove image');
    }
  };

  // SafeImage component to prevent crashes from invalid URIs
  const SafeImage = ({ uri, style }: { uri: string; style: any }) => {
    const [imageError, setImageError] = useState(false);

    const isValidUri = uri && (uri.startsWith('http') || uri.startsWith('file://'));

    if (!isValidUri || imageError) {
      return (
        <LinearGradient
          colors={['#f88250', '#f15d81']}
          style={style}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.avatarText}>
            {client?.name
              ? `${client.name.split(' ')[0]?.[0] || ''}${client.name.split(' ')[1]?.[0] || ''}`
              : ''}
          </Text>
        </LinearGradient>
      );
    }

    return (
      <Image
        source={{ uri }}
        style={style}
        onError={() => setImageError(true)}
      />
    );
  };

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scrollViewContent} showsVerticalScrollIndicator={false}>
        {/* Header - Back arrow always on left */}
        <View style={[styles.header, isRTL && styles.headerAr]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isRTL && styles.headerTitleAr]}>
            {isRTL ? 'تعديل الملف الشخصي' : 'Edit Profile'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Profile Photo */}
        <View style={styles.photoContainer}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => setAvatarModalVisible(true)}
            activeOpacity={0.8}
          >
            {image ? (
              <SafeImage
                uri={image.startsWith("http") || image.startsWith("file://")
                  ? image
                  : `https://haba-haba-api.ubua.cloud/uploads/profileImages/${image}`
                }
                style={styles.profileImage}
              />
            ) : (
              <LinearGradient
                colors={['#f88250', '#f15d81']}
                style={styles.avatar}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.avatarText}>
                  {client?.name
                    ? `${client.name.split(' ')[0]?.[0] || ''}${client.name.split(' ')[1]?.[0] || ''}`
                    : ''}
                </Text>
              </LinearGradient>
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.photoText, isRTL && styles.photoTextAr]}>
            {isRTL ? 'انقر لتغيير الصورة' : 'Tap to change photo'}
          </Text>
        </View>

        <Modal
          visible={avatarModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAvatarModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={[styles.modalHeader, isRTL && styles.modalHeaderAr]}>
                <Text style={[styles.modalTitle, isRTL && styles.modalTitleAr]}>
                  {isRTL ? 'تغيير صورة الملف الشخصي' : 'Change Profile Photo'}
                </Text>
                <TouchableOpacity onPress={() => setAvatarModalVisible(false)}>
                  <Ionicons name="close" size={24} color={Colors.text.primary} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalOptions}>
                <TouchableOpacity
                  style={[styles.modalOption, isRTL && styles.modalOptionAr]}
                  onPress={() => pickImage('camera')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.modalOptionIcon, { backgroundColor: Colors.primary + '20' }]}>
                    <Ionicons name="camera" size={28} color={Colors.primary} />
                  </View>
                  <Text style={[styles.modalOptionText, isRTL && styles.modalOptionTextAr]}>
                    {isRTL ? 'التقاط صورة' : 'Take Photo'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalOption, isRTL && styles.modalOptionAr]}
                  onPress={() => pickImage('library')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.modalOptionIcon, { backgroundColor: Colors.success + '20' }]}>
                    <Ionicons name="images" size={28} color={Colors.success} />
                  </View>
                  <Text style={[styles.modalOptionText, isRTL && styles.modalOptionTextAr]}>
                    {isRTL ? 'اختر من المكتبة' : 'Choose from Library'}
                  </Text>
                </TouchableOpacity>
                {image && (
                  <TouchableOpacity
                    style={[styles.modalOption, isRTL && styles.modalOptionAr]}
                    onPress={removeImage}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.modalOptionIcon, { backgroundColor: Colors.error + '20' }]}>
                      <Ionicons name="trash-outline" size={28} color={Colors.error} />
                    </View>
                    <Text style={[styles.modalOptionText, { color: Colors.error }, isRTL && styles.modalOptionTextAr]}>
                      {isRTL ? 'إزالة الصورة' : 'Remove Photo'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.sectionTitleAr]}>
            {isRTL ? 'المعلومات الشخصية' : 'Personal Information'}
          </Text>

          {/* First & Last Name */}
          <View style={[styles.row, isRTL && styles.rowAr]}>
            <View style={styles.halfWidth}>
              <Text style={[styles.label, isRTL && styles.labelAr]}>
                {isRTL ? 'الاسم الأول' : 'First Name'}
              </Text>
              <TextInput
                style={[styles.input, isRTL && styles.inputAr]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder={isRTL ? 'الاسم الأول' : 'First Name'}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
            <View style={styles.halfWidth}>
              <Text style={[styles.label, isRTL && styles.labelAr]}>
                {isRTL ? 'اسم العائلة' : 'Last Name'}
              </Text>
              <TextInput
                style={[styles.input, isRTL && styles.inputAr]}
                value={lastName}
                onChangeText={setLastName}
                placeholder={isRTL ? 'اسم العائلة' : 'Last Name'}
                textAlign={isRTL ? 'right' : 'left'}
              />
            </View>
          </View>

          {/* Email - with extra margin top */}
          <View style={[styles.fieldContainer, styles.emailFieldContainer]}>
            <Text style={[styles.label, isRTL && styles.labelAr]}>
              {isRTL ? 'البريد الإلكتروني' : 'Email'}
            </Text>
            <TextInput
              style={[styles.input, isRTL && styles.inputAr]}
              value={email}
              onChangeText={setEmail}
              placeholder={isRTL ? 'البريد الإلكتروني' : 'Email'}
              keyboardType="email-address"
              autoCapitalize="none"
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>

          {/* Phone */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, isRTL && styles.labelAr]}>
              {isRTL ? 'رقم الهاتف' : 'Phone Number'}
            </Text>
            <TextInput
              style={[styles.input, isRTL && styles.inputAr]}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder={isRTL ? 'رقم الهاتف' : 'Phone Number'}
              keyboardType="phone-pad"
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>

          {/* Birth Date */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, isRTL && styles.labelAr]}>
              {isRTL ? 'تاريخ الميلاد' : 'Date of Birth'}
            </Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[isRTL && styles.dateTextAr, { color: dateOfBirth ? '#000' : '#999' }]}>
                {dateOfBirth ? dateOfBirth.split('T')[0] : (isRTL ? 'اختر التاريخ' : 'Select Date')}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={dateOfBirth ? new Date(dateOfBirth) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}
          </View>

          {/* Gender - arrow always faces down */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, isRTL && styles.labelAr]}>
              {isRTL ? 'الجنس' : 'Gender'}
            </Text>
            <TouchableOpacity
              style={userLanguage === 'english' ? styles.dropdownContainer : styles.dropdownContainerAr}
              onPress={() => setShowGenderDropdown(!showGenderDropdown)}
            >
              <Text style={[styles.dropdownText, isRTL && styles.dropdownTextAr]}>
                {gender || (isRTL ? 'اختر الجنس' : 'Select Gender')}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
            {showGenderDropdown && (
              <View style={styles.dropdownOptions}>
                {(isRTL ? ['ذكر', 'أنثى', 'آخر'] : ['Male', 'Female', 'Other']).map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.dropdownOption}
                    onPress={() => {
                      setGender(option);
                      setShowGenderDropdown(false);
                    }}
                  >
                    <Text style={[styles.dropdownOptionText, isRTL && styles.dropdownOptionTextAr]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Bio */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, isRTL && styles.labelAr]}>
              {isRTL ? 'نبذة عنك' : 'Bio'}
            </Text>
            <TextInput
              style={[styles.bioInput, isRTL && styles.bioInputAr]}
              value={bio}
              onChangeText={setBio}
              placeholder={isRTL ? 'نبذة عنك' : 'Bio'}
              multiline
              maxLength={bioMaxChars}
              textAlign={isRTL ? 'right' : 'left'}
            />
            <Text style={[styles.charCount, isRTL && styles.charCountAr]}>
              {bioCharCount}/{bioMaxChars} {isRTL ? 'حرف' : 'characters'}
            </Text>
          </View>

          {/* Address */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, isRTL && styles.labelAr]}>
              {isRTL ? 'العنوان' : 'Address'}
            </Text>
            <TextInput
              style={[styles.input, isRTL && styles.inputAr]}
              value={adresses}
              onChangeText={setAdresses}
              placeholder={isRTL ? 'أدخل عنوانك' : 'Enter your address'}
              textAlign={isRTL ? 'right' : 'left'}
            />

            <TouchableOpacity
              style={styles.setLocationButton}
              onPress={handleSetLocation}
              disabled={fetchingLocation}
            >
              {fetchingLocation ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="location" size={18} color="#fff" style={{ marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }} />
                  <Text style={styles.setLocationButtonText}>
                    {isRTL ? 'تعيين الموقع تلقائياً' : 'Set Location Automatically'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isRTL ? 'حفظ التغييرات' : 'Save changes'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

// Your existing styles remain exactly the same
const styles = StyleSheet.create({
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  setLocationButton: {
    marginTop: 8,
    backgroundColor: '#FF8C00',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  setLocationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: 24,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalHeaderAr: {
    flexDirection: 'row-reverse',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  modalTitleAr: {
    textAlign: 'right',
  },
  modalOptions: {
    gap: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalOptionAr: {
    flexDirection: 'row-reverse',
  },
  modalOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  modalOptionTextAr: {
    textAlign: 'right',
  },
  safeArea: { flex: 1, backgroundColor: '#fff' },
  scrollViewContent: { flexGrow: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 16,
  },
  headerAr: {
    flexDirection: 'row',
  },
  backButton: { width: 40 },
  backArrow: { fontSize: 24, color: '#000' },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  headerTitleAr: { 
    textAlign: 'center',
  },
  placeholder: { width: 40 },
  photoContainer: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#F8F8F8' },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
  },
  avatarText: { fontSize: 28, fontWeight: '600', color: '#fff' },
  photoText: { fontSize: 14, color: '#666' },
  photoTextAr: { textAlign: 'right' },
  section: { paddingHorizontal: 24, paddingTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 16 },
  sectionTitleAr: { textAlign: 'right' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowAr: { flexDirection: 'row-reverse' },
  halfWidth: { flex: 1 },
  fieldContainer: { marginBottom: 16 },
  emailFieldContainer: {
    marginTop: 16, // Added extra spacing for email field
  },
  label: { fontSize: 14, fontWeight: '500', color: '#000', marginBottom: 8 },
  labelAr: { textAlign: 'right' },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  inputAr: {
    textAlign: 'right',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  dateTextAr: {
    textAlign: 'right',
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  dropdownContainerAr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  dropdownText: { fontSize: 14, color: '#000' },
  dropdownTextAr: { textAlign: 'right' },
  dropdownArrow: { fontSize: 12, color: '#666' },
  dropdownOptions: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  dropdownOptionText: { fontSize: 14, color: '#000' },
  dropdownOptionTextAr: { textAlign: 'right' },
  bioInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  bioInputAr: {
    textAlign: 'right',
  },
  charCount: { fontSize: 12, color: '#999', marginTop: 4 },
  charCountAr: { textAlign: 'right' },
  saveButton: {
    backgroundColor: '#FF8C00',
    marginHorizontal: 24,
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});

export default EditProfile;