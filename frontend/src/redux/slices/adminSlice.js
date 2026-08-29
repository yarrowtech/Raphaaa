import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// Fetch all the users (admin only)
export const fetchUsers = createAsyncThunk(
  "admin/fetchUsers", 
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/users`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("userToken")}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to fetch users'
      );
    }
  }
);

// Add the create user action
export const addUser = createAsyncThunk(
  "admin/addUser",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/users`,
        userData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("userToken")}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 
        error.response?.data?.error ||
        error.message || 
        'Failed to add user'
      );
    }
  }
);

// Update the user info
export const updateUser = createAsyncThunk(
  "admin/updateUser",
  async ({ id, name, email, role, mobile }, { rejectWithValue }) => {
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/users/${id}`,
        { name, email, role, ...(mobile !== undefined ? { mobile } : {}) },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("userToken")}`,
          }
        }
      );
      return response.data.user;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to update user'
      );
    }
  }
);

// Delete a user
export const deleteUser = createAsyncThunk(
  "admin/deleteUser", 
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/admin/users/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("userToken")}`,
          },
        }
      );
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to delete user'
      );
    }
  }
);

const adminSlice = createSlice({
    name: "admin",
    initialState: {
        users: [],
        loading: false,
        error: null,
    },
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
        .addCase(fetchUsers.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(fetchUsers.fulfilled, (state, action) => {
            state.loading = false;
            state.users = action.payload;
        })
        .addCase(fetchUsers.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload || action.error.message;
        })
        .addCase(updateUser.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(updateUser.fulfilled, (state, action) => {
            state.loading = false;
            const updateUser = action.payload;
            const userIndex = state.users.findIndex((user) => user._id === updateUser._id);
            if(userIndex !== -1){
                state.users[userIndex] = updateUser;
            }
        })
        .addCase(updateUser.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload || action.error.message;
        })
        .addCase(deleteUser.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(deleteUser.fulfilled, (state, action) => {
            state.loading = false;
            state.users = state.users.filter((user) => user._id !== action.payload);
        })
        .addCase(deleteUser.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload || action.error.message;
        })
        .addCase(addUser.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(addUser.fulfilled, (state, action) => {
            state.loading = false;
            state.users.push(action.payload.user || action.payload); // Handle both response formats
        })
        .addCase(addUser.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload || action.error.message; // Fixed the error handling
        });
    }
});

export const { clearError } = adminSlice.actions;
export default adminSlice.reducer;