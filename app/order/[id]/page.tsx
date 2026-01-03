'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface OrderData {
  id: string;
  status: string;
  items: OrderItem[];
  total: number;
  notes?: string;
  customerName?: string;
  statusHistory: {
    status: string;
    timestamp: string;
    note?: string;
  }[];
  createdAt: string;
  updatedAt: string;
  table: {
    id: string;
    name: string;
    number: number;
  } | null;
  restaurant: {
    id: string;
    name: string;
    currency: string;
  } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  created: { label: 'Order Placed', color: 'bg-yellow-500', icon: '📝' },
  accepted: { label: 'Accepted', color: 'bg-blue-500', icon: '✅' },
  preparing: { label: 'Preparing', color: 'bg-orange-500', icon: '👨‍🍳' },
  ready: { label: 'Ready', color: 'bg-green-500', icon: '🔔' },
  served: { label: 'Served', color: 'bg-green-600', icon: '🍽️' },
  paid: { label: 'Paid', color: 'bg-gray-500', icon: '💳' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500', icon: '❌' },
};

export default function OrderPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${params.id}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Order not found');
        return;
      }

      setOrder(data.data);
    } catch (err) {
      setError('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchOrder, 10000);
    return () => clearInterval(interval);
  }, [params.id]);

  const formatPrice = (price: number) => {
    const currency = order?.restaurant?.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold mb-2">Order Not Found</h1>
          <p className="text-gray-600">{error}</p>
          <Link
            href="/"
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS.created;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">{order.restaurant?.name}</h1>
          {order.table && (
            <p className="text-sm text-gray-500">
              Table {order.table.number} - {order.table.name}
            </p>
          )}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="text-center">
            <div className="text-5xl mb-4">{statusInfo.icon}</div>
            <div
              className={`inline-block px-4 py-2 rounded-full text-white font-medium ${statusInfo.color}`}
            >
              {statusInfo.label}
            </div>
            <p className="text-gray-500 text-sm mt-4">
              Order #{order.id.slice(-8).toUpperCase()}
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="font-semibold mb-4">Order Progress</h2>
          <div className="space-y-3">
            {order.statusHistory.map((history, index) => {
              const historyInfo = STATUS_LABELS[history.status];
              return (
                <div key={index} className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${historyInfo?.color || 'bg-gray-400'}`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {historyInfo?.label || history.status}
                    </p>
                    {history.note && (
                      <p className="text-xs text-gray-500">{history.note}</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {formatTime(history.timestamp)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="font-semibold mb-4">Order Items</h2>
          <div className="space-y-3">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between">
                <div>
                  <p className="font-medium">
                    {item.quantity}x {item.name}
                  </p>
                  {item.notes && (
                    <p className="text-xs text-gray-500">Note: {item.notes}</p>
                  )}
                </div>
                <p className="text-gray-600">
                  {formatPrice(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>
          <div className="border-t mt-4 pt-4 flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
          {order.notes && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Notes:</span> {order.notes}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        {order.restaurant && order.table && (
          <Link
            href={`/menu/${order.restaurant.id}/${order.table.id}`}
            className="block w-full text-center bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700"
          >
            Order More Items
          </Link>
        )}

        <p className="text-center text-xs text-gray-400 mt-4">
          This page updates automatically
        </p>
      </div>
    </div>
  );
}
