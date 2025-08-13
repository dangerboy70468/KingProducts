import { useState, useEffect } from "react";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XIcon,
  EyeIcon,
  ClipboardCheckIcon,
} from "lucide-react";
import api from "../api";
import { InventorySearch } from "./InventorySearch";

interface ValidationErrors {
  fk_batch_product?: string;
  batch_number?: string;
  mfg_date?: string;
  exp_date?: string;
  init_qty?: string;
  cost?: string;
  general?: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
}

interface ValidationErrors {
  fk_batch_product?: string;
  batch_number?: string;
  mfg_date?: string;
  exp_date?: string;
  init_qty?: string;
  cost?: string;
}

interface Batch {
  id: number;
  fk_batch_product: number;
  batch_number: string;
  mfg_date: string;
  exp_date: string;
  init_qty: number;
  qty: number;
  cost: number;
  product_name?: string;
  description?: string;
}

interface AssignedOrder {
  id: number;
  fk_batch_order_order: number;
  qty: number;
  order_date: string;
  client_name: string;
}

interface NewBatch {
  fk_batch_product: number;
  batch_number: string;
  mfg_date: string;
  exp_date: string;
  init_qty: number;
  cost: number;
}

export const InventoryManagement = () => {
  const [inventory, setInventory] = useState<Batch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<Batch | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [filteredInventory, setFilteredInventory] = useState<Batch[]>([]);
  const [filters, setFilters] = useState({
    searchTerm: "",
    expiryRange: "",
    startDate: "",
    endDate: "",
  });
  const [newItem, setNewItem] = useState<NewBatch>({
    fk_batch_product: 0,
    batch_number: "",
    init_qty: 0,
    mfg_date: "",
    exp_date: "",
    cost: 0,
  });
  const [showDetails, setShowDetails] = useState(false);
  const [detailsItem, setDetailsItem] = useState<Batch | null>(null);
  const [assignedOrders, setAssignedOrders] = useState<AssignedOrder[]>([]);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);

  // Add state for assign order modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignBatch, setAssignBatch] = useState<Batch | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null);
  const [assignQty, setAssignQty] = useState<number>(0);
  const [assignError, setAssignError] = useState<string>("");
  const [assignDescription, setAssignDescription] = useState<string>("");

  const handleAssign = async () => {
    if (!assignBatch || !selectedOrder || assignQty <= 0) {
      setAssignError("Please select an order and enter a valid quantity.");
      return;
    }
    if (assignQty > assignBatch.qty) {
      setAssignError("Cannot assign more than available batch quantity.");
      return;
    }

    // Get the selected order details
    const selectedOrderDetails = orders.find(
      (order) => order.id === selectedOrder
    );
    if (!selectedOrderDetails) return;

    // Check if assigned quantity is less than order quantity
    const needsDescription =
      assignQty < selectedOrderDetails.qty ||
      assignQty > selectedOrderDetails.qty;
    if (assignQty < selectedOrderDetails.qty && !assignDescription) {
      setAssignError(
        "Please provide a description for low quantity assignment."
      );
      return;
    }
    if (assignQty > selectedOrderDetails.qty && !assignDescription) {
      setAssignError(
        "Please provide a description for extra quantity assignment."
      );
      return;
    }

    try {
      await api.post("/batch-orders", {
        fk_batch_order_batch: assignBatch.id,
        fk_batch_order_order: selectedOrder,
        qty: assignQty,
        description: needsDescription ? assignDescription : null,
      });

      setInventory((prevInventory) =>
        prevInventory.map((batch) =>
          batch.id === assignBatch.id
            ? { ...batch, qty: batch.qty - assignQty }
            : batch
        )
      );
      setShowAssignModal(false);
      fetchInventory();
      window.dispatchEvent(new Event("order-update"));
    } catch (error) {
      setAssignError("Assignment failed. Please try again.");
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchInventory();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get("/products");
      setProducts(response.data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await api.get("/batches");
      setInventory(response.data);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    }
  };

  // Fetch orders for assignment
  const fetchOrders = async () => {
    try {
      const response = await api.get("/orders");
      // Filter orders to only show pending status and matching product
      const filteredOrders = response.data.filter(
        (order: any) =>
          order.status.toLowerCase() === "pending" &&
          order.fk_order_product === assignBatch?.fk_batch_product
      );
      setOrders(filteredOrders);
    } catch (error) {
      setOrders([]);
    }
  };

  const generateBatchNumber = async (productId: number) => {
    try {
      // Get product info
      const selectedProduct = products.find((p) => p.id === productId);
      if (!selectedProduct) return "";

      // Generate product code from name (first letter of each word)
      const productCode = selectedProduct.name
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase())
        .join("");

      // Get current year
      const year = new Date().getFullYear();

      // Get existing batches for this product this year to determine sequence number
      const response = await api.get(`/batches/product/${productId}`);
      const existingBatches = response.data;
      const yearBatches = existingBatches.filter((batch: Batch) =>
        batch.batch_number.includes(`${productCode}-${year}`)
      );
      const sequence = (yearBatches.length + 1).toString().padStart(4, "0");

      return `${productCode}-${year}-${sequence}`;
    } catch (error) {
      console.error("Error generating batch number:", error);
      return "";
    }
  };

  const handleProductChange = async (productId: number) => {
    const batchNumber = await generateBatchNumber(productId);
    setNewItem({
      ...newItem,
      fk_batch_product: productId,
      batch_number: batchNumber,
    });
  };

  const validateForm = () => {
    const newErrors: ValidationErrors = {};

    // Validate Product ID (must exist and be a valid foreign key)
    if (!newItem.fk_batch_product || newItem.fk_batch_product <= 0) {
      newErrors.fk_batch_product = "Please select a valid product";
    }

    // Validate Batch Number (required, max 45 chars)
    if (!newItem.batch_number) {
      newErrors.batch_number = "";
    } else if (newItem.batch_number.length > 45) {
      newErrors.batch_number = "Batch number cannot exceed 45 characters";
    }

    // Validate Initial Quantity (must be positive integer)
    if (
      !newItem.init_qty ||
      !Number.isInteger(newItem.init_qty) ||
      newItem.init_qty <= 0
    ) {
      newErrors.init_qty = "Quantity is required";
    }

    // Validate Manufacturing Date (required and valid date)
    if (!newItem.mfg_date) {
      newErrors.mfg_date = "Manufacturing date is required";
    } else {
      const mfgDate = new Date(newItem.mfg_date);
      mfgDate.setHours(0, 0, 0, 0);
      if (isNaN(mfgDate.getTime())) {
        newErrors.mfg_date = "Invalid manufacturing date";
      }
    }

    // Validate Expiry Date (required, valid date, after mfg date)
    if (!newItem.exp_date) {
      newErrors.exp_date = "Expiry date is required";
    } else {
      const mfgDate = new Date(newItem.mfg_date);
      const expDate = new Date(newItem.exp_date);
      mfgDate.setHours(0, 0, 0, 0);
      expDate.setHours(0, 0, 0, 0);
      if (isNaN(expDate.getTime())) {
        newErrors.exp_date = "Invalid expiry date";
      } else if (expDate <= mfgDate) {
        newErrors.exp_date = "Expiry date must be after manufacturing date";
      }
    }

    // Validate Cost (required, positive integer only)
    if (!newItem.cost || newItem.cost <= 0) {
      newErrors.cost = "Cost is required and must be valid";
    } else if (!Number.isInteger(newItem.cost)) {
      newErrors.cost = "Cost must be a whole number";
    } else if (newItem.cost > 99999999) {
      newErrors.cost = "Cost is too large (max 8 digits)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddItem = async () => {
    if (!validateForm()) {
      return; // Stop if validation fails
    }

    try {
      // Set manufacturing and expiry dates to noon to avoid timezone issues
      const mfgDate = new Date(newItem.mfg_date);
      mfgDate.setHours(12);
      const expDate = new Date(newItem.exp_date);
      expDate.setHours(12);

      const itemData = {
        ...newItem,
        mfg_date: mfgDate.toISOString().split("T")[0],
        exp_date: expDate.toISOString().split("T")[0],
      };

      if (editingItem) {
        await api.put(`/batches/${editingItem.id}`, itemData);
      } else {
        const batchData = {
          ...itemData,
          qty: newItem.init_qty,
        };
        await api.post("/batches", batchData);
      }
      fetchInventory();
      setNewItem({
        fk_batch_product: 0,
        batch_number: "",
        init_qty: 0,
        mfg_date: "",
        exp_date: "",
        cost: 0,
      });
      setErrors({});
      setEditingItem(null);
      setShowAddItem(false);
    } catch (error: any) {
      console.error("Error saving batch:", error);
      if (error.response?.data?.errors) {
        // Handle field-specific validation errors from the backend
        setErrors(error.response.data.errors);
      } else if (error.response?.data?.error) {
        // Handle general error
        setErrors({ general: error.response.data.error });
      }
    }
  };

  const handleEditItem = (item: Batch) => {
    setEditingItem(item);
    setNewItem({
      fk_batch_product: item.fk_batch_product,
      batch_number: item.batch_number,
      init_qty: item.init_qty,
      mfg_date: item.mfg_date.split("T")[0],
      exp_date: item.exp_date.split("T")[0],
      cost: Math.floor(item.cost), // Convert to integer
    });
    setShowAddItem(true);
  };

  const handleDeleteClick = (id: number) => {
    setItemToDelete(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      try {
        await api.delete(`/batches/${itemToDelete}`);
        fetchInventory();
        setShowDeleteConfirm(false);
        setItemToDelete(null);
      } catch (error) {
        console.error("Error deleting batch:", error);
      }
    }
  };

  const handleViewDetails = async (item: Batch) => {
    setDetailsItem(item);
    setShowDetails(true);
    setDetailsLoading(true);
    try {
      const response = await api.get(`/batch-orders/batch/${item.id}`);
      setAssignedOrders(response.data);
    } catch (error) {
      console.error("Error fetching assigned orders:", error);
      setAssignedOrders([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleRemoveAssignment = async (orderId: number) => {
    if (!detailsItem) return;

    try {
      await api.delete(`/batch-orders/${detailsItem.id}/${orderId}`);

      // Refresh the assigned orders list
      const response = await api.get(`/batch-orders/batch/${detailsItem.id}`);
      setAssignedOrders(response.data);

      // Refresh inventory to get updated quantities
      fetchInventory();
    } catch (error) {
      console.error("Error removing assignment:", error);
    }
  };

  const handleOpenAssignModal = (batch: Batch) => {
    setAssignBatch(batch);
    setSelectedOrder(null);
    setAssignQty(0);
    setAssignError("");
    setAssignDescription("");
    setShowAssignModal(true);
    fetchOrders(); // This will now fetch and filter orders
  };

  useEffect(() => {
    let filtered = [...inventory];

    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.batch_number.toLowerCase().includes(searchLower) ||
          item.product_name?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by expiry range
    if (filters.expiryRange) {
      const today = new Date();
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

      filtered = filtered.filter((item) => {
        const expDate = new Date(item.exp_date);
        switch (filters.expiryRange) {
          case "expired":
            return expDate < today;
          case "this_month":
            return expDate >= thisMonth && expDate < nextMonth;
          case "next_month":
            return (
              expDate >= nextMonth &&
              expDate < new Date(today.getFullYear(), today.getMonth() + 2, 1)
            );
          case "future":
            return (
              expDate >= new Date(today.getFullYear(), today.getMonth() + 2, 1)
            );
          default:
            return true;
        }
      });
    }

    // Filter by date range
    if (filters.startDate) {
      filtered = filtered.filter((item) => item.exp_date >= filters.startDate);
    }
    if (filters.endDate) {
      filtered = filtered.filter((item) => item.exp_date <= filters.endDate);
    }

    setFilteredInventory(filtered);
  }, [filters, inventory]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
        <h2 className="text-xl font-semibold text-gray-800">
          Inventory Management
        </h2>
        <button
          onClick={() => {
            setEditingItem(null);
            setNewItem({
              fk_batch_product: 0,
              batch_number: "",
              init_qty: 0,
              mfg_date: "",
              exp_date: "",
              cost: 0,
            });
            setErrors({});
            setShowAddItem(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700 w-fit"
        >
          <PlusIcon className="h-4 w-4 mr-2" /> Add Items
        </button>
      </div>

      <InventorySearch filters={filters} onFilterChange={setFilters} />

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Batch Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  MFG Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  EXP Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost (Rs.)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(filteredInventory.length > 0
                ? filteredInventory
                : inventory
              ).map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.batch_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.product_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.qty}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.mfg_date.split("T")[0]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.exp_date.split("T")[0]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Rs. {item.cost}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => handleViewDetails(item)}
                      className="flex items-center text-green-600 hover:text-green-900"
                      title="View details"
                      aria-label={`View details of batch ${item.batch_number}`}
                    >
                      <EyeIcon className="h-5 w-5 mr-1" /> View
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleOpenAssignModal(item)}
                        className="text-amber-600 hover:text-amber-900"
                        title="Assign to order"
                        aria-label={`Assign batch ${item.batch_number} to order`}
                      >
                        <ClipboardCheckIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleEditItem(item)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit batch"
                        aria-label={`Edit batch ${item.batch_number}`}
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(item.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete batch"
                        aria-label={`Delete batch ${item.batch_number}`}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Inventory Item Modal */}
      {showAddItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingItem ? "Edit Inventory Item" : "Add Inventory Items"}
              </h3>
              <button
                onClick={() => {
                  setShowAddItem(false);
                  setErrors({});
                }}
                className="text-gray-400 hover:text-gray-500"
                title="Close modal"
                aria-label="Close modal"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">
                  Product
                </label>
                <select
                  value={newItem.fk_batch_product}
                  onChange={(e) => handleProductChange(Number(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    errors.fk_batch_product
                      ? "border-red-500"
                      : "border-gray-300"
                  }`}
                  disabled={!!editingItem}
                  title="Select product"
                  aria-label="Select product"
                >
                  <option value="">Select a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                {errors.fk_batch_product && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.fk_batch_product}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Batch Number
                </label>
                <input
                  type="text"
                  value={newItem.batch_number}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  title="Batch number"
                  aria-label="Batch number"
                  placeholder="Batch number will be generated automatically"
                />
                {errors.batch_number && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.batch_number}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={newItem.init_qty || ""}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      init_qty:
                        e.target.value === "" ? 0 : parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  title="Enter quantity"
                  aria-label="Enter quantity"
                  placeholder="Enter quantity"
                />
                {errors.init_qty && (
                  <p className="text-red-500 text-sm mt-1">{errors.init_qty}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manufacturing Date
                </label>
                <input
                  type="date"
                  value={newItem.mfg_date}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      mfg_date: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  title="Select manufacturing date"
                  aria-label="Select manufacturing date"
                />
                {errors.mfg_date && (
                  <p className="text-red-500 text-sm mt-1">{errors.mfg_date}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={newItem.exp_date}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      exp_date: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  title="Select expiry date"
                  aria-label="Select expiry date"
                />
                {errors.exp_date && (
                  <p className="text-red-500 text-sm mt-1">{errors.exp_date}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost (Rs.)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newItem.cost || ""}
                  onKeyDown={(e) => {
                    // Prevent decimal point
                    if (e.key === ".") {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const value =
                      e.target.value === ""
                        ? 0
                        : Math.floor(parseInt(e.target.value));
                    setNewItem({
                      ...newItem,
                      cost: value,
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  title="Enter cost"
                  aria-label="Enter cost"
                  placeholder="Enter cost in dollars"
                />
                {errors.cost && (
                  <p className="text-red-500 text-sm mt-1">{errors.cost}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => {
                  setShowAddItem(false);
                  setErrors({});
                }}
                className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md mr-2 hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingItem ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Confirm Delete
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this batch? This action cannot
                be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setItemToDelete(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Details Modal */}
      {showDetails && detailsItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">
                Inventory Details
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Batch Number
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {detailsItem.batch_number}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-500">Product</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {detailsItem.product_name}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">
                    Initial Quantity
                  </p>
                  <p className="text-lg font-semibold text-green-700">
                    {detailsItem.init_qty}
                  </p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-gray-500">
                    Current Quantity
                  </p>
                  <p className="text-lg font-semibold text-blue-700">
                    {detailsItem.qty}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Manufacturing Date
                    </p>
                    <p className="text-base text-gray-900">
                      {formatDate(detailsItem.mfg_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Expiry Date
                    </p>
                    <p className="text-base text-gray-900">
                      {formatDate(detailsItem.exp_date)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Cost</p>
                  <p className="text-lg font-semibold text-gray-900">
                    Rs. {detailsItem.cost}
                  </p>
                </div>
                {detailsItem.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Description
                    </p>
                    <p className="text-base text-gray-900">
                      {detailsItem.description}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-700 mb-3">
                  Assigned Orders
                </h4>
                {detailsLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : assignedOrders.length > 0 ? (
                  <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                    {assignedOrders.map((order) => (
                      <div
                        key={order.id}
                        className="p-3 flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            Order #{order.fk_batch_order_order}
                          </p>
                          <p className="text-sm text-gray-500">
                            {order.client_name}
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="font-medium text-gray-900">
                              Qty: {order.qty}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDate(order.order_date)}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              handleRemoveAssignment(order.fk_batch_order_order)
                            }
                            className="text-red-600 hover:text-red-800 p-2"
                            title="Remove assignment"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
                    No orders assigned to this batch.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Order Modal */}
      {showAssignModal && assignBatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Assign Batch to Order
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-500"
                title="Close assign modal"
                aria-label="Close assign modal"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <strong>Batch:</strong> {assignBatch.batch_number} (Available:{" "}
                {assignBatch.qty})
              </div>
              <div>
                <select
                  value={selectedOrder || ""}
                  onChange={(e) => setSelectedOrder(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Select an order</option>
                  {orders.length > 0 ? (
                    orders.map((order) => (
                      <option key={order.id} value={order.id}>
                        Order #{order.id} - {order.client_name} - Qty:{" "}
                        {order.qty}
                      </option>
                    ))
                  ) : (
                    <option disabled>No pending orders for this product</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity to assign
                </label>
                <input
                  type="number"
                  min="1"
                  max={assignBatch.qty}
                  value={assignQty || ""}
                  onChange={(e) => setAssignQty(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter quantity"
                />
              </div>
              {selectedOrder &&
                assignQty > 0 &&
                assignQty !==
                  (orders.find((o) => o.id === selectedOrder)?.qty || 0) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Required when quantity differs from order
                      quantity)
                    </label>
                    <textarea
                      value={assignDescription}
                      onChange={(e) => setAssignDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={3}
                      placeholder="Please explain why the full quantity cannot be assigned"
                    />
                  </div>
                )}
              {assignError && (
                <div className="text-red-500 text-sm">{assignError}</div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={handleAssign}
                  className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};


