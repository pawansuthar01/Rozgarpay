"use client";

import ClientLayout from "@/components/layout/ClientLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import {
  CheckCircle,
  Clock,
  Heart,
  Shield,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

export default function AboutPage() {
  return (
    <ClientLayout>
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-50 to-white py-16 sm:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              About Rozgarpay
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              We're building the future of payroll and staff management, making
              it simple for businesses to focus on what matters most - their
              people.
            </p>
          </div>
        </section>

        {/* Company Introduction */}
        <section className="py-16 sm:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Our Story
              </h2>
            </div>

            <div className="prose prose-lg mx-auto text-gray-600">
              <p className="mb-6">
                Rozgarpay was born from a simple observation: managing payroll
                and staff operations shouldn't be a burden for growing
                businesses. As former HR professionals and software developers,
                we experienced firsthand the challenges of fragmented systems,
                manual processes, and compliance headaches.
              </p>

              <p className="mb-6">
                We set out to create a comprehensive platform that combines
                attendance tracking, salary management, and staff administration
                into one seamless experience. Our goal is to give businesses the
                tools they need to manage their most valuable asset - their
                people.
              </p>

              <p>
                Today, Rozgarpay serves thousands of businesses worldwide, from
                startups to enterprise organizations, helping them streamline
                operations and focus on growth.
              </p>
            </div>
          </div>
        </section>

        {/* Why We Built This */}
        <section className="py-16 sm:py-24 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Why We Built Rozgarpay
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-red-500 mt-1 mr-4 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Manual Processes Are Time-Consuming
                      </h3>
                      <p className="text-gray-600">
                        Businesses waste countless hours on spreadsheets, manual
                        calculations, and paperwork that could be automated.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-red-500 mt-1 mr-4 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Compliance Is Complex
                      </h3>
                      <p className="text-gray-600">
                        Navigating labor laws, tax regulations, and reporting
                        requirements creates unnecessary risk and complexity.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-red-500 mt-1 mr-4 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Fragmented Systems Cause Errors
                      </h3>
                      <p className="text-gray-600">
                        Using multiple disconnected tools leads to data
                        inconsistencies, missed deadlines, and frustrated
                        employees.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-red-500 mt-1 mr-4 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Growth Shouldn't Be Hindered
                      </h3>
                      <p className="text-gray-600">
                        As businesses scale, their HR processes should scale
                        with them without becoming more complicated.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Mission & Values */}
        <section className="py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Our Mission & Values
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <Target className="h-8 w-8 text-blue-600 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    Our Mission
                  </h3>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    To empower businesses with simple, reliable tools for
                    managing their people, so they can focus on growth and
                    innovation rather than administrative burdens.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Shield className="h-8 w-8 text-blue-600 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    Security First
                  </h3>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    We prioritize the security and privacy of your data. Every
                    feature is built with enterprise-grade security and
                    compliance in mind.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Heart className="h-8 w-8 text-blue-600 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    Human-Centered
                  </h3>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    We believe technology should serve people, not the other way
                    around. Our platform is designed with empathy for both
                    administrators and staff.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Who This Product Is For */}
        <section className="py-16 sm:py-24 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Who We Serve
              </h2>
              <p className="text-lg text-gray-600">
                Rozgarpay is designed for businesses that value efficiency,
                compliance, and employee satisfaction.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <Users className="h-8 w-8 text-blue-600 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    Growing Businesses
                  </h3>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    From startups with 10 employees to mid-sized companies with
                    hundreds, we scale with your business needs.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Flexible pricing plans
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Easy setup and onboarding
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Scalable features
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Shield className="h-8 w-8 text-blue-600 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    Compliance-Focused Organizations
                  </h3>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Industries with strict regulatory requirements trust
                    Rozgarpay for accurate record-keeping and reporting.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Audit-ready reports
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Data retention compliance
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Secure data handling
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Commitment to Security */}
        <section className="py-16 sm:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Our Commitment to Security & Compliance
              </h2>
            </div>

            <div className="prose prose-lg mx-auto text-gray-600">
              <p className="mb-6">
                Security isn't just a feature - it's the foundation of
                everything we build. We understand that payroll and employee
                data is sensitive information that requires the highest levels
                of protection.
              </p>

              <p className="mb-6">
                Our platform employs industry-standard security measures
                including end-to-end encryption, regular security audits, and
                compliance with international data protection regulations. We
                never compromise on security to maintain the trust our customers
                place in us.
              </p>

              <p>
                When you choose Rozgarpay, you're choosing a partner committed
                to protecting your business and your employees' data with the
                same care we would our own.
              </p>
            </div>
          </div>
        </section>
      </div>
    </ClientLayout>
  );
}
