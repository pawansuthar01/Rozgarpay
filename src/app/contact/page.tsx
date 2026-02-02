"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Mail, Phone, MapPin, CheckCircle, AlertCircle } from "lucide-react";
import ClientLayout from "@/components/layout/ClientLayout";
import { validatePhoneNumber } from "@/lib/utils";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "+91",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.phone) {
      newErrors.phone = "phone is required";
    } else if (!validatePhoneNumber(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus("success");
        setFormData({ name: "", phone: "+91", message: "" });
      } else {
        setSubmitStatus("error");
      }
    } catch (error) {
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ClientLayout>
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-50 to-white py-16 sm:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Get in Touch
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Have questions about Rozgarpay? We're here to help. Reach out to
              our team for support, sales inquiries, or general information.
            </p>
          </div>
        </section>

        {/* Contact Form & Info */}
        <section className="py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <div>
                <Card>
                  <CardHeader>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Send us a Message
                    </h2>
                    <p className="text-gray-600">
                      Fill out the form below and we'll get back to you within
                      24 hours.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <Input
                        label="Name"
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        error={errors.name}
                        required
                      />

                      <Input
                        label="phone"
                        type="text"
                        value={formData.phone}
                        onChange={(e) =>
                          handleInputChange("phone", e.target.value)
                        }
                        placeholder="+91"
                        error={errors.phone}
                        required
                      />

                      <Textarea
                        label="Message"
                        value={formData.message}
                        onChange={(e) =>
                          handleInputChange("message", e.target.value)
                        }
                        error={errors.message}
                        placeholder="Tell us how we can help you..."
                        required
                      />

                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 px-6 py-3 text-base w-full disabled:opacity-50 disabled:pointer-events-none"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Sending..." : "Send Message"}
                      </button>

                      {submitStatus === "success" && (
                        <div className="flex items-center text-green-600 bg-green-50 p-4 rounded-md">
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Thank you! Your message has been sent successfully.
                          We'll get back to you soon.
                        </div>
                      )}

                      {submitStatus === "error" && (
                        <div className="flex items-center text-red-600 bg-red-50 p-4 rounded-md">
                          <AlertCircle className="h-5 w-5 mr-2" />
                          Something went wrong. Please try again or contact us
                          directly.
                        </div>
                      )}
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Contact Information */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Contact Information
                  </h2>
                  <p className="text-gray-600 mb-8">
                    Prefer to reach out directly? Here are our contact details
                    and support options.
                  </p>
                </div>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-6">
                      <div className="flex items-start">
                        <Mail className="h-6 w-6 text-blue-600 mt-1 mr-4" />
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            Email Support
                          </h3>
                          <p className="text-gray-600">mail@pawansuthar.in</p>
                          <p className="text-sm text-gray-500 mt-1">
                            For technical support and general inquiries
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <Mail className="h-6 w-6 text-blue-600 mt-1 mr-4" />
                        <div>
                          <h3 className="font-semibold text-gray-900">Sales</h3>
                          <p className="text-gray-600">mail@pawansuthar.in</p>
                          <p className="text-sm text-gray-500 mt-1">
                            For pricing, demos, and enterprise solutions
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <Phone className="h-6 w-6 text-blue-600 mt-1 mr-4" />
                        <div>
                          <h3 className="font-semibold text-gray-900">Phone</h3>
                          <p className="text-gray-600">+91 86192 18048</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Mon-Fri, 9 AM - 6 PM EST
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-gray-900 mb-4">
                      Response Times
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email Support</span>
                        <span className="font-medium">Within 24 hours</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sales Inquiries</span>
                        <span className="font-medium">Within 4 hours</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Phone Support</span>
                        <span className="font-medium">Immediate</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </div>
    </ClientLayout>
  );
}
