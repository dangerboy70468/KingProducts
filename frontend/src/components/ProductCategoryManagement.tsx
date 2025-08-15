import { useEffect, useState } from "react";
import { PlusIcon, PencilIcon, TrashIcon, XIcon } from "lucide-react";
import api from "../api";

interface Category {
  id: number;
  name: string;
}

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

interface ProductCategoryManagementProps {
  onCategoryAdded?: () => void;
}

export const ProductCategoryManagement = ({ onCategoryAdded }: ProductCategoryManagementProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get("/product-categories");
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setError("Failed to fetch categories");
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      setError("Category name is required");
      return;
    }

    if (categories.find((cat) => cat.name.toLowerCase() === newCategory.toLowerCase())) {
      setError("Category already exists");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await api.post("/product-categories", {
        name: newCategory,
      });
      setCategories([...categories, response.data]);
      setNewCategory("");
      setShowAddModal(false);
      onCategoryAdded?.();
    } catch (error) {
      const apiError = error as ApiError;
      setError(apiError.response?.data?.error || "Failed to add category");
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = async () => {
    if (!editingCategory || !newCategory.trim()) {
      setError("Category name is required");
      return;
    }

    if (categories.find(
      (cat) => cat.name.toLowerCase() === newCategory.toLowerCase() && cat.id !== editingCategory.id
    )) {
      setError("Category already exists");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await api.put(`/product-categories/${editingCategory.id}`, {
        name: newCategory,
      });
      setCategories(categories.map(cat => 
        cat.id === editingCategory.id ? { ...cat, name: newCategory } : cat
      ));
      setNewCategory("");
      setEditingCategory(null);
      setShowAddModal(false);
    } catch (error) {
      const apiError = error as ApiError;
      setError(apiError.response?.data?.error || "Failed to update category");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category.id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;

    try {
      setLoading(true);
      await api.delete(`/product-categories/${categoryToDelete}`);
      setCategories(categories.filter(cat => cat.id !== categoryToDelete));
      setShowDeleteConfirm(false);
      setCategoryToDelete(null);
    } catch (error) {
      const apiError = error as ApiError;
      setError(apiError.response?.data?.error || "Failed to delete category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Product Categories</h2>
        <button
          onClick={() => {
            setError("");
            setNewCategory("");
            setEditingCategory(null);
            setShowAddModal(true);
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
        >
          <PlusIcon size={20} />
          Add Category
        </button>
      </div>

      {/* Categories List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories.map((category) => (
              <tr key={category.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {category.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setError("");
                      setNewCategory(category.name);
                      setEditingCategory(category);
                      setShowAddModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    <PencilIcon size={20} />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(category)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <TrashIcon size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {editingCategory ? "Edit Category" : "Add New Category"}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setError("");
                  setNewCategory("");
                  setEditingCategory(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <XIcon size={20} />
              </button>
            </div>
            {error && (
              <div className="mb-4 text-red-600 text-sm">{error}</div>
            )}
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Category name"
              className="w-full px-3 py-2 border rounded-md mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setError("");
                  setNewCategory("");
                  setEditingCategory(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={editingCategory ? handleEditCategory : handleAddCategory}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
              >
                {loading ? "Saving..." : editingCategory ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-lg font-medium mb-4">Confirm Delete</h3>
            <p className="mb-4">Are you sure you want to delete this category? This action cannot be undone.</p>
            {error && (
              <div className="mb-4 text-red-600 text-sm">{error}</div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setCategoryToDelete(null);
                  setError("");
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={loading}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 