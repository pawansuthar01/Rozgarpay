"use client";
import ClientLayout from "@/components/layout/ClientLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { CheckCircle, Clock, Shield, TrendingUp, Users } from "lucide-react";

function HomePage() {
  return (
    <ClientLayout>
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-50 to-white py-12 sm:py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Simplify Your
                <span className="text-blue-600"> Payroll Management</span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                Track attendance, manage salaries, and ensure compliance with
                our comprehensive staff management platform designed for growing
                businesses.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 px-6 py-3 text-base">
                  Start
                </button>
                <button className="inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500 px-6 py-3 text-base">
                  Contact
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Key Features */}
        <section className="py-16 sm:py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Everything You Need to Manage Your Team
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Comprehensive tools to handle attendance, payroll, and staff
                management efficiently.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <Clock className="h-8 w-8 text-blue-600 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    Attendance Tracking
                  </h3>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    attendance monitoring with geolocation, photo verification,
                    and automated reporting for accurate time tracking.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <TrendingUp className="h-8 w-8 text-blue-600 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    Salary Management
                  </h3>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Automated salary calculations, payroll processing, and
                    comprehensive reporting to ensure timely and accurate
                    payments.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Users className="h-8 w-8 text-blue-600 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    Staff Directory
                  </h3>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Centralized employee database with role management,
                    permissions, and easy access to staff information and
                    performance data.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-12 sm:py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                How It Works
              </h2>
              <p className="text-base sm:text-lg text-gray-600">
                Get started in minutes with our simple setup process.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-blue-600">1</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Set Up Your Company
                </h3>
                <p className="text-gray-600">
                  Create your company profile, configure salary rules, and
                  invite your team members.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-blue-600">2</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Track & Manage
                </h3>
                <p className="text-gray-600">
                  Monitor attendance in real-time, manage salary calculations,
                  and generate reports.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-blue-600">3</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Scale & Grow
                </h3>
                <p className="text-gray-600">
                  Expand your team, add new features, and maintain compliance as
                  your business grows.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Who It's For */}
        <section className="py-12 sm:py-16 md:py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Built for Every Role in Your Organization
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
              <Card>
                <CardHeader>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Administrators
                  </h3>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Full control over company settings, user management, and
                    system configuration.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Company setup and configuration
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      User role management
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      System-wide reporting
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Managers
                  </h3>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Oversee team performance, approve requests, and manage daily
                    operations.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Team attendance monitoring
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Request approvals
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Performance reports
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Staff Members
                  </h3>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Easy attendance tracking and access to personal salary
                    information.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Mobile attendance punching
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Salary slip access
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Leave management
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Trust Indicators */}
        <section className="py-12 sm:py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Trusted by Businesses Worldwide
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 text-center">
              <div>
                <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Secure & Compliant
                </h3>
                <p className="text-gray-600">
                  Enterprise-grade security with full compliance to data
                  protection regulations.
                </p>
              </div>

              <div>
                <CheckCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Reliable
                </h3>
                <p className="text-gray-600">
                  99.9% uptime with automated backups and disaster recovery
                  capabilities.
                </p>
              </div>

              <div>
                <TrendingUp className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Scalable
                </h3>
                <p className="text-gray-600">
                  Built to grow with your business, from startups to enterprise
                  organizations.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-blue-600 py-12 sm:py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Transform Your Payroll Management?
            </h2>
            <p className="text-lg sm:text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join thousands of businesses already using Rozgarpay to streamline
              their operations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-blue-200 cursor-pointer hover:bg-blue-300 border hover:blue-green-200 text-white border-blue-300 px-6 py-3 text-base">
                Get Start Now
              </button>
              <button className="inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-blue-200 cursor-pointer hover:bg-blue-300 border hover:blue-green-200 text-white border-blue-300 px-6 py-3 text-base">
                Contact
              </button>
            </div>
          </div>
        </section>
      </div>
    </ClientLayout>
  );
}
export default HomePage;
