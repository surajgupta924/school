import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'xyz.auth';

function readStoredAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.accessToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(state) {
  try {
    if (!state.accessToken) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        schoolName: state.schoolName,
      })
    );
  } catch {
    /* storage unavailable (private mode) — session stays in memory */
  }
}

const stored = readStoredAuth();

const initialState = {
  accessToken: stored?.accessToken || null,
  refreshToken: stored?.refreshToken || null,
  user: stored?.user || null,
  schoolName: stored?.schoolName || 'XYZ Convent School',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, { payload }) {
      state.accessToken = payload.accessToken || payload.token || state.accessToken;
      state.refreshToken = payload.refreshToken ?? state.refreshToken;
      if (payload.user) state.user = payload.user;
      if (payload.schoolName) state.schoolName = payload.schoolName;
      persist(state);
    },
    setTokens(state, { payload }) {
      state.accessToken = payload.accessToken || payload.token || null;
      if (payload.refreshToken) state.refreshToken = payload.refreshToken;
      if (payload.user) state.user = payload.user;
      persist(state);
    },
    setUser(state, { payload }) {
      state.user = payload;
      persist(state);
    },
    logout(state) {
      state.accessToken = null;
      state.refreshToken = null;
      state.user = null;
      persist(state);
    },
  },
});

export const { setCredentials, setTokens, setUser, logout } = authSlice.actions;

export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectRole = (state) => state.auth.user?.role || null;
export const selectAccessToken = (state) => state.auth.accessToken;
export const selectIsAuthenticated = (state) => Boolean(state.auth.accessToken);
export const selectSchoolName = (state) => state.auth.schoolName;

export default authSlice.reducer;
