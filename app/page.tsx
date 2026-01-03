import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold mb-4">🍽️ TabMe</h1>
        <p className="text-gray-600 mb-8">
          QR Restaurant Ordering System
        </p>
        
        <div className="space-y-4">
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-2">👨‍🍳 Restaurant Staff</h2>
            <p className="text-gray-500 text-sm mb-4">
              Manage orders, menu, and tables
            </p>
            <Link
              href="/login"
              className="inline-block w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Staff Login
            </Link>
          </div>
          
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-2">🧑‍🤝‍🧑 Customers</h2>
            <p className="text-gray-500 text-sm mb-4">
              Scan the QR code at your table to start ordering
            </p>
            <p className="text-xs text-gray-400">
              Look for QR codes on tables in participating restaurants
            </p>
          </div>
        </div>
        
        <p className="mt-8 text-xs text-gray-400">
          Demo QR URL: <code className="bg-gray-100 px-2 py-1 rounded">/qr/demo-table-1</code>
        </p>
      </div>
    </main>
  );
}
