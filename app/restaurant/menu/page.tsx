'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  sortOrder: number;
  tags?: string[];
  allergens?: string[];
}

interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}

export default function MenuPage() {
  const { token, restaurant } = useAuth();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form states
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    isAvailable: true,
    tags: '',
    allergens: '',
  });

  const fetchData = useCallback(async () => {
    if (!token) return;

    try {
      const [catRes, itemRes] = await Promise.all([
        fetch('/api/restaurant/menu/categories', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/restaurant/menu/items', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const catData = await catRes.json();
      const itemData = await itemRes.json();

      if (catRes.ok) {
        setCategories(catData.data.categories);
        if (catData.data.categories.length > 0 && !selectedCategory) {
          setSelectedCategory(catData.data.categories[0].id);
        }
      }

      if (itemRes.ok) {
        setItems(itemData.data.items);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setLoading(false);
    }
  }, [token, selectedCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatPrice = (price: number) => {
    const currency = restaurant?.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price);
  };

  // Category handlers
  const openCategoryModal = (category?: MenuCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({ name: category.name, description: category.description || '' });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '' });
    }
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    if (!token || !categoryForm.name) return;

    const url = editingCategory
      ? `/api/restaurant/menu/categories/${editingCategory.id}`
      : '/api/restaurant/menu/categories';

    const res = await fetch(url, {
      method: editingCategory ? 'PUT' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(categoryForm),
    });

    if (res.ok) {
      setShowCategoryModal(false);
      fetchData();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!token || !confirm('Delete this category?')) return;

    const res = await fetch(`/api/restaurant/menu/categories/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      fetchData();
      if (selectedCategory === id) {
        setSelectedCategory(categories[0]?.id || null);
      }
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete category');
    }
  };

  // Item handlers
  const openItemModal = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name,
        description: item.description || '',
        price: item.price.toString(),
        imageUrl: item.imageUrl || '',
        isAvailable: item.isAvailable,
        tags: item.tags?.join(', ') || '',
        allergens: item.allergens?.join(', ') || '',
      });
    } else {
      setEditingItem(null);
      setItemForm({
        name: '',
        description: '',
        price: '',
        imageUrl: '',
        isAvailable: true,
        tags: '',
        allergens: '',
      });
    }
    setShowItemModal(true);
  };

  const handleSaveItem = async () => {
    if (!token || !itemForm.name || !itemForm.price || !selectedCategory) return;

    const payload = {
      categoryId: selectedCategory,
      name: itemForm.name,
      description: itemForm.description || undefined,
      price: parseFloat(itemForm.price),
      imageUrl: itemForm.imageUrl || undefined,
      isAvailable: itemForm.isAvailable,
      tags: itemForm.tags ? itemForm.tags.split(',').map((t) => t.trim()) : undefined,
      allergens: itemForm.allergens ? itemForm.allergens.split(',').map((a) => a.trim()) : undefined,
    };

    const url = editingItem
      ? `/api/restaurant/menu/items/${editingItem.id}`
      : '/api/restaurant/menu/items';

    const res = await fetch(url, {
      method: editingItem ? 'PUT' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowItemModal(false);
      fetchData();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to save item');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!token || !confirm('Delete this item?')) return;

    const res = await fetch(`/api/restaurant/menu/items/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      fetchData();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete item');
    }
  };

  const toggleItemAvailability = async (item: MenuItem) => {
    if (!token) return;

    const res = await fetch(`/api/restaurant/menu/items/${item.id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isAvailable: !item.isAvailable }),
    });

    if (res.ok) {
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentItems = items.filter((i) => i.categoryId === selectedCategory);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Menu Management</h2>
        <button
          onClick={() => openCategoryModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + Add Category
        </button>
      </div>

      <div className="flex gap-6">
        {/* Categories Sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-semibold mb-3">Categories</h3>
            <div className="space-y-1">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <span className="text-sm">{cat.name}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openCategoryModal(cat);
                      }}
                      className="text-gray-400 hover:text-blue-600"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(cat.id);
                      }}
                      className="text-gray-400 hover:text-red-600"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-sm text-gray-500 py-2">No categories yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Items Grid */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">
              {categories.find((c) => c.id === selectedCategory)?.name || 'Items'}
            </h3>
            {selectedCategory && (
              <button
                onClick={() => openItemModal()}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                + Add Item
              </button>
            )}
          </div>

          {currentItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white rounded-lg">
              <p className="text-4xl mb-4">🍽️</p>
              <p>No items in this category</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {currentItems.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-lg shadow-sm p-4 ${
                    !item.isAvailable ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-20 h-20 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h4 className="font-medium">{item.name}</h4>
                        <span className="font-semibold text-blue-600">
                          {formatPrice(item.price)}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {item.description}
                        </p>
                      )}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {item.tags.map((tag) => (
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
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t">
                    <button
                      onClick={() => toggleItemAvailability(item)}
                      className={`text-xs px-2 py-1 rounded ${
                        item.isAvailable
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {item.isAvailable ? '✓ Available' : '✗ Unavailable'}
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openItemModal(item)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingItem ? 'Edit Item' : 'Add Item'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={itemForm.name}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Price *</label>
                <input
                  type="number"
                  step="0.01"
                  value={itemForm.price}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, price: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Image URL</label>
                <input
                  type="url"
                  value={itemForm.imageUrl}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, imageUrl: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={itemForm.tags}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, tags: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Spicy, Vegetarian, Popular"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Allergens (comma separated)
                </label>
                <input
                  type="text"
                  value={itemForm.allergens}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, allergens: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Nuts, Gluten, Dairy"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isAvailable"
                  checked={itemForm.isAvailable}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, isAvailable: e.target.checked })
                  }
                  className="rounded"
                />
                <label htmlFor="isAvailable" className="text-sm">
                  Available for ordering
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowItemModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItem}
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
