// redux/slices/languageSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type Language = 'english' | 'arabic' | 'french';

interface LanguageState {
  current: Language;
}

const initialState: LanguageState = {
  current: 'english',
};

const languageSlice = createSlice({
  name: 'language',
  initialState,
  reducers: {
    setLanguage(state, action: PayloadAction<Language>) {
      state.current = action.payload;
    },
  },
});

export const { setLanguage } = languageSlice.actions;
export default languageSlice.reducer;