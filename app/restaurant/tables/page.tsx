'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Table {
  id: string;
  name: string;
  number: number;
  qrCode: string;
  qrUrl: string;
  capacity?: number;
  isActive: boolean;
}

export default function TablesPage() {
  const { token } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [tableForm, setTableForm] = useState({
    name: '',
    number: '',
    capacity: '4',
    isActive: true,
  });
  const [regeneratingQR, setRegeneratingQR] = useState<string | null>(null);

  const fetchTables = useCallback(async () => {
    if (!token) return;

    try {
      const res = await fetch('/api/restaurant/tables', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setTables(data.data.tables);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const openModal = (table?: Table) => {
    if (table) {
      setEditingTable(table);
      setTableForm({
        name: table.name,
        number: table.number.toString(),
        capacity: table.capacity?.toString() || '4',
        isActive: table.isActive,
      });
    } else {
      setEditingTable(null);
      const nextNumber = tables.length > 0 
        ? Math.max(...tables.map(t => t.number)) + 1 
        : 1;
      setTableForm({
        name: `Table ${nextNumber}`,
        number: nextNumber.toString(),
        capacity: '4',
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!token || !tableForm.name || !tableForm.number) return;

    const payload = {
      name: tableForm.name,
      number: parseInt(tableForm.number),
      capacity: parseInt(tableForm.capacity) || 4,
      isActive: tableForm.isActive,
    };

    const url = editingTable
      ? `/api/restaurant/tables/${editingTable.id}`
      : '/api/restaurant/tables';

    const res = await fetch(url, {
      method: editingTable ? 'PUT' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowModal(false);
      fetchTables();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to save table');
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm('Delete this table? This cannot be undone.')) return;

    const res = await fetch(`/api/restaurant/tables/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      fetchTables();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete table');
    }
  };

  const handleRegenerateQR = async (id: string) => {
    if (!token || !confirm('Regenerate QR code? Old QR code will stop working.')) return;

    setRegeneratingQR(id);
    try {
      const res = await fetch(`/api/restaurant/tables/${id}/regenerate-qr`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchTables();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to regenerate QR');
      }
    } finally {
      setRegeneratingQR(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('QR URL copied to clipboard!');
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
        <h2 className="text-2xl font-bold">Tables & QR Codes</h2>
        <button
          onClick={() => openModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + Add Table
        </button>
      </div>

      {tables.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg">
          <p className="text-4xl mb-4">🪑</p>
          <p>No tables yet</p>
          <p className="text-sm mt-2">Create your first table to generate a QR code</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tables.map((table) => (
            <div
              key={table.id}
              className={`bg-white rounded-lg shadow-sm p-4 ${
                !table.isActive ? 'opacity-60' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{table.name}</h3>
                  <p className="text-sm text-gray-500">Table #{table.number}</p>
                  {table.capacity && (
                    <p className="text-xs text-gray-400">Capacity: {table.capacity}</p>
                  )}
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    table.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {table.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* QR Code Display */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center mb-3">
                  {/* QR Code placeholder - in production, use a QR library */}
                  <div className="w-32 h-32 bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-4xl">📱</p>
                      <p className="text-xs text-gray-500 mt-1">QR Code</p>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-2 break-all">{table.qrUrl}</p>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => copyToClipboard(table.qrUrl)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      📋 Copy URL
                    </button>
                    <a
                      href={table.qrUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      🔗 Test Link
                    </a>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-3 border-t">
                <button
                  onClick={() => handleRegenerateQR(table.id)}
                  disabled={regeneratingQR === table.id}
                  className="text-xs text-orange-600 hover:text-orange-800 disabled:opacity-50"
                >
                  {regeneratingQR === table.id ? '...' : '🔄 New QR'}
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => openModal(table)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(table.id)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingTable ? 'Edit Table' : 'Add Table'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Table Name</label>
                <input
                  type="text"
                  value={tableForm.name}
                  onChange={(e) =>
                    setTableForm({ ...tableForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Patio Table 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Table Number</label>
                <input
                  type="number"
                  value={tableForm.number}
                  onChange={(e) =>
                    setTableForm({ ...tableForm, number: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Capacity</label>
                <input
                  type="number"
                  value={tableForm.capacity}
                  onChange={(e) =>
                    setTableForm({ ...tableForm, capacity: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  min="1"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={tableForm.isActive}
                  onChange={(e) =>
                    setTableForm({ ...tableForm, isActive: e.target.checked })
                  }
                  className="rounded"
                />
                <label htmlFor="isActive" className="text-sm">
                  Table is active (QR code works)
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
