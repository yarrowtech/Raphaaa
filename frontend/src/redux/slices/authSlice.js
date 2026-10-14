import { safeStorage, readStoredJson, validUser } from "../../utils/safeStorage";
// import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// import axios from 'axios';

// // Retrieve user info and token from localStorage if available
// const userFromStorage = safeStorage.getItem('userInfo') ? JSON.parse(safeStorage.getItem('userInfo')) : null;

// // Check for an existing guest ID in the localstorage or generate a new one
// const initialGuestId = safeStorage.getItem('guestId') || `guest_${crypto.randomUUID()}`;
// safeStorage.setItem('guestId', initialGuestId);

// // Initial state
// const initialState = {
//     user: userFromStorage,
//     guestId: initialGuestId,
//     loading: false,
//     error: null,
// };

// // Async thunk for user login
// export const loginUser = createAsyncThunk("auth/loginUser", async (userData, {rejectWithValue}) => {
//     try {
//         const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/users/login`, userData);
//         safeStorage.setItem('userInfo', JSON.stringify(response.data.user));
//         safeStorage.setItem('userToken', response.data.token);
//         return response.data.user; // Return the user object from the response
//     } catch (error) {
//         // console.error(error);
//         return rejectWithValue(error.response.data);
//     }
// });

// // Async thunk for user registration
// export const registerUser = createAsyncThunk("auth/registerUser", async (userData, {rejectWithValue}) => {
//     try {
//         const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/users/register`, userData);
//         safeStorage.setItem('userInfo', JSON.stringify(response.data.user));
//         safeStorage.setItem('token', response.data.token);
//         return response.data.user; // Return the user object from the response
//     } catch (error) {
//         // console.error(error);
//         return rejectWithValue(error.response.data);
//     }
// });

// // Slice
// const authSlice = createSlice({
//     name: "auth",
//     initialState,
//     reducers: {
//         logout: (state) => {
//             state.user = null;
//             state.guestId = `guest_${crypto.randomUUID()}`; // Reset guest ID on logout
//             safeStorage.removeItem("userInfo");
//             safeStorage.removeItem("userToken");
//             safeStorage.setItem("guestId", state.guestId); // Set new guest ID in localStorage
//         },
//         generateNewGuestId: (state) => {
//             state.guestId = `guest_${crypto.randomUUID()}`;
//             safeStorage.setItem("guestId", state.guestId); // Update guest ID in
//         },
//     },
//     extraReducers: (builder) => {
//         builder.addCase(loginUser.pending, (state) => {
//             state.loading = true;
//             state.error = null;
//         })
//         .addCase(loginUser.fulfilled, (state, action) => {
//             state.loading = false;
//             state.user = action.payload;
//         })
//         .addCase(loginUser.rejected, (state, action) => {
//             state.loading = false;
//             state.error = action.payload.message;
//         })
//         .addCase(registerUser.pending, (state) => {
//             state.loading = true;
//             state.error = null;
//         })
//         .addCase(registerUser.fulfilled, (state, action) => {
//             state.loading = false;
//             state.user = action.payload;
//         })
//         .addCase(registerUser.rejected, (state, action) => {
//             state.loading = false;
//             state.error = action.payload.message;
//         })
//     },
// });

// export const { logout, generateNewGuestId } = authSlice.actions;
// export default authSlice.reducer;

// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import axios from "axios";
// import { toast } from "sonner"; // ✅ Add this

// // Retrieve user info and token from localStorage if available
// const userFromStorage = safeStorage.getItem("userInfo")
//   ? JSON.parse(safeStorage.getItem("userInfo"))
//   : null;
// const tokenFromStorage = safeStorage.getItem("userInfo"); // Use consistent key

// // Check for an existing guest ID in the localstorage or generate a new one
// const initialGuestId = safeStorage.getItem("guestId") || `guest_${crypto.randomUUID()}`;
// safeStorage.setItem("guestId", initialGuestId);

// // Initial state
// const initialState = {
//   user: userFromStorage,
//   token: tokenFromStorage,
//   guestId: initialGuestId,
//   loading: false,
//   error: null,
// };

// // Async thunk for user login
// export const loginUser = createAsyncThunk(
//   "auth/loginUser",
//   async (userData, { rejectWithValue }) => {
//     try {
//       const response = await axios.post(
//         `${import.meta.env.VITE_BACKEND_URL}/api/users/login`,
//         userData
//       );

//       // Store with consistent keys
//       safeStorage.setItem("userInfo", JSON.stringify(response.data.user));
//       safeStorage.setItem("userToken", response.data.token); // Changed from 'userToken' to 'token'

//       return {
//         user: response.data.user,
//         token: response.data.token,
//       };
//     } catch (error) {
//       const message =
//         error.response?.data?.message ||
//         "Login failed. Please check your credentials.";
//       toast.error(message); // ✅ Sonner error toast
//       console.error("Login error:", error);
//       return rejectWithValue(
//         error.response?.data || { message: "Login failed" }
//       );
//     }
//   }
// );

// // Async thunk for user registration
// export const registerUser = createAsyncThunk(
//   "auth/registerUser",
//   async (userData, { rejectWithValue }) => {
//     try {
//       const response = await axios.post(
//         `${import.meta.env.VITE_BACKEND_URL}/api/users/register`,
//         userData
//       );

//       // Store with consistent keys
//       safeStorage.setItem("userInfo", JSON.stringify(response.data.user));
//       safeStorage.setItem("userToken", response.data.token);
//       toast.success("Registered successfully!"); // ✅ Success toast

//       return {
//         user: response.data.user,
//         token: response.data.token,
//       };
//     } catch (error) {
//       const errMsg = error.response?.data?.message || "Registration failed";
//       toast.error(errMsg); // ✅ Error toast
//       console.error("Registration error:", error);
//       return rejectWithValue(
//         error.response?.data || { message: "Registration failed" }
//       );
//     }
//   }
// );

// // Update admin profile details
// export const updateProfile = createAsyncThunk(
//   "auth/updateProfile",
//   async (updatedData, { getState, rejectWithValue }) => {
//     try {
//       const { token } = getState().auth;

//       const config = {
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//       };

//       const response = await axios.put(
//         `${import.meta.env.VITE_BACKEND_URL}/api/users/update-profile`,
//         updatedData,
//         config
//       );

//       safeStorage.setItem("userInfo", JSON.stringify(response.data.user));
//       safeStorage.setItem("userToken", response.data.token);
//       toast.success("Profile updated successfully!");

//       return {
//         user: response.data.user,
//         token: response.data.token,
//       };
//     } catch (error) {
//       toast.error(error.response?.data?.message || "Failed to update profile");
//       return rejectWithValue(
//         error.response?.data || { message: "Update failed" }
//       );
//     }
//   }
// );

// // Slice
// const authSlice = createSlice({
//   name: "auth",
//   initialState,
//   reducers: {
//     logout: (state) => {
//       state.user = null;
//       state.token = null;
//       state.guestId = `guest_${crypto.randomUUID()}`; // Reset guest ID on logout
//       safeStorage.removeItem("userInfo");
//       safeStorage.removeItem("token"); // Use consistent key
//       safeStorage.setItem("guestId", state.guestId); // Set new guest ID in localStorage
//     },
//     generateNewGuestId: (state) => {
//       state.guestId = `guest_${crypto.randomUUID()}`;
//       safeStorage.setItem("guestId", state.guestId);
//     },
//     clearError: (state) => {
//       state.error = null;
//     },
//   },
//   extraReducers: (builder) => {
//     builder
//       .addCase(loginUser.pending, (state) => {
//         state.loading = true;
//         state.error = null;
//       })
//       .addCase(loginUser.fulfilled, (state, action) => {
//         state.loading = false;
//         state.user = action.payload.user;
//         state.token = action.payload.token;
//       })
//       .addCase(loginUser.rejected, (state, action) => {
//         state.loading = false;
//         state.error = action.payload?.message || "Login failed";
//       })
//       .addCase(registerUser.pending, (state) => {
//         state.loading = true;
//         state.error = null;
//       })
//       .addCase(registerUser.fulfilled, (state, action) => {
//         state.loading = false;
//         state.user = action.payload.user;
//         state.token = action.payload.token;
//       })
//       .addCase(registerUser.rejected, (state, action) => {
//         state.loading = false;
//         state.error = action.payload?.message || "Registration failed";
//       })
//       .addCase(updateProfile.pending, (state) => {
//         state.loading = true;
//       })
//       .addCase(updateProfile.fulfilled, (state, action) => {
//         state.loading = false;
//         state.user = action.payload.user;
//         state.token = action.payload.token;
//       })
//       .addCase(updateProfile.rejected, (state, action) => {
//         state.loading = false;
//         state.error = action.payload?.message || "Update failed";
//       });
//   },
// });

// export const { logout, generateNewGuestId, clearError } = authSlice.actions;
// export default authSlice.reducer;

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { toast } from "sonner";

// Retrieve user info and token from localStorage if available
const userFromStorage = readStoredJson('userInfo', validUser, null);
const tokenFromStorage = safeStorage.getItem("userToken"); // ✅ Fixed: Use correct key

// Check for an existing guest ID in the localstorage or generate a new one
const initialGuestId = safeStorage.getItem("guestId") || `guest_${crypto.randomUUID()}`;
safeStorage.setItem("guestId", initialGuestId);

// Initial state
const initialState = {
  user: userFromStorage,
  token: tokenFromStorage, // ✅ Fixed: Now using correct token
  guestId: initialGuestId,
  loading: false,
  error: null,
};

// Async thunk for user login
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/users/login`,
        userData
      );

      // Store with consistent keys
      safeStorage.setItem("userInfo", JSON.stringify(response.data.user));
      safeStorage.setItem("userToken", response.data.token);

      return {
        user: response.data.user,
        token: response.data.token,
      };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Login failed. Please check your credentials.";
      toast.error(message);
      console.error("Login error:", error);
      return rejectWithValue(
        error.response?.data || { message: "Login failed" }
      );
    }
  }
);

// Async thunk for user registration
export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/users/register`,
        userData
      );

      // Store with consistent keys
      safeStorage.setItem("userInfo", JSON.stringify(response.data.user));
      safeStorage.setItem("userToken", response.data.token);
      toast.success("Registered successfully!");

      return {
        user: response.data.user,
        token: response.data.token,
      };
    } catch (error) {
      const errMsg = error.response?.data?.message || "Registration failed";
      toast.error(errMsg);
      console.error("Registration error:", error);
      return rejectWithValue(
        error.response?.data || { message: "Registration failed" }
      );
    }
  }
);

// Update admin profile details
export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (updatedData, { getState, rejectWithValue }) => {
    try {
      const { token } = getState().auth;

      // ✅ Fixed: Better token handling
      const authToken = token || safeStorage.getItem("userToken");

      if (!authToken) {
        toast.error("Authentication token not found. Please login again.");
        return rejectWithValue({ message: "No authentication token" });
      }

      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        // ✅ Added: Timeout for server requests
        timeout: 10000, // 10 seconds timeout
      };

      // ✅ Fixed: Remove empty password field if not provided
      const cleanedData = { ...updatedData };
      if (!cleanedData.password || cleanedData.password.trim() === "") {
        delete cleanedData.password;
      }

      const response = await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/api/users/update-profile`,
        cleanedData,
        config
      );

      safeStorage.setItem("userInfo", JSON.stringify(response.data.user));
      safeStorage.setItem("userToken", response.data.token);
      toast.success("Profile updated successfully!");

      return {
        user: response.data.user,
        token: response.data.token,
      };
    } catch (error) {
      console.error("Update profile error:", error);

      // ✅ Enhanced error handling for server issues
      let errorMessage = "Failed to update profile";

      if (error.code === "ECONNABORTED") {
        errorMessage = "Request timeout. Please try again.";
      } else if (error.response?.status === 401) {
        errorMessage = "Session expired. Please login again.";
      } else if (error.response?.status === 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
      return rejectWithValue(error.response?.data || { message: errorMessage });
    }
  }
);

// Slice
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.guestId = `guest_${crypto.randomUUID()}`;
      safeStorage.removeItem("userInfo");
      safeStorage.removeItem("userToken"); // ✅ Fixed: Use correct key
      safeStorage.setItem("guestId", state.guestId);
    },
    generateNewGuestId: (state) => {
      state.guestId = `guest_${crypto.randomUUID()}`;
      safeStorage.setItem("guestId", state.guestId);
    },
    clearError: (state) => {
      state.error = null;
    },
    googleLoginSuccess: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      safeStorage.setItem("userInfo", JSON.stringify(action.payload.user));
      safeStorage.setItem("userToken", action.payload.token);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Login failed";
      })
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Registration failed";
      })
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Update failed";
      });
  },
});

export const { logout, generateNewGuestId, clearError, googleLoginSuccess  } = authSlice.actions;
export default authSlice.reducer;
