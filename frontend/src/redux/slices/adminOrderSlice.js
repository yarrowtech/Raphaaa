// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import axios from "axios";

// // fetch all orders (Admin only)
// export const fetchAllOrders = createAsyncThunk("adminOrders/fetchAllOrders", async(_, {rejectWithValue}) => {
//     try {
//         const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/admin/orders`,
//             {
//                 headers: {
//                     Authorization: `Bearer ${localStorage.getItem("userToken")}`
//                 },
//             }
//         );
//         return response.data;
//     } catch (error) {
//         return rejectWithValue(error.response.data);
//     }
// });


// // updating the order delivery status (Admin only)
// export const updateOrderStatus = createAsyncThunk("adminOrders/updateOrderStatus", async({ id, status }, {rejectWithValue}) => {
//     try {
//         const response = await axios.put(`${import.meta.env.VITE_BACKEND_URL}/api/admin/orders/${id}`, {status},
//             {
//                 headers: {
//                     Authorization: `Bearer ${localStorage.getItem("userToken")}`
//                 },
//             }
//         );
//         return response.data;
//     } catch (error) {
//         return rejectWithValue(error.response.data);
//     }
// })


// // Deleteing an order (Admin only)
// export const deleteOrder = createAsyncThunk("adminOrders/deleteOrder", async(id, {rejectWithValue}) => {
//     try {
//         await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/admin/orders/${id}`,
//             {
//                 headers: {
//                     Authorization: `Bearer ${localStorage.getItem("userToken")}`
//                 },
//             }
//         );
//         return id;
//     } catch (error) {
//         return rejectWithValue(error.response.data);
//     }
// });

// const adminOrderSlice = createSlice({
//     name: "adminOrders",
//     initialState: {
//         orders: [],
//         totalOrders: 0,
//         totalSales: 0,
//         loading: false,
//         error: null,
//     },
//     reducers: {},
//     extraReducers: (builder) => {
//         builder
//         // Fetch all orders
//         .addCase(fetchAllOrders.pending, (state) => {
//             state.loading = true;
//             state.error = null;
//         })
//         .addCase(fetchAllOrders.fulfilled, (state, action) => {
//             state.loading = false;
//             state.orders = action.payload;
//             state.totalOrders = action.payload.length;

//             // calculate total sales
//             const totalSales = action.payload.reduce((acc, order) => {
//                 return acc + order.totalPrice;
//             }, 0);
//             state.totalSales = totalSales;
//         })
//         .addCase(fetchAllOrders.rejected, (state, action) => {
//             state.loading = false;
//             state.error = action.payload || action.error.message;
//         })
//         // update order status
//         .addCase(updateOrderStatus.fulfilled, (state, action) => {
//             const updatedOrder = action.payload;
//             const orderIndex = state.orders.findIndex((order)=> order._id === updatedOrder._id);
//             if(orderIndex !== -1) {
//                 state.orders[orderIndex] = updatedOrder;
//             }
//         })
//         // delete an order
//         .addCase(deleteOrder.fulfilled, (state, action) => {
//             state.orders = state.orders.filter(
//                 (order) => order._id !== action.payload
//             );
//         })
//     }
// })

// export default adminOrderSlice.reducer;

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// fetch all orders (Admin only)
export const fetchAllOrders = createAsyncThunk("adminOrders/fetchAllOrders", async(_, {rejectWithValue}) => {
    try {
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/admin/orders`,
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("userToken")}`
                },
            }
        );
        // console.log('Fetched orders:', response.data);
        return response.data;
    } catch (error) {
        console.error('Fetch orders error:', error.response?.data || error.message);
        return rejectWithValue(error.response?.data || error.message);
    }
});

// updating the order delivery status (Admin only)
export const updateOrderStatus = createAsyncThunk("adminOrders/updateOrderStatus", async({ id, status }, {rejectWithValue}) => {
    try {
        const response = await axios.put(`${import.meta.env.VITE_BACKEND_URL}/api/admin/orders/${id}`, {status},
            {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("userToken")}`
                },
            }
        );
        console.log('Updated order:', response.data);
        return response.data;
    } catch (error) {
        console.error('Update order error:', error.response?.data || error.message);
        return rejectWithValue(error.response?.data || error.message);
    }
})

// Deleting an order (Admin only)
export const deleteOrder = createAsyncThunk("adminOrders/deleteOrder", async(id, {rejectWithValue}) => {
    try {
        
        console.log('Deleted order:', id);
        return id; // Return the ID of the deleted order
    } catch (error) {
        console.error('Delete order error:', error.response?.data || error.message);
        return rejectWithValue(error.response?.data || error.message);
    }
});

const adminOrderSlice = createSlice({
    name: "adminOrders",
    initialState: {
        orders: [],
        totalOrders: 0,
        totalSales: 0,
        loading: false,
        error: null,
    },
    reducers: {
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
        // Fetch all orders
        .addCase(fetchAllOrders.pending, (state) => {
            state.loading = true;
            state.error = null;
        })
        .addCase(fetchAllOrders.fulfilled, (state, action) => {
            state.loading = false;
            state.orders = action.payload;
            state.totalOrders = action.payload.length;

            // calculate total sales
            const totalSales = action.payload.reduce((acc, order) => {
                return acc + order.totalPrice;
            }, 0);
            state.totalSales = totalSales;
        })
        .addCase(fetchAllOrders.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload || action.error.message;
        })
        // update order status
        .addCase(updateOrderStatus.pending, (state) => {
            state.loading = true;
        })
        .addCase(updateOrderStatus.fulfilled, (state, action) => {
            state.loading = false;
            const updatedOrder = action.payload;
            const orderIndex = state.orders.findIndex((order)=> order._id === updatedOrder._id);
            if(orderIndex !== -1) {
                state.orders[orderIndex] = updatedOrder;
            }
        })
        .addCase(updateOrderStatus.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload || action.error.message;
        })
        // delete an order
        .addCase(deleteOrder.pending, (state) => {
            state.loading = true;
        })
        .addCase(deleteOrder.fulfilled, (state, action) => {
            state.loading = false;
            state.orders = state.orders.filter(
                (order) => order._id !== action.payload
            );
            state.totalOrders = state.orders.length;
            
            // Recalculate total sales
            const totalSales = state.orders.reduce((acc, order) => {
                return acc + order.totalPrice;
            }, 0);
            state.totalSales = totalSales;
        })
        .addCase(deleteOrder.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload || action.error.message;
        })
    }
})

export const { clearError } = adminOrderSlice.actions;
export default adminOrderSlice.reducer;