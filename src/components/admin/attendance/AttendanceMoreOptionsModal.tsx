"use client";

import { useState, useEffect } from "react";
import { X, Clock, AlertTriangle, Save } from "lucide-react";
import { AttendanceRecord } from "@/types/attendance";

interface AttendanceMoreOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendance: AttendanceRecord | null;
  onSave: (attendanceId: string, updates: any) => Promise<void>;
}

export default function AttendanceMoreOptionsModal({
  isOpen,
  onClose,
  attendance,
  onSave,
}: AttendanceMoreOptionsModalProps) {
  const [overtimeHours, setOvertimeHours] = useState<string>("");
  const [lateMinutes, setLateMinutes] = useState<string>("");
  const [workingHours, setWorkingHours] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (attendance && isOpen) {
      setOvertimeHours(attendance.overtimeHours?.toString() || "0");
      setLateMinutes(attendance.isLate ? "1" : "0");
      setWorkingHours(attendance.workingHours?.toString() || "");
      setReason("");
    }
  }, [attendance, isOpen]);

  const handleSave = async () => {
    if (!attendance) return;

    setSaving(true);
    try {
      // Parse and validate numbers with proper precision
      const parsedOvertimeHours = overtimeHours ? parseFloat(overtimeHours) : 0;
      const parsedWorkingHours = workingHours ? parseFloat(workingHours) : null;

      // Round to 2 decimal places to avoid floating point issues
      const updates: any = {
        overtimeHours: Math.round(parsedOvertimeHours * 100) / 100,
        workingHours: parsedWorkingHours
          ? Math.round(parsedWorkingHours * 100) / 100
          : null,
        isLate: parseInt(lateMinutes) > 0,
      };

      if (reason.trim()) {
        updates.approvalReason = reason;
      }

      await onSave(attendance.id, updates);
      onClose();
    } catch (error) {
      console.error("Failed to save attendance updates:", error);
      alert("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !attendance) return null;

  return (
    <>
      {/* Desktop Modal */}
      <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Edit Attendance Details
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {attendance.user.firstName} {attendance.user.lastName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-105"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
            {/* Staff Info Card */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {attendance.user.firstName?.[0]}
                    {attendance.user.lastName?.[0]}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {attendance.user.firstName} {attendance.user.lastName}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {attendance.user.email}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(attendance.attendanceDate).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-5">
              {/* Working Hours */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <div className="p-1.5 bg-blue-100 rounded-lg mr-3 group-focus-within:bg-blue-200 transition-colors">
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  Working Hours
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="24"
                  value={workingHours}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow only up to 2 decimal places
                    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
                      setWorkingHours(value);
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300"
                  placeholder="8.50"
                />
              </div>

              {/* Overtime Hours */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <div className="p-1.5 bg-green-100 rounded-lg mr-3 group-focus-within:bg-green-200 transition-colors">
                    <Clock className="h-4 w-4 text-green-600" />
                  </div>
                  Overtime Hours
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="16"
                  value={overtimeHours}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow only up to 2 decimal places
                    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
                      setOvertimeHours(value);
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300"
                  placeholder="2.00"
                />
              </div>

              {/* Late Minutes */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <div className="p-1.5 bg-orange-100 rounded-lg mr-3 group-focus-within:bg-orange-200 transition-colors">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                  </div>
                  Late Minutes
                </label>
                <input
                  type="number"
                  min="0"
                  max="480"
                  value={lateMinutes}
                  onChange={(e) => setLateMinutes(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300"
                  placeholder="15"
                />
              </div>

              {/* Reason */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Reason for Changes
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 resize-none"
                  placeholder="Please provide a reason for these attendance modifications..."
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-100 bg-gray-50">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 hover:shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-105 flex items-center"
            >
              {saving ? (
                <Clock className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet */}
      <div
        className="md:hidden fixed inset-x-0 bottom-0 z-50 transform transition-transform duration-300 ease-out"
        style={{ transform: isOpen ? "translateY(0)" : "translateY(100%)" }}
      >
        <div className="bg-white rounded-t-2xl shadow-xl max-h-[85vh] overflow-y-auto">
          {/* Handle */}
          <div className="flex justify-center py-3">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              Edit Attendance
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 py-4 space-y-5">
            {/* Staff Info */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <h4 className="font-semibold text-gray-900 text-sm">
                {attendance.user.firstName} {attendance.user.lastName}
              </h4>
              <p className="text-xs text-gray-600 mt-1">
                {attendance.user.email}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(attendance.attendanceDate).toLocaleDateString()}
              </p>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Working Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-blue-600" />
                  Working Hours
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="24"
                  value={workingHours}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow only up to 2 decimal places
                    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
                      setWorkingHours(value);
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="8.50"
                />
              </div>

              {/* Overtime Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-green-600" />
                  Overtime Hours
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="16"
                  value={overtimeHours}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow only up to 2 decimal places
                    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
                      setOvertimeHours(value);
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="2.00"
                />
              </div>

              {/* Late Minutes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" />
                  Late Minutes
                </label>
                <input
                  type="number"
                  min="0"
                  max="480"
                  value={lateMinutes}
                  onChange={(e) => setLateMinutes(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="15"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Changes
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                  placeholder="Optional reason for these changes..."
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3 p-6 border-t border-gray-100 bg-gray-50">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center"
            >
              {saving ? (
                <Clock className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
