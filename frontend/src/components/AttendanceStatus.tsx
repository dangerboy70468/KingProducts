import React, { useState, useEffect } from "react";
import api from "../api";
import { format } from "date-fns";

interface AttendanceRecord {
  id: number;
  fk_attendance_employee: number;
  attendance_date: string;
  check_in_time: string;
  check_out_time: string | null;
  status: string;
  employee_name: string;
  nic: string;
  total_hours?: number;
}

interface AttendanceStatusProps {
  nic: string;
  onCheckOut: () => void;
}

export const AttendanceStatus: React.FC<AttendanceStatusProps> = ({
  nic,
  onCheckOut,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attendanceRecord, setAttendanceRecord] =
    useState<AttendanceRecord | null>(null);
  const [employee, setEmployee] = useState<{ id: number; name: string } | null>(
    null
  );

  useEffect(() => {
    if (nic) {
      fetchEmployeeAndAttendance();
    }
  }, [nic]);

  const fetchEmployeeAndAttendance = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get employee details by NIC
      const employeeResponse = await api.get(
        `/attendance/employee-by-nic/${nic}`
      );
      const employeeData = employeeResponse.data;
      setEmployee({ id: employeeData.id, name: employeeData.name });

      // Then, get today's attendance record for this employee
      const today = format(new Date(), "yyyy-MM-dd");
      const attendanceResponse = await api.get(
        `/attendance/employee/${employeeData.id}?date=${today}`
      );

      if (attendanceResponse.data.length > 0) {
        setAttendanceRecord(attendanceResponse.data[0]);
      }
    } catch (err: any) {
      console.error("Error fetching attendance data:", err);
      setError(
        err.response?.data?.error ||
          "Failed to load attendance data. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!attendanceRecord) return;

    try {
      setLoading(true);
      setError(null);

      const response = await api.post("/attendance/qr-scan", { nic });

      // Check if the response indicates a successful check-out
      if (response.data.type === "check-out") {
        // Refresh the attendance data to show the updated check-out time
        await fetchEmployeeAndAttendance();
        onCheckOut();
      }
    } catch (err: any) {
      console.error("Error checking out:", err);

      // If the error is about already being checked out, show a specific message
      if (
        err.response?.data?.error?.includes(
          "Already completed check-in and check-out"
        )
      ) {
        // This is not really an error, just refresh the data to show current status
        await fetchEmployeeAndAttendance();
      } else {
        setError(
          err.response?.data?.error || "Failed to check out. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return "-";
    const date = new Date(dateTimeStr);
    return format(date, "hh:mm a");
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
        <p className="mt-2 text-gray-600">Loading attendance status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 text-red-800 p-4 rounded mb-4">{error}</div>
    );
  }

  if (!attendanceRecord) {
    return (
      <div className="bg-yellow-100 text-yellow-800 p-4 rounded mb-4">
        No check-in record found for today. Please check in first.
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-medium text-gray-800 mb-4">
        Today's Attendance Status
      </h3>

      <div className="mb-4">
        <div className="text-sm font-medium text-gray-500">Employee</div>
        <div className="text-base font-medium">{employee?.name}</div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <div className="text-sm font-medium text-gray-500">Date</div>
          <div className="text-base">
            {format(new Date(attendanceRecord.attendance_date), "yyyy-MM-dd")}
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">Status</div>
          <div className="text-base">
            {attendanceRecord.status === "late" ? (
              <span className="text-red-600 font-medium">Late</span>
            ) : (
              <span className="text-green-600 font-medium">On Time</span>
            )}
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">Check-in Time</div>
          <div className="text-base">
            {formatTime(attendanceRecord.check_in_time)}
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">
            Check-out Time
          </div>
          <div className="text-base">
            {attendanceRecord.check_out_time
              ? formatTime(attendanceRecord.check_out_time)
              : "-"}
          </div>
        </div>
        {attendanceRecord.total_hours && (
          <div>
            <div className="text-sm font-medium text-gray-500">Total Hours</div>
            <div className="text-base">{attendanceRecord.total_hours}</div>
          </div>
        )}
      </div>

      {attendanceRecord.check_out_time ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Checked out at {formatTime(attendanceRecord.check_out_time)}
              </p>
              <p className="text-xs text-green-700 mt-1">
                Attendance record complete for today
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <button
            onClick={handleCheckOut}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            {loading ? "Processing..." : "Check Out Now"}
          </button>
        </div>
      )}
    </div>
  );
};
