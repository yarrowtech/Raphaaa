import { createContext, useContext, useMemo, useState } from 'react';

const CartContext = createContext(null);

function getCartItemImage(product) {
  return (
    product?.colorVariants?.[0]?.images?.[0]?.url ||
    product?.images?.[0]?.url ||
    null
  );
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  const addToCart = (product, { size, color, quantity = 1 } = {}) => {
    if (!product?._id) return;

    setItems((current) => {
      const key = `${product._id}-${size || ''}-${color || ''}`;
      const existingIndex = current.findIndex((item) => item.key === key);

      if (existingIndex >= 0) {
        const next = [...current];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + quantity,
        };
        return next;
      }

      return [
        ...current,
        {
          key,
          productId: product._id,
          name: product.name,
          price: product.discountPrice || product.price,
          image: getCartItemImage(product),
          size: size || null,
          color: color || null,
          quantity,
        },
      ];
    });
  };

  const removeFromCart = (key) => {
    setItems((current) => current.filter((item) => item.key !== key));
  };

  const cartCount = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({ items, addToCart, removeFromCart, cartCount }),
    [items, cartCount]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
