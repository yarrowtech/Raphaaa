const mongoose = require("mongoose");

const colorVariantSizeSchema = new mongoose.Schema({
    size: { type: String, required: true, trim: true },
    sku:  { type: String, required: true, trim: true },
    countInStock: { type: Number, required: true, default: 0, min: 0 },
}, { _id: false });

const colorVariantSchema = new mongoose.Schema({
    color:     { type: String, required: true, trim: true },
    colorName: { type: String, trim: true, default: "" },
    images: [{
        url:     { type: String, required: true },
        altText: { type: String },
    }],
    sizes: [colorVariantSizeSchema],
}, { _id: false });

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    discountPrice: {
        type: Number,
    },
    offerPercentage: {
        type: Number,
        default: 0,
    },
    baseDiscountPrice: {
        type: Number,
        default: null,
    },
    baseOfferPercentage: {
        type: Number,
        default: 0,
    },
    activeSaleOfferId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Offer",
        default: null,
    },
    activeSalePrice: {
        type: Number,
        default: null,
    },
    activeSaleOfferPercentage: {
        type: Number,
        default: 0,
    },
    activeSaleSyncedAt: {
        type: Date,
        default: null,
    },
    countInStock: {
        type: Number,
        required: true,
        default: 0,
    },
    sku: {
        type: String,
        unique: true,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    brand: {
        type: String,
    },
    sizes: {
        type: [String],
        required: true,
    },
    colors: {
        type: [String],
        required: true,
    },
    // New structured variant system: one entry per color, each with its own images & sizes
    colorVariants: [colorVariantSchema],
    // Legacy flat variants (kept for backwards compatibility with old products)
    variants: [
        {
            designName: {
                type: String,
                trim: true,
                default: "Default",
            },
            color: {
                type: String,
                required: true,
                trim: true,
            },
            size: {
                type: String,
                required: true,
                trim: true,
            },
            sku: {
                type: String,
                required: true,
                trim: true,
            },
            countInStock: {
                type: Number,
                required: true,
                default: 0,
                min: 0,
            },
        },
    ],
    collections: {
        type: String,
        required: true,
    },
    material: {
        type: String,
    },
    gender: {
        type: String,
        enum: ["Men", "Women", "Kids"],
    },
    images: [
        {
            url: {
                type: String,
                required: true,
            },
            altText: {
                type: String,
            },
        },
    ],
    sizeChart: {
        templateId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SizeChart",
        },
        imageUrl: {
            type: String,
            default: "",
        },
        measureImageUrl: {
            type: String,
            default: "",
        },
        title: {
            type: String,
            default: "Size Chart",
        },
        audience: {
            type: String,
            enum: ["Men", "Women", "Kids", "Unisex"],
            default: "Unisex",
        },
    },
    isFeatured: {
        type: Boolean,
        default: false,
    },
    isPublished: {
        type: Boolean,
        default: false,
    },
    rating: {
        type: Number,
        default: 0,
    },
    numReviews: {
        type: Number,
        default: 0,
    },
    tags: [String],
    // External marketplaces / affiliates to compare offers on PDP.
    externalOffers: [
        {
            provider: {
                type: String,
                enum: ["Amazon", "Flipkart", "Meesho", "Other"],
                default: "Other",
            },
            url: { type: String, trim: true, default: "" },
            label: { type: String, trim: true, default: "" },
        },
    ],
    // Item-level delivery & return/replace policy info shown on PDP.
    deliveryPromise: {
        text: { type: String, trim: true, default: "" },
        shipsInDaysMin: { type: Number, min: 0 },
        shipsInDaysMax: { type: Number, min: 0 },
    },
    returnPolicy: {
        eligible: { type: Boolean, default: true },
        days: { type: Number, default: 7, min: 0 },
        text: { type: String, trim: true, default: "" },
    },
    // Trust indicators for conversion blocks (rendered as small badges/icons).
    trustBadges: [{ type: String, trim: true }],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    metaTitle: {
        type: String,
    },
    metaDescription: {
        type: String,
    },
    metaKeywords: {
        type: String,
    },
    dimensions: {
        length: Number,
        width: Number,
        height: Number,
    },
    weight: Number,
    // Delivery pricing overrides per product
    freeShipping:        { type: Boolean, default: false },  // always free regardless of subtotal
    extraShippingCharge: { type: Number,  default: 0, min: 0 }, // added on top of base shipping
    // Legal / compliance fields (India)
    mrp:                 { type: Number,  default: null },
    countryOfOrigin:     { type: String,  default: "India" },
    materialComposition: { type: String,  default: "" },
    washCare:            { type: String,  default: "" },
    netQuantity:         { type: String,  default: "" },
    manufacturerInfo:    { type: String,  default: "" },
},
{timestamps: true}
);

// Weighted text index for better catalog search relevance.
productSchema.index(
    {
        name: "text",
        description: "text",
        brand: "text",
        category: "text",
        collections: "text",
        material: "text",
        tags: "text",
    },
    {
        name: "ProductTextIndex",
        weights: {
            name: 10,
            brand: 6,
            category: 6,
            tags: 4,
            collections: 2,
            material: 2,
            description: 1,
        },
    }
);

// Basic filter/facet indexes
productSchema.index({ isPublished: 1, category: 1 });
productSchema.index({ isPublished: 1, brand: 1 });
productSchema.index({ isPublished: 1, price: 1 });
productSchema.index({ isPublished: 1, gender: 1 });

module.exports = mongoose.model("Product", productSchema);
