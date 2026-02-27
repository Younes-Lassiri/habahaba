import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  user: any | null;
  token: string | null;
  loading: boolean;
}

const initialState: UserState = {
  user: null,
  token: null,
  loading: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<{ user: any; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    logoutUser: (state) => {
      state.user = null;
      state.token = null;
    },
  },
});

export const { setUser, logoutUser } = userSlice.actions;
export default userSlice.reducer;
