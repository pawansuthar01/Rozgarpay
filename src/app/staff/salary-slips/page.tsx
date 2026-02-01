"use client";

import { useSession } from "next-auth/react";
import Loading from "@/components/ui/Loading";

import { useState } from "react";
import { Download, Share2 } from "lucide-react";
import { useSalarySlipDownload } from "@/hooks";

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

export default function StaffSalarySlipsPage() {
  const { data: session } = useSession();

  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [type, setType] = useState<"full" | "summary" | null>(null);

  // Use the custom hook
  const downloadMutation = useSalarySlipDownload();

  if (!session || session.user.role !== "STAFF") {
    return <div className="p-6 text-center">Access Denied</div>;
  }

  const handleAction = async (share = false) => {
    if (!year || !month || !type) return;

    try {
      const file = await downloadMutation.mutateAsync({
        year,
        month,
        type,
      });

      if (share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      alert(e.message || "Failed to generate salary slip");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Salary Slip</h1>
          <p className="text-sm text-gray-600">
            Download or share your payslip
          </p>
        </div>

        {/* Year */}
        <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
          <select
            className="w-full p-3 border rounded-lg"
            value={year ?? ""}
            onChange={(e) => {
              setYear(Number(e.target.value));
              setMonth(null);
            }}
          >
            <option value="">Select Year</option>
            {Array.from({ length: 4 }).map((_, i) => {
              const y = currentYear - i;
              return (
                <option key={y} value={y}>
                  {y}
                </option>
              );
            })}
          </select>

          <select
            className="w-full p-3 border rounded-lg"
            value={month ?? ""}
            disabled={!year}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            <option value="">Select Month</option>
            {Array.from({
              length: year === currentYear ? currentMonth : 12,
            }).map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString("default", {
                  month: "long",
                })}
              </option>
            ))}
          </select>
        </div>

        {/* Type */}
        {year && month && (
          <div className="bg-white p-4 rounded-xl shadow-sm flex gap-3">
            {["summary", "full"].map((t) => (
              <button
                key={t}
                onClick={() => setType(t as any)}
                className={`flex-1 py-3 rounded-lg font-medium border ${
                  type === t ? "bg-blue-600 text-white" : "bg-white"
                }`}
              >
                {t === "summary" ? "Summary" : "Full"}
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        {year && month && type && (
          <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
            <button
              onClick={() => handleAction(false)}
              disabled={downloadMutation.isPending}
              className="w-full bg-green-600 text-white py-3 rounded-lg flex justify-center gap-2"
            >
              <Download size={18} /> Download PDF
            </button>

            <button
              onClick={() => handleAction(true)}
              disabled={downloadMutation.isPending}
              className="w-full bg-blue-600 text-white py-3 rounded-lg flex justify-center gap-2"
            >
              <Share2 size={18} /> Share PDF
            </button>
          </div>
        )}

        {downloadMutation.isPending && (
          <p className="text-center text-sm text-gray-500">
            Generating salary slip…
          </p>
        )}
      </div>
    </div>
  );
}
