// types.ts
export type RootStackParamList = {
  Home: undefined;
  ProductDetails: { productId: number };
  AllProducts: undefined;
};

export type BottomTabParamList = {
  HomeStack: undefined;  // This will be a nested stack navigator
  Orders: undefined;
  Cart: undefined;
  Updates: undefined;
  Profile: undefined;
};