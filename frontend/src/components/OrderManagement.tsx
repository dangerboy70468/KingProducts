import { useState, useEffect, useMemo } from "react";
import { PlusIcon, PencilIcon, TrashIcon, XIcon } from "lucide-react";
import api from "../api";
import { OrderSearch } from "./OrderSearch";

interface Client {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
}

interface Order {
  id: number;
  client_name: string;
  product_name: string;
  fk_order_client: number;
  fk_order_product: number;
  qty: number;
  adjustedQty?: number;
  unit_price: number;
  total_price: number;
  date: string;
  required_date: string;
  status: string;
}



interface NewOrder {
  fk_order_client: number;
  fk_order_product: number;
  qty: number;
  unit_price: number;
  required_date: string;
  status: string;
}

interface ValidationErrors {
  fk_order_client?: string;
  fk_order_product?: string;
  qty?: string;
  unit_price?: string;
  required_date?: string;
}

export const OrderManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<number | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [filters, setFilters] = useState({
    searchTerm: "",
    status: "",
    startDate: "",
    endDate: "",
  });
  const [newOrder, setNewOrder] = useState<NewOrder>({
    fk_order_client: 0,
    fk_order_product: 0,
    qty: 1,
    unit_price: 0,
    required_date: "",
    status: "pending",
  });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);
  const [ordersWithNotes, setOrdersWithNotes] = useState<Set<number>>(
    new Set()
  );

  useEffect(() => {
    fetchOrders();
    fetchClients();
    fetchProducts();
  }, []);

  useEffect(() => {
    const handleOrderUpdate = () => {
      fetchOrders();
    };

    window.addEventListener("order-update", handleOrderUpdate);

    return () => {
      window.removeEventListener("order-update", handleOrderUpdate);
    };
  }, []);

  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.client_name.toLowerCase().includes(searchLower) ||
          order.product_name.toLowerCase().includes(searchLower) ||
          order.id.toString().includes(searchLower)
      );
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(
        (order) => order.status.trim().toLowerCase() === filters.status
      );
    }

    // Filter by date range
    if (filters.startDate) {
      filtered = filtered.filter(
        (order) => order.required_date >= filters.startDate
      );
    }
    if (filters.endDate) {
      filtered = filtered.filter(
        (order) => order.required_date <= filters.endDate
      );
    }

    return filtered;
  }, [filters, orders]);
  const fetchOrders = async () => {
    try {
      const response = await api.get("/orders");
      const ordersData = response.data;

      // Fetch batch assignments for all orders
      const notesSet = new Set<number>();
      for (const order of ordersData) {
        const batchResponse = await api.get(`/batch-orders/order/${order.id}`);
        if (batchResponse.data.some((batch: any) => batch.description)) {
          notesSet.add(order.id);
        }
        // Calculate total qty including batch differences
        const totalQtyDiff = batchResponse.data.reduce(
          (acc: number, batch: any) => acc + (batch.diff_qty || 0),
          0
        );
        // Update order with adjusted qty
        order.adjustedQty = order.qty + totalQtyDiff;
      }
      setOrders(ordersData);
      setOrdersWithNotes(notesSet);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await api.get("/clients");
      setClients(response.data);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get("/products");
      setProducts(response.data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const validateForm = () => {
    const newErrors: ValidationErrors = {};

    if (!newOrder.fk_order_client) {
      newErrors.fk_order_client = "Please select a client";
    }

    if (!newOrder.fk_order_product) {
      newErrors.fk_order_product = "Please select a product";
    }

    if (!newOrder.qty || newOrder.qty <= 0) {
      newErrors.qty = "Quantity is required ";
    }

    if (!newOrder.unit_price || newOrder.unit_price <= 0) {
      newErrors.unit_price = "Unit price is required & valid";
    } else if (!Number.isInteger(newOrder.unit_price)) {
      newErrors.unit_price = "Unit price must be a whole number";
    }

    if (!newOrder.required_date) {
      newErrors.required_date = "Required date is required";
    } else if (!editingOrder) {
      // Only validate date is not in past when creating a new order
      const selectedDate = new Date(newOrder.required_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Set to start of day for fair comparison
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        newErrors.required_date = "Required date cannot be in the past";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddOrder = async () => {
    if (validateForm()) {
      try {
        // Convert required_date to ISO string for consistent timezone handling
        const required_date = new Date(newOrder.required_date);
        required_date.setHours(12); // Set to noon to avoid timezone issues

        const orderData = {
          ...newOrder,
          qty: Number(newOrder.qty),
          unit_price: Number(newOrder.unit_price),
          fk_order_client: Number(newOrder.fk_order_client),
          fk_order_product: Number(newOrder.fk_order_product),
          required_date: required_date.toISOString().split("T")[0],
          status: editingOrder ? newOrder.status : "pending",
        };

        if (editingOrder) {
          const response = await api.put(
            `/orders/${editingOrder.id}`,
            orderData
          );
          setOrders(
            orders.map((o) =>
              o.id === editingOrder.id
                ? {
                    ...o,
                    ...orderData,
                    total_price: Number(
                      (orderData.qty * orderData.unit_price).toFixed(2)
                    ),
                    client_name:
                      clients.find((c) => c.id === orderData.fk_order_client)
                        ?.name || "",
                    product_name:
                      products.find((p) => p.id === orderData.fk_order_product)
                        ?.name || "",
                  }
                : o
            )
          );
        } else {
          const response = await api.post("/orders", orderData);
          // Add total_price to the response data
          const newOrderWithTotal = {
            ...response.data,
            total_price: Number(
              (orderData.qty * orderData.unit_price).toFixed(2)
            ),
          };
          setOrders([...orders, newOrderWithTotal]);
        }

        // Trigger client update
        window.dispatchEvent(new Event("client-update"));

        resetForm();
        setShowAddOrder(false);
      } catch (error) {
        console.error("Error saving order:", error);
      }
    }
  };

  const handleDeleteOrder = async (id: number) => {
    try {
      await api.delete(`/orders/${id}`);
      setOrders(orders.filter((order) => order.id !== id));
      setShowDeleteConfirm(false);
      setOrderToDelete(null);

      // Trigger client update after deletion
      window.dispatchEvent(new Event("client-update"));
    } catch (error) {
      console.error("Error deleting order:", error);
    }
  };

  const resetForm = () => {
    setNewOrder({
      fk_order_client: 0,
      fk_order_product: 0,
      qty: 0,
      unit_price: 0,
      required_date: "",
      status: "pending",
    });
    setErrors({});
    setEditingOrder(null);
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    // Just use the date portion of the required_date
    const formattedDate = order.required_date.split("T")[0];

    setNewOrder({
      fk_order_client: order.fk_order_client,
      fk_order_product: order.fk_order_product,
      qty: Math.floor(order.qty),
      unit_price: Number(order.unit_price),
      required_date: formattedDate,
      status: order.status,
    });
    setErrors({});
    setShowAddOrder(true);
  };

  const handleDeleteClick = (id: number) => {
    setOrderToDelete(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (orderToDelete) {
      await handleDeleteOrder(orderToDelete);
    }
  };

  const handleProductChange = (productId: number) => {
    const selectedProduct = products.find((p) => p.id === productId);
    setNewOrder({
      ...newOrder,
      fk_order_product: productId,
      unit_price: selectedProduct ? Number(selectedProduct.price) : 0,
    });
  };

  const handleNumberInput = (value: string, field: "qty" | "unit_price") => {
    // For qty, use integers. For unit_price, allow decimals
    const numberValue =
      value === ""
        ? 0
        : field === "qty"
        ? Math.floor(parseInt(value))
        : parseFloat(value);

    // Update the order with new value and calculate total
    const updatedOrder = {
      ...newOrder,
      [field]: numberValue,
    };

    setNewOrder(updatedOrder);
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Add new state for batch assignments
  const [batchAssignments, setBatchAssignments] = useState<any[]>([]);
  // Update handleViewDetails to fetch batch assignments and calculate adjusted total price
  const handleViewDetails = async (order: Order) => {
    setDetailsOrder(order);
    setShowDetailsModal(true);
    try {
      await api.get(`/batch-orders/order/${order.id}`);
      setBatchAssignments(response.data);

      // Calculate total qty including batch differences
      const totalQtyDiff = response.data.reduce(
        (acc: number, batch: any) => acc + (batch.diff_qty || 0),
        0
      );

      const adjustedTotalPrice = (order.qty + totalQtyDiff) * order.unit_price;

      // Update details order with adjusted total price
      setDetailsOrder((prev) =>
        prev
          ? {
              ...prev,
              total_price: Number(adjustedTotalPrice.toFixed(2)),
            }
          : null
      );
    } catch (error) {
      console.error("Error fetching batch assignments:", error);
      setBatchAssignments([]);
    }
  };

  // Inside the order details modal, add this section
  const BatchAssignmentsSection = () => (
    <div className="border-t pt-4">
      <h4 className="font-semibold text-gray-700 mb-3">Batch Assignments</h4>
      {batchAssignments.length > 0 ? (
        <div className="space-y-3">
          {batchAssignments.map((assignment) => (
            <div key={assignment.id} className="bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">
                  Batch: {assignment.batch_number}
                </span>
                <span className="text-sm text-gray-600">
                  Qty: {assignment.qty}
                </span>
              </div>
              {assignment.description && (
                <div className="mt-2 text-sm text-gray-600">
                  <p className="font-medium">Description:</p>
                  <p className="mt-1">{assignment.description}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
          No batch assignments for this order.
        </p>
      )}
    </div>
  );
  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
          <h2 className="text-xl font-semibold text-gray-800">
            Order Management
          </h2>
          <button
            onClick={() => {
              setEditingOrder(null);
              resetForm();
              setShowAddOrder(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700 w-fit"
          >
            <PlusIcon className="h-4 w-4 mr-2" /> Create Order
          </button>
        </div>

        <OrderSearch filters={filters} onFilterChange={setFilters} />

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Required Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center space-x-2">
                        <span>{order.id}</span>
                        {ordersWithNotes.has(order.id) && (
                          <span
                            className="w-2 h-2 bg-red-500 rounded-full"
                            title="Has special notes"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.client_name}{" "}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.product_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.adjustedQty !== undefined ? (
                        <div>
                          <span>{order.adjustedQty}</span>
                          {order.adjustedQty !== order.qty && (
                            <span className="ml-1 text-xs text-gray-400">
                              (init: {order.qty})
                            </span>
                          )}
                        </div>
                      ) : (
                        order.qty
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      Rs. {Number(order.unit_price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.required_date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleViewDetails(order)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View details"
                      >
                        View
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${
                        order.status.trim().toLowerCase() === "completed"
                          ? "bg-green-100 text-green-800"
                          : order.status.trim().toLowerCase() === "in_transit"
                          ? "bg-blue-100 text-blue-800"
                          : order.status.trim().toLowerCase() === "assigned"
                          ? "bg-purple-200 text-purple-900"
                          : order.status.trim().toLowerCase() === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditOrder(order)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit order"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(order.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete order"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-gray-500">
                      No orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showAddOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">
                  {editingOrder ? "Edit Order" : "Create New Order"}
                </h3>
                <button
                  onClick={() => {
                    setShowAddOrder(false);
                    resetForm();
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client
                  </label>
                  <select
                    value={newOrder.fk_order_client || ""}
                    onChange={(e) =>
                      setNewOrder({
                        ...newOrder,
                        fk_order_client: Number(e.target.value),
                      })
                    }
                    className={`w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      errors.fk_order_client
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    title="Select client"
                    aria-label="Select client"
                  >
                    <option value="">Select a client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                  {errors.fk_order_client && (
                    <p className="mt-0.5 text-xs text-red-500">
                      {errors.fk_order_client}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product
                  </label>
                  <select
                    value={newOrder.fk_order_product || ""}
                    onChange={(e) =>
                      handleProductChange(Number(e.target.value))
                    }
                    className={`w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      errors.fk_order_product
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    title="Select product"
                    aria-label="Select product"
                  >
                    <option value="">Select a product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - Rs. {Number(product.price).toFixed(2)}
                      </option>
                    ))}
                  </select>
                  {errors.fk_order_product && (
                    <p className="mt-0.5 text-xs text-red-500">
                      {errors.fk_order_product}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newOrder.qty || ""}
                    onChange={(e) => handleNumberInput(e.target.value, "qty")}
                    className={`w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      errors.qty ? "border-red-500" : "border-gray-300"
                    }`}
                    title="Enter quantity"
                    aria-label="Enter quantity"
                    placeholder="Enter quantity"
                  />
                  {errors.qty && (
                    <p className="mt-0.5 text-xs text-red-500">{errors.qty}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price (Rs.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newOrder.unit_price || ""}
                    onChange={(e) =>
                      handleNumberInput(e.target.value, "unit_price")
                    }
                    className={`w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      errors.unit_price ? "border-red-500" : "border-gray-300"
                    }`}
                    title="Enter unit price"
                    aria-label="Enter unit price"
                    placeholder="Enter unit price"
                  />
                  {errors.unit_price && (
                    <p className="mt-0.5 text-xs text-red-500">
                      {errors.unit_price}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Required Date
                  </label>
                  <input
                    type="date"
                    value={newOrder.required_date}
                    min={editingOrder ? undefined : getTodayDate()}
                    onChange={(e) =>
                      setNewOrder({
                        ...newOrder,
                        required_date: e.target.value,
                      })
                    }
                    className={`w-full px-3 py-1.5 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      errors.required_date
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    title="Select required date"
                    aria-label="Select required date"
                  />
                  {errors.required_date && (
                    <p className="mt-0.5 text-xs text-red-500">
                      {errors.required_date}
                    </p>
                  )}
                </div>
                {editingOrder && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={newOrder.status}
                      onChange={(e) =>
                        setNewOrder({ ...newOrder, status: e.target.value })
                      }
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      title="Select order status"
                      aria-label="Select order status"
                    >
                      <option value="pending">Pending</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_transit">In Transit</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="flex justify-end p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                <button
                  onClick={() => {
                    setShowAddOrder(false);
                    resetForm();
                  }}
                  className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md mr-2 hover:bg-gray-300 text-sm"
                  title="Cancel"
                  aria-label="Cancel"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddOrder}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  title={editingOrder ? "Update order" : "Create order"}
                  aria-label={editingOrder ? "Update order" : "Create order"}
                >
                  {editingOrder ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Confirm Delete
                </h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete this order? This action cannot
                  be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setOrderToDelete(null);
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
      </div>
      {showDetailsModal && detailsOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold text-gray-800">
                  Order Details
                </h3>
                <span
                  className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                    detailsOrder.status
                  )}`}
                >
                  {detailsOrder.status}
                </span>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-500 transition-colors"
                title="Close details"
                aria-label="Close details"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-500">Order ID</p>
                  <p className="text-lg font-semibold text-gray-900">
                    #{detailsOrder.id}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Required Date
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(detailsOrder.required_date)}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Client
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {detailsOrder.client_name}
                  </p>
                </div>
                <div className="border-b pb-4">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Product
                  </p>
                  <p className="text-base font-semibold text-gray-900">
                    {detailsOrder.product_name}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    {" "}
                    <p className="text-sm font-medium text-gray-500 mb-1">
                      Quantity
                    </p>
                    <div className="text-base font-semibold text-gray-900">
                      <span>
                        {detailsOrder.adjustedQty !== undefined
                          ? detailsOrder.adjustedQty
                          : detailsOrder.qty}
                      </span>
                      {detailsOrder.adjustedQty !== undefined &&
                        detailsOrder.adjustedQty !== detailsOrder.qty && (
                          <span className="ml-2 text-sm font-normal text-gray-500">
                            (Initial: {detailsOrder.qty})
                          </span>
                        )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">
                      Unit Price
                    </p>
                    <p className="text-base font-semibold text-gray-900">
                      Rs. {formatPrice(detailsOrder.unit_price)}
                    </p>
                  </div>
                </div>
                {batchAssignments.map(
                  (assignment) =>
                    assignment.description && (
                      <div
                        key={assignment.id}
                        className="mt-4 bg-red-50 p-4 rounded-lg"
                      >
                        <p className="text-sm font-bold text-red-500 mb-1">
                          Special Notes
                        </p>
                        <p className="text-base text-gray-900">
                          {assignment.description}
                        </p>
                      </div>
                    )
                )}
                <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-500 mb-1">
                    Total Price
                  </p>
                  <p className="text-xl font-bold text-blue-600">
                    Rs. {formatPrice(detailsOrder.total_price)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatPrice = (price: number) => {
  return Number(price).toFixed(2);
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "in_transit":
      return "bg-blue-100 text-blue-800";
    case "assigned":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-yellow-100 text-yellow-800";
  }
};
