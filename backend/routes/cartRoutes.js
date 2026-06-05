// const express = require("express");
// const Cart = require("../models/Cart");
// const Product = require("../models/Product");
// const { protect } = require("../middleware/authMiddleware");

// const router = express.Router();

// // helper function to get a cart by user ID or guest ID
// const getCart = async (userId, guestId) => {
//     if (userId) {
//         return await Cart.findOne({ user: userId });
//     } else if (guestId) {
//         return await Cart.findOne({ guestId });
//     }
//     return null;
// }

// // @route POST /api/cart
// // @desc Add a product to the cart for a guest or logged in user
// // @access Public
// router.post("/", async(req, res) => {
//     const { productId, quantity, size, color, guestId, userId } = req.body;
//     try {
//         const product = await Product.findById(productId);
//         if (!product) return res.status(404).json({ message: "Product not found" });

//         // Determine if the user is logged in or guest
//         let cart = await getCart(userId, guestId);

//         // If the cart exists, update it
//         if(cart) {
//             const productIndex = cart.products.findIndex(
//                 (p) => 
//                     p.productId.toString() === productId &&
//                     p.size === size &&
//                     p.color === color
//             );

//             if(productIndex > -1) {
//                 // If the product already exists, update the quantity
//                 cart.products[productIndex].quantity += quantity;
//             } else {
//                 // add new product
//                 cart.products.push({
//                     productId,
//                     name: product.name,
//                     image: product.images[0].url,
//                     price: product.price,
//                     size,
//                     color,
//                     quantity,
//                 });
//             }

//             // Recalculate the total price
//             cart.totalPrice = cart.products.reduce(
//                 (acc, item) => acc + item.price * quantity,
//                 0
//             );
//             await cart.save();
//             return res.status(200).json(cart);
//         } else {
//             // create a new cart for guest or user
//             const newCart = await Cart.create({
//                 user: userId ? userId : undefined,
//                 guestId: guestId ? guestId : "guest_" + new Date().getTime(),
//                 products: [
//                     {
//                         productId,
//                         name: product.name,
//                         image: product.images[0].url,
//                         price: product.price,
//                         size,
//                         color,
//                         quantity,
//                     },
//                 ],
//                 totalPrice: product.price * quantity,
//             });
//             return res.status(201).json(newCart);
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: "Internal server error" });
//     }
// });

// // @route PUT /api/cart
// // @desc Update product quantity in the cart for a guest or logged-in user
// // @access Public
// router.put("/", async(req, res) => {
//     const { productId, quantity, size, color, guestId, userId } = req.body;

//     try {
//         let cart = await getCart(userId, guestId);
//         if(!cart) return res.status(404).json({ message: "Cart not found" });

//         const productIndex = cart.products.findIndex(
//             (p) => 
//                 p.productId.toString() === productId &&
//                 p.size === size &&
//                 p.color === color
//         );

//         if(productIndex > -1) {
//             // Update quantity
//             if(quantity > 0) {
//                 cart.products[productIndex].quantity = quantity;
//             } else {
//                 cart.products.splice(productIndex, 1); // Remove product if the quantity is 0
//             }

//             cart.totalPrice = cart.products.reduce(
//                 (acc, item) => acc + item.price * item.quantity,
//                 0
//             );
//             await cart.save();
//             return res.status(200).json(cart);
//         } else {
//             return res.status(404).json({ message: "Product not found in cart" });
//         }
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ message: "Internal Server Error" });
//     }
// });

// // @route DELETE /api/cart
// // @desc Remove a product from the cart
// // @access Public
// router.delete("/", async (req, res) => {
//     const { productId, size, color, guestId, userId } = req.body;
//     try {
//         let cart = await getCart(userId, guestId);

//         if (!cart) return res.status(404).json({ message: "cart not found" });

//         const productIndex = cart.products.findIndex(
//             (p) =>
//                 p.productId.toString() === productId &&
//                 p.size === size &&
//                 p.color === color
//         );

//         if (productIndex > -1){
//             cart.products.splice(productIndex, 1);

//             cart.totalPrice = cart.products.reduce(
//                 (acc, item) => acc + item.price * item.quantity,
//                 0
//             );
//             await cart.save();
//             return res.status(200).json(cart);
//         } else {
//             return res.status(404).json({ message: "Product not found in cart" });
//         }
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ message: "Internal server error" });
//     }
// });

// // @route GET /api/cart
// // @desc Get logged-in user's or guest user's cart
// // @access Public
// router.get("/", async(req, res) => {
//     const { userId, guestId } = req.query;

//     try {
//         const cart = await getCart(userId, guestId);
//         if(cart) {
//             res.json(cart);
//         } else {
//             res.status(404).json({ message: "cart not found" });
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: "Internal server error" });
//     }
// });

// // @route POST /api/cart/merge
// // @desc Merge guest cart into user cart into user cart on login
// // @access Private
// router.post("/merge", protect, async(req, res) => {
//     const { guestId } = req.body;

//     try {
//         // Find the guest cart and user cart
//         const guestCart = await Cart.findOne({ guestId });
//         const userCart = await Cart.findOne({ user: req.user._id });

//         if(guestCart){
//             if(guestCart.products.length === 0){
//                 return res.status(400).json({ message: "Guest cart is empty" });
//             }

//             if(userCart){
//                 // Merge guest cart into user cart
//                 guestCart.products.forEach((guestItem) => {
//                     const productIndex = userCart.products.findIndex(
//                         (item) =>
//                             item.productId.toString() === guestItem.productId.toString() &&
//                             item.size === guestItem.size &&
//                             item.color === guestItem.color
//                     );

//                     if(productIndex > -1) {
//                         // If the items exists in the user cart, update the quantity
//                         userCart.products[productIndex].quantity += guestItem.quantity;
//                     } else {
//                         // otherwise, add the guest item to the cart
//                         userCart.products.push(guestItem);
//                     }
//                 });

//                 userCart.totalPrice = userCart.products.reduce(
//                     (acc, item) => acc + item.price * item.quantity,
//                     0
//                 );
//                 await userCart.save();

//                 // Remove the guest cart after merging
//                 try {
//                     await Cart.findOneAndDelete({ guestId });
//                 } catch (error) {
//                     console.error("Error deleting guest cart: ", error);
//                 }
//                 res.status(200).json(userCart);
//             } else {
//                 // If the user has no existing cart, assign the guest cart to the user
//                 guestCart.user = req.user._id;
//                 guestCart.guestId = undefined;
//                 await guestCart.save();

//                 res.status(200).json(guestCart);
//             }
//         } else {
//             if(userCart){
//                 // Guest cart has already been merged, return user cart
//                 return res.status(404).json({ message: "Guest cart not found" });
//             }
//         }
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: "Server Error" });
//     }
// });

// module.exports = router;

const express = require("express");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { protect } = require("../middleware/authMiddleware");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Offer = require("../models/offer");
const { decorateProductWithTimedOffer } = require("../utils/timedOfferPricing");

const router = express.Router();

const resolveAuthUser = async (req) => {
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) return null;
    try {
        const token = auth.split(" ")[1];
        if (!token || token.split(".").length !== 3) return null;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded?.user?.id || decoded?.id;
        if (!userId) return null;
        return await User.findById(userId).select("_id");
    } catch {
        return null;
    }
};

// helper function to get a cart by user ID or guest ID
const getCart = async (userId, guestId) => {
    if (userId) {
        return await Cart.findOne({ user: userId });
    } else if (guestId) {
        return await Cart.findOne({ guestId });
    }
    return null;
}

// Helper: get image URL for selected color from colorVariants or fallback to product.images
const getProductImageForColor = (product, color) => {
    if (Array.isArray(product.colorVariants) && product.colorVariants.length > 0 && color) {
        const cv = product.colorVariants.find(
            (c) =>
                String(c?.color || "").toLowerCase() === String(color || "").toLowerCase() ||
                String(c?.colorName || "").toLowerCase() === String(color || "").toLowerCase()
        );
        if (cv?.images?.[0]?.url) return cv.images[0].url;
    }
    return product?.images?.[0]?.url || "";
};

const getTimedOffersForDisplay = async () =>
    Offer.find()
        .select("_id title startDate endDate isActive offerPercentage benefit priority productIds createdAt")
        .lean();

const resolveCartItemPrice = (product, offers = []) => {
    const pricing = decorateProductWithTimedOffer(product, offers);
    return Number(pricing?.displayPrice ?? pricing?.discountPrice ?? pricing?.price ?? product?.price ?? 0);
};

// Helper: resolve SKU from colorVariants or legacy variants
const resolveSkuFromProduct = (product, color, size, skuFromRequest) => {
    if (skuFromRequest) return skuFromRequest;
    const colorLow = String(color || "").trim().toLowerCase();
    const sizeLow  = String(size  || "").trim().toLowerCase();

    if (Array.isArray(product.colorVariants) && product.colorVariants.length > 0) {
        const cv = product.colorVariants.find(
            (c) => String(c?.color || "").toLowerCase() === colorLow ||
                   String(c?.colorName || "").toLowerCase() === colorLow
        );
        if (cv) {
            const sz = cv.sizes.find((s) => String(s?.size || "").toLowerCase() === sizeLow);
            if (sz?.sku) return sz.sku;
        }
    }
    if (Array.isArray(product.variants) && product.variants.length > 0) {
        const v = product.variants.find(
            (v) =>
                String(v?.color || "").toLowerCase() === colorLow &&
                String(v?.size  || "").toLowerCase() === sizeLow
        );
        if (v?.sku) return v.sku;
    }
    return product.sku || "-";
};

const normalizeCartProducts = async (cart, offers = []) => {
    if (!cart?.products?.length) {
        return {
            ...(cart?.toObject?.() || cart),
            products: cart?.products || [],
            totalPrice: Number(cart?.totalPrice || 0),
        };
    }

    const products = await Promise.all(
        cart.products.map(async (item) => {
            const productDoc = await Product.findById(item.productId).select(
                "_id price discountPrice offerPercentage timedOffer name images colorVariants variants skuCode sku"
            );
            if (!productDoc) return { ...(item.toObject?.() || item) };
            return {
                ...(item.toObject?.() || item),
                price: resolveCartItemPrice(productDoc, offers),
            };
        })
    );

    const totalPrice = products.reduce(
        (acc, item) => acc + Number(item.price || 0) * Number(item.quantity || 0),
        0
    );

    return {
        ...(cart.toObject?.() || cart),
        products,
        totalPrice,
    };
};

// @route POST /api/cart
// @desc Add a product to the cart for a guest or logged in user
// @access Public
router.post("/", async(req, res) => {
    const { productId, quantity, size, color, sku, guestId, userId } = req.body;
    try {
        const authUser = await resolveAuthUser(req);
        const effectiveUserId = authUser?._id?.toString();
        const effectiveGuestId = effectiveUserId ? null : guestId;

        if (!effectiveUserId && !effectiveGuestId) {
            return res.status(400).json({ message: "guestId is required for guest cart" });
        }

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: "Product not found" });

        const resolvedSku = resolveSkuFromProduct(product, color, size, sku);
        const productImage = getProductImageForColor(product, color);
        const timedOffers = await getTimedOffersForDisplay();
        const resolvedPrice = resolveCartItemPrice(product, timedOffers);

        // Determine if the user is logged in or guest
        let cart = await getCart(effectiveUserId, effectiveGuestId);

        // If the cart exists, update it
        if(cart) {
            const productIndex = cart.products.findIndex(
                (p) =>
                    p.productId.toString() === productId &&
                    p.size === size &&
                    p.color === color
            );

            if(productIndex > -1) {
                // If the product already exists, update the quantity
                cart.products[productIndex].quantity += quantity;
                if (!cart.products[productIndex].sku) {
                    cart.products[productIndex].sku = resolvedSku;
                }
                // Update image in case it changed
                cart.products[productIndex].image = productImage;
            } else {
                // add new product
                cart.products.push({
                    productId,
                    name: product.name,
                    image: productImage,
                    price: resolvedPrice,
                    size,
                    color,
                    sku: resolvedSku,
                    quantity,
                });
            }

            // Recalculate the total price
            cart.totalPrice = cart.products.reduce(
                (acc, item) => acc + item.price * item.quantity,
                0
            );
            await cart.save();
            return res.status(200).json(await normalizeCartProducts(cart, timedOffers));
        } else {
            // create a new cart for guest or user
            const newCart = await Cart.create({
                user: effectiveUserId ? effectiveUserId : undefined,
                guestId: effectiveGuestId ? effectiveGuestId : "guest_" + new Date().getTime(),
                products: [
                    {
                        productId,
                        name: product.name,
                        image: productImage,
                        price: resolvedPrice,
                        size,
                        color,
                        sku: resolvedSku,
                        quantity,
                    },
                ],
                totalPrice: resolvedPrice * quantity,
            });
            return res.status(201).json(await normalizeCartProducts(newCart, timedOffers));
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// @route PUT /api/cart
// @desc Update product quantity in the cart for a guest or logged-in user
// @access Public
router.put("/", async(req, res) => {
    const { productId, quantity, size, color, guestId, userId } = req.body;

    try {
        const authUser = await resolveAuthUser(req);
        const effectiveUserId = authUser?._id?.toString();
        const effectiveGuestId = effectiveUserId ? null : guestId;

        if (!effectiveUserId && !effectiveGuestId) {
            return res.status(400).json({ message: "guestId is required for guest cart" });
        }

        let cart = await getCart(effectiveUserId, effectiveGuestId);
        if(!cart) return res.status(404).json({ message: "Cart not found" });

        const productIndex = cart.products.findIndex(
            (p) => 
                p.productId.toString() === productId &&
                p.size === size &&
                p.color === color
        );

        if(productIndex > -1) {
            // Update quantity
            if(quantity > 0) {
                cart.products[productIndex].quantity = quantity;
            } else {
                cart.products.splice(productIndex, 1); // Remove product if the quantity is 0
            }

            const timedOffers = await getTimedOffersForDisplay();
            const normalizedCart = await normalizeCartProducts(cart, timedOffers);
            cart.products = normalizedCart.products;
            cart.totalPrice = normalizedCart.totalPrice;
            await cart.save();
            return res.status(200).json(normalizedCart);
        } else {
            return res.status(404).json({ message: "Product not found in cart" });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

// @route DELETE /api/cart
// @desc Remove a product from the cart
// @access Public
router.delete("/", async (req, res) => {
    const { productId, size, color, guestId, userId } = req.body;
    try {
        const authUser = await resolveAuthUser(req);
        const effectiveUserId = authUser?._id?.toString();
        const effectiveGuestId = effectiveUserId ? null : guestId;

        if (!effectiveUserId && !effectiveGuestId) {
            return res.status(400).json({ message: "guestId is required for guest cart" });
        }

        let cart = await getCart(effectiveUserId, effectiveGuestId);

        if (!cart) return res.status(404).json({ message: "cart not found" });

        const productIndex = cart.products.findIndex(
            (p) =>
                p.productId.toString() === productId &&
                p.size === size &&
                p.color === color
        );

        if (productIndex > -1){
            cart.products.splice(productIndex, 1);

            const timedOffers = await getTimedOffersForDisplay();
            const normalizedCart = await normalizeCartProducts(cart, timedOffers);
            cart.products = normalizedCart.products;
            cart.totalPrice = normalizedCart.totalPrice;
            await cart.save();
            return res.status(200).json(normalizedCart);
        } else {
            return res.status(404).json({ message: "Product not found in cart" });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
});

// @route GET /api/cart
// @desc Get logged-in user's or guest user's cart
// @access Public
router.get("/", async(req, res) => {
    const { userId, guestId } = req.query;

    try {
        const authUser = await resolveAuthUser(req);
        const effectiveUserId = authUser?._id?.toString();
        const effectiveGuestId = effectiveUserId ? null : guestId;

        if (!effectiveUserId && !effectiveGuestId) {
            return res.status(400).json({ message: "guestId is required for guest cart" });
        }

        const cart = await getCart(effectiveUserId, effectiveGuestId);
        if(cart) {
            const timedOffers = await getTimedOffersForDisplay();
            res.json(await normalizeCartProducts(cart, timedOffers));
        } else {
            res.status(404).json({ message: "cart not found" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// @route POST /api/cart/merge
// @desc Merge guest cart into user cart into user cart on login
// @access Private
router.post("/merge", protect, async(req, res) => {
    const { guestId } = req.body;

    try {
        // Find the guest cart and user cart
        const guestCart = await Cart.findOne({ guestId });
        const userCart = await Cart.findOne({ user: req.user._id });

        if(guestCart && guestCart.products.length > 0){
            if(userCart){
                // Merge guest cart into user cart
                guestCart.products.forEach((guestItem) => {
                    const productIndex = userCart.products.findIndex(
                        (item) =>
                            item.productId.toString() === guestItem.productId.toString() &&
                            item.size === guestItem.size &&
                            item.color === guestItem.color
                    );

                    if(productIndex > -1) {
                        // If the items exists in the user cart, update the quantity
                        userCart.products[productIndex].quantity += guestItem.quantity;
                    } else {
                        // otherwise, add the guest item to the cart
                        userCart.products.push(guestItem);
                    }
                });

                const timedOffers = await getTimedOffersForDisplay();
                const normalizedUserCart = await normalizeCartProducts(userCart, timedOffers);
                userCart.products = normalizedUserCart.products;
                userCart.totalPrice = normalizedUserCart.totalPrice;
                await userCart.save();

                // Remove the guest cart after merging
                try {
                    await Cart.findOneAndDelete({ guestId });
                } catch (error) {
                    console.error("Error deleting guest cart: ", error);
                }
                res.status(200).json(normalizedUserCart);
            } else {
                // If the user has no existing cart, assign the guest cart to the user
                guestCart.user = req.user._id;
                guestCart.guestId = undefined;
                const timedOffers = await getTimedOffersForDisplay();
                const normalizedGuestCart = await normalizeCartProducts(guestCart, timedOffers);
                guestCart.products = normalizedGuestCart.products;
                guestCart.totalPrice = normalizedGuestCart.totalPrice;
                await guestCart.save();

                res.status(200).json(normalizedGuestCart);
            }
        } else {
            // No guest cart found or guest cart is empty
            if(userCart){
                // Return existing user cart
                const timedOffers = await getTimedOffersForDisplay();
                return res.status(200).json(await normalizeCartProducts(userCart, timedOffers));
            } else {
                // No cart exists, create empty cart for user
                const newCart = await Cart.create({
                    user: req.user._id,
                    products: [],
                    totalPrice: 0,
                });
                return res.status(200).json(newCart);
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;
