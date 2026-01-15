"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Company {
  id: string;
  name: string;
  isActive: boolean;
  _count: {
    users: number;
  };
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    const res = await fetch("/api/super-admin/companies");
    if (res.ok) {
      const data = await res.json();
      setCompanies(data.companies);
    }
    setLoading(false);
  };

  const toggleActive = async (id: string) => {
    const res = await fetch(`/api/super-admin/companies/${id}`, {
      method: "PATCH",
    });
    if (res.ok) {
      fetchCompanies();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Manage Companies
            </h1>
            <div className="space-x-4">
              <Link
                href="/super-admin/create-company"
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Create Company
              </Link>
              <Link
                href="/super-admin/dashboard"
                className="text-blue-600 hover:text-blue-800"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {companies.map((company) => (
              <li key={company.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {company.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {company._count.users} users
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        company.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {company.isActive ? "Active" : "Inactive"}
                    </span>
                    <button
                      onClick={() => toggleActive(company.id)}
                      className={`px-4 py-2 text-sm rounded ${
                        company.isActive
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      {company.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {companies.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No companies found.</p>
              <Link
                href="/super-admin/create-company"
                className="text-blue-600 hover:text-blue-800 mt-2 inline-block"
              >
                Create your first company
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
