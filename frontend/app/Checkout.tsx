import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import { useDispatch } from 'react-redux';
import { removeItem as removeItemFromOrder } from './redux/slices/orderSlice';

import Colors from '@/constants/Colors';

interface OrderDetails {
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  address: string;
  promoCode?: string;
}

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState<any>(null);

  // Card details state
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  // Parse order details from params
  const orderDetails: OrderDetails = params.orderDetails
    ? JSON.parse(params.orderDetails as string)
    : null;

  useEffect(() => {
    fetchClientData();
  }, []);

  const fetchClientData = async () => {
    try {
      const clientData = await AsyncStorage.getItem('client');
      if (clientData) {
        const parsed = JSON.parse(clientData);
        setClient(parsed);
        if (parsed.name) {
          setCardHolder(parsed.name);
        }
      }
    } catch (error) {
      console.error('Error fetching client data:', error);
    }
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.slice(0, 19); // Max 16 digits + 3 spaces
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const validateCard = (): boolean => {
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
      Alert.alert('Invalid Card', 'Please enter a valid 16-digit card number.');
      return false;
    }
    if (!cardHolder || cardHolder.length < 3) {
      Alert.alert('Invalid Card Holder', 'Please enter the cardholder name.');
      return false;
    }
    if (!expiryDate || expiryDate.length < 5) {
      Alert.alert('Invalid Expiry', 'Please enter a valid expiry date (MM/YY).');
      return false;
    }
    if (!cvv || cvv.length < 3) {
      Alert.alert('Invalid CVV', 'Please enter a valid CVV.');
      return false;
    }
    return true;
  };

  const handlePayment = async () => {
    if (!validateCard()) return;

    if (!client || !client.id) {
      Alert.alert('Error', 'User not found. Please log in again.');
      return;
    }

    if (!orderDetails) {
      Alert.alert('Error', 'Order details not found.');
      return;
    }

    try {
      setLoading(true);

      // Simulate payment processing
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 2000));

      // Create order payload
      const payload = {
        user_id: client.id,
        items: orderDetails.items.map((item) => ({
          product_id: item.id,
          price: item.price,
          quantity: item.quantity,
        })),
        delivery_address: orderDetails.address || client.adresses || 1,
        total_price: orderDetails.subtotal,
        delivery_fee: orderDetails.deliveryFee,
        discount: orderDetails.discount,
        final_price: orderDetails.total,
        paymentMethod: 'card',
      };

      const res = await axios.post('https://haba-haba-api.ubua.cloud/api/auth/place-order', payload);

      Toast.show({
        type: 'success',
        text1: 'Payment Successful!',
        text2: `Order #${res.data.order_number} has been placed.`,
        position: 'top',
      });

      // Store order ID for thank you modal
      await AsyncStorage.setItem('newOrderId', JSON.stringify({
        orderId: res.data.order_id,
        orderNumber: res.data.order_number,
      }));

      // Clear cart items
      orderDetails.items.forEach((item) => {
        dispatch(removeItemFromOrder(item.id));
      });

      // Redirect to home
      setTimeout(() => {
        router.replace('/');
      }, 2000);
    } catch (err: any) {
      console.error('Payment error:', err);
      Alert.alert(
        'Payment Failed',
        err.response?.data?.message || 'Could not process payment. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!orderDetails) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={Colors.error} />
          <Text style={styles.errorText}>Order details not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back to Cart</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Toast />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          {orderDetails.items.map((item, index) => (
            <View key={index} style={styles.summaryItem}>
              <Text style={styles.summaryItemText}>
                {item.quantity}x {item.name}
              </Text>
              <Text style={styles.summaryItemPrice}>
                {(item.price * item.quantity).toFixed(2)} MAD
              </Text>
            </View>
          ))}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{orderDetails.subtotal.toFixed(2)} MAD</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>{orderDetails.deliveryFee.toFixed(2)} MAD</Text>
          </View>
          {orderDetails.discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: Colors.success }]}>
                Discount
              </Text>
              <Text style={[styles.summaryValue, { color: Colors.success }]}>
                -{orderDetails.discount.toFixed(2)} MAD
              </Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{orderDetails.total.toFixed(2)} MAD</Text>
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles.addressCard}>
          <View style={styles.addressHeader}>
            <Ionicons name="location" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Delivery Address</Text>
          </View>
          <Text style={styles.addressText}>{orderDetails.address}</Text>
        </View>

        {/* Payment Method */}
        <View style={styles.paymentCard}>
          <View style={styles.paymentHeader}>
            <Ionicons name="card" size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Card Payment</Text>
          </View>

          {/* Card Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Card Number</Text>
            <View style={styles.cardInputContainer}>
              <TextInput
                style={styles.cardInput}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor={Colors.text.secondary}
                value={cardNumber}
                onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                keyboardType="numeric"
                maxLength={19}
              />
              <Ionicons name="card-outline" size={20} color={Colors.text.secondary} />
            </View>
          </View>

          {/* Card Holder */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Card Holder Name</Text>
            <TextInput
              style={styles.input}
              placeholder="John Doe"
              placeholderTextColor={Colors.text.secondary}
              value={cardHolder}
              onChangeText={setCardHolder}
              autoCapitalize="words"
            />
          </View>

          {/* Expiry and CVV */}
          <View style={styles.rowInputs}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
              <Text style={styles.inputLabel}>Expiry Date</Text>
              <TextInput
                style={styles.input}
                placeholder="MM/YY"
                placeholderTextColor={Colors.text.secondary}
                value={expiryDate}
                onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>CVV</Text>
              <TextInput
                style={styles.input}
                placeholder="123"
                placeholderTextColor={Colors.text.secondary}
                value={cvv}
                onChangeText={(text) => setCvv(text.replace(/\D/g, '').slice(0, 4))}
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
              />
            </View>
          </View>

          {/* Security Note */}
          <View style={styles.securityNote}>
            <Ionicons name="lock-closed" size={16} color={Colors.success} />
            <Text style={styles.securityText}>
              Your payment information is secure and encrypted
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Payment Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payButton, loading && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.payButtonText}>
                Pay {orderDetails.total.toFixed(2)} MAD
              </Text>
              <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryItemText: {
    fontSize: 14,
    color: Colors.text.primary,
    flex: 1,
  },
  summaryItemPrice: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text.primary,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text.primary,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  addressText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.gray[50],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[50],
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  cardInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text.primary,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 12,
    backgroundColor: Colors.success + '15',
    borderRadius: 8,
  },
  securityText: {
    fontSize: 12,
    color: Colors.success,
    flex: 1,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  payButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

