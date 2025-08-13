import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import api from "../api";

interface Employee {
  id: number;
  name: string;
  nic: string;
}

export const EmployeeQRGenerator: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.get("/employees");
      // Filter out employees without NIC
      const employeesWithNIC = response.data.filter((emp: Employee) => emp.nic);
      setEmployees(employeesWithNIC);
      setError(null);
    } catch (err) {
      console.error("Error fetching employees:", err);
      setError("Failed to load employees. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to print QR code");
      return;
    }

    const qrCode = document.getElementById("employee-qr-code");
    if (!qrCode) return;

    const employeeName = selectedEmployee?.name || "Employee";

    printWindow.document.write(`
      <html>
        <head>
          <title>Employee QR Code - ${employeeName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 20px;
            }
            .qr-container {
              margin: 20px auto;
              padding: 15px;
              border: 1px solid #ccc;
              border-radius: 8px;
              display: inline-block;
            }
            h2 {
              margin-bottom: 5px;
            }
            p {
              margin-top: 5px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h2>${employeeName}</h2>
            <div>${qrCode.outerHTML}</div>
            <p>Scan for attendance</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Employee QR Code Generator
      </h2>

      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded mb-4">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading employees...</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <label
              htmlFor="employeeSelect"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Select Employee
            </label>
            <select
              id="employeeSelect"
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              onChange={(e) => {
                const empId = parseInt(e.target.value);
                const emp = employees.find((e) => e.id === empId) || null;
                setSelectedEmployee(emp);
              }}
              value={selectedEmployee?.id || ""}
            >
              <option value="">-- Select an employee --</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} - {employee.nic}
                </option>
              ))}
            </select>
          </div>

          {selectedEmployee && (
            <div className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="mb-2 text-center">
                <h3 className="text-lg font-medium">{selectedEmployee.name}</h3>
                <p className="text-sm text-gray-600">
                  NIC: {selectedEmployee.nic}
                </p>
              </div>

              <div
                className="bg-white p-4 rounded-lg shadow-sm"
                id="employee-qr-code"
              >
                <QRCodeSVG
                  value={selectedEmployee.nic}
                  size={200}
                  level="H" // High error correction capability
                  includeMargin={true}
                />
              </div>

              <button
                onClick={handlePrint}
                className="mt-4 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Print QR Code
              </button>
            </div>
          )}

          {employees.length === 0 && !loading && (
            <div className="text-center py-4 text-gray-600">
              No employees with NIC information found. Please add NIC details to
              employees.
            </div>
          )}
        </>
      )}
    </div>
  );
};
