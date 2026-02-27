import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

// Define interfaces for our data
export interface Category {
  id: number;
  name: string;
  image?: string;
  description?: string;
  price?: number;
}

export interface OfferInfo {
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

export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  final_price?: number;
  rating?: number;
  image?: string;
  category_name?: string;
  delivery?: string;
  promo: boolean;
  promoValue: number;
  badge?: string;
  is_popular?: boolean;
  has_offer?: boolean;
  discount_applied?: boolean;
  offer_info?: OfferInfo | null;
  best_for?: 'breakfast' | 'lunch' | 'dinner' | 'snacks'; // Add this
}

// Define the state interface
interface HomeState {
  categories: Category[];
  products: Product[];
  offers: OfferInfo[];
  restaurant_name: string;
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: HomeState = {
  categories: [],
  products: [],
  offers: [],
  restaurant_name: '',
  loading: false,
  error: null,
};

// Create async thunk for fetching home page data
export const fetchHomePageData = createAsyncThunk(
  'home/fetchHomePageData',
  async (_, { rejectWithValue }) => {
    try {
      const API_URL = 'https://haba-haba-api.ubua.cloud/api/auth/home-page-data';

      // Read AsyncStorage items
      const [token, clientData] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('client'),
      ]);

      let userIdValue: number | null = null;
      if (clientData) {
        try {
          const client = JSON.parse(clientData);
          userIdValue = client.id;
        } catch (parseError) {
          console.error('Error parsing client data:', parseError);
        }
      }

      // Build request configuration
      const config: any = {
        params: {},
        headers: {
          'Content-Type': 'application/json',  // ADD THIS
          'Accept': 'application/json',        // ADD THIS
          'User-Agent': 'MobileApp/1.0',       // ADD THIS
        }
      };

      if (userIdValue) {
        config.params.userId = userIdValue;
      }

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Execute API call
      const response = await axios.get(API_URL, config);
      if (response.data.success) {
        return {
          categories: response.data.categories || [],
          products: response.data.products || [],
          offers: response.data.offers || [],
          restaurant_name: response.data.restaurant_name || 'Restaurant',
        };
      } else {
        return rejectWithValue('Backend reported fetch failure');
      }
    } catch (error: any) {
      console.error('Failed to fetch home page data:', error);
      return rejectWithValue(error.message || 'Failed to fetch data');
    }
  }
);

// Create slice
const homeSlice = createSlice({
  name: 'home',
  initialState,
  reducers: {
    // You can add synchronous reducers here if needed
    clearHomeData: (state) => {
      state.categories = [];
      state.products = [];
      state.offers = [];
      state.restaurant_name = '';
    },
    updateProducts: (state, action: PayloadAction<Product[]>) => {
      state.products = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHomePageData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHomePageData.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload.categories;
        state.products = action.payload.products;
        state.offers = action.payload.offers;
        state.restaurant_name = action.payload.restaurant_name;
      })
      .addCase(fetchHomePageData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions and reducer
export const { clearHomeData, updateProducts } = homeSlice.actions;
export default homeSlice.reducer;