import { useEffect, useState } from "react";
import { PlusIcon, PencilIcon, TrashIcon, XIcon, Search } from "lucide-react";
import api from "../api";
import { ProductCategoryManagement } from "./ProductCategoryManagement";

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  category: string;
  price: string;
  description?: string;
}

interface ApiProduct {
  id: number;
  name: string;
  category_name: string;
  price: string;
  description?: string;
}

interface ProductInput {
  name: string;
  category: string;
  price: string;
  description?: string;
}

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

interface ValidationErrors {
  name?: string;
  category?: string;
  price?: string;
}

const emptyProduct: ProductInput = {
  name: "",
  category: "",
  price: "",
};

export const ProductManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<ProductInput>(emptyProduct);
  const [newCategory, setNewCategory] = useState("");
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  useEffect(() => {
    const filtered = products.filter((product) => {
      const searchLower = searchTerm.toLowerCase();
      const description = product.description || "";
      return (
        !searchTerm ||
        product.name.toLowerCase().includes(searchLower) ||
        product.category.toLowerCase().includes(searchLower) ||
        description.toLowerCase().includes(searchLower)
      );
    });
    setFilteredProducts(filtered);
  }, [products, searchTerm]);

  const fetchCategories = async () => {
    try {
      const response = await api.get("/product-categories");
      setCategories(response.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get("/products");
      const productsWithCategory = response.data.map((product: ApiProduct) => ({
        id: product.id,
        name: product.name,
        category: product.category_name,
        price: product.price,
        description: product.description || "",
      }));
      setProducts(productsWithCategory);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const validateProduct = () => {
    const newErrors: ValidationErrors = {};

    if (!newProduct.name.trim()) {
      newErrors.name = "Product name is required";
    }

    if (!newProduct.category) {
      newErrors.category = "Category is required";
    }

    if (!newProduct.price || parseFloat(newProduct.price) <= 0) {
      newErrors.price = "Price must be greater than 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setNewProduct(emptyProduct);
    setErrors({});
  };

  const handleAddProduct = async () => {
    if (validateProduct()) {
      try {
        if (editingProduct) {
          await api.put(`/products/${editingProduct.id}`, {
            name: newProduct.name,
            fk_product_category: categories.find(
              (cat) => cat.name === newProduct.category
            )?.id,
            price: parseFloat(newProduct.price),
            description: newProduct.description || "",
          });

          setProducts(
            products.map((p) =>
              p.id === editingProduct.id
                ? {
                    ...p,
                    ...newProduct,
                  }
                : p
            )
          );
          setEditingProduct(null);
        } else {
          const response = await api.post("/products", {
            name: newProduct.name,
            fk_product_category: categories.find(
              (cat) => cat.name === newProduct.category
            )?.id,
            price: parseFloat(newProduct.price),
            description: newProduct.description || "",
          });

          setProducts([
            ...products,
            {
              id: response.data.id,
              ...newProduct,
            },
          ]);
        }

        resetForm();
        setShowAddProduct(false);
      } catch (error) {
        console.error("Error saving product:", error);
      }
    }
  };

  const handleDeleteClick = (id: number) => {
    setProductToDelete(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (productToDelete) {
      try {
        await api.delete(`/products/${productToDelete}`);
        setProducts(
          products.filter((product) => product.id !== productToDelete)
        );
        setShowDeleteConfirm(false);
        setProductToDelete(null);
      } catch (error) {
        console.error("Error deleting product:", error);
      }
    }
  };

  const handleEditProduct = (product: Product) => {
    setErrors({});
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      category: product.category,
      price: product.price,
      description: product.description || "",
    });
    setShowAddProduct(true);
  };

  const handleAddCategory = async () => {
    if (!newCategory || newCategory.trim() === "") {
      setCategoryError("Category name is required");
      return;
    }

    if (categories.find((cat) => cat.name === newCategory)) {
      setCategoryError("Category already exists");
      return;
    }

    try {
      setCategoryLoading(true);
      setCategoryError("");
      const response = await api.post("/product-categories", {
        name: newCategory,
      });
      const newCat = response.data;
      setCategories([...categories, newCat]);
      setNewCategory("");
      setShowAddCategory(false);
    } catch (error) {
      console.error("Error adding category:", error);
      const apiError = error as ApiError;
      setCategoryError(
        apiError.response?.data?.error || "Failed to add category"
      );
    } finally {
      setCategoryLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {showCategoryManagement ? (
        <>
          <div className="flex justify-between items-center">
            <button
              onClick={() => setShowCategoryManagement(false)}
              className="text-blue-500 hover:text-blue-600 flex items-center gap-2"
            >
              ← Back to Products
            </button>
          </div>
          <ProductCategoryManagement />
        </>
      ) : (
        <>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
            <h2 className="text-xl font-semibold text-gray-800">
              Products Management
            </h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCategoryManagement(true)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
              >
                Manage Categories
              </button>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  resetForm();
                  setShowAddProduct(true);
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
              >
                <PlusIcon size={20} />
                Add Product
              </button>
            </div>
          </div>
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-md pr-10"
            />
            <Search className="absolute right-3 top-2.5 text-gray-400" size={20} />
          </div>
          {/* Products Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Rs.{product.price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                        title="Edit product"
                        aria-label="Edit product"
                      >
                        <PencilIcon size={20} />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(product.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete product"
                        aria-label="Delete product"
                      >
                        <TrashIcon size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Add/Edit Product Modal */}
          {showAddProduct && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg w-96">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">
                    {editingProduct ? "Edit Product" : "Add New Product"}
                  </h3>
                                      <button
                      onClick={() => {
                        setShowAddProduct(false);
                        resetForm();
                      }}
                      className="text-gray-400 hover:text-gray-500"
                      title="Close modal"
                      aria-label="Close modal"
                    >
                      <XIcon size={20} />
                    </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Name
                    </label>
                    <input
                      type="text"
                      id="product-name"
                      value={newProduct.name}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, name: e.target.value })
                      }
                      placeholder="Enter product name"
                      aria-label="Product name"
                      className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Category
                    </label>
                    <select
                      id="product-category"
                      value={newProduct.category}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, category: e.target.value })
                      }
                      aria-label="Product category"
                      className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {errors.category && (
                      <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Price
                    </label>
                    <input
                      type="number"
                      id="product-price"
                      value={newProduct.price}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, price: e.target.value })
                      }
                      placeholder="Enter price"
                      aria-label="Product price"
                      className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                    />
                    {errors.price && (
                      <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      id="product-description"
                      value={newProduct.description || ""}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, description: e.target.value })
                      }
                      placeholder="Enter product description"
                      aria-label="Product description"
                      className="mt-1 block w-full border rounded-md shadow-sm py-2 px-3"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowAddProduct(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddProduct}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                  >
                    {editingProduct ? "Update" : "Add"}
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Add Category Modal */}
          {showAddCategory && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Add New Category
                  </h3>
                  <button
                    onClick={() => setShowAddCategory(false)}
                    className="text-gray-400 hover:text-gray-500"
                    title="Close modal"
                    aria-label="Close modal"
                  >
                    <XIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label
                      className="block text-sm font-medium text-gray-700 mb-1"
                      htmlFor="category-name"
                    >
                      Category Name
                    </label>
                    <input
                      id="category-name"
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      aria-label="Category name"
                      placeholder="Enter category name"
                    />
                    {categoryError && (
                      <p className="text-sm text-red-600 mt-1">{categoryError}</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                  <button
                    onClick={() => setShowAddCategory(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md mr-2 hover:bg-gray-300"
                    title="Cancel"
                    aria-label="Cancel"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCategory}
                    className={`px-4 py-2 text-white rounded-md ${
                      categoryLoading
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                    disabled={categoryLoading}
                    title="Add category"
                    aria-label="Add category"
                  >
                    {categoryLoading ? "Adding..." : "Add"}
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
                <p className="mb-4">Are you sure you want to delete this product? This action cannot be undone.</p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
