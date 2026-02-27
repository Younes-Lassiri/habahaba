cat > api.js << 'EOF'
const trimTrailingSlash = (url = '') => url.replace(/\/+$/, '');

const getBackendBaseUrl = () => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return trimTrailingSlash(import.meta.env.VITE_BACKEND_URL);
  }
  if (import.meta.env.VITE_API_URL) {
    return trimTrailingSlash(import.meta.env.VITE_API_URL);
  }
  return 'https://haba-haba-api.ubua.cloud';
};

export const BACKEND_BASE_URL = getBackendBaseUrl();
export const ADMIN_API_BASE_URL = `${BACKEND_BASE_URL}/api/admin`;

export const buildApiUrl = (endpoint = '') => {
  const normalized = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${BACKEND_BASE_URL}${normalized}`;
};

export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  return `${BACKEND_BASE_URL}/${imagePath.replace(/^\/+/, '')}`;
};
EOF