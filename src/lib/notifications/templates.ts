// ============================================
// Notification Templates
// ============================================
import { NotificationTemplate, NotificationType } from "./types";

export const NOTIFICATION_TEMPLATES: Record<
  NotificationType,
  NotificationTemplate
> = {
  customer_support: {
    id: "customer_support",
    type: "customer_support",
    title: "Customer Support",
    message: "{{message}}",
    priority: "high",
    channels: ["in_app", "push"],
    variables: ["message", "supportId"],
    actions: [
      {
        label: "Contact Support",
        action: "navigate",
        params: { route: "/support" },
      },
    ],
  },
  promotional: {
    id: "promotional",
    type: "promotional",
    title: "{{title}}",
    message: "{{message}}",
    priority: "low",
    channels: ["in_app", "push"],
    variables: ["title", "message", "offerId"],
    actions: [
      {
        label: "View Offer",
        action: "navigate",
        params: { route: "/offers/{{offerId}}" },
      },
    ],
  },
  system_alert: {
    id: "system_alert",
    type: "system_alert",
    title: "System Alert",
    message: "{{message}}",
    priority: "urgent",
    channels: ["in_app", "push", "email"],
    variables: ["message", "alertType"],
  },
  admin_manual: {
    id: "admin_manual",
    type: "admin_manual",
    title: "{{title}}",
    message: "{{message}}",
    priority: "medium",
    channels: ["in_app", "push"],
    variables: ["title", "message", "sentBy"],
    actions: [],
  },
  staff_manual: {
    id: "store_manual",
    type: "staff_manual",
    title: "{{title}}",
    message: "{{message}}",
    priority: "medium",
    channels: ["in_app", "push"],
    variables: ["title", "message", "storeName", "sentBy"],
    actions: [],
  },
  company_join_link: {
    id: "company_join_link",
    type: "company_join_link",
    title: "You're Invited to Join RozgarPay",
    message:
      "You've been invited to join RozgarPay as a {{role}}. Click here to complete your registration.",
    priority: "high",
    channels: ["in_app", "email", "whatsapp"],
    variables: ["role", "invitationUrl", "expiresAt", "message"],
    actions: [
      {
        label: "Accept Invitation",
        action: "navigate",
        params: { route: "{{invitationUrl}}" },
      },
    ],
  },
  company_staff_join: {
    id: "company_staff_join",
    type: "company_staff_join",
    title: "You're Invited to Join RozgarPay",
    message:
      "You've been invited to join RozgarPay as a {{role}}. Click here to complete your registration.",
    priority: "high",
    channels: ["in_app", "email", "whatsapp"],
    variables: ["role", "invitationUrl", "expiresAt", "message"],
    actions: [
      {
        label: "Accept Invitation",
        action: "navigate",
        params: { route: "{{invitationUrl}}" },
      },
    ],
  },
  staff_join: {
    id: "staff_join",
    type: "staff_join",
    title: "You're Invited to Join RozgarPay",
    message:
      "You've been invited to join RozgarPay as a {{role}}. Click here to complete your registration.",
    priority: "high",
    channels: ["email", "whatsapp"],
    variables: ["role", "invitationUrl", "expiresAt", "message"],
    actions: [
      {
        label: "Accept Invitation",
        action: "navigate",
        params: { route: "{{invitationUrl}}" },
      },
    ],
  },
  salary_padding: {
    id: "salary_padding",
    type: "salary_padding",
    title: "Salary Payment Processed",
    message:
      "Your salary payment of {{amount}} has been processed for {{month}}.",
    priority: "high",
    channels: ["in_app", "push", "whatsapp"],
    variables: ["amount", "month", "paymentDate", "staffName"],
    actions: [
      {
        label: "View Details",
        action: "navigate",
        params: { route: "/admin/salary" },
      },
    ],
  },
  salary_setup_pending: {
    id: "salary_setup_pending",
    type: "salary_setup_pending",
    title: "Salary Setup Pending",
    message:
      "Salary setup is pending for {{staffName}}. Please complete the setup to process payments.",
    priority: "medium",
    channels: ["in_app", "push", "email"],
    variables: ["staffName", "companyName", "dueDate"],
    actions: [
      {
        label: "Setup Salary",
        action: "navigate",
        params: { route: "/admin/salary/setup" },
      },
    ],
  },
  welcome_message: {
    id: "welcome_message",
    type: "welcome_message",
    title: "Welcome to RozgarPay!",
    message:
      "Hello {{staffName}}, welcome to {{companyName}}! We're happy to have you on board.",
    priority: "high",
    channels: ["in_app", "email", "whatsapp"],
    variables: ["staffName", "companyName", "startDate", "role"],
    actions: [
      {
        label: "View Profile",
        action: "navigate",
        params: { route: "/admin/profile" },
      },
    ],
  },
  protection: {
    id: "protection",
    type: "protection",
    title: "Security Alert",
    message: "{{message}}",
    priority: "urgent",
    channels: ["in_app", "push", "email"],
    variables: ["message", "alertType", "actionRequired"],
    actions: [],
  },
  salary_setup_done: {
    id: "salary_setup_done",
    type: "salary_setup_done",
    title: "Salary Setup Complete",
    message:
      "Congratulations! Your salary has been set up. You can now start marking your attendance.",
    priority: "high",
    channels: ["in_app", "email", "whatsapp"],
    variables: ["staffName", "companyName", "salaryType", "effectiveDate"],
    actions: [
      {
        label: "View Profile",
        action: "navigate",
        params: { route: "/admin/profile" },
      },
    ],
  },
};

// Helper to get template with fallback
export function getTemplate(
  type: NotificationType,
): NotificationTemplate | null {
  return NOTIFICATION_TEMPLATES[type] || null;
}

// Helper to check if template exists
export function templateExists(type: NotificationType): boolean {
  return type in NOTIFICATION_TEMPLATES;
}
