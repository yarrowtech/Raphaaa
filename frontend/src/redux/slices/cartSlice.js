import { safeStorage, readStoredJson, validCart } from "../../utils/safeStorage";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// // Helper function to get cart from localStorage
const loadCartFromStorage = () => readStoredJson('cart', validCart, { products: [] });

// Helper function to save cart to localStorage
const saveCartToStorage = (cart) => {
  safeStorage.setItem("cart", JSON.stringify(cart));
};

const applyLocalCartUpdate = (updater) => {
  const current = loadCartFromStorage();
  const next = updater(current || { products: [] });
  saveCartToStorage(next);
  return next;
};

// Fetch cart for a user or guest
export const fetchCart = createAsyncThunk(
  "cart/fetchCart",
  async ({ userId, guestId }, { rejectWithValue }) => {
    try {
      const token = safeStorage.getItem("userToken");
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/cart`,
        {
          params: { userId, guestId },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      return response.data;
    } catch (error) {
      if (error?.response?.status === 404) {
        return { products: [], totalPrice: 0 };
      }
      console.error("Error fetching cart:", error);
      return rejectWithValue({
        status: error?.response?.status,
        message: error?.response?.data?.message || "Failed to fetch cart",
      });
    }
  }
);

// Add an item to the cart for a user or guest
export const addToCart = createAsyncThunk(
  "cart/addToCart",
  async (
    { productId, quantity, size, color, sku, userId, guestId },
    { rejectWithValue }
  ) => {
    try {
      const token = safeStorage.getItem("userToken");
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/cart`,
        { 
          productId, 
          quantity, 
          size, 
          color, 
          sku,
          guestId, 
          userId 
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

// Update the quantity of an item in the cart
export const updateCartItemQuantity = createAsyncThunk(
  "cart/updateCartItemQuantity", async ({ productId, quantity, guestId, userId, size, color },
    { rejectWithValue }) => {
    try {
      const token = safeStorage.getItem("userToken");
      const response = await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/api/cart`,
        {
          productId,
          quantity,
          guestId,
          userId,
          size,
          color,
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      return response.data;
    } catch (error) {
      const token = safeStorage.getItem("userToken");
      const isGuestFallback = !token && error?.response?.status === 404;
      if (isGuestFallback) {
        const next = applyLocalCartUpdate((cart) => {
          const products = Array.isArray(cart?.products) ? [...cart.products] : [];
          const idx = products.findIndex(
            (p) =>
              String(p.productId) === String(productId) &&
              String(p.size || "") === String(size || "") &&
              String(p.color || "") === String(color || "")
          );
          if (idx === -1) return cart || { products: [] };
          if (quantity > 0) products[idx] = { ...products[idx], quantity };
          else products.splice(idx, 1);
          const totalPrice = products.reduce((acc, p) => acc + Number(p.price || 0) * Number(p.quantity || 0), 0);
          return { ...(cart || {}), products, totalPrice };
        });
        return next;
      }
      return rejectWithValue(error.response.data);
    }
  }
);

// Remove an item from the cart
export const removeFromCart = createAsyncThunk(
  "cart/removeFromCart",
  async ({ productId, guestId, userId, size, color }, { rejectWithValue }) => {
    try {
      const token = safeStorage.getItem("userToken");
      const response = await axios({
        method: "DELETE",
        url: `${import.meta.env.VITE_BACKEND_URL}/api/cart`,
        data: { productId, guestId, userId, size, color },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return response.data;
    } catch (error) {
      const token = safeStorage.getItem("userToken");
      const isGuestFallback = !token && error?.response?.status === 404;
      if (isGuestFallback) {
        const next = applyLocalCartUpdate((cart) => {
          const products = (cart?.products || []).filter(
            (p) =>
              !(
                String(p.productId) === String(productId) &&
                String(p.size || "") === String(size || "") &&
                String(p.color || "") === String(color || "")
              )
          );
          const totalPrice = products.reduce((acc, p) => acc + Number(p.price || 0) * Number(p.quantity || 0), 0);
          return { ...(cart || {}), products, totalPrice };
        });
        return next;
      }
      return rejectWithValue(error.response.data);
    }
  }
);




// Merge guest cart into user cart
export const mergecart = createAsyncThunk(
  "cart/mergeCart",
  async ({ guestId, user }, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/cart/merge`,
        { guestId, user },
        {
            headers: {
                Authorization: `Bearer ${safeStorage.getItem("userToken")}`,
            },
        }
      );
      return response.data;
    } catch (error) {
        return rejectWithValue(error.response.data);
    }
  }
);

const cartSlice = createSlice({
    name: "cart",
    initialState: {
        cart: loadCartFromStorage(),
        loading: false,
        error: null,
    },
    reducers: {
        clearCart: (state) => {
            state.cart = { products: [] };
            safeStorage.removeItem("cart");
        },
    },
    extraReducers: (builder) => {
        builder
        .addCase(fetchCart.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(fetchCart.fulfilled, (state, action) => {
            state.loading = false;
            state.cart = action.payload;
            saveCartToStorage(action.payload);
        })
        .addCase(fetchCart.rejected, (state, action) => {
            state.loading = false;
            const status = action.payload?.status;
            const message = action.payload?.message;

            if (status === 404 || message === "cart not found") {
              state.cart = { products: [], totalPrice: 0 };
              saveCartToStorage(state.cart);
              state.error = null;
              return;
            }

            state.error = message || action.error.message || "Failed to fetch cart";
        })
        .addCase(addToCart.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(addToCart.fulfilled, (state, action) => {
            state.loading = false;
            state.cart = action.payload;
            saveCartToStorage(action.payload);
        })
        .addCase(addToCart.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload?.message || "Failed to add to cart";
        })
        .addCase(updateCartItemQuantity.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(updateCartItemQuantity.fulfilled, (state, action) => {
            state.loading = false;
            state.cart = action.payload;
            saveCartToStorage(action.payload);
        })
        .addCase(updateCartItemQuantity.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload?.message || "Failed to update Item quantity";
        })
        .addCase(removeFromCart.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(removeFromCart.fulfilled, (state, action) => {
            state.loading = false;
            state.cart = action.payload;
            saveCartToStorage(action.payload);
        })
        .addCase(removeFromCart.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload?.message || "Failed to remove item";
        })
        .addCase(mergecart.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(mergecart.fulfilled, (state, action) => {
            state.loading = false;
            state.cart = action.payload;
            saveCartToStorage(action.payload);
        })
        .addCase(mergecart.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload?.message || "Failed to merge cart";
        })
        
    }
});

export const { clearCart } = cartSlice.actions;
export default cartSlice.reducer;
