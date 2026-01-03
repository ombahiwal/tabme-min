'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import Link from 'next/link';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  tags?: string[];
  allergens?: string[];
}

interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  items: MenuItem[];
}

interface MenuData {
  restaurant: {
    id: string;
    name: string;
    currency: string;
    description?: string;
    logoUrl?: string;
  };
  menu: MenuCategory[];
}

export default function MenuPage({
  params,
}: {
  params: { restaurantId: string; tableId: string };
}) {
  const router = useRouter();
  const cart = useCart();
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [isOrdering, setIsOrdering] = useState(false);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch(`/api/restaurants/${params.restaurantId}/menu`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to load menu');
          return;
        }

        setMenuData(data.data);
        cart.setRestaurantInfo(data.data.restaurant);

        // Set table info from session storage or fetch
        const qrContext = sessionStorage.getItem('qrContext');
        if (qrContext) {
          const { table } = JSON.parse(qrContext);
          cart.setTableInfo(table);
        } else {
          // If no QR context, set a placeholder table info
          cart.setTableInfo({
            id: params.tableId,
            name: 'Table',
            number: 0,
          });
        }

        if (data.data.menu.length > 0) {
          setSelectedCategory(data.data.menu[0].id);
        }
      } catch (err) {
        setError('Failed to load menu');
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [params.restaurantId, params.tableId]);

  const handleAddToCart = (item: MenuItem) => {
    cart.addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
    });
  };

  const handlePlaceOrder = async () => {
    if (cart.items.length === 0) return;

    setIsOrdering(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurantId: params.restaurantId,
          tableId: params.tableId,
          items: cart.items.map(item => ({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            notes: item.notes,
          })),
          notes: orderNotes,
          customerName: customerName || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to place order');
        return;
      }

      // Clear cart and redirect to order tracking
      cart.clearCart();
      router.push(`/order/${data.data.id}`);
    } catch (err) {
      alert('Failed to place order. Please try again.');
    } finally {
      setIsOrdering(false);
    }
  };

  const formatPrice = (price: number) => {
    const currency = menuData?.restaurant.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !menuData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold mb-2">Error</h1>
          <p className="text-gray-600">{error || 'Failed to load menu'}</p>
        </div>
      </div>
    );
  }

  const currentCategory = menuData.menu.find(c => c.id === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">{menuData.restaurant.name}</h1>
          {cart.tableInfo && (
            <p className="text-sm text-gray-500">
              Table {cart.tableInfo.number} - {cart.tableInfo.name}
            </p>
          )}
        </div>
      </header>

      {/* Category Tabs */}
      <div className="bg-white border-b sticky top-[72px] z-10">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex overflow-x-auto gap-2 py-3 scrollbar-hide">
            {menuData.menu.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="max-w-lg mx-auto px-4 py-4">
        {currentCategory && (
          <div className="space-y-4">
            {currentCategory.items.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No items available in this category
              </p>
            ) : (
              currentCategory.items.map(item => {
                const cartItem = cart.items.find(i => i.menuItemId === item.id);
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg shadow-sm p-4 flex gap-4"
                  >
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.name}</h3>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {item.description}
                        </p>
                      )}
                      <p className="text-blue-600 font-medium mt-2">
                        {formatPrice(item.price)}
                      </p>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {item.tags.map(tag => (
                            <span
                              key={tag}
                              className="text-xs bg-gray-100 px-2 py-0.5 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col justify-center">
                      {cartItem ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              cart.updateQuantity(item.id, cartItem.quantity - 1)
                            }
                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="w-6 text-center">
                            {cartItem.quantity}
                          </span>
                          <button
                            onClick={() =>
                              cart.updateQuantity(item.id, cartItem.quantity + 1)
                            }
                            className="w-8 h-8 rounded-full bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(item)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Cart Bar */}
      {cart.getItemCount() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
          <div className="max-w-lg mx-auto px-4 py-3">
            <button
              onClick={() => setShowCart(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium flex items-center justify-between px-4 hover:bg-blue-700"
            >
              <span className="flex items-center gap-2">
                <span className="bg-white text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">
                  {cart.getItemCount()}
                </span>
                View Cart
              </span>
              <span>{formatPrice(cart.getTotal())}</span>
            </button>
          </div>
        </div>
      )}

      {/* Cart Modal */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="bg-white w-full max-h-[80vh] rounded-t-2xl overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Your Cart</h2>
              <button
                onClick={() => setShowCart(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {cart.items.map(item => (
                <div
                  key={item.menuItemId}
                  className="flex items-center justify-between py-3 border-b"
                >
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatPrice(item.price)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        cart.updateQuantity(item.menuItemId, item.quantity - 1)
                      }
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() =>
                        cart.updateQuantity(item.menuItemId, item.quantity + 1)
                      }
                      className="w-8 h-8 rounded-full bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                  <p className="ml-4 font-medium w-20 text-right">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              ))}

              <div className="mt-4">
                <input
                  type="text"
                  placeholder="Your name (optional)"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg mb-2"
                />
                <textarea
                  placeholder="Order notes (optional)"
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg resize-none"
                  rows={2}
                />
              </div>
            </div>
            <div className="p-4 border-t">
              <div className="flex justify-between mb-4">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg">
                  {formatPrice(cart.getTotal())}
                </span>
              </div>
              <button
                onClick={handlePlaceOrder}
                disabled={isOrdering}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400"
              >
                {isOrdering ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
