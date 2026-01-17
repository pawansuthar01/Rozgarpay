"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Building2,
  Mail,
  Phone,
  CheckCircle,
} from "lucide-react";

interface Company {
  id: string;
  name: string;
  status: string;
}

export default function CreateAdminPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const res = await fetch(
        "/api/super-admin/companies?status=ACTIVE&limit=1000"
      );
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies);
      }
    } catch (error) {
      console.error("Failed to fetch companies:", error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company);
    setCurrentStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `/api/super-admin/companies/${selectedCompany.id}/invite-admin`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error || "Error sending invitation");
      }
    } catch (error) {
      setError("An error occurred while sending invitation");
    }

    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedCompany(null);
    setFormData({ email: "", phone: "" });
    setError("");
    setSuccess(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              👤 Invite Company Admin
            </h1>
            <Link
              href="/super-admin/dashboard"
              className="text-blue-600 hover:text-blue-800"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto py-8 sm:px-6 lg:px-8">
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep >= 1
                  ? "bg-blue-600 text-white"
                  : "bg-gray-300 text-gray-600"
              }`}
            >
              1
            </div>
            <span
              className={`ml-2 ${
                currentStep >= 1 ? "text-blue-600 font-medium" : "text-gray-600"
              }`}
            >
              Select Company
            </span>
            <ChevronRight className="mx-4 h-4 w-4 text-gray-400" />
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep >= 2
                  ? "bg-blue-600 text-white"
                  : "bg-gray-300 text-gray-600"
              }`}
            >
              2
            </div>
            <span
              className={`ml-2 ${
                currentStep >= 2 ? "text-blue-600 font-medium" : "text-gray-600"
              }`}
            >
              Send Invitation
            </span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-lg shadow">
          {success ? (
            <div className="text-center">
              <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Invitation Sent!
              </h2>
              <p className="text-gray-600 mb-6">
                An invitation has been sent to {formData.email} to join{" "}
                {selectedCompany?.name} as an admin.
              </p>
              <div className="space-x-4">
                <button
                  onClick={resetForm}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                >
                  Send Another Invitation
                </button>
                <Link
                  href="/super-admin/admins"
                  className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
                >
                  View All Admins
                </Link>
              </div>
            </div>
          ) : currentStep === 1 ? (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Select Company
              </h2>
              <p className="text-gray-600 mb-6">
                Choose the company where you want to invite an admin.
              </p>

              {loadingCompanies ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : companies.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">
                    No active companies found.
                  </p>
                  <Link
                    href="/super-admin/create-company"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Create a company first
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4">
                  {companies.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => handleCompanySelect(company)}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                    >
                      <div className="flex items-center">
                        <Building2 className="h-8 w-8 text-blue-600 mr-3" />
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {company.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            ID: {company.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  ← Back to company selection
                </button>
              </div>

              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <Building2 className="h-6 w-6 text-blue-600 mr-2" />
                  <div>
                    <h3 className="font-medium text-blue-900">
                      {selectedCompany?.name}
                    </h3>
                    <p className="text-sm text-blue-700">
                      Selected company for admin invitation
                    </p>
                  </div>
                </div>
              </div>

              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Send Admin Invitation
              </h2>
              <p className="text-gray-600 mb-6">
                Enter the contact details to send an invitation to join{" "}
                {selectedCompany?.name} as an admin.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="admin@company.com"
                      className="pl-10 block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+1234567890"
                      className="pl-10 block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="text-red-800 text-sm">{error}</div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Sending Invitation..." : "Send Admin Invitation"}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
