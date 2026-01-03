'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface Order {
  id: string;
  status: string;
  items: OrderItem[];
  total: number;
  notes?: string;
  customerName?: string;
  createdAt: string;
  updatedAt: string;
  table: {
    id: string;
    name: string;
    number: number;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  created: { label: 'New', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  accepted: { label: 'Accepted', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  preparing: { label: 'Preparing', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  ready: { label: 'Ready', color: 'text-green-700', bgColor: 'bg-green-100' },
  served: { label: 'Served', color: 'text-green-800', bgColor: 'bg-green-200' },
  paid: { label: 'Paid', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100' },
};

const STATUS_FLOW = ['created', 'accepted', 'preparing', 'ready', 'served', 'paid'];

export default function OrdersPage() {
  const { token, restaurant } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('active');
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!token) return;

    try {
      let url = '/api/restaurant/orders';
      if (filter === 'active') {
        url += '?status=created,accepted,preparing,ready';
      } else if (filter !== 'all') {
        url += `?status=${filter}`;
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (res.ok) {
        setOrders(data.data.orders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => {
    fetchOrders();
    // Poll for new orders every 15 seconds
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!token) return;

    setUpdatingOrder(orderId);
    try {
      const res = await fetch(`/api/restaurant/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        await fetchOrders();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update order');
      }
    } catch (error) {
      alert('Failed to update order');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const currentIndex = STATUS_FLOW.indexOf(currentStatus);
    if (currentIndex >= 0 && currentIndex < STATUS_FLOW.length - 1) {
      return STATUS_FLOW[currentIndex + 1];
    }
    return null;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    const currency = restaurant?.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Orders</h2>
        <div className="flex gap-2">
          {['active', 'all', 'paid', 'cancelled'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-sm ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-4">📋</p>
          <p>No orders found</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => {
            const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.created;
            const nextStatus = getNextStatus(order.status);

            return (
              <div key={order.id} className="bg-white rounded-lg shadow-sm p-4">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="font-mono text-sm text-gray-500">
                      #{order.id.slice(-6).toUpperCase()}
                    </span>
                    {order.table && (
                      <p className="font-semibold">
                        Table {order.table.number}
                      </p>
                    )}
                    {order.customerName && (
                      <p className="text-sm text-gray-600">{order.customerName}</p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                  >
                    {statusConfig.label}
                  </span>
                </div>

                {/* Items */}
                <div className="border-t border-b py-3 my-3 space-y-1">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>
                        {item.quantity}x {item.name}
                        {item.notes && (
                          <span className="text-gray-400 text-xs ml-1">
                            ({item.notes})
                          </span>
                        )}
                      </span>
                      <span className="text-gray-600">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                {order.notes && (
                  <p className="text-xs text-gray-500 mb-3 bg-gray-50 p-2 rounded">
                    📝 {order.notes}
                  </p>
                )}

                {/* Footer */}
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold">{formatPrice(order.total)}</p>
                    <p className="text-xs text-gray-400">{formatTime(order.createdAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    {order.status === 'created' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'cancelled')}
                        disabled={updatingOrder === order.id}
                        className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                    {nextStatus && order.status !== 'cancelled' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, nextStatus)}
                        disabled={updatingOrder === order.id}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {updatingOrder === order.id
                          ? '...'
                          : `→ ${STATUS_CONFIG[nextStatus]?.label || nextStatus}`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
