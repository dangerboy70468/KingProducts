import React, { useState, useEffect } from "react";
import api from "../api";
import { format, parseISO, addMinutes } from "date-fns";
import { AttendanceQRScanner } from "./AttendanceQRScanner";
import { EmployeeQRGenerator } from "./EmployeeQRGenerator";
import { AttendanceStatus } from "./AttendanceStatus";

// Helper function to convert UTC to Sri Lanka time
const convertToSLTime = (dateTimeStr: string) => {
  if (!dateTimeStr) return null;
  const date = parseISO(dateTimeStr);
  // Add 5 hours and 30 minutes for Sri Lanka time
  return addMinutes(date, 5 * 60 + 30);
};

interface Attendance {
  id: number;
  fk_attendance_employee: number;
  attendance_date: string;
  check_in_time: string;
  check_out_time: string | null;
  status: string;
  employee_name: string;
  nic: string;
}

interface AttendanceStats {
  employee_id: number;
  employee_name: string;
  total_days: number;
  late_days: number;
  on_time_days: number;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

export const AttendanceManagement = () => {
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats[]>([]);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error" | "";
  }>({
    text: "",
    type: "",
  });
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: format(
      new Date().setDate(new Date().getDate() - 30),
      "yyyy-MM-dd"
    ),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });
  const [activeTab, setActiveTab] = useState<
    "records" | "stats" | "qr" | "generator" | "checkout"
  >("qr");
  const [nicForCheckout, setNicForCheckout] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    fetchAttendanceRecords();
    fetchAttendanceStats();
  }, [dateRange]);

  const fetchAttendanceRecords = async () => {
    try {
      const response = await api.get(
        `/attendance/range?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`
      );
      setAttendanceList(response.data);
    } catch (error) {
      console.error("Error fetching attendance records:", error);
    }
  };

  const fetchAttendanceStats = async () => {
    try {
      const response = await api.get(
        `/attendance/summary?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`
      );
      setAttendanceStats(response.data);
    } catch (error) {
      console.error("Error fetching attendance stats:", error);
    }
  };

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateRange({
      ...dateRange,
      [e.target.name]: e.target.value,
    });
  };

  const formatDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return "-";
    const slTime = convertToSLTime(dateTimeStr);
    return slTime ? format(slTime, "yyyy-MM-dd HH:mm:ss") : "-";
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const slTime = convertToSLTime(dateStr);
    return slTime ? format(slTime, "yyyy-MM-dd") : "-";
  };

  const getStatusBadge = (status: string) => {
    if (status === "late") {
      return (
        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">
          Late
        </span>
      );
    } else if (status === "on time") {
      return (
        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
          On Time
        </span>
      );
    }
    return (
      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">
        {status || "Unknown"}
      </span>
    );
  };

  const handleQRSuccess = (successMessage: string) => {
    setMessage({
      text: successMessage,
      type: "success",
    });

    // Refresh data after successful scan
    fetchAttendanceRecords();
    fetchAttendanceStats();

    // Auto-clear success message after 5 seconds
    setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 5000);
  };

  const handleQRError = (errorMessage: string) => {
    setMessage({
      text: errorMessage,
      type: "error",
    });

    // Auto-clear error message after 5 seconds
    setTimeout(() => {
      setMessage({ text: "", type: "" });
    }, 5000);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nicForCheckout.trim()) {
      setMessage({
        text: "Please enter employee NIC",
        type: "error",
      });
      return;
    }

    try {
      setCheckoutLoading(true);
      const response = await api.post("/attendance/qr-scan", {
        nic: nicForCheckout,
      });

      setMessage({
        text:
          response.data.type === "check-out"
            ? "Check-out processed successfully"
            : "Check-in processed successfully",
        type: "success",
      });

      // Don't clear NIC so the user can see the attendance status

      // Refresh data
      fetchAttendanceRecords();
      fetchAttendanceStats();
    } catch (error: any) {
      // If error is about already checked out, show a more user-friendly message
      if (
        error.response?.data?.error?.includes(
          "Already completed check-in and check-out"
        )
      ) {
        setMessage({
          text: "Employee has already completed check-in and check-out for today",
          type: "error",
        });
      } else {
        setMessage({
          text: error.response?.data?.error || "Error processing check-out",
          type: "error",
        });
      }
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Employee Attendance Management
      </h2>

      <div className="mb-6">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <button
            className={`py-2 px-4 font-medium whitespace-nowrap ${
              activeTab === "records"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab("records")}
          >
            Attendance Records
          </button>
          <button
            className={`py-2 px-4 font-medium whitespace-nowrap ${
              activeTab === "stats"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab("stats")}
          >
            Attendance Statistics
          </button>
          <button
            className={`py-2 px-4 font-medium whitespace-nowrap ${
              activeTab === "qr"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab("qr")}
          >
            QR Scanner
          </button>
          <button
            className={`py-2 px-4 font-medium whitespace-nowrap ${
              activeTab === "checkout"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab("checkout")}
          >
            Quick Checkout
          </button>
          <button
            className={`py-2 px-4 font-medium whitespace-nowrap ${
              activeTab === "generator"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab("generator")}
          >
            QR Generator
          </button>
        </div>
      </div>

      {message.text && (
        <div
          className={`p-4 mb-4 rounded ${
            message.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {activeTab === "qr" && (
        <div className="mb-8">
          <AttendanceQRScanner
            onSuccess={handleQRSuccess}
            onError={handleQRError}
          />
        </div>
      )}

      {activeTab === "checkout" && (
        <div className="mb-8">
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 max-w-md mx-auto">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              Quick Employee Check-out
            </h3>

            <form onSubmit={handleCheckoutSubmit}>
              <div className="mb-4">
                <label
                  htmlFor="nicForCheckout"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Employee NIC
                </label>
                <input
                  type="text"
                  id="nicForCheckout"
                  value={nicForCheckout}
                  onChange={(e) => setNicForCheckout(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter employee NIC"
                  disabled={checkoutLoading}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={checkoutLoading}
              >
                {checkoutLoading ? "Processing..." : "Process Attendance"}
              </button>
            </form>

            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">
                Enter an employee's NIC to check them in or out for today. This
                is useful for:
              </p>
              <ul className="list-disc pl-5 text-sm text-gray-600">
                <li>Employees who forgot to scan their QR code</li>
                <li>Handling attendance when the QR scanner is unavailable</li>
                <li>Administrative corrections to attendance records</li>
              </ul>
            </div>

            {nicForCheckout && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <AttendanceStatus
                  nic={nicForCheckout}
                  onCheckOut={() => {
                    fetchAttendanceRecords();
                    fetchAttendanceStats();
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "generator" && (
        <div className="mb-8">
          <EmployeeQRGenerator />
        </div>
      )}

      {(activeTab === "records" || activeTab === "stats") && (
        <div className="mb-4 flex flex-wrap gap-4">
          <div>
            <label
              htmlFor="startDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateRangeChange}
              className="p-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label
              htmlFor="endDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateRangeChange}
              className="p-2 border border-gray-300 rounded"
            />
          </div>
        </div>
      )}

      {activeTab === "records" && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check Out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendanceList.length > 0 ? (
                attendanceList.map((attendance) => (
                  <tr key={attendance.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {attendance.employee_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {attendance.nic}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(attendance.attendance_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(attendance.check_in_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {attendance.check_out_time
                        ? formatDateTime(attendance.check_out_time)
                        : "Not checked out"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(attendance.status)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    No attendance records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "stats" && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  On Time Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Late Days
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendanceStats.length > 0 ? (
                attendanceStats.map((stat) => (
                  <tr key={stat.employee_id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {stat.employee_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.total_days}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.on_time_days}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.late_days}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {stat.total_days > 0 ? (
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-blue-600 h-2.5 rounded-full"
                              style={{
                                width: `${(stat.total_days / 30) * 100}%`,
                              }}
                            ></div>
                          </div>
                          <span className="ml-2 text-sm text-gray-700">
                            {Math.round((stat.total_days / 30) * 100)}%
                          </span>
                        </div>
                      ) : (
                        "0%"
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    No attendance statistics found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
