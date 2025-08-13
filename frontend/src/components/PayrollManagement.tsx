import React, { useEffect, useState } from "react";
import api from "../api";
import { format } from "date-fns";

interface PayrollRow {
  employee_id: number;
  employee_name: string;
  type_name: string;
  base_salary: number;
  present_days: number;
  late_days: number;
  deduction_percent: number;
  final_salary: number;
}

interface PayrollRecord {
  id: number;
  employee_id: number;
  employee_name: string;
  type_name?: string;
  base_salary: number;
  present_days?: number;
  late_days?: number;
  deduction_percent?: number;
  overtime_hours?: number;
  overtime_rate?: number;
  overtime_pay?: number;
  bonuses?: number;
  deductions?: number;
  total_salary: number;
  salary_month: string;
  payment_date?: string;
}

interface SalarySlip {
  id: number;
  employee_name: string;
  base_salary: number;
  present_days: number;
  late_days: number;
  deduction_percent: number;
  overtime_hours: number;
  overtime_rate: number;
  overtime_pay: number;
  bonuses: number;
  deductions: number;
  total_salary: number;
  salary_month: string;
  payment_date: string;
  // Add more fields as needed
}

export const PayrollManagement = () => {
  const [payroll, setPayroll] = useState<PayrollRow[]>([]);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return format(now, "yyyy-MM");
  });
  const [processing, setProcessing] = useState(false);
  const [processMessage, setProcessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"calculate" | "history">(
    "calculate"
  );
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<SalarySlip | null>(null);
  const slipContentRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPayroll();
    if (activeTab === "history") {
      fetchPayrollRecords();
    }
    // eslint-disable-next-line
  }, [selectedMonth, activeTab]);

  const fetchPayroll = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/payroll/calculate?month=${selectedMonth}`);
      setPayroll(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to fetch payroll data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrollRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/payroll?month=${selectedMonth}`);
      setPayrollRecords(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to fetch payroll history.");
    } finally {
      setLoading(false);
    }
  };

  const processPayroll = async () => {
    setProcessing(true);
    setProcessMessage(null);
    try {
      // POST each payroll row to /api/payroll
      for (const row of payroll) {
        await api.post("/payroll", {
          employee_id: row.employee_id,
          salary_month: selectedMonth,
          base_salary: row.base_salary,
          present_days: row.present_days,
          late_days: row.late_days,
          deduction_percent: row.deduction_percent,
          overtime_hours: 0,
          overtime_rate: 0,
          overtime_pay: 0,
          bonuses: 0,
          deductions: 0,
          total_salary: row.final_salary,
          payment_date: null,
        });
      }
      setProcessMessage("Payroll processed and saved successfully!");
    } catch (err: any) {
      setProcessMessage(
        err.response?.data?.error ||
          "Failed to process payroll. Some records may already exist."
      );
    } finally {
      setProcessing(false);
    }
  };

  const openSalarySlip = async (payrollId: number) => {
    setSlipModalOpen(true);
    setSelectedSlip(null);
    try {
      const res = await api.get(`/payroll/salary-slip/${payrollId}`);
      // Ensure all required fields have default values
      const slipData = {
        ...res.data,
        present_days: res.data.present_days || 0,
        late_days: res.data.late_days || 0,
        deduction_percent: res.data.deduction_percent || 0,
        overtime_hours: res.data.overtime_hours || 0,
        overtime_rate: res.data.overtime_rate || 0,
        overtime_pay: res.data.overtime_pay || 0,
        bonuses: res.data.bonuses || 0,
        deductions: res.data.deductions || 0
      };
      setSelectedSlip(slipData);
    } catch (err: any) {
      console.error("Error fetching salary slip:", err);
      setSelectedSlip(null);
    }
  };

  const handlePrintSlip = () => {
    if (!selectedSlip) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const slipContent = slipContentRef.current?.innerHTML || "";
    printWindow.document.write(`
      <html>
        <head>
          <title>Salary Slip - ${selectedSlip.employee_name || "Employee"}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f9f9f9; }
            .slip-container { max-width: 400px; margin: 40px auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); padding: 32px; }
            h2 { margin-bottom: 8px; font-size: 1.5rem; }
            .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .label { color: #555; }
            .value { font-weight: 500; }
            hr { margin: 16px 0; border: none; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="slip-container">
            <h2>Salary Slip</h2>
            ${slipContent}
          </div>
          <script>
            window.onload = function() { window.print(); setTimeout(() => window.close(), 500); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Payroll Management
      </h2>
      <div className="mb-4 flex gap-2 border-b">
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "calculate"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("calculate")}
        >
          Calculate Payroll
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            activeTab === "history"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("history")}
        >
          Payroll History
        </button>
      </div>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
        <label className="text-sm font-medium text-gray-700" htmlFor="month">
          Select Month:
        </label>
        <input
          id="month"
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="border p-2 rounded focus:ring-blue-500 focus:border-blue-500"
        />
        {activeTab === "calculate" && (
          <button
            onClick={processPayroll}
            className="ml-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            disabled={processing || payroll.length === 0}
          >
            {processing ? "Processing..." : "Process Payroll"}
          </button>
        )}
      </div>
      {processMessage && activeTab === "calculate" && (
        <div
          className={`mb-2 ${
            processMessage.includes("success")
              ? "text-green-600"
              : "text-red-600"
          }`}
        >
          {processMessage}
        </div>
      )}
      {activeTab === "calculate" ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Basic Salary
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Present Days
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Late Days
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deduction
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Final Salary
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payroll.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-gray-500">
                    No payroll data for this month.
                  </td>
                </tr>
              ) : (
                payroll.map((row) => (
                  <tr key={row.employee_id}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      {row.employee_name}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {row.type_name}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {row.base_salary.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {row.present_days}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {row.late_days}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {row.deduction_percent > 0 ? (
                        <span className="text-red-600 font-semibold">
                          {row.deduction_percent}%
                        </span>
                      ) : (
                        <span className="text-green-600">0%</span>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-semibold text-blue-700">
                      {row.final_salary.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Base Salary
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Salary
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Month
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Date
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slip
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payrollRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-gray-500">
                    No payroll records for this month.
                  </td>
                </tr>
              ) : (
                payrollRecords.map((rec) => (
                  <tr key={rec.id}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      {rec.employee_name}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {Number(rec.base_salary).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-blue-700 font-semibold">
                      {Number(rec.total_salary).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {rec.salary_month}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {rec.payment_date || "-"}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                      <button
                        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-xs"
                        onClick={() => openSalarySlip(rec.id)}
                      >
                        View Slip
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {/* Salary Slip Modal */}
      {slipModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Salary Slip
              </h3>
              <button
                onClick={() => setSlipModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
                title="Close modal"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className="p-4" ref={slipContentRef}>
              {selectedSlip ? (
                <div className="space-y-2">
                  <div className="font-medium text-lg text-gray-800 mb-2">
                    {selectedSlip.employee_name || "Employee"}
                  </div>
                  <div className="text-sm text-gray-500">
                    Month: {selectedSlip.salary_month || "-"}
                  </div>
                  <div className="text-sm text-gray-500">
                    Payment Date: {selectedSlip.payment_date || "-"}
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between text-sm">
                    <span>Base Salary:</span>
                    <span>{Number(selectedSlip.base_salary || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Present Days:</span>
                    <span>{selectedSlip.present_days || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Late Days:</span>
                    <span>{selectedSlip.late_days || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Deduction:</span>
                    <span>{(selectedSlip.deduction_percent || 0)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Overtime Pay:</span>
                    <span>{Number(selectedSlip.overtime_pay || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Bonuses:</span>
                    <span>{Number(selectedSlip.bonuses || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Deductions:</span>
                    <span>{Number(selectedSlip.deductions || 0).toFixed(2)}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total Salary:</span>
                    <span>{Number(selectedSlip.total_salary || 0).toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="text-gray-600">Loading slip...</div>
              )}
            </div>
            <div className="flex justify-end p-4 border-t border-gray-200 gap-2">
              <button
                onClick={handlePrintSlip}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md"
              >
                Print / Download PDF
              </button>
              <button
                onClick={() => setSlipModalOpen(false)}
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
