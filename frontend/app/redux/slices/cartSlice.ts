import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Product {
  id: number;
  name: string;
  price: number;
  image?: string;
}

interface OfferInfo {
  offer_id: number;
  offer_name: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  original_price: number;
  can_use_offer: boolean;
  times_used: number;
  max_uses: number | null;
  remaining_uses: number | null;
  user_has_used?: boolean;
  user_usage_count?: number;
  valid_until: string;
  description?: string;
}

interface CartItem {
  id: number;
  name: string;
  description: string;
  price: number;
  quantity: number;
  image: string;
  restaurant: string;
  discount_applied?: boolean;
  original_price?: number;
  offer_info?: OfferInfo | null;
}

interface CartState {
  items: CartItem[];
  total: number;
}

const initialState: CartState = {
  items: [],
  total: 0,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<CartItem>) => {
      const { id, name, description, price, quantity, image, restaurant, discount_applied, original_price, offer_info } = action.payload;
      
      const existingItem = state.items.find(item => item.id === id);
      
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        state.items.push({
          id,
          name,
          description,
          price,
          quantity,
          image,
          restaurant,
          discount_applied,
          original_price,
          offer_info
        });
      }
      
      // Update total
      state.total = state.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    },
    removeFromCart: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
      state.total = state.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    },
    clearCart: (state) => {
      state.items = [];
      state.total = 0;
    },
    updateQuantity: (state, action: PayloadAction<{ id: number; quantity: number }>) => {
      const { id, quantity } = action.payload;
      const existingItem = state.items.find(item => item.id === id);
      
      if (existingItem) {
        existingItem.quantity = quantity;
        state.total = state.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      }
    },
  },
});

// Export addItem (not addToCart) since that's what your reducer is called
export const { addItem, removeFromCart, clearCart, updateQuantity } = cartSlice.actions;
export default cartSlice.reducer;