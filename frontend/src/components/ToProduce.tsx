import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import api from "../api";

interface ProductItem {
  product_id: number;
  product_name: string;
  quantity: number;
  clients: string[];
  order_count: number;
  required_date: string;
}

interface UrgencyGroup {
  urgency: "overdue" | "today" | "tomorrow" | "upcoming";
  products: ProductItem[];
}

export const ToProduce = () => {
  const [productionGroups, setProductionGroups] = useState<UrgencyGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchProductionItems();
  }, []);

  const fetchProductionItems = async () => {
    try {
      const response = await api.get("/production/requirements");
      setProductionGroups(response.data);
    } catch (error) {
      console.error("Error fetching production items:", error);
    }
  };

  const filteredGroups = productionGroups
    .map((group) => ({
      ...group,
      products: group.products.filter((product) =>
        product.product_name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))
    .filter((group) => group.products.length > 0);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "overdue":
        return "bg-red-100 text-red-800 border-red-200";
      case "today":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "tomorrow":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getUrgencyTitle = (urgency: string) => {
    switch (urgency) {
      case "overdue":
        return "OVERDUE - Needs Immediate Attention";
      case "today":
        return "Due Today";
      case "tomorrow":
        return "Due Tomorrow";
      default:
        return "Upcoming Production";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
        <h2 className="text-xl font-semibold text-gray-800">
          Production Requirements
        </h2>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Production Groups */}
      <div className="space-y-6">
        {filteredGroups.map((group) => (
          <div
            key={group.urgency}
            className={`rounded-lg border ${getUrgencyColor(
              group.urgency
            )} p-4`}
          >
            <h3 className="text-lg font-semibold mb-4">
              {getUrgencyTitle(group.urgency)}
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Required Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Orders & Clients
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {group.products.map((product) => (
                    <tr key={`${product.product_id}-${product.required_date}`}>
                      <td className="px-4 py-3 text-sm font-medium">
                        {product.product_name}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {product.quantity} units
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(product.required_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-medium">
                          {product.order_count} orders
                        </span>
                        <br />
                        <span className="text-sm text-gray-600">
                          from: {product.clients.join(", ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
