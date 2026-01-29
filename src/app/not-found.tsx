"use client";
import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 to-blue-700 p-12 flex-col justify-center items-center text-white">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold mb-4">Rozgarpay</h1>
          <p className="text-xl mb-8 opacity-90">
            Streamline your payroll and staff management with our comprehensive
            platform
          </p>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold">✓</span>
              </div>
              <span>Track attendance effortlessly</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold">✓</span>
              </div>
              <span>Manage salaries with ease</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold">✓</span>
              </div>
              <span>Ensure compliance and accuracy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - 404 Content */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-8">
          {/* Mobile branding */}
          <div className="lg:hidden">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Rozgarpay</h1>
          </div>

          <div>
            <div className="text-8xl font-bold text-indigo-600 mb-4">404</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Page Not Found
            </h2>
            <p className="text-gray-600 mb-8">
              Sorry, the page you are looking for doesn't exist or has been
              moved.
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Home className="mr-2 h-5 w-5" />
              Go to Homepage
            </Link>

            <div>
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
