"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface CorrectionRequest {
  id: string;
  attendanceDate: string;
  type: "MISSED_PUNCH_IN" | "MISSED_PUNCH_OUT";
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

export default function CorrectionRequestsPage() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState<CorrectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    attendanceDate: "",
    type: "MISSED_PUNCH_IN" as "MISSED_PUNCH_IN" | "MISSED_PUNCH_OUT",
    requestedTime: "",
    reason: "",
    evidence: "",
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/staff/correction-requests");
      const data = await res.json();
      setRequests(data.correctionRequests);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/staff/correction-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowForm(false);
        setFormData({
          attendanceDate: "",
          type: "MISSED_PUNCH_IN",
          requestedTime: "",
          reason: "",
          evidence: "",
        });
        fetchRequests();
      }
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h1 className="text-xl font-semibold">Correction Requests</h1>
        </div>

        <div className="p-4">
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded mb-4"
          >
            {showForm ? "Cancel" : "New Request"}
          </button>

          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={formData.attendanceDate}
                  onChange={(e) =>
                    setFormData({ ...formData, attendanceDate: e.target.value })
                  }
                  className="w-full border rounded p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as any })
                  }
                  className="w-full border rounded p-2"
                >
                  <option value="MISSED_PUNCH_IN">Missed Punch In</option>
                  <option value="MISSED_PUNCH_OUT">Missed Punch Out</option>
                </select>
              </div>

              {formData.type === "MISSED_PUNCH_OUT" && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Requested Punch Out Time
                  </label>
                  <input
                    type="time"
                    value={formData.requestedTime}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requestedTime: e.target.value,
                      })
                    }
                    className="w-full border rounded p-2"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <textarea
                  required
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  className="w-full border rounded p-2"
                  rows={3}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-green-500 text-white py-2 px-4 rounded"
              >
                Submit Request
              </button>
            </form>
          )}

          <div className="space-y-2">
            {requests.map((req) => (
              <div key={req.id} className="border rounded p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {new Date(req.attendanceDate).toDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {req.type.replace("_", " ")}
                    </p>
                    <p className="text-sm">{req.reason}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      req.status === "APPROVED"
                        ? "bg-green-100 text-green-800"
                        : req.status === "REJECTED"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {req.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
