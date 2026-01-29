"use client";

import ClientLayout from "@/components/layout/ClientLayout";

export default function PrivacyPolicyPage() {
  return (
    <ClientLayout>
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-50 to-white py-16 sm:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Privacy Policy
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Your privacy is important to us. This policy explains how we
              collect, use, and protect your personal information.
            </p>
            <p className="text-sm text-gray-500">
              Last updated: January 28, 2026
            </p>
          </div>
        </section>

        {/* Privacy Policy Content */}
        <section className="py-16 sm:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="prose prose-lg max-w-none">
              <h2>What Data We Collect</h2>
              <p>
                We collect information you provide directly to us, such as when
                you create an account, use our services, or contact us for
                support. This includes:
              </p>
              <ul>
                <li>
                  <strong>Account Information:</strong> Name, email address,
                  company details, and login credentials
                </li>
                <li>
                  <strong>Employee Data:</strong> Names, contact information,
                  salary details, and attendance records (provided by
                  administrators)
                </li>
                <li>
                  <strong>Usage Data:</strong> How you interact with our
                  platform, including features used and time spent
                </li>
                <li>
                  <strong>Device Information:</strong> IP address, browser type,
                  and device characteristics
                </li>
                <li>
                  <strong>Communication Data:</strong> Messages sent through our
                  support channels
                </li>
              </ul>

              <h2>Why We Collect Data</h2>
              <p>We use your data to:</p>
              <ul>
                <li>
                  Provide and maintain our payroll and staff management services
                </li>
                <li>Process and manage employee information securely</li>
                <li>
                  Ensure platform security and prevent unauthorized access
                </li>
                <li>Comply with legal and regulatory requirements</li>
                <li>Improve our services and develop new features</li>
                <li>
                  Communicate with you about your account and our services
                </li>
                <li>Provide customer support and respond to inquiries</li>
              </ul>

              <h2>How We Use Your Data</h2>
              <p>
                Your data is used exclusively for legitimate business purposes:
              </p>
              <ul>
                <li>
                  <strong>Service Delivery:</strong> To operate and maintain the
                  Rozgarpay platform
                </li>
                <li>
                  <strong>Payroll Processing:</strong> To calculate salaries,
                  generate reports, and process payments
                </li>
                <li>
                  <strong>Compliance:</strong> To meet legal obligations and
                  regulatory requirements
                </li>
                <li>
                  <strong>Security:</strong> To protect against fraud,
                  unauthorized access, and security threats
                </li>
                <li>
                  <strong>Communication:</strong> To send important updates,
                  security alerts, and support responses
                </li>
                <li>
                  <strong>Improvement:</strong> To analyze usage patterns and
                  improve our services
                </li>
              </ul>

              <h2>Data Security</h2>
              <p>
                We implement comprehensive security measures to protect your
                data:
              </p>
              <ul>
                <li>
                  <strong>Encryption:</strong> All data is encrypted in transit
                  and at rest using industry-standard protocols
                </li>
                <li>
                  <strong>Access Controls:</strong> Strict access controls
                  ensure only authorized personnel can view sensitive data
                </li>
                <li>
                  <strong>Regular Audits:</strong> We conduct regular security
                  audits and vulnerability assessments
                </li>
                <li>
                  <strong>Backup Systems:</strong> Multiple backup systems
                  ensure data availability and disaster recovery
                </li>
                <li>
                  <strong>Employee Training:</strong> Our team receives regular
                  training on data protection and security practices
                </li>
              </ul>

              <h2>Cookies and Tracking</h2>
              <p>
                We use cookies and similar technologies to enhance your
                experience and analyze usage:
              </p>
              <ul>
                <li>
                  <strong>Essential Cookies:</strong> Required for platform
                  functionality and security
                </li>
                <li>
                  <strong>Analytics Cookies:</strong> Help us understand how
                  users interact with our platform
                </li>
                <li>
                  <strong>Preference Cookies:</strong> Remember your settings
                  and preferences
                </li>
              </ul>
              <p>
                You can control cookie settings through your browser
                preferences. However, disabling essential cookies may affect
                platform functionality.
              </p>

              <h2>Third-Party Services</h2>
              <p>We may use third-party services to enhance our platform:</p>
              <ul>
                <li>
                  <strong>Cloud Infrastructure:</strong> Secure cloud providers
                  for data storage and processing
                </li>
                <li>
                  <strong>Payment Processors:</strong> For salary disbursements
                  and billing (when applicable)
                </li>
                <li>
                  <strong>Analytics Services:</strong> To understand platform
                  usage and improve services
                </li>
                <li>
                  <strong>Communication Tools:</strong> For customer support and
                  notifications
                </li>
              </ul>
              <p>
                All third-party services are selected for their security
                standards and compliance with data protection regulations.
              </p>

              <h2>Your Rights</h2>
              <p>You have the following rights regarding your data:</p>
              <ul>
                <li>
                  <strong>Access:</strong> Request a copy of the personal data
                  we hold about you
                </li>
                <li>
                  <strong>Correction:</strong> Request correction of inaccurate
                  or incomplete data
                </li>
                <li>
                  <strong>Deletion:</strong> Request deletion of your personal
                  data (subject to legal requirements)
                </li>
                <li>
                  <strong>Portability:</strong> Request transfer of your data to
                  another service
                </li>
                <li>
                  <strong>Restriction:</strong> Request limitation of how we
                  process your data
                </li>
                <li>
                  <strong>Objection:</strong> Object to certain types of data
                  processing
                </li>
              </ul>

              <h2>Contact for Privacy Concerns</h2>
              <p>
                If you have questions about this privacy policy or want to
                exercise your rights, please contact us:
              </p>
              <div className="bg-gray-50 p-6 rounded-lg my-6">
                <p>
                  <strong>Email:</strong> privacy@Rozgarpay.com
                </p>
                <p>
                  <strong>Address:</strong> 123 Business Street, Suite 100, San
                  Francisco, CA 94105
                </p>
                <p>
                  <strong>Phone:</strong> +1 (555) 123-4567
                </p>
              </div>
              <p>We will respond to your privacy inquiries within 30 days.</p>

              <h2>Data Retention</h2>
              <p>
                We retain your data only as long as necessary for the purposes
                outlined in this policy:
              </p>
              <ul>
                <li>
                  <strong>Account Data:</strong> Retained while your account is
                  active and for 7 years after account closure for tax and legal
                  compliance
                </li>
                <li>
                  <strong>Employee Records:</strong> Retained according to local
                  labor laws and regulations
                </li>
                <li>
                  <strong>Usage Logs:</strong> Retained for 2 years for security
                  and analytics purposes
                </li>
                <li>
                  <strong>Communication Records:</strong> Retained for 3 years
                  for support and compliance purposes
                </li>
              </ul>

              <h2>International Data Transfers</h2>
              <p>
                Your data may be transferred to and processed in countries other
                than your own. We ensure all transfers comply with applicable
                data protection laws and implement appropriate safeguards such
                as standard contractual clauses.
              </p>

              <h2>Children's Privacy</h2>
              <p>
                Our services are not intended for children under 13. We do not
                knowingly collect personal information from children under 13.
                If we become aware that we have collected such information, we
                will delete it immediately.
              </p>

              <h2>Changes to This Policy</h2>
              <p>
                We may update this privacy policy from time to time. We will
                notify you of any material changes by email or through our
                platform. Your continued use of our services after such changes
                constitutes acceptance of the updated policy.
              </p>

              <h2>Contact Information</h2>
              <p>
                For any questions about this privacy policy or our data
                practices, please contact:
              </p>
              <div className="bg-gray-50 p-6 rounded-lg my-6">
                <p>
                  <strong>Data Protection Officer</strong>
                </p>
                <p>
                  <strong>Email:</strong> dpo@Rozgarpay.com
                </p>
                <p>
                  <strong>Phone:</strong> +1 (555) 123-4567
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </ClientLayout>
  );
}
