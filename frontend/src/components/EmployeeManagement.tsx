import { useEffect, useState } from "react";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XIcon,
  Search,
  EyeIcon,
} from "lucide-react";
import api from "../api";

interface Employee {
  id: number;
  name: string;
  type_id: number;
  type_name: string;
  email: string;
  phone1: string;
  nic: string | null;
  acc_no: string | null;
  dob: string | null;
  phone2: string | null;
}

interface EmployeeInput {
  name: string;
  type_id: number;
  email: string;
  phone1: string;
  nic: string | null;
  acc_no: string | null;
  dob: string | null;
  phone2: string | null;
  password?: string;
  confirmPassword?: string;
}



interface ValidationErrors {
  name?: string;
  type_id?: string;
  email?: string;
  phone1?: string;
  password?: string;
  confirmPassword?: string;
  acc_no?: string;
  nic?: string;
}

interface EmployeeType {
  id: number;
  name: string;
  description: string;
  basic_salary: number;
}

interface EmployeeTypeInput {
  name: string;
  description: string;
  basic_salary: string;
}

const emptyEmployee: EmployeeInput = {
  name: "",
  type_id: 0,
  email: "",
  phone1: "",
  nic: null,
  acc_no: null,
  dob: null,
  phone2: null,
  password: "",
  confirmPassword: "",
};

export const EmployeeManagement = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [newEmployee, setNewEmployee] = useState<EmployeeInput>(emptyEmployee);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>([]);
  const [showEmployeeTypeModal, setShowEmployeeTypeModal] = useState(false);
  const [newEmployeeType, setNewEmployeeType] = useState<EmployeeTypeInput>({
    name: "",
    description: "",
    basic_salary: "0",
  });
  const [showTypesModal, setShowTypesModal] = useState(false);
  const [editingEmployeeType, setEditingEmployeeType] =
    useState<EmployeeType | null>(null);
  const [employeeTypeError, setEmployeeTypeError] = useState("");

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    const filtered = employees.filter((employee) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        !searchTerm ||
        employee.name.toLowerCase().includes(searchLower) ||
        employee.type_name.toLowerCase().includes(searchLower) ||
        employee.email.toLowerCase().includes(searchLower)
      );
    });
    setFilteredEmployees(filtered);
  }, [employees, searchTerm]);
  const fetchEmployees = async () => {
    try {
      const response = await api.get("/employees");
      const employees = response.data.map((emp: any) => ({
        ...emp,
        type_id: Number(emp.type_id),
        acc_no: emp.acc_no || null,
        nic: emp.nic || null,
        dob: emp.dob || null,
        phone2: emp.phone2 || null,
      }));
      setEmployees(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchEmployeeTypes = async () => {
    try {
      const response = await api.get("/employee-types");
      const types = response.data.map((type: any) => ({
        ...type,
        basic_salary: Number(type.basic_salary) || 0
      }));
      setEmployeeTypes(types);
    } catch (error) {
      console.error("Error fetching employee types:", error);
    }
  };
  const validateEmployee = () => {
    const newErrors: ValidationErrors = {};

    // Required fields
    if (!newEmployee.name.trim()) {
      newErrors.name = "Employee name is required";
    }

    if (!newEmployee.type_id) {
      newErrors.type_id = "Employee type is required";
    }

    if (!newEmployee.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(newEmployee.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!newEmployee.phone1.trim()) {
      newErrors.phone1 = "Primary phone number is required";
    }

    // Password validation for new employees
    if (!editingEmployee) {
      if (!newEmployee.password) {
        newErrors.password = "Password is required";
      } else if (newEmployee.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }

      if (!newEmployee.confirmPassword) {
        newErrors.confirmPassword = "Please confirm password";
      } else if (newEmployee.password !== newEmployee.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setNewEmployee(emptyEmployee);
    setErrors({});
  };
  const handleAddEmployee = async () => {
    if (validateEmployee()) {
      try {
        // Convert and validate account number
        let accNoInt = null;
        if (newEmployee.acc_no) {
          accNoInt = parseInt(newEmployee.acc_no);
          if (isNaN(accNoInt)) {
            setErrors((prev) => ({
              ...prev,
              acc_no: "Account number must be a valid number",
            }));
            return;
          }
        }

        const employeeData = {
          ...newEmployee,
          acc_no: accNoInt,
          password: newEmployee.password?.substring(0, 45),
          nic: newEmployee.nic || null,
          dob: newEmployee.dob || null,
          phone2: newEmployee.phone2 || null,
        };

        if (editingEmployee) {
          const { password, confirmPassword, ...updateData } = employeeData;
          await api.put(`/employees/${editingEmployee.id}`, updateData);
          await fetchEmployees(); // Refresh the list to get updated data
        } else {
          await api.post("/employees", employeeData);
          await fetchEmployees(); // Refresh the list to get new data
        }

        resetForm();
        setShowAddEmployee(false);
      } catch (error: any) {
        console.error("Error saving employee:", error);

        // Get the error message from the response
        let errorMessage = "An error occurred while saving the employee.";
        if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.message) {
          errorMessage = error.message;
        }

        // Show error in alert
        alert(errorMessage);

        // If it's a validation error, highlight the fields
        if (error.response?.status === 400) {
          const fieldErrors: ValidationErrors = {};
          if (errorMessage.includes("Email")) {
            fieldErrors.email = errorMessage;
          } else if (errorMessage.includes("NIC")) {
            fieldErrors.nic = errorMessage;
          } else if (errorMessage.includes("Account")) {
            fieldErrors.acc_no = errorMessage;
          }
          setErrors((prevErrors) => ({ ...prevErrors, ...fieldErrors }));
        }
      }
    }
  };

  const handleAddEmployeeType = async () => {
    try {
      if (!newEmployeeType.name.trim()) {
        setEmployeeTypeError("Type name is required");
        return;
      }

      setEmployeeTypeError("");
      const typeData = {
        ...newEmployeeType,
        basic_salary: Number(newEmployeeType.basic_salary) || 0
      };

      if (editingEmployeeType) {
        await api.put(
          `/employee-types/${editingEmployeeType.id}`,
          typeData
        );
      } else {
        await api.post("/employee-types", typeData);
      }

      await fetchEmployeeTypes();
      setNewEmployeeType({ name: "", description: "", basic_salary: "0" });
      setEditingEmployeeType(null);
      setEmployeeTypeError("");
      setShowEmployeeTypeModal(false);
    } catch (error) {
      console.error("Error saving employee type:", error);
      setEmployeeTypeError("Failed to save employee type");
    }
  };



  const handleEditType = (type: EmployeeType) => {
    setEditingEmployeeType(type);
    setNewEmployeeType({
      name: type.name,
      description: type.description || "",
      basic_salary: type.basic_salary.toString(),
    });
    setShowEmployeeTypeModal(true);
    setShowTypesModal(false);
  };

  const handleDeleteType = async (typeId: number) => {
    if (
      confirm(
        "Are you sure you want to delete this employee type? This may affect employees using this type."
      )
    ) {
      try {
        await api.delete(`/employee-types/${typeId}`);
        await fetchEmployeeTypes();
      } catch (error) {
        console.error("Error deleting employee type:", error);
        alert("Could not delete employee type. It may be in use by employees.");
      }
    }
  };

  const handleDeleteClick = (id: number) => {
    setEmployeeToDelete(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (employeeToDelete) {
      try {
        await api.delete(`/employees/${employeeToDelete}`);
        setEmployees(
          employees.filter((employee) => employee.id !== employeeToDelete)
        );
        setShowDeleteConfirm(false);
        setEmployeeToDelete(null);
      } catch (error) {
        console.error("Error deleting employee:", error);
      }
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setErrors({});
    setEditingEmployee(employee);
    setNewEmployee({
      name: employee.name,
      type_id: employee.type_id,
      email: employee.email,
      phone1: employee.phone1,
      nic: employee.nic,
      acc_no: employee.acc_no,
      dob: employee.dob,
      phone2: employee.phone2,
    });
    setShowAddEmployee(true);
  };

  const handleShowDetails = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDetailsModal(true);
  };

  useEffect(() => {
    fetchEmployeeTypes();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
        <h2 className="text-xl font-semibold text-gray-800">
          Employee Management
        </h2>{" "}
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setEditingEmployeeType(null);
              setNewEmployeeType({
                name: "",
                description: "",
                basic_salary: "0",
              });
              setEmployeeTypeError("");
              setShowEmployeeTypeModal(true);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center hover:bg-green-700"
            title="Add employee type"
            aria-label="Add employee type"
          >
            <PlusIcon className="h-4 w-4 mr-2" /> Add Employee Type
          </button>
          <button
            onClick={() => setShowTypesModal(true)}
            className="px-4 py-2 bg-teal-600 text-white rounded-md flex items-center hover:bg-teal-700"
            title="View employee types"
            aria-label="View employee types"
          >
            <EyeIcon className="h-4 w-4 mr-2" /> View Types
          </button>
          <button
            onClick={() => {
              setEditingEmployee(null);
              resetForm();
              setShowAddEmployee(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center hover:bg-blue-700"
            title="Add employee"
            aria-label="Add employee"
          >
            <PlusIcon className="h-4 w-4 mr-2" /> Add Employee
          </button>
        </div>
      </div>
      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 relative">
            <input
              type="text"
              placeholder="Search employees..."
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
      {/* Employees Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {employee.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.name}{" "}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.type_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.phone1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleShowDetails(employee)}
                        className="text-green-600 hover:text-green-900"
                        title="View details"
                        aria-label="View details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleEditEmployee(employee)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit employee"
                        aria-label="Edit employee"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(employee.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete employee"
                        aria-label="Delete employee"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>{" "}
      </div>
      {/* Add/Edit Employee Modal */}
      {showAddEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingEmployee ? "Edit Employee" : "Add New Employee"}
              </h3>
              <button
                onClick={() => setShowAddEmployee(false)}
                className="text-gray-400 hover:text-gray-500"
                title="Close modal"
                aria-label="Close modal"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={newEmployee.name}
                    onChange={(e) =>
                      setNewEmployee({ ...newEmployee, name: e.target.value })
                    }
                    className={`w-full px-3 py-2 border ${
                      errors.name ? "border-red-500" : "border-gray-300"
                    } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    placeholder="Enter employee name"
                  />
                  {errors.name && (
                    <p className="text-xs text-red-600 mt-0.5">{errors.name}</p>
                  )}
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type *
                  </label>
                  <select
                    value={newEmployee.type_id}
                    onChange={(e) =>
                      setNewEmployee({
                        ...newEmployee,
                        type_id: Number(e.target.value),
                      })
                    }
                    className={`w-full px-3 py-2 border ${
                      errors.type_id ? "border-red-500" : "border-gray-300"
                    } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    title="Employee Type"
                    aria-label="Employee Type"
                  >
                    <option value="">Select employee type</option>
                    {employeeTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                  {errors.type_id && (
                    <p className="text-xs text-red-600 mt-0.5">
                      {errors.type_id}
                    </p>
                  )}
                </div>

                {/* NIC */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    NIC
                  </label>
                  <input
                    type="text"
                    value={newEmployee.nic || ""}
                    onChange={(e) =>
                      setNewEmployee({ ...newEmployee, nic: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter NIC number"
                  />
                </div>

                {/* Account Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number
                  </label>{" "}
                  <input
                    type="number"
                    value={newEmployee.acc_no || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow positive integers
                      if (value === "" || /^\d+$/.test(value)) {
                        setNewEmployee({
                          ...newEmployee,
                          acc_no: value,
                        });
                      }
                    }}
                    className={`w-full px-3 py-2 border ${
                      errors.acc_no ? "border-red-500" : "border-gray-300"
                    } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    placeholder="Enter account number"
                  />
                  {errors.acc_no && (
                    <p className="text-xs text-red-600 mt-0.5">
                      {errors.acc_no}
                    </p>
                  )}
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={newEmployee.dob || ""}
                    onChange={(e) =>
                      setNewEmployee({ ...newEmployee, dob: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    title="Date of Birth"
                    placeholder="Select date of birth"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) =>
                      setNewEmployee({ ...newEmployee, email: e.target.value })
                    }
                    className={`w-full px-3 py-2 border ${
                      errors.email ? "border-red-500" : "border-gray-300"
                    } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    placeholder="Enter email address"
                  />
                  {errors.email && (
                    <p className="text-xs text-red-600 mt-0.5">
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Password - Only show for new employees */}
                {!editingEmployee && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        value={newEmployee.password || ""}
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
                            password: e.target.value,
                          })
                        }
                        className={`w-full px-3 py-2 border ${
                          errors.password ? "border-red-500" : "border-gray-300"
                        } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                        placeholder="Enter password"
                      />
                      {errors.password && (
                        <p className="text-xs text-red-600 mt-0.5">
                          {errors.password}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password *
                      </label>
                      <input
                        type="password"
                        value={newEmployee.confirmPassword || ""}
                        onChange={(e) =>
                          setNewEmployee({
                            ...newEmployee,
                            confirmPassword: e.target.value,
                          })
                        }
                        className={`w-full px-3 py-2 border ${
                          errors.confirmPassword
                            ? "border-red-500"
                            : "border-gray-300"
                        } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                        placeholder="Confirm password"
                      />
                      {errors.confirmPassword && (
                        <p className="text-xs text-red-600 mt-0.5">
                          {errors.confirmPassword}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Phone 1 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone 1 *
                  </label>
                  <input
                    type="tel"
                    value={newEmployee.phone1}
                    onChange={(e) =>
                      setNewEmployee({ ...newEmployee, phone1: e.target.value })
                    }
                    className={`w-full px-3 py-2 border ${
                      errors.phone1 ? "border-red-500" : "border-gray-300"
                    } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    placeholder="Enter primary phone number"
                  />
                  {errors.phone1 && (
                    <p className="text-xs text-red-600 mt-0.5">
                      {errors.phone1}
                    </p>
                  )}
                </div>

                {/* Phone 2 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone 2
                  </label>
                  <input
                    type="tel"
                    value={newEmployee.phone2 || ""}
                    onChange={(e) =>
                      setNewEmployee({ ...newEmployee, phone2: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter secondary phone number"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end p-4 border-t border-gray-200">
              <button
                onClick={() => setShowAddEmployee(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 mr-2"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEmployee}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                {editingEmployee ? "Update" : "Add"} Employee
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
                Are you sure you want to delete this employee? This action
                cannot be undone.
              </p>
            </div>
            <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md mr-2 hover:bg-gray-300"
                title="Cancel deletion"
                aria-label="Cancel deletion"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                title="Confirm deletion"
                aria-label="Confirm deletion"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Details Modal */}
      {showDetailsModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Employee Details
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-500"
                title="Close modal"
                aria-label="Close modal"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Name</p>
                  <p className="text-base">{selectedEmployee.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Employee Type
                  </p>
                  <p className="text-base">{selectedEmployee.type_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Basic Salary
                  </p>
                  <p className="text-base">
                    {(employeeTypes
                        .find((type) => type.id === selectedEmployee.type_id)
                        ?.basic_salary || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-base">{selectedEmployee.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <p className="text-base">{selectedEmployee.phone1}</p>
                </div>
                {selectedEmployee.phone2 && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Secondary Phone
                    </p>
                    <p className="text-base">{selectedEmployee.phone2}</p>
                  </div>
                )}
                {selectedEmployee.nic && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">NIC</p>
                    <p className="text-base">{selectedEmployee.nic}</p>
                  </div>
                )}
                {selectedEmployee.acc_no && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Account Number
                    </p>
                    <p className="text-base">{selectedEmployee.acc_no}</p>
                  </div>
                )}
                {selectedEmployee.dob && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Date of Birth
                    </p>
                    <p className="text-base">
                      {new Date(selectedEmployee.dob).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md mr-2 hover:bg-gray-300 text-sm"
                title="Close"
                aria-label="Close"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Employee Type Modal */}
      {showEmployeeTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingEmployeeType
                  ? "Edit Employee Type"
                  : "Add Employee Type"}
              </h3>
              <button
                onClick={() => setShowEmployeeTypeModal(false)}
                className="text-gray-400 hover:text-gray-500"
                title="Close modal"
                aria-label="Close modal"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="type-name"
                >
                  Type Name
                </label>
                <input
                  id="type-name"
                  type="text"
                  value={newEmployeeType.name}
                  onChange={(e) =>
                    setNewEmployeeType({
                      ...newEmployeeType,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter type name"
                />
                {employeeTypeError && (
                  <p className="text-sm text-red-600 mt-1">{employeeTypeError}</p>
                )}
              </div>
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="type-description"
                >
                  Description
                </label>
                <textarea
                  id="type-description"
                  value={newEmployeeType.description}
                  onChange={(e) =>
                    setNewEmployeeType({
                      ...newEmployeeType,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Enter type description"
                  title="Type Description"
                  aria-label="Type Description"
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 mb-1"
                  htmlFor="basic-salary"
                >
                  Basic Salary
                </label>
                <input
                  id="basic-salary"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newEmployeeType.basic_salary}
                  onChange={(e) =>
                    setNewEmployeeType({
                      ...newEmployeeType,
                      basic_salary: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter basic salary"
                  title="Basic Salary"
                  aria-label="Basic Salary"
                />
              </div>
            </div>
            <div className="flex justify-end p-4 border-t border-gray-200">
              <button
                onClick={() => setShowEmployeeTypeModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md mr-2"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEmployeeType}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Save Type
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Employee Types Modal */}
      {showTypesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Employee Types
              </h3>
              <button
                onClick={() => setShowTypesModal(false)}
                className="text-gray-400 hover:text-gray-500"
                title="Close modal"
                aria-label="Close modal"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Basic Salary
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {employeeTypes.map((type) => (
                    <tr key={type.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {type.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {type.description || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {Number(type.basic_salary).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditType(type)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit type"
                            aria-label="Edit type"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteType(type.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete type"
                            aria-label="Delete type"
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
            <div className="flex justify-end p-4 border-t border-gray-200">
              <button
                onClick={() => setShowTypesModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
