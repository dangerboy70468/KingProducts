
import { useState, useEffect } from "react";
import {
  PackageIcon,
  UsersIcon,
  ShoppingCartIcon,
  WarehouseIcon,
  TruckIcon,
  DollarSignIcon,
  Loader2Icon,
} from "lucide-react";
import api from "../api";

interface DashboardSummary {
  totalProducts: number;
  totalClients: number;
  ordersThisMonth: number;
  lowStockItems: number;
  pendingDeliveries: number;
  revenueThisMonth: number;
}

interface RecentOrder {
  id: string;
  client: string;
  product: string;
  date: string;
  status: string;
}

export const Dashboard = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch summary data
        const summaryResponse = await api.get("/dashboard/summary");
        setSummary(summaryResponse.data);

        // Fetch recent orders
        const ordersResponse = await api.get("/dashboard/recent-orders");
        setRecentOrders(ordersResponse.data);
      } catch (err: any) {
        console.error("Error fetching dashboard data:", err);
        let errorMessage = "Failed to load dashboard data. ";
        
        if (err.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          errorMessage += err.response.data?.error || err.response.data?.message || `Server error: ${err.response.status}`;
        } else if (err.request) {
          // The request was made but no response was received
          errorMessage += "No response received from server. Please check your connection.";
        } else {
          // Something happened in setting up the request that triggered an Error
          errorMessage += err.message || "An unexpected error occurred.";
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2Icon className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        <p>{error}</p>
      </div>
    );
  }

  const summaryCards = [
    {
      title: "Total Products",
      value: summary?.totalProducts.toString() || "0",
      icon: PackageIcon,
      color: "bg-blue-500",
    },
    {
      title: "Total Clients",
      value: summary?.totalClients.toString() || "0",
      icon: UsersIcon,
      color: "bg-green-500",
    },
    {
      title: "Orders This Month",
      value: summary?.ordersThisMonth.toString() || "0",
      icon: ShoppingCartIcon,
      color: "bg-purple-500",
    },
    {
      title: "Low Stock Items",
      value: summary?.lowStockItems.toString() || "0",
      icon: WarehouseIcon,
      color: "bg-yellow-500",
    },
    {
      title: "Pending Deliveries",
      value: summary?.pendingDeliveries.toString() || "0",
      icon: TruckIcon,
      color: "bg-orange-500",
    },
    {
      title: "Revenue This Month",
      value: typeof summary?.revenueThisMonth === 'number' && summary.revenueThisMonth > 0
        ? new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(summary.revenueThisMonth)
        : "Rs. 0.00",
      icon: DollarSignIcon,
      color: "bg-red-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
            >
              <div className="flex items-center">
                <div className={`${card.color} p-3 rounded-full`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">
                    {card.title}
                  </h3>
                  <p className="text-2xl font-semibold text-gray-900">
                    {card.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Recent Orders</h2>
        </div>
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
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentOrders.map((order: any) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.client}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.product}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        order.status === "Delivered" ||
                        order.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : order.status === "Processing" ||
                            order.status === "in_transit"
                          ? "bg-blue-100 text-blue-800"
                          : order.status === "assigned"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
