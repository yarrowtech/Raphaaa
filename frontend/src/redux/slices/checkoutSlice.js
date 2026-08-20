// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import axios from "axios";

// // Async thunk to create a checkout session
// export const createCheckout = createAsyncThunk(
//   "checkout/createCheckout",
//   async (checkoutData, { rejectWithValue }) => {
//     try {
//       const response = await axios.post(
//         `${import.meta.env.VITE_BACKEND_URL}/api/checkout`,
//         checkoutData,
//         {
//           headers: {
//             Authorization: `Bearer ${localStorage.getItem(userToken)}`,
//           },
//         }
//       );
//       return response.data;
//     } catch (error) {
//       return rejectWithValue(error.response.data);
//     }
//   }
// );

// const checkoutSlice = createSlice({
//     name: "checkout",
//     initialState: {
//         checkout: null,
//         loading: false,
//         error: null,
//     },
//     reducers: {},
//     extraReducers: (builder) => {
//         builder
//         .addCase(createCheckout.pending, (state) => {
//             state.loading = true;
//             state.error = null;
//         })
//         .addCase(createCheckout.fulfilled, (state, action) => {
//             state.loading = false;
//             state.checkout = action.payload;
//         })
//         .addCase(createCheckout.rejected, (state, action) => {
//             state.loading = false;
//             state.error = action.payload.message;
//         })
//     }
// })

// export default checkoutSlice.reducer;

// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import axios from "axios";

// // Async thunk to create a checkout session
// export const createCheckout = createAsyncThunk(
//   "checkout/createCheckout",
//   async (checkoutData, { rejectWithValue }) => {
//     try {
//       const response = await axios.post(
//         `${import.meta.env.VITE_BACKEND_URL}/api/checkout`,
//         checkoutData,
//         {
//           headers: {
//             Authorization: `Bearer ${localStorage.getItem("userToken")}`,
//           },
//         }
//       );
//       return response.data;
//     } catch (error) {
//       return rejectWithValue(error.response.data);
//     }
//   }
// );

// // Async thunk to directly create order for Cash on Delivery
// export const createCODOrder = createAsyncThunk(
//   "checkout/createCODOrder",
//   async (orderData, { rejectWithValue }) => {
//     try {
//       const response = await axios.post(
//         `${import.meta.env.VITE_BACKEND_URL}/api/orders/cod`,
//         orderData,
//         {
//           headers: {
//             Authorization: `Bearer ${localStorage.getItem("userToken")}`,
//           },
//         }
//       );
//       return response.data;
//     } catch (error) {
//       return rejectWithValue(error.response.data);
//     }
//   }
// );

// // Async thunk to update payment status
// export const updatePaymentStatus = createAsyncThunk(
//   "checkout/updatePaymentStatus",
//   async ({ checkoutId, paymentData }, { rejectWithValue }) => {
//     try {
//       const response = await axios.put(
//         `${import.meta.env.VITE_BACKEND_URL}/api/checkout/${checkoutId}/pay`,
//         paymentData,
//         {
//           headers: {
//             Authorization: `Bearer ${localStorage.getItem("userToken")}`,
//           },
//         }
//       );
//       return response.data;
//     } catch (error) {
//       return rejectWithValue(error.response.data);
//     }
//   }
// );

// // Async thunk to finalize checkout
// export const finalizeCheckout = createAsyncThunk(
//   "checkout/finalizeCheckout",
//   async (checkoutId, { rejectWithValue }) => {
//     try {
//       const response = await axios.post(
//         `${import.meta.env.VITE_BACKEND_URL}/api/checkout/${checkoutId}/finalize`,
//         {},
//         {
//           headers: {
//             Authorization: `Bearer ${localStorage.getItem("userToken")}`,
//           },
//         }
//       );
//       return response.data;
//     } catch (error) {
//       return rejectWithValue(error.response.data);
//     }
//   }
// );

// const checkoutSlice = createSlice({
//     name: "checkout",
//     initialState: {
//         checkout: null,
//         order: null,
//         loading: false,
//         error: null,
//         paymentStatus: null,
//     },
//     reducers: {
//         clearCheckout: (state) => {
//             state.checkout = null;
//             state.order = null;
//             state.error = null;
//             state.paymentStatus = null;
//         },
//         resetError: (state) => {
//             state.error = null;
//         }
//     },
//     extraReducers: (builder) => {
//         builder
//         // Create checkout
//         .addCase(createCheckout.pending, (state) => {
//             state.loading = true;
//             state.error = null;
//         })
//         .addCase(createCheckout.fulfilled, (state, action) => {
//             state.loading = false;
//             state.checkout = action.payload;
//         })
//         .addCase(createCheckout.rejected, (state, action) => {
//             state.loading = false;
//             state.error = action.payload?.message || "Failed to create checkout";
//         })
//         // Create COD Order
//         .addCase(createCODOrder.pending, (state) => {
//             state.loading = true;
//             state.error = null;
//         })
//         .addCase(createCODOrder.fulfilled, (state, action) => {
//             state.loading = false;
//             state.order = action.payload;
//             state.paymentStatus = 'cod_confirmed';
//         })
//         .addCase(createCODOrder.rejected, (state, action) => {
//             state.loading = false;
//             state.error = action.payload?.message || "Failed to create COD order";
//         })
//         // Update payment status
//         .addCase(updatePaymentStatus.pending, (state) => {
//             state.loading = true;
//             state.error = null;
//         })
//         .addCase(updatePaymentStatus.fulfilled, (state, action) => {
//             state.loading = false;
//             state.checkout = action.payload;
//             state.paymentStatus = 'payment_updated';
//         })
//         .addCase(updatePaymentStatus.rejected, (state, action) => {
//             state.loading = false;
//             state.error = action.payload?.message || "Failed to update payment";
//         })
//         // Finalize checkout
//         .addCase(finalizeCheckout.pending, (state) => {
//             state.loading = true;
//             state.error = null;
//         })
//         .addCase(finalizeCheckout.fulfilled, (state, action) => {
//             state.loading = false;
//             state.order = action.payload;
//             state.paymentStatus = 'finalized';
//         })
//         .addCase(finalizeCheckout.rejected, (state, action) => {
//             state.loading = false;
//             state.error = action.payload?.message || "Failed to finalize checkout";
//         })
//     }
// })

// export const { clearCheckout, resetError } = checkoutSlice.actions;
// export default checkoutSlice.reducer;

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// Async thunk to create Razorpay order
export const createRazorpayOrder = createAsyncThunk(
  "checkout/createRazorpayOrder",
  async (orderData, { rejectWithValue, getState }) => {
    try {
      const { auth: { user } } = getState();
      const token = user?.token || localStorage.getItem("userToken");

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      };

      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/paymentRoutes/create-order`,
        {
          amount: orderData.totalPrice,
          orderItems: orderData.orderItems,
          shippingAddress: orderData.shippingAddress,
          currency: "INR",
          receipt: `order_${Date.now()}`,
          idempotencyKey: orderData.idempotencyKey, // Include idempotency key
          couponCodes: orderData.couponCodes,
          walletRedeem: orderData.walletRedeem,
          trackingInfo: orderData.trackingInfo,
        },
        config
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create Razorpay order"
      );
    }
  }
);

// Async thunk to create COD order
export const createCODOrder = createAsyncThunk(
  "checkout/createCODOrder",
  async (orderData, { rejectWithValue, getState }) => {
    try {
      const { auth: { user } } = getState();
      const token = user?.token || localStorage.getItem("userToken");

      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/orders/cod`,
        orderData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create COD order"
      );
    }
  }
);

// Async thunk to verify Razorpay payment
export const verifyRazorpayPayment = createAsyncThunk(
  "checkout/verifyRazorpayPayment",
  async ({ razorpayPaymentId, razorpayOrderId, razorpaySignature, orderId }, { rejectWithValue, getState }) => {
    try {
      const { auth: { user } } = getState();
      const token = user?.token || localStorage.getItem("userToken");

      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/paymentRoutes/verify-payment`,
        {
          razorpayPaymentId,
          razorpayOrderId,
          razorpaySignature,
          orderId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Payment verification failed"
      );
    }
  }
);

// Async thunk to handle payment failure
export const handlePaymentFailure = createAsyncThunk(
  "checkout/handlePaymentFailure",
  async ({ razorpayOrderId, error_code, error_description }, { rejectWithValue, getState }) => {
    try {
      const { auth: { user } } = getState();
      const token = user?.token || localStorage.getItem("userToken");

      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/paymentRoutes/payment-failed`,
        {
          razorpayOrderId,
          error_code,
          error_description,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to handle payment failure"
      );
    }
  }
);

const checkoutSlice = createSlice({
  name: "checkout",
  initialState: {
    order: null,
    loading: false,
    error: null,
    paymentStatus: null,
    razorpayOrderId: null,
    orderId: null,
    razorpayKeyId: null,
    amount: 0,
    currency: "INR",
  },
  reducers: {
    clearCheckout: (state) => {
      state.order = null;
      state.error = null;
      state.paymentStatus = null;
      state.razorpayOrderId = null;
      state.orderId = null;
      state.razorpayKeyId = null;
      state.amount = 0;
      state.currency = "INR";
    },
    resetError: (state) => {
      state.error = null;
    },
    setPaymentStatus: (state, action) => {
      state.paymentStatus = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createRazorpayOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createRazorpayOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.razorpayOrderId = action.payload.razorpayOrderId;
        state.orderId = action.payload.orderId;
        state.razorpayKeyId = action.payload.key;
        state.amount = action.payload.amount;
        state.currency = action.payload.currency;
        state.paymentStatus = "order_created";
      })
      .addCase(createRazorpayOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createCODOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCODOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.order = action.payload;
        state.paymentStatus = "cod_confirmed";
      })
      .addCase(createCODOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(verifyRazorpayPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyRazorpayPayment.fulfilled, (state, action) => {
        state.loading = false;
        state.order = action.payload.order;
        state.paymentStatus = "payment_verified";
      })
      .addCase(verifyRazorpayPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(handlePaymentFailure.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(handlePaymentFailure.fulfilled, (state, action) => {
        state.loading = false;
        state.paymentStatus = "payment_failed";
      })
      .addCase(handlePaymentFailure.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearCheckout, resetError, setPaymentStatus } = checkoutSlice.actions;
export default checkoutSlice.reducer;
