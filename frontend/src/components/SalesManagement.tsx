import React, { useState, useEffect } from "react";
import api from "../api";
import "./SalesManagement.css";
import { Bar, Line } from "react-chartjs-2";
import { format } from "date-fns";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

// Define interfaces for our data types
interface SalesSummary {
  total_orders: number;
  total_sales: number;
  average_order_value: number;
  first_sale_date?: string;
  last_sale_date?: string;
}

interface ProductSales {
  product_id: number;
  product_name: string;
  total_sales: number;
  total_quantity: number;
  order_count: number;
}

interface MonthlySales {
  month: string;
  total_sales: number;
}

interface ProductionCostResponse {
  total_production_cost: number;
}

export const SalesManagement = () => {
  // State for data
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [salesByProduct, setSalesByProduct] = useState<ProductSales[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlySales[]>([]);
  const [topProducts, setTopProducts] = useState<ProductSales[]>([]);
  const [productionCost, setProductionCost] = useState<number>(0);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [deliveredOrders, setDeliveredOrders] = useState<number>(0);

  // State for UI
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [filterApplied, setFilterApplied] = useState<boolean>(false);

  // Function to format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) return "Rs. 0.00";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Function to format number
  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined || isNaN(num)) return "0";
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Function to safely convert to number
  const toNumber = (value: any): number => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // Function to fetch data
  const fetchData = async (start?: string, end?: string) => {
    setLoading(true);
    setError(null);
    try {
      // Prepare API calls
      const apiCalls = [
        api.get("/sales/summary"),
        api.get("/sales/by-product"),
        api.get("/sales/monthly-trend"),
        api.get("/sales/top-products?limit=5"),
        api.get("/sales/production-cost"),
        api.get("/sales/total-orders"),
        api.get("/sales/total-delivered-orders"),
      ];

      // Add date range filter if provided
      if (start && end && filterApplied) {
        apiCalls.push(api.get(`/sales/range?start_date=${start}&end_date=${end}`));
      }

      // Execute all API calls in parallel
      const [
        summaryRes,
        salesByProductRes,
        monthlyTrendRes,
        topProductsRes,
        productionCostRes,
        totalOrdersRes,
        deliveredOrdersRes,
      ] = await Promise.all(apiCalls);

      console.log('Sales Summary Response:', summaryRes.data);
      console.log('Sales by Product Response:', salesByProductRes.data);
      console.log('Monthly Trend Response:', monthlyTrendRes.data);
      console.log('Top Products Response:', topProductsRes.data);

      // Set summary data
      setSummary({
        total_orders: toNumber(summaryRes.data?.total_orders),
        total_sales: toNumber(summaryRes.data?.total_sales),
        average_order_value: toNumber(summaryRes.data?.average_order_value),
        first_sale_date: summaryRes.data?.first_sale_date,
        last_sale_date: summaryRes.data?.last_sale_date
      });

      // Set sales by product data
      setSalesByProduct(salesByProductRes.data?.map((product: ProductSales) => ({
        ...product,
        total_sales: toNumber(product.total_sales),
        total_quantity: toNumber(product.total_quantity),
        order_count: toNumber(product.order_count)
      })) || []);

      // Set monthly trend data
      setMonthlyTrend(monthlyTrendRes.data?.map((trend: MonthlySales) => ({
        month: trend.month,
        total_sales: toNumber(trend.total_sales)
      })) || []);

      // Set top products data
      setTopProducts(topProductsRes.data?.map((product: ProductSales) => ({
        ...product,
        total_sales: toNumber(product.total_sales),
        total_quantity: toNumber(product.total_quantity),
        order_count: toNumber(product.order_count)
      })) || []);

      // Set production cost
      setProductionCost(toNumber(productionCostRes.data?.total_production_cost));

      // Set order counts
      setTotalOrders(toNumber(totalOrdersRes.data?.total_orders));
      setDeliveredOrders(toNumber(deliveredOrdersRes.data?.total_delivered_orders));

    } catch (err: any) {
      console.error("Error fetching sales data:", err);
      let errorMessage = "Failed to fetch sales data. ";
      
      if (err.response) {
        console.error('Error Response:', err.response);
        errorMessage += err.response.data?.error || err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        console.error('Error Request:', err.request);
        errorMessage += "No response received from server. Please check your connection.";
      } else {
        console.error('Error Message:', err.message);
        errorMessage += err.message || "An unexpected error occurred.";
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Handle date filter
  const handleDateFilter = () => {
    if (startDate && endDate) {
      if (new Date(endDate) < new Date(startDate)) {
        setError("End date cannot be before start date");
        return;
      }
      setFilterApplied(true);
      fetchData(startDate, endDate);
    } else {
      setError("Please select both start and end dates");
    }
  };

  // Reset filters
  const resetFilters = () => {
    setStartDate("");
    setEndDate("");
    setFilterApplied(false);
    fetchData();
  };

  // Chart configurations
  const monthlyTrendChartData = {
    labels: monthlyTrend.map((d) => format(new Date(d.month + "-01"), "MMM yyyy")),
    datasets: [
      {
        label: "Total Sales",
        data: monthlyTrend.map((d) => d.total_sales),
        borderColor: "rgb(75, 192, 192)",
        tension: 0.1,
        fill: false
      }
    ]
  };

  const topProductsChartData = {
    labels: topProducts.map((p) => p.product_name),
    datasets: [
      {
        label: "Sales Amount",
        data: topProducts.map((p) => p.total_sales),
        backgroundColor: "rgba(54, 162, 235, 0.5)",
        borderColor: "rgb(54, 162, 235)",
        borderWidth: 1
      }
    ]
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="text-center text-red-600 p-4 bg-red-50 rounded-lg">
        <p>{error}</p>
        <button 
          onClick={() => fetchData()} 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  // Render empty state
  if (!summary) {
    return (
      <div className="sales-management-container">
        <div className="empty-state">
          <h3>No Sales Data Available</h3>
          <p>There is no sales data to display at this time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Date Filter */}
      <div className="flex gap-4 items-center bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col">
          <label htmlFor="start-date" className="text-sm text-gray-600 mb-1">Start Date</label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded px-3 py-2"
            aria-label="Start date for sales filter"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="end-date" className="text-sm text-gray-600 mb-1">End Date</label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded px-3 py-2"
            aria-label="End date for sales filter"
          />
        </div>
        <button
          onClick={handleDateFilter}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Apply Filter
        </button>
        {filterApplied && (
          <button
            onClick={resetFilters}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Reset
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 sm:p-6 h-full flex flex-col justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 text-center">Total Sales</h3>
            <div className="mt-2 sm:mt-4 flex items-center justify-center">
              <p className="text-2xl sm:text-3xl font-bold text-blue-600 tabular-nums tracking-tight">
                {formatCurrency(summary?.total_sales)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 sm:p-6 h-full flex flex-col justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 text-center">Total Orders</h3>
            <div className="mt-2 sm:mt-4 flex items-center justify-center">
              <p className="text-2xl sm:text-3xl font-bold text-green-600 tabular-nums tracking-tight">
                {formatNumber(summary?.total_orders)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 sm:p-6 h-full flex flex-col justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 text-center">Average Order Value</h3>
            <div className="mt-2 sm:mt-4 flex items-center justify-center">
              <p className="text-2xl sm:text-3xl font-bold text-purple-600 tabular-nums tracking-tight">
                {formatCurrency(summary?.average_order_value)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 sm:p-6 h-full flex flex-col justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-gray-700 text-center">Profit Margin</h3>
            <div className="mt-2 sm:mt-4 flex items-center justify-center">
              <p className="text-2xl sm:text-3xl font-bold text-orange-600 tabular-nums tracking-tight">
                {formatCurrency(Math.max(0, (summary?.total_sales || 0) - productionCost))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4">Monthly Sales Trend</h3>
          <div className="w-full aspect-[16/9]">
            <Line data={monthlyTrendChartData} options={{ 
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: {
                  position: 'top' as const,
                },
              }
            }} />
          </div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
          <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4">Top Products by Sales</h3>
          <div className="w-full aspect-[16/9]">
            <Bar data={topProductsChartData} options={{ 
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: {
                  position: 'top' as const,
                }
              }
            }} />
          </div>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-4">Top Products Details</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Product
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Total Sales
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Quantity Sold
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Order Count
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topProducts.map((product) => (
                <tr key={product.product_id} className="hover:bg-gray-50">
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {product.product_name}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 tabular-nums">
                    {formatCurrency(product.total_sales)}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 tabular-nums">
                    {product.total_quantity}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 tabular-nums">
                    {product.order_count}
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
