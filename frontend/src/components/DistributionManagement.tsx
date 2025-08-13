import { useEffect, useState } from "react";
import {
  PlusIcon,
  PlayIcon,
  StopCircleIcon,
  TrashIcon,
  XIcon,
  BanIcon,
  Search,
  EyeIcon,
} from "lucide-react";
import api from "../api";

interface Employee {
  id: number;
  name: string;
  type_name: string;
}

interface Order {
  id: number;
  client_name: string;
  product_name: string;
  qty: number;
  assigned_qty: number;
  unit_price: number;
  total_price: number;
  status: string;
  batch_notes?: string;
}

interface Distribution {
  id: number;
  date: string;
  departure_time: string | null;
  arrival_time: string | null;
  notes: string;
  employee_names: string;
  order_details: string;
}

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

export const DistributionManagement = () => {
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [detailsItem, setDetailsItem] = useState<Distribution | null>(null);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);
  const [detailedOrders, setDetailedOrders] = useState<Order[]>([]);
  const [detailedEmployees, setDetailedEmployees] = useState<Employee[]>([]);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedDistribution, setSelectedDistribution] =
    useState<Distribution | null>(null);

  // Filter distributions based on search term
  const filteredDistributions = distributions.filter((dist) => {
    const searchStr = searchTerm.toLowerCase();
    return (
      dist.id.toString().includes(searchStr) ||
      (dist.employee_names &&
        dist.employee_names.toLowerCase().includes(searchStr)) ||
      (dist.order_details &&
        dist.order_details.toLowerCase().includes(searchStr)) ||
      (dist.notes && dist.notes.toLowerCase().includes(searchStr))
    );
  });

  const fetchDistributions = async () => {
    try {
      const response = await api.get("/distribution");
      setDistributions(response.data || []);
    } catch (err) {
      const error = err as ApiError;
      setError(error.response?.data?.error || "Failed to fetch distributions");
      console.error(error);
      setDistributions([]);
    }
  };

  const fetchAvailableEmployees = async () => {
    try {
      const response = await api.get("/distribution/available-employees");
      setAvailableEmployees(response.data || []);
    } catch (err) {
      const error = err as ApiError;
      setError(
        error.response?.data?.error || "Failed to fetch available employees"
      );
      console.error(error);
    }
  };

  const fetchAvailableOrders = async () => {
    try {
      const response = await api.get("/distribution/available-orders");
      setAvailableOrders(response.data || []);
    } catch (err) {
      const error = err as ApiError;
      setError(
        error.response?.data?.error || "Failed to fetch available orders"
      );
      console.error(error);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchDistributions().finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!selectedEmployees.length || !selectedOrders.length) {
      setError("Please select at least one employee and one order");
      return;
    }

    setLoading(true);
    try {
      const formData = {
        notes,
        employeeIds: selectedEmployees,
        orderIds: selectedOrders,
      };

      await api.post("/distribution", formData);

      setShowCreateModal(false);
      setSelectedEmployees([]);
      setSelectedOrders([]);
      setNotes("");
      fetchDistributions();
      setError("");
    } catch (err) {
      const error = err as ApiError;
      setError(error.response?.data?.error || "Failed to create distribution");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartJob = async (id: number) => {
    if (!id) {
      setError("Invalid distribution ID");
      return;
    }

    try {
      setError("");
      setLoading(true);
      
      // First check if distribution exists and is in correct state
      const response = await api.post(`/distribution/${id}/start`);
      
      if (response.data?.message) {
        // Clear any existing errors
        setError("");
        // Refresh the distributions list
        await fetchDistributions();
      }
    } catch (err) {
      const error = err as ApiError;
      const errorMessage = error.response?.data?.error || "Failed to start job";
      setError(errorMessage);
      console.error("Error starting job:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEndJob = async (id: number) => {
    if (!id) {
      setError("Invalid distribution ID");
      return;
    }

    try {
      setError("");
      setLoading(true);
      
      // First check if distribution exists and is in correct state
      const response = await api.post(`/distribution/${id}/end`);
      
      if (response.data?.message) {
        // Clear any existing errors
        setError("");
        // Refresh the distributions list
        await fetchDistributions();
      }
    } catch (err) {
      const error = err as ApiError;
      const errorMessage = error.response?.data?.error || "Failed to end job";
      setError(errorMessage);
      console.error("Error ending job:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelJob = async (id: number) => {
    try {
      setError("");
      setLoading(true);
      await api.post(`/distribution/${id}/cancel`);
      await fetchDistributions();
    } catch (err) {
      const error = err as ApiError;
      setError(error.response?.data?.error || "Failed to cancel job");
      console.error("Error canceling job:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/distribution/${id}`);
      fetchDistributions();
      setError("");
    } catch (err) {
      const error = err as ApiError;
      setError(error.response?.data?.error || "Failed to delete distribution");
      console.error(error);
    }
  };

  const handleViewDetails = async (distribution: Distribution) => {
    setDetailsItem(distribution);
    setShowDetails(true);
    setDetailsLoading(true);
    try {
      const ordersPromise = api.get(`/distribution/${distribution.id}/orders`);
      const employeesPromise = api.get(
        `/distribution/${distribution.id}/employees`
      );

      const [ordersResponse, employeesResponse] = await Promise.all([
        ordersPromise,
        employeesPromise,
      ]);

      setDetailedOrders(ordersResponse.data || []);
      setDetailedEmployees(employeesResponse.data || []);
    } catch (error) {
      setError("Failed to fetch distribution details.");
      setDetailedOrders([]);
      setDetailedEmployees([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleShowEmployees = async (distribution: Distribution) => {
    setSelectedDistribution(distribution);
    setDetailsLoading(true);
    try {
      const response = await api.get(
        `/distribution/${distribution.id}/employees`
      );
      setDetailedEmployees(response.data || []);
      setShowEmployeeDetails(true);
    } catch (err) {
      const error = err as ApiError;
      setError(
        error.response?.data?.error || "Failed to fetch employee details"
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleShowOrders = async (distribution: Distribution) => {
    setSelectedDistribution(distribution);
    setDetailsLoading(true);
    try {
      const response = await api.get(`/distribution/${distribution.id}/orders`);
      setDetailedOrders(response.data || []);
      setShowOrderDetails(true);
    } catch (err) {
      const error = err as ApiError;
      setError(error.response?.data?.error || "Failed to fetch order details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const formatTimeOrNull = (time: string | null): string => {
    if (!time) return "Not set";
    try {
      const [hours, minutes] = time.split(":");
      const timeValue = new Date();
      timeValue.setHours(parseInt(hours, 10));
      timeValue.setMinutes(parseInt(minutes, 10));
      return timeValue.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch (error) {
      console.error("Invalid time format:", time);
      return "Invalid time";
    }
  };

  const OrderDetails = ({ orders }: { orders: Order[] }) => (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-2">Orders</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Qty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.client_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.product_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.assigned_qty}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(order.unit_price)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(order.total_price)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.batch_notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
        <h2 className="text-xl font-semibold text-gray-800">
          Distribution Management
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setShowCreateModal(true);
              fetchAvailableEmployees();
              fetchAvailableOrders();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700"
            title="Create distribution"
            aria-label="Create distribution"
          >
            <PlusIcon className="h-4 w-4 mr-2" /> Create Distribution
          </button>
        </div>
      </div>
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 relative">
            <input
              type="text"
              placeholder="Search distributions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employees
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Departed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Returned
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
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
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    Loading distributions...
                  </td>
                </tr>
              ) : filteredDistributions.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    {distributions.length === 0
                      ? "No distributions found. Create one to get started."
                      : "No distributions match your search."}
                  </td>
                </tr>
              ) : (
                filteredDistributions.map((dist) => (
                  <tr key={dist.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {dist.id}
                    </td>{" "}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleShowEmployees(dist)}
                        className="flex items-center text-green-600 hover:text-green-900"
                        title="View employees"
                        aria-label="View employees"
                      >
                        <EyeIcon className="h-5 w-5 mr-1" /> View
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleShowOrders(dist)}
                        className="flex items-center text-green-600 hover:text-green-900"
                        title="View orders"
                        aria-label="View orders"
                      >
                        <EyeIcon className="h-5 w-5 mr-1" /> View
                      </button>
                    </td>{" "}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded
                        ${
                          !dist.departure_time
                            ? "bg-gray-100 text-gray-800"
                            : formatTimeOrNull(dist.departure_time) ===
                              "Invalid time"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-50 text-blue-800"
                        }`}
                      >
                        {formatTimeOrNull(dist.departure_time)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded
                        ${
                          !dist.arrival_time
                            ? "bg-gray-100 text-gray-800"
                            : formatTimeOrNull(dist.arrival_time) ===
                              "Invalid time"
                            ? "bg-red-100 text-red-800"
                            : "bg-green-50 text-green-800"
                        }`}
                      >
                        {formatTimeOrNull(dist.arrival_time)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(dist.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${
                          !dist.departure_time
                            ? "bg-gray-100 text-gray-800"
                            : !dist.arrival_time
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {!dist.departure_time
                          ? "Not Started"
                          : !dist.arrival_time
                          ? "In Progress"
                          : "Completed"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleViewDetails(dist)}
                        className="flex items-center text-green-600 hover:text-green-900"
                        title="View details"
                      >
                        <EyeIcon className="h-5 w-5 mr-1" /> View
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {!dist.departure_time ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStartJob(dist.id)}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                              title="Start Job"
                            >
                              <PlayIcon className="w-4 h-4 mr-1" /> Start
                            </button>
                            <button
                              onClick={() => handleDelete(dist.id)}
                              className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700"
                              title="Delete Distribution"
                            >
                              <TrashIcon className="w-4 h-4 mr-1" /> Delete
                            </button>
                          </div>
                        ) : !dist.arrival_time ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEndJob(dist.id)}
                              className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700"
                              title="End Job"
                            >
                              <StopCircleIcon className="w-4 h-4 mr-1" /> Finish
                            </button>
                            <button
                              onClick={() => handleCancelJob(dist.id)}
                              className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700"
                              title="Cancel Job"
                            >
                              <BanIcon className="w-4 h-4 mr-1" /> Cancel
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Create Distribution Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Create Distribution
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
                title="Close"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <h4 className="font-medium mb-2">Select Employees</h4>
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  {availableEmployees.map((emp) => (
                    <label
                      key={emp.id}
                      className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(emp.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEmployees([
                              ...selectedEmployees,
                              emp.id,
                            ]);
                          } else {
                            setSelectedEmployees(
                              selectedEmployees.filter((id) => id !== emp.id)
                            );
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {emp.name} ({emp.type_name})
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Select Orders</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Select</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Qty</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Price</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {availableOrders.map((order) => (
                        <tr key={order.id} className={selectedOrders.includes(order.id) ? 'bg-blue-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              id={`order-${order.id}`}
                              aria-label={`Select order #${order.id} for distribution`}
                              checked={selectedOrders.includes(order.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedOrders([...selectedOrders, order.id]);
                                } else {
                                  setSelectedOrders(selectedOrders.filter((id) => id !== order.id));
                                }
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{order.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.client_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.product_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.assigned_qty}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(order.unit_price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'LKR' }).format(order.total_price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block font-medium mb-2">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                rows={3}
                placeholder="Optional notes about this distribution..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : "Create Distribution"}
              </button>
            </div>
          </div>
        </div>
      )}{" "}
      {/* Details Modal */}
      {showDetails && detailsItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold text-gray-800">
                  Distribution #{detailsItem.id}
                </h3>
                <span
                  className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center ${
                    !detailsItem.departure_time
                      ? "bg-gray-100 text-gray-800"
                      : !detailsItem.arrival_time
                      ? "bg-blue-100 text-blue-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {!detailsItem.departure_time
                    ? "Not Started"
                    : !detailsItem.arrival_time
                    ? "In Progress"
                    : "Completed"}
                </span>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-500 transition-colors"
                title="Close details"
                aria-label="Close details"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              {detailsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-gray-500">
                    Loading distribution details...
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Basic Info Card */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Date Created
                      </p>
                      <p className="text-sm font-semibold text-gray-900">
                        {new Date(detailsItem.date).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Time Departed
                      </p>
                      <p className="text-sm font-semibold">
                        <span
                          className={`inline-flex px-2 py-1 rounded ${
                            !detailsItem.departure_time
                              ? "bg-gray-100 text-gray-800"
                              : "bg-blue-50 text-blue-800"
                          }`}
                        >
                          {formatTimeOrNull(detailsItem.departure_time)}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Time Returned
                      </p>
                      <p className="text-sm font-semibold">
                        <span
                          className={`inline-flex px-2 py-1 rounded ${
                            !detailsItem.arrival_time
                              ? "bg-gray-100 text-gray-800"
                              : "bg-green-50 text-green-800"
                          }`}
                        >
                          {formatTimeOrNull(detailsItem.arrival_time)}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Total Orders
                      </p>
                      <p className="text-sm font-semibold text-gray-900">
                        {detailedOrders.length}
                      </p>
                    </div>
                  </div>

                  {/* Notes Section */}
                  {detailsItem.notes && (
                    <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800 mb-1">
                        Notes
                      </p>
                      <p className="text-sm text-gray-800">
                        {detailsItem.notes}
                      </p>
                    </div>
                  )}

                  {/* Distribution Team Section */}
                  <div className="border-t pt-4">
                    <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                      <span className="mr-2">Distribution Team</span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        {detailedEmployees.length} Members
                      </span>
                    </h4>
                    <div className="bg-white border rounded-lg divide-y divide-gray-100">
                      {detailedEmployees.map((emp) => (
                        <div
                          key={emp.id}
                          className="p-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {emp.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {emp.type_name}
                              </p>
                            </div>
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              ID: {emp.id}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Details Section */}
                  <div className="border-t pt-4">
                    <h4 className="text-base font-semibold text-gray-800 mb-3 flex items-center">
                      <span className="mr-2">Order Details</span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        {detailedOrders.length} Orders
                      </span>
                    </h4>
                    <OrderDetails orders={detailedOrders} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Employee Details Modal */}
      {showEmployeeDetails && selectedDistribution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">
                Distribution #{selectedDistribution.id} - Employees
              </h3>{" "}
              <button
                onClick={() => setShowEmployeeDetails(false)}
                className="text-gray-400 hover:text-gray-500"
                title="Close employee details"
                aria-label="Close employee details"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              {detailsLoading ? (
                <div className="text-center py-4">
                  Loading employee details...
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {detailedEmployees.map((emp) => (
                    <div key={emp.id} className="py-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {emp.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {emp.type_name}
                          </p>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          ID: {emp.id}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Order Details Modal */}
      {showOrderDetails && selectedDistribution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800">
                Distribution #{selectedDistribution.id} - Orders
              </h3>{" "}
              <button
                onClick={() => setShowOrderDetails(false)}
                className="text-gray-400 hover:text-gray-500"
                title="Close order details"
                aria-label="Close order details"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              {detailsLoading ? (
                <div className="text-center py-4">Loading order details...</div>
              ) : (
                <OrderDetails orders={detailedOrders} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
