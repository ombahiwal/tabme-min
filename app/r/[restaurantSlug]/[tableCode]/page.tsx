'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AliasQRPage({
  params,
}: {
  params: { restaurantSlug: string; tableCode: string };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolve = async () => {
      try {
        const res = await fetch(`/api/r/${params.restaurantSlug}/${params.tableCode}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Invalid QR code');
          setLoading(false);
          return;
        }

        sessionStorage.setItem(
          'qrContext',
          JSON.stringify({
            table: data.data.table,
            restaurant: data.data.restaurant,
            qrAlias: {
              restaurantSlug: params.restaurantSlug,
              tableCode: params.tableCode,
            },
          })
        );

        router.push(`/menu/${data.data.restaurant.id}/${data.data.table.id}`);
      } catch {
        setError('Failed to load. Please try again.');
        setLoading(false);
      }
    };

    resolve();
  }, [params.restaurantSlug, params.tableCode, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading restaurant...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold mb-2">Invalid QR Code</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Please scan a valid QR code at a restaurant table.</p>
        </div>
      </div>
    );
  }

  return null;
}
