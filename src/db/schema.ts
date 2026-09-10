import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  decimal,
  boolean,
  timestamp,
  date,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", [
  "owner",
  "manager",
  "accountant",
  "staff",
]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trial",
  "active",
  "overdue",
  "blocked",
  "suspended",
]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "enquiry",
  "tentative",
  "confirmed",
  "completed",
  "cancelled",
]);
export const sessionTypeEnum = pgEnum("session_type", [
  "morning",
  "evening",
  "full_day",
  "hourly",
]);
export const paymentModeEnum = pgEnum("payment_mode", [
  "cash",
  "upi",
  "card",
  "netbanking",
  "cheque",
]);
export const paymentTypeEnum = pgEnum("payment_type", [
  "advance",
  "balance",
  "refund",
  "deposit",
  "deposit_refund",
]);
export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "in_progress",
  "done",
]);
export const assetConditionEnum = pgEnum("asset_condition", [
  "excellent",
  "good",
  "fair",
  "poor",
]);
export const expenseCategoryEnum = pgEnum("expense_category", [
  "electricity",
  "salaries",
  "property_tax",
  "maintenance",
  "marketing",
  "other",
]);
export const bookingSourceEnum = pgEnum("booking_source", [
  "online",
  "phone",
  "walk_in",
]);
export const vendorCategoryEnum = pgEnum("vendor_category", [
  "catering",
  "decoration",
  "generator",
  "orchestra",
  "photography",
  "other",
]);

// ─── Venues ───────────────────────────────────────────────────────────────────
export const venues = pgTable("venues", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  district: varchar("district", { length: 100 }),
  gstNumber: varchar("gst_number", { length: 50 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  website: varchar("website", { length: 255 }),
  logoUrl: text("logo_url"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status")
    .notNull()
    .default("trial"),
  subscriptionPlan: varchar("subscription_plan", { length: 50 }).default(
    "starter"
  ),
  trialStartDate: date("trial_start_date"),
  currentCycleStart: date("current_cycle_start"),
  freeBookingQuota: integer("free_booking_quota").default(5),
  perBookingRate: decimal("per_booking_rate", { precision: 10, scale: 2 }).default("99.00"),
  invoicePrefix: varchar("invoice_prefix", { length: 20 }).default("INV"),
  invoiceSequence: integer("invoice_sequence").default(1),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }).default("18.00"),
  cancellationPolicy: text("cancellation_policy"),
  refundPolicy: text("refund_policy"),
  notifyWhatsapp: boolean("notify_whatsapp").default(true),
  notifySms: boolean("notify_sms").default(false),
  notifyEmail: boolean("notify_email").default(true),
  language: varchar("language", { length: 10 }).default("en"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id").references(() => venues.id),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  passwordHash: text("password_hash"),
  role: userRoleEnum("role").notNull().default("staff"),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Halls ────────────────────────────────────────────────────────────────────
export const halls = pgTable("halls", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id")
    .references(() => venues.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  capacity: integer("capacity"),
  hasAc: boolean("has_ac").default(false),
  parkingCount: integer("parking_count").default(0),
  stageSize: varchar("stage_size", { length: 100 }),
  stageType: varchar("stage_type", { length: 100 }),
  cateringRule: varchar("catering_rule", { length: 50 }).default(
    "outside_allowed"
  ),
  hasGeneratorBackup: boolean("has_generator_backup").default(false),
  hasBridalRoom: boolean("has_bridal_room").default(false),
  hasProjector: boolean("has_projector").default(false),
  hasAv: boolean("has_av").default(false),
  isAccessible: boolean("is_accessible").default(false),
  description: text("description"),
  isBookable: boolean("is_bookable").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Hall Photos ──────────────────────────────────────────────────────────────
export const hallPhotos = pgTable("hall_photos", {
  id: serial("id").primaryKey(),
  hallId: integer("hall_id")
    .references(() => halls.id)
    .notNull(),
  url: text("url").notNull(),
  caption: varchar("caption", { length: 255 }),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Pricing Rules ────────────────────────────────────────────────────────────
export const pricingRules = pgTable("pricing_rules", {
  id: serial("id").primaryKey(),
  hallId: integer("hall_id")
    .references(() => halls.id)
    .notNull(),
  sessionType: sessionTypeEnum("session_type").notNull(),
  baseRate: decimal("base_rate", { precision: 10, scale: 2 }).notNull(),
  seasonalOverride: jsonb("seasonal_override"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Packages ─────────────────────────────────────────────────────────────────
export const packages = pgTable("packages", {
  id: serial("id").primaryKey(),
  hallId: integer("hall_id")
    .references(() => halls.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  includes: jsonb("includes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Licence Documents ────────────────────────────────────────────────────────
export const licenceDocuments = pgTable("licence_documents", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id")
    .references(() => venues.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  documentType: varchar("document_type", { length: 100 }),
  fileUrl: text("file_url"),
  expiryDate: date("expiry_date"),
  reminderSent: boolean("reminder_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Customers ────────────────────────────────────────────────────────────────
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id")
    .references(() => venues.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id")
    .references(() => venues.id)
    .notNull(),
  hallId: integer("hall_id")
    .references(() => halls.id)
    .notNull(),
  customerId: integer("customer_id").references(() => customers.id),
  bookingRef: varchar("booking_ref", { length: 50 }),
  eventDate: date("event_date").notNull(),
  sessionType: sessionTypeEnum("session_type").notNull(),
  startTime: varchar("start_time", { length: 10 }),
  endTime: varchar("end_time", { length: 10 }),
  eventType: varchar("event_type", { length: 100 }),
  guestCount: integer("guest_count"),
  packageId: integer("package_id").references(() => packages.id),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  advanceAmount: decimal("advance_amount", { precision: 10, scale: 2 }),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0"),
  balanceDue: decimal("balance_due", { precision: 10, scale: 2 }),
  securityDeposit: decimal("security_deposit", { precision: 10, scale: 2 }).default("0"),
  depositRefunded: boolean("deposit_refunded").default(false),
  status: bookingStatusEnum("status").notNull().default("enquiry"),
  source: bookingSourceEnum("source").default("phone"),
  specialRequirements: text("special_requirements"),
  internalNotes: text("internal_notes"),
  addOns: jsonb("add_ons"),
  statusHistory: jsonb("status_history"),
  countedForBilling: boolean("counted_for_billing").default(false),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Payments ─────────────────────────────────────────────────────────────────
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .references(() => bookings.id)
    .notNull(),
  venueId: integer("venue_id")
    .references(() => venues.id)
    .notNull(),
  type: paymentTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  mode: paymentModeEnum("mode").notNull(),
  paymentDate: date("payment_date").notNull(),
  referenceNumber: varchar("reference_number", { length: 100 }),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Invoices ─────────────────────────────────────────────────────────────────
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id")
    .references(() => venues.id)
    .notNull(),
  bookingId: integer("booking_id").references(() => bookings.id),
  paymentId: integer("payment_id").references(() => payments.id),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  invoiceDate: date("invoice_date").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }),
  gstAmount: decimal("gst_amount", { precision: 10, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  isPreview: boolean("is_preview").default(false),
  isCancelled: boolean("is_cancelled").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Security Deposit Deductions ──────────────────────────────────────────────
export const depositDeductions = pgTable("deposit_deductions", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .references(() => bookings.id)
    .notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Staff ────────────────────────────────────────────────────────────────────
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id")
    .references(() => venues.id)
    .notNull(),
  userId: integer("user_id").references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  joiningDate: date("joining_date"),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Attendance ───────────────────────────────────────────────────────────────
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id")
    .references(() => staff.id)
    .notNull(),
  venueId: integer("venue_id")
    .references(() => venues.id)
    .notNull(),
  date: date("date").notNull(),
  status: varchar("status", { length: 20 }).default("present"),
  checkIn: varchar("check_in", { length: 10 }),
  checkOut: varchar("check_out", { length: 10 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Booking Staff Assignments ────────────────────────────────────────────────
export const bookingStaff = pgTable("booking_staff", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .references(() => bookings.id)
    .notNull(),
  staffId: integer("staff_id")
    .references(() => staff.id)
    .notNull(),
  role: varchar("role", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Housekeeping Templates ───────────────────────────────────────────────────
export const taskTemplates = pgTable("task_templates", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id")
    .references(() => venues.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  tasks: jsonb("tasks"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Booking Tasks ────────────────────────────────────────────────────────────
export const bookingTasks = pgTable("booking_tasks", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .references(() => bookings.id)
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  assignedStaffId: integer("assigned_staff_id").references(() => staff.id),
  status: taskStatusEnum("status").default("pending"),
  photoUrl: text("photo_url"),
  dueTime: varchar("due_time", { length: 10 }),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Assets ───────────────────────────────────────────────────────────────────
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id")
    .references(() => venues.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  totalQuantity: integer("total_quantity").default(1),
  availableQuantity: integer("available_quantity").default(1),
  purchaseDate: date("purchase_date"),
  purchaseCost: decimal("purchase_cost", { precision: 10, scale: 2 }),
  condition: assetConditionEnum("condition").default("good"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Maintenance Logs ─────────────────────────────────────────────────────────
export const maintenanceLogs = pgTable("maintenance_logs", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id")
    .references(() => assets.id)
    .notNull(),
  serviceDate: date("service_date").notNull(),
  description: text("description"),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  nextDueDate: date("next_due_date"),
  technician: varchar("technician", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Booking Assets ───────────────────────────────────────────────────────────
export const bookingAssets = pgTable("booking_assets", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .references(() => bookings.id)
    .notNull(),
  assetId: integer("asset_id")
    .references(() => assets.id)
    .notNull(),
  quantityAllocated: integer("quantity_allocated").default(1),
  returnStatus: varchar("return_status", { length: 50 }).default("pending"),
  damageNotes: text("damage_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Vendors ──────────────────────────────────────────────────────────────────
export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id")
    .references(() => venues.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: vendorCategoryEnum("category").notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  rateCard: text("rate_card"),
  rating: decimal("rating", { precision: 3, scale: 1 }),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Booking Vendors ──────────────────────────────────────────────────────────
export const bookingVendors = pgTable("booking_vendors", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .references(() => bookings.id)
    .notNull(),
  vendorId: integer("vendor_id")
    .references(() => vendors.id)
    .notNull(),
  serviceDetails: text("service_details"),
  agreedAmount: decimal("agreed_amount", { precision: 10, scale: 2 }),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0"),
  paymentStatus: varchar("payment_status", { length: 50 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Expenses ─────────────────────────────────────────────────────────────────
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id")
    .references(() => venues.id)
    .notNull(),
  bookingId: integer("booking_id").references(() => bookings.id),
  category: expenseCategoryEnum("category").notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  expenseDate: date("expense_date").notNull(),
  isRecurring: boolean("is_recurring").default(false),
  frequency: varchar("frequency", { length: 50 }),
  receiptUrl: text("receipt_url"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Communication Logs ───────────────────────────────────────────────────────
export const communicationLogs = pgTable("communication_logs", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .references(() => customers.id)
    .notNull(),
  bookingId: integer("booking_id").references(() => bookings.id),
  type: varchar("type", { length: 50 }),
  message: text("message"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Subscription Invoices (VenueHub's billing to venues) ────────────────────
export const subscriptionInvoices = pgTable("subscription_invoices", {
  id: serial("id").primaryKey(),
  venueId: integer("venue_id")
    .references(() => venues.id)
    .notNull(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
  billingPeriodStart: date("billing_period_start").notNull(),
  billingPeriodEnd: date("billing_period_end").notNull(),
  confirmedBookings: integer("confirmed_bookings").default(0),
  freeQuota: integer("free_quota").default(5),
  overageBookings: integer("overage_bookings").default(0),
  baseFee: decimal("base_fee", { precision: 10, scale: 2 }).default("0"),
  overageFee: decimal("overage_fee", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  isPreview: boolean("is_preview").default(false),
  status: varchar("status", { length: 50 }).default("pending"),
  dueDate: date("due_date"),
  paidAt: timestamp("paid_at"),
  paymentMode: varchar("payment_mode", { length: 50 }),
  paymentReference: varchar("payment_reference", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────
export const venuesRelations = relations(venues, ({ many }) => ({
  users: many(users),
  halls: many(halls),
  customers: many(customers),
  bookings: many(bookings),
  staff: many(staff),
  assets: many(assets),
  vendors: many(vendors),
  expenses: many(expenses),
  licenceDocuments: many(licenceDocuments),
  taskTemplates: many(taskTemplates),
  subscriptionInvoices: many(subscriptionInvoices),
  invoices: many(invoices),
}));

export const hallsRelations = relations(halls, ({ one, many }) => ({
  venue: one(venues, { fields: [halls.venueId], references: [venues.id] }),
  photos: many(hallPhotos),
  pricingRules: many(pricingRules),
  packages: many(packages),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  venue: one(venues, { fields: [bookings.venueId], references: [venues.id] }),
  hall: one(halls, { fields: [bookings.hallId], references: [halls.id] }),
  customer: one(customers, {
    fields: [bookings.customerId],
    references: [customers.id],
  }),
  package: one(packages, {
    fields: [bookings.packageId],
    references: [packages.id],
  }),
  payments: many(payments),
  invoices: many(invoices),
  tasks: many(bookingTasks),
  staffAssignments: many(bookingStaff),
  assetAllocations: many(bookingAssets),
  vendorEngagements: many(bookingVendors),
  expenses: many(expenses),
  depositDeductions: many(depositDeductions),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  venue: one(venues, { fields: [customers.venueId], references: [venues.id] }),
  bookings: many(bookings),
  communicationLogs: many(communicationLogs),
}));

export const staffRelations = relations(staff, ({ one, many }) => ({
  venue: one(venues, { fields: [staff.venueId], references: [venues.id] }),
  user: one(users, { fields: [staff.userId], references: [users.id] }),
  bookingAssignments: many(bookingStaff),
  attendance: many(attendance),
  tasks: many(bookingTasks),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  venue: one(venues, { fields: [assets.venueId], references: [venues.id] }),
  maintenanceLogs: many(maintenanceLogs),
  bookingAllocations: many(bookingAssets),
}));

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  venue: one(venues, { fields: [vendors.venueId], references: [venues.id] }),
  bookingEngagements: many(bookingVendors),
}));
