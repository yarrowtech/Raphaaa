const mongoose = require("mongoose");

const prebookingSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    user:    { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
    // booked    -> reserved a slot, product still in the making
    // ready     -> admin marked the product ready, user has been emailed
    // fulfilled -> user completed a real order for this product after it went ready
    // cancelled -> user (or admin) released the slot
    status:     { type: String, enum: ["booked", "ready", "fulfilled", "cancelled"], default: "booked" },
    size:       { type: String, default: "" },
    color:      { type: String, default: "" },
    notifiedAt: { type: Date, default: null },
    order:      { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    // Which prebooking round of the product this booking belongs to — lets a product
    // go through disable → re-enable cycles while keeping each round's bookings and
    // history distinct instead of colliding with a leftover record from an earlier round.
    round:      { type: Number, default: 1, min: 1 },
  },
  { timestamps: true }
);

// One prebooking slot per user per product PER ROUND — a user can re-book once a new round starts.
prebookingSchema.index({ product: 1, user: 1, round: 1 }, { unique: true });

const Prebooking = mongoose.model("Prebooking", prebookingSchema);

// Best-effort cleanup of the old pre-round unique index ({product, user}) from before
// rounds existed — it would otherwise keep blocking a second round's bookings forever.
Prebooking.collection.dropIndex("product_1_user_1").catch(() => {});

module.exports = Prebooking;
