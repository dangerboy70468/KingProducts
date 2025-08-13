import { useEffect, useState } from "react";
import { PlusIcon, PencilIcon, TrashIcon, XIcon, Search } from "lucide-react";
import api from "../api";

interface Client {
  id: number;
  name: string;
  contact_person: string;
  location: string;
  phone1: string;
  phone2: string;
  email: string;
  total_orders?: number;
  total_amount?: string; // Changed to string since MySQL returns it as string
}

interface ValidationErrors {
  name?: string;
  contact_person?: string;
  location?: string;
  phone1?: string;
  email?: string;
}

export const ClientManagement = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddClient, setShowAddClient] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [newClient, setNewClient] = useState({
    name: "",
    contact_person: "",
    location: "",
    phone1: "",
    phone2: "",
    email: "",
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<number | null>(null);

  useEffect(() => {
    fetchClients();

    // Add event listener for client updates
    window.addEventListener("client-update", fetchClients);

    // Cleanup listener
    return () => {
      window.removeEventListener("client-update", fetchClients);
    };
  }, []);

  useEffect(() => {
    const filtered = clients.filter((client) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        !searchTerm ||
        client.name.toLowerCase().includes(searchLower) ||
        client.contact_person.toLowerCase().includes(searchLower) ||
        client.location.toLowerCase().includes(searchLower) ||
        client.email.toLowerCase().includes(searchLower) ||
        client.phone1.includes(searchTerm) ||
        (client.phone2 && client.phone2.includes(searchTerm))
      );
    });
    setFilteredClients(filtered);
  }, [clients, searchTerm]);

  const fetchClients = async () => {
    try {
      const response = await api.get("/clients");
      // Parse total_amount to number since it comes as string from MySQL
      const clientsWithParsedAmounts = response.data.map((client: Client) => ({
        ...client,
        total_amount: client.total_amount ? parseFloat(client.total_amount) : 0,
      }));
      setClients(clientsWithParsedAmounts);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const validateForm = () => {
    const newErrors: ValidationErrors = {};

    if (!newClient.name.trim()) {
      newErrors.name = "Company name is required";
    }

    if (!newClient.contact_person.trim()) {
      newErrors.contact_person = "Contact person is required";
    }

    if (!newClient.phone1.trim()) {
      newErrors.phone1 = "Primary phone is required";
    }

    if (!newClient.location.trim()) {
      newErrors.location = "Location is required";
    }

    if (!newClient.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newClient.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddClient = async () => {
    if (validateForm()) {
      try {
        if (editingClient) {
          // Update existing client
          await api.put(`/clients/${editingClient.id}`, newClient);
          setClients(
            clients.map((c) =>
              c.id === editingClient.id ? { ...c, ...newClient } : c
            )
          );
          setEditingClient(null);
        } else {
          // Add new client
          const response = await api.post("/clients", newClient);
          setClients([...clients, response.data]);
        }

        // Reset form
        setNewClient({
          name: "",
          contact_person: "",
          location: "",
          phone1: "",
          phone2: "",
          email: "",
        });
        setErrors({});
        setShowAddClient(false);
      } catch (error) {
        console.error("Error saving client:", error);
      }
    }
  };

  const handleDeleteClick = (id: number) => {
    setClientToDelete(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (clientToDelete) {
      try {
        await api.delete(`/clients/${clientToDelete}`);
        setClients(clients.filter((client) => client.id !== clientToDelete));
        setShowDeleteConfirm(false);
        setClientToDelete(null);
      } catch (error: any) {
        console.error("Error deleting client:", error);
        alert(error.response?.data?.error || "Error deleting client");
      }
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setNewClient({
      name: client.name,
      contact_person: client.contact_person,
      location: client.location,
      phone1: client.phone1,
      phone2: client.phone2 || "",
      email: client.email,
    });
    setErrors({});
    setShowAddClient(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
        <h2 className="text-xl font-semibold text-gray-800">
          Client Management
        </h2>
        <button
          onClick={() => {
            setEditingClient(null);
            setNewClient({
              name: "",
              contact_person: "",
              location: "",
              phone1: "",
              phone2: "",
              email: "",
            });
            setShowAddClient(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700 w-fit"
        >
          <PlusIcon className="h-4 w-4 mr-2" /> Add Client
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 relative">
            <input
              type="text"
              placeholder="Search clients..."
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

      {/* Clients Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Person
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone 1
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone 2
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <tr key={client.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {client.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {client.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {client.contact_person}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {client.location || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {client.phone1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {client.phone2 || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {client.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {client.total_orders || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    Rs. {parseFloat(client.total_amount || "0").toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditClient(client)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit client"
                        aria-label="Edit client"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(client.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete client"
                        aria-label="Delete client"
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

      {/* Add/Edit Client Modal */}
      {showAddClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingClient ? "Edit Client" : "Add New Client"}
              </h3>
              <button
                onClick={() => setShowAddClient(false)}
                className="text-gray-400 hover:text-gray-500"
                title="Close modal"
                aria-label="Close modal"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label
                  htmlFor="company-name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Company Name
                </label>
                <input
                  id="company-name"
                  type="text"
                  value={newClient.name}
                  onChange={(e) =>
                    setNewClient({
                      ...newClient,
                      name: e.target.value,
                    })
                  }
                  className={`w-full px-3 py-1.5 border ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm`}
                />
                {errors.name && (
                  <p className="mt-0.5 text-xs text-red-500">{errors.name}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor="contact-person"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Contact Person
                </label>
                <input
                  id="contact-person"
                  type="text"
                  value={newClient.contact_person}
                  onChange={(e) =>
                    setNewClient({
                      ...newClient,
                      contact_person: e.target.value,
                    })
                  }
                  className={`w-full px-3 py-1.5 border ${
                    errors.contact_person ? "border-red-500" : "border-gray-300"
                  } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm`}
                />
                {errors.contact_person && (
                  <p className="mt-0.5 text-xs text-red-500">
                    {errors.contact_person}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Location
                </label>
                <input
                  id="location"
                  type="text"
                  value={newClient.location}
                  onChange={(e) =>
                    setNewClient({
                      ...newClient,
                      location: e.target.value,
                    })
                  }
                  className={`w-full px-3 py-1.5 border ${
                    errors.location ? "border-red-500" : "border-gray-300"
                  } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm`}
                />
                {errors.location && (
                  <p className="mt-0.5 text-xs text-red-500">
                    {errors.location}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="phone1"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Phone 1
                </label>
                <input
                  id="phone1"
                  type="text"
                  value={newClient.phone1}
                  onChange={(e) =>
                    setNewClient({
                      ...newClient,
                      phone1: e.target.value,
                    })
                  }
                  className={`w-full px-3 py-1.5 border ${
                    errors.phone1 ? "border-red-500" : "border-gray-300"
                  } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm`}
                />
                {errors.phone1 && (
                  <p className="mt-0.5 text-xs text-red-500">{errors.phone1}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor="phone2"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Phone 2 (Optional)
                </label>
                <input
                  id="phone2"
                  type="text"
                  value={newClient.phone2}
                  onChange={(e) =>
                    setNewClient({
                      ...newClient,
                      phone2: e.target.value,
                    })
                  }
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={newClient.email}
                  onChange={(e) =>
                    setNewClient({
                      ...newClient,
                      email: e.target.value,
                    })
                  }
                  className={`w-full px-3 py-1.5 border ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm`}
                />
                {errors.email && (
                  <p className="mt-0.5 text-xs text-red-500">{errors.email}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setShowAddClient(false)}
                className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md mr-2 hover:bg-gray-300 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAddClient}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                {editingClient ? "Update" : "Add"}
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
              <h3 className="text-lg font-semibold text-gray-800">
                Confirm Delete
              </h3>
              <p className="text-sm text-gray-600 mt-2">
                Are you sure you want to delete this client? This action cannot
                be undone.
              </p>
            </div>
            <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md mr-2 hover:bg-gray-300"
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
      )}
    </div>
  );
};
