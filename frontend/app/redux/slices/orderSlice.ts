import { createSlice, PayloadAction } from "@reduxjs/toolkit";

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

export interface OrderItem {
  id: number;
  name: string;
  description: string;
  price: number;
  quantity: number;
  image: string;
  restaurant: string;
  discount_applied?: boolean;
  original_price?: number;
  offer_info?: {
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
  } | null;
  specialInstructions?: string;
  showSpecialInstructions?: boolean;
}

interface OrderState {
  items: OrderItem[];
  total: number;
}

const initialState: OrderState = {
  items: [],
  total: 0,
};

const calculateTotal = (items: OrderItem[]): number =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0);

const orderSlice = createSlice({
  name: "order",
  initialState,
  reducers: {
    addItem: (state, action: PayloadAction<OrderItem>) => {
      const { 
        id, 
        name, 
        description, 
        price, 
        quantity, 
        image, 
        restaurant, 
        discount_applied, 
        original_price, 
        offer_info,
        specialInstructions, // ✅ ADD THIS
        showSpecialInstructions // ✅ ADD THIS
      } = action.payload;
      
      const existingItem = state.items.find(item => item.id === id);
      
      if (existingItem) {
        existingItem.quantity += quantity;
        // ✅ Also update special instructions when updating existing item
        if (specialInstructions) {
          existingItem.specialInstructions = specialInstructions;
        }
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
          offer_info,
          specialInstructions: specialInstructions || '', // ✅ ADD THIS
          showSpecialInstructions: showSpecialInstructions || false // ✅ ADD THIS
        });
      }
      state.total = calculateTotal(state.items);
    },

    removeItem: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
      state.total = calculateTotal(state.items);
    },

    clearOrder: (state) => {
      state.items = [];
      state.total = 0;
    },

    updateItemQuantity: (
      state,
      action: PayloadAction<{ id: number; quantity: number }>
    ) => {
      const item = state.items.find((i) => i.id === action.payload.id);
      if (item) {
        item.quantity = action.payload.quantity;
      }
      state.total = calculateTotal(state.items);
    },

    toggleSpecialInstructions: (state, action: PayloadAction<number>) => {
      const item = state.items.find(item => item.id === action.payload);
      if (item) {
        item.showSpecialInstructions = !item.showSpecialInstructions;
      }
    },

    updateSpecialInstructions: (state, action: PayloadAction<{id: number, instructions: string}>) => {
      const item = state.items.find(item => item.id === action.payload.id);
      if (item) {
        item.specialInstructions = action.payload.instructions;
      }
    },
    setCartFromStorage: (state, action: PayloadAction<OrderItem[]>) => {
    state.items = action.payload;
    state.total = calculateTotal(action.payload);
},
  },
});

export const { 
  addItem, 
  removeItem, 
  clearOrder, 
  updateItemQuantity,
  toggleSpecialInstructions,
  updateSpecialInstructions ,
  setCartFromStorage
} = orderSlice.actions;

export default orderSlice.reducer;