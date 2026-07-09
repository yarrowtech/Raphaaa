import { API_BASE_URL } from '@env';

const fallbackBaseUrl = 'http://10.0.2.2:9000';
export const BASE_URL = API_BASE_URL || fallbackBaseUrl;

async function request(path, options = {}) {
  let response;
  try {
    console.log(`[API] ${options.method || 'GET'} ${BASE_URL}${path}`);
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    console.log(`[API] Response Status: ${response.status}`);
  } catch (error) {
    console.error(`[API ERROR] Network Error: ${error.message}`);
    throw new Error('Unable to reach the server. Please check your connection.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error(`[API ERROR] ${response.status}: ${data?.message || 'Unknown error'}`);
    throw new Error(data?.message || 'Something went wrong. Please try again.');
  }

  console.log(`[API] Success: ${path}`);
  return data;
}

export function checkEmail(email) {
  return request('/api/users/check-email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function loginUser(email, password) {
  return request('/api/users/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function getHomeBanners() {
  return request('/api/hero-slides', {
    method: 'GET',
  });
}

export function getProducts(limit = 50) {
  return request(`/api/products?limit=${limit}`, {
    method: 'GET',
  });
}

export function getProductsByFilter({ category, gender, limit = 1, sortBy, search } = {}) {
  const query = new URLSearchParams();
  if (category) query.set('category', category);
  if (gender) query.set('gender', gender);
  if (sortBy) query.set('sortBy', sortBy);
  if (search) query.set('search', search);
  query.set('limit', limit);
  return request(`/api/products?${query.toString()}`, {
    method: 'GET',
  });
}

export function getProductFacets({ category, gender } = {}) {
  const query = new URLSearchParams();
  if (category) query.set('category', category);
  if (gender) query.set('gender', gender);
  return request(`/api/products/facets?${query.toString()}`, {
    method: 'GET',
  });
}

export function getBestSellers() {
  return request('/api/products/best-seller', {
    method: 'GET',
  });
}

export function getProductById(productId) {
  return request(`/api/products/${productId}`, {
    method: 'GET',
  });
}

export function getNewArrivals() {
  return request('/api/products/new-arrivals', {
    method: 'GET',
  });
}

export default {
  BASE_URL,
  checkEmail,
  loginUser,
  getHomeBanners,
  getProducts,
  getProductsByFilter,
  getProductFacets,
  getBestSellers,
  getProductById,
  getNewArrivals,
};
