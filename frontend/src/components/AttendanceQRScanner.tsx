import React, { useState } from "react";
import api from "../api";
import { QrReader } from "react-qr-reader";
import { AttendanceStatus } from "./AttendanceStatus";

interface QRScannerProps {
  onSuccess: (message: string) => void;
  onError: (error: string) => void;
}

export const AttendanceQRScanner: React.FC<QRScannerProps> = ({
  onSuccess,
  onError,
}) => {
  const [nic, setNic] = useState("");
  const [loading, setLoading] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerFacing, setScannerFacing] = useState<"environment" | "user">(
    "environment"
  );
  const [showAttendanceStatus, setShowAttendanceStatus] = useState(false);
  const [scannedNIC, setScannedNIC] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nic.trim()) {
      onError("Please enter employee NIC");
      return;
    }

    processNIC(nic);
  };

  const processNIC = async (nicValue: string) => {
    setLoading(true);
    setScanError(null);

    // Validate NIC format
    const nicValue_trimmed = nicValue.trim();
    if (!nicValue_trimmed) {
      onError("NIC is required");
      setLoading(false);
      return;
    }

    // Log the request data for debugging
    console.log('Sending QR scan request with NIC:', nicValue_trimmed);

    try {
      const response = await api.post("/attendance/qr-scan", { 
        nic: nicValue_trimmed 
      });

      console.log('QR scan response:', response.data);

      // Handle successful response
      onSuccess(`${response.data.message} for ${response.data.employee_name}`);
      setNic("");
      setScannerActive(false);

      // Show attendance status after successful scan
      setScannedNIC(nicValue_trimmed);
      setShowAttendanceStatus(true);
    } catch (error: any) {
      console.error('QR scan error:', error.response || error);

      // Get the error message from the response if available
      const errorMessage =
        error.response?.data?.error || "Error processing QR scan";
      const employeeName = error.response?.data?.employee_name || "";

      // Check if this is an "already checked out" error
      if (errorMessage.includes("Already completed check-in and check-out")) {
        // This is an expected error for employees who have already completed their attendance
        // Show the attendance status even though there was an error
        setScanError(
          `${employeeName} has already completed check-in and check-out for today.`
        );
        setScannedNIC(nicValue_trimmed);
        setShowAttendanceStatus(true);

        // Don't show this as an error in the parent component
        // Instead, treat it more like an informational message
      } else if (errorMessage.includes("Attendance record already exists")) {
        // Handle duplicate check-in attempt
        setScanError(`${employeeName} is already checked in for today.`);
        setScannedNIC(nicValue_trimmed);
        setShowAttendanceStatus(true);
      } else {
        // For other errors, show the error message from the server
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleScanResult = (result: any) => {
    if (result && !loading) {
      const scannedNIC = result?.text;
      if (scannedNIC) {
        // Trim and validate the scanned NIC before processing
        const cleanNIC = scannedNIC.trim();
        if (cleanNIC) {
          setNic(cleanNIC);
          processNIC(cleanNIC);
        }
      }
    }
  };

  const toggleCamera = () => {
    setScannerFacing(scannerFacing === "environment" ? "user" : "environment");
  };

  const handleBackToScanner = () => {
    setShowAttendanceStatus(false);
    setScannedNIC("");
    setScanError(null);
  };

  if (showAttendanceStatus) {
    return (
      <div>
        {scanError && (
          <div className="bg-yellow-100 text-yellow-800 p-4 rounded mb-4">
            {scanError}
          </div>
        )}
        <AttendanceStatus
          nic={scannedNIC}
          onCheckOut={() => {
            // Refresh attendance status
            setShowAttendanceStatus(false);
            setTimeout(() => setShowAttendanceStatus(true), 500);
          }}
        />
        <div className="mt-4">
          <button
            onClick={handleBackToScanner}
            className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Back to Scanner
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-medium text-gray-800 mb-4">
        QR Code Scanner
      </h3>

      {scannerActive ? (
        <div className="mb-6">
          <div className="relative">
            <QrReader
              constraints={{ facingMode: scannerFacing }}
              onResult={handleScanResult}
              containerStyle={{ width: "100%", height: "auto" }}
              videoStyle={{ width: "100%", height: "auto" }}
              videoContainerStyle={{
                width: "100%",
                height: "auto",
                borderRadius: "0.5rem",
                overflow: "hidden",
              }}
            />
            <div className="absolute inset-0 pointer-events-none border-2 border-blue-500 rounded-lg">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1/2 h-1/2 border-2 border-blue-500 rounded"></div>
            </div>
          </div>
          <div className="flex justify-between mt-2">
            <button
              type="button"
              onClick={toggleCamera}
              className="bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={loading}
            >
              {scannerFacing === "environment"
                ? "Switch to Front Camera"
                : "Switch to Back Camera"}
            </button>
            <button
              type="button"
              onClick={() => setScannerActive(false)}
              className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={loading}
            >
              Close Camera
            </button>
          </div>
          {loading && (
            <div className="mt-2 text-center text-sm font-medium text-blue-600">
              Processing scan...
            </div>
          )}
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label
                htmlFor="nic"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Employee NIC from QR Code
              </label>
              <input
                type="text"
                id="nic"
                value={nic}
                onChange={(e) => setNic(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                placeholder="Scan or enter NIC"
                disabled={loading}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                {loading ? "Processing..." : "Submit Manually"}
              </button>
              <button
                type="button"
                onClick={() => setScannerActive(true)}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={loading}
              >
                Open Camera
              </button>
            </div>
          </form>
        </>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <p>Instructions:</p>
        <ul className="list-disc pl-5 mt-1">
          <li>Scan employee QR code using camera or enter NIC manually</li>
          <li>First scan of the day will record check-in time</li>
          <li>Second scan will record check-out time</li>
          <li>Check-in after 9:10 AM will be marked as "Late"</li>
          <li>Only one attendance record is allowed per employee per day</li>
        </ul>
      </div>
    </div>
  );
};
