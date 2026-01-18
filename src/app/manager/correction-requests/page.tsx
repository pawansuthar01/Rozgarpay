"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface CorrectionRequest {
  id: string;
  attendanceDate: string;
  type: "MISSED_PUNCH_IN" | "MISSED_PUNCH_OUT";
  reason: string;
  requestedTime: string | null;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  attendance: {
    punchIn: string | null;
    punchOut: string | null;
  };
}

export default function ManagerCorrectionRequestsPage() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState<CorrectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/manager/correction-requests");
      const data = await res.json();
      setRequests(data.correctionRequests);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    id: string,
    status: "APPROVED" | "REJECTED",
    approvedTime?: string,
  ) => {
    setApproving(id);
    try {
      const res = await fetch("/api/manager/correction-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, approvedTime }),
      });
      if (res.ok) {
        fetchRequests();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setApproving(null);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h1 className="text-xl font-semibold">Correction Requests</h1>
        </div>

        <div className="p-4">
          {requests.length === 0 ? (
            <p className="text-gray-500">No pending correction requests</p>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <div key={req.id} className="border rounded p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">
                        {req.user.firstName} {req.user.lastName}
                      </p>
                      <p className="text-sm text-gray-600">{req.user.email}</p>
                    </div>
                    <p className="text-sm font-medium">
                      {new Date(req.attendanceDate).toDateString()}
                    </p>
                  </div>

                  <p className="text-sm mb-2">
                    <strong>Type:</strong> {req.type.replace("_", " ")}
                  </p>

                  {req.type === "MISSED_PUNCH_OUT" && req.requestedTime && (
                    <p className="text-sm mb-2">
                      <strong>Requested Time:</strong> {req.requestedTime}
                    </p>
                  )}

                  <p className="text-sm mb-4">
                    <strong>Reason:</strong> {req.reason}
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(req.id, "APPROVED")}
                      disabled={approving === req.id}
                      className="bg-green-500 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                    >
                      {approving === req.id ? "Processing..." : "Approve"}
                    </button>
                    <button
                      onClick={() => handleAction(req.id, "REJECTED")}
                      disabled={approving === req.id}
                      className="bg-red-500 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
