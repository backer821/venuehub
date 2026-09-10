-- ============================================================================
-- VenueHub - Complete Database Setup Script
-- Version: 1.0
-- Description: Full schema setup for VenueHub Venue Management Platform
-- ============================================================================

-- Create the database (run as superuser if needed)
-- CREATE DATABASE venuehub_db;
-- \c venuehub_db;

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('owner', 'manager', 'accountant', 'staff');

CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'overdue', 'blocked', 'suspended');

CREATE TYPE booking_status AS ENUM ('enquiry', 'tentative', 'confirmed', 'completed', 'cancelled');

CREATE TYPE session_type AS ENUM ('morning', 'evening', 'full_day', 'hourly');

CREATE TYPE payment_mode AS ENUM ('cash', 'upi', 'card', 'netbanking', 'cheque');

CREATE TYPE payment_type AS ENUM ('advance', 'balance', 'refund', 'deposit', 'deposit_refund');

CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'done');

CREATE TYPE asset_condition AS ENUM ('excellent', 'good', 'fair', 'poor');

CREATE TYPE expense_category AS ENUM (
    'electricity', 'salaries', 'property_tax', 'maintenance', 'marketing', 'other'
);

CREATE TYPE booking_source AS ENUM ('online', 'phone', 'walk_in');

CREATE TYPE vendor_category AS ENUM (
    'catering', 'decoration', 'generator', 'orchestra', 'photography', 'other'
);

-- ============================================================================
-- TABLE: venues
-- Core venue entity. Each venue is a SaaS tenant.
-- ============================================================================

CREATE TABLE venues (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(255)    NOT NULL,
    address             TEXT,
    district            VARCHAR(100),
    gst_number          VARCHAR(50),
    phone               VARCHAR(20),
    email               VARCHAR(255),
    website             VARCHAR(255),
    logo_url            TEXT,

    -- Subscription & Billing (VenueHub's own billing to this venue)
    subscription_status subscription_status NOT NULL DEFAULT 'trial',
    subscription_plan   VARCHAR(50)     DEFAULT 'starter',
    trial_start_date    DATE,
    current_cycle_start DATE,
    free_booking_quota  INTEGER         DEFAULT 5,
    per_booking_rate    NUMERIC(10, 2)  DEFAULT 99.00,

    -- Invoice Configuration
    invoice_prefix      VARCHAR(20)     DEFAULT 'INV',
    invoice_sequence    INTEGER         DEFAULT 1,
    gst_rate            NUMERIC(5, 2)   DEFAULT 18.00,

    -- Policies
    cancellation_policy TEXT,
    refund_policy       TEXT,

    -- Notification Preferences
    notify_whatsapp     BOOLEAN         DEFAULT TRUE,
    notify_sms          BOOLEAN         DEFAULT FALSE,
    notify_email        BOOLEAN         DEFAULT TRUE,

    -- UI Settings
    language            VARCHAR(10)     DEFAULT 'en',  -- 'en' or 'ml' (Malayalam)

    created_at          TIMESTAMP       DEFAULT NOW(),
    updated_at          TIMESTAMP       DEFAULT NOW()
);

COMMENT ON TABLE venues IS 'Core venue entity. Each row is a SaaS tenant on VenueHub platform.';
COMMENT ON COLUMN venues.subscription_status IS 'trial → active → overdue → blocked → suspended lifecycle.';
COMMENT ON COLUMN venues.free_booking_quota IS 'Number of confirmed bookings included in flat monthly fee.';
COMMENT ON COLUMN venues.per_booking_rate IS 'Charge per confirmed booking beyond free_booking_quota.';

-- ============================================================================
-- TABLE: users
-- Platform users (owners, managers, accountants, staff) per venue.
-- ============================================================================

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    venue_id        INTEGER         REFERENCES venues(id) ON DELETE SET NULL,
    name            VARCHAR(255)    NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(20),
    password_hash   TEXT,
    role            user_role       NOT NULL DEFAULT 'staff',
    is_active       BOOLEAN         DEFAULT TRUE,
    last_login      TIMESTAMP,
    created_at      TIMESTAMP       DEFAULT NOW(),
    updated_at      TIMESTAMP       DEFAULT NOW()
);

CREATE INDEX idx_users_venue_id ON users(venue_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);

COMMENT ON TABLE users IS 'Platform users. Role determines access per permission matrix (Appendix A).';
COMMENT ON COLUMN users.role IS 'owner: full access. manager: operations. accountant: financials. staff: assigned tasks only.';

-- ============================================================================
-- TABLE: halls
-- Bookable halls/spaces within a venue.
-- ============================================================================

CREATE TABLE halls (
    id                      SERIAL PRIMARY KEY,
    venue_id                INTEGER         NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    name                    VARCHAR(255)    NOT NULL,
    capacity                INTEGER,

    -- Facilities Checklist
    has_ac                  BOOLEAN         DEFAULT FALSE,
    parking_count           INTEGER         DEFAULT 0,
    stage_size              VARCHAR(100),
    stage_type              VARCHAR(100),
    catering_rule           VARCHAR(50)     DEFAULT 'outside_allowed',  -- 'in_house_only' | 'outside_allowed'
    has_generator_backup    BOOLEAN         DEFAULT FALSE,
    has_bridal_room         BOOLEAN         DEFAULT FALSE,
    has_projector           BOOLEAN         DEFAULT FALSE,
    has_av                  BOOLEAN         DEFAULT FALSE,
    is_accessible           BOOLEAN         DEFAULT FALSE,

    description             TEXT,

    -- Bookable flag: must have capacity + pricing + photo to enable
    is_bookable             BOOLEAN         DEFAULT FALSE,
    is_active               BOOLEAN         DEFAULT TRUE,

    created_at              TIMESTAMP       DEFAULT NOW(),
    updated_at              TIMESTAMP       DEFAULT NOW()
);

CREATE INDEX idx_halls_venue_id ON halls(venue_id);

COMMENT ON COLUMN halls.is_bookable IS 'Cannot be TRUE unless capacity, at least one pricing rule, and one photo are set.';
COMMENT ON COLUMN halls.catering_rule IS 'in_house_only: only venue catering allowed. outside_allowed: external caterers permitted.';

-- ============================================================================
-- TABLE: hall_photos
-- Photo gallery for each hall.
-- ============================================================================

CREATE TABLE hall_photos (
    id          SERIAL PRIMARY KEY,
    hall_id     INTEGER     NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
    url         TEXT        NOT NULL,
    caption     VARCHAR(255),
    is_primary  BOOLEAN     DEFAULT FALSE,
    created_at  TIMESTAMP   DEFAULT NOW()
);

CREATE INDEX idx_hall_photos_hall_id ON hall_photos(hall_id);

-- ============================================================================
-- TABLE: pricing_rules
-- Base rates per session type, per hall. Supports seasonal overrides as JSONB.
-- ============================================================================

CREATE TABLE pricing_rules (
    id                  SERIAL PRIMARY KEY,
    hall_id             INTEGER         NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
    session_type        session_type    NOT NULL,
    base_rate           NUMERIC(10, 2)  NOT NULL,
    -- JSONB: [{ date: "YYYY-MM-DD", rate: 75000, label: "Muhurtham Premium" }]
    seasonal_override   JSONB,
    is_active           BOOLEAN         DEFAULT TRUE,
    created_at          TIMESTAMP       DEFAULT NOW(),
    UNIQUE(hall_id, session_type)
);

CREATE INDEX idx_pricing_rules_hall_id ON pricing_rules(hall_id);

-- ============================================================================
-- TABLE: packages
-- Named package bundles (e.g. Gold Wedding Package) per hall.
-- ============================================================================

CREATE TABLE packages (
    id          SERIAL PRIMARY KEY,
    hall_id     INTEGER         NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
    name        VARCHAR(255)    NOT NULL,
    description TEXT,
    price       NUMERIC(10, 2)  NOT NULL,
    -- JSONB array of included items: ["Decoration", "Catering (300 pax)", "Sound & Light"]
    includes    JSONB,
    is_active   BOOLEAN         DEFAULT TRUE,
    created_at  TIMESTAMP       DEFAULT NOW()
);

CREATE INDEX idx_packages_hall_id ON packages(hall_id);

-- ============================================================================
-- TABLE: licence_documents
-- Venue regulatory documents (Fire NOC, FSSAI, Entertainment Tax, etc.)
-- ============================================================================

CREATE TABLE licence_documents (
    id              SERIAL PRIMARY KEY,
    venue_id        INTEGER         NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    name            VARCHAR(255)    NOT NULL,
    document_type   VARCHAR(100),
    file_url        TEXT,
    expiry_date     DATE,
    reminder_sent   BOOLEAN         DEFAULT FALSE,  -- 30-day advance reminder flag
    created_at      TIMESTAMP       DEFAULT NOW()
);

CREATE INDEX idx_licence_documents_venue_id ON licence_documents(venue_id);
CREATE INDEX idx_licence_documents_expiry ON licence_documents(expiry_date);

COMMENT ON COLUMN licence_documents.reminder_sent IS 'Set TRUE after 30-day expiry reminder is sent to owner.';

-- ============================================================================
-- TABLE: customers
-- Customer master. One record per person, referenced across bookings.
-- ============================================================================

CREATE TABLE customers (
    id          SERIAL PRIMARY KEY,
    venue_id    INTEGER         NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    name        VARCHAR(255)    NOT NULL,
    phone       VARCHAR(20),
    email       VARCHAR(255),
    address     TEXT,
    notes       TEXT,
    created_at  TIMESTAMP       DEFAULT NOW(),
    updated_at  TIMESTAMP       DEFAULT NOW()
);

CREATE INDEX idx_customers_venue_id ON customers(venue_id);
CREATE INDEX idx_customers_phone ON customers(phone);

COMMENT ON TABLE customers IS 'Never duplicated. One customer record per phone number per venue, reused across all bookings.';

-- ============================================================================
-- TABLE: bookings
-- Core booking entity. Central module of the platform.
-- ============================================================================

CREATE TABLE bookings (
    id                      SERIAL PRIMARY KEY,
    venue_id                INTEGER         NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    hall_id                 INTEGER         NOT NULL REFERENCES halls(id),
    customer_id             INTEGER         REFERENCES customers(id),
    booking_ref             VARCHAR(50)     UNIQUE,

    -- Event Details
    event_date              DATE            NOT NULL,
    session_type            session_type    NOT NULL,
    start_time              VARCHAR(10),    -- HH:MM (for hourly sessions)
    end_time                VARCHAR(10),
    event_type              VARCHAR(100),   -- Wedding, Birthday, Corporate, Engagement...
    guest_count             INTEGER,

    -- Pricing
    package_id              INTEGER         REFERENCES packages(id),
    total_amount            NUMERIC(10, 2),
    advance_amount          NUMERIC(10, 2),
    paid_amount             NUMERIC(10, 2)  DEFAULT 0,
    balance_due             NUMERIC(10, 2),
    security_deposit        NUMERIC(10, 2)  DEFAULT 0,
    deposit_refunded        BOOLEAN         DEFAULT FALSE,

    -- Status & Source
    status                  booking_status  NOT NULL DEFAULT 'enquiry',
    source                  booking_source  DEFAULT 'phone',

    -- Notes
    special_requirements    TEXT,
    internal_notes          TEXT,
    add_ons                 JSONB,

    -- Audit trail stored as JSONB array: [{status, date, by}]
    status_history          JSONB,

    -- Billing: only confirmed bookings count toward platform quota
    counted_for_billing     BOOLEAN         DEFAULT FALSE,

    created_by              INTEGER         REFERENCES users(id),
    created_at              TIMESTAMP       DEFAULT NOW(),
    updated_at              TIMESTAMP       DEFAULT NOW()
);

CREATE INDEX idx_bookings_venue_id ON bookings(venue_id);
CREATE INDEX idx_bookings_hall_id ON bookings(hall_id);
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_event_date ON bookings(event_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_counted_for_billing ON bookings(counted_for_billing);

-- Availability check: unique constraint on hall + date + session
-- (partial: excludes cancelled bookings via application logic)
CREATE INDEX idx_bookings_availability ON bookings(hall_id, event_date, session_type)
    WHERE status NOT IN ('cancelled');

COMMENT ON TABLE bookings IS 'Central module. Enforces availability lock on hall+date+session.';
COMMENT ON COLUMN bookings.counted_for_billing IS 'TRUE only for confirmed bookings. Drives VenueHub platform quota billing.';
COMMENT ON COLUMN bookings.status_history IS 'JSONB audit trail: [{status, date, by}] for every status change.';

-- ============================================================================
-- TABLE: payments
-- Payment entries linked to bookings (advance, balance, refund, deposit).
-- ============================================================================

CREATE TABLE payments (
    id                  SERIAL PRIMARY KEY,
    booking_id          INTEGER             NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    venue_id            INTEGER             NOT NULL REFERENCES venues(id),
    type                payment_type        NOT NULL,
    amount              NUMERIC(10, 2)      NOT NULL,
    mode                payment_mode        NOT NULL,
    payment_date        DATE                NOT NULL,
    reference_number    VARCHAR(100),       -- UPI txn ID, cheque number, etc.
    notes               TEXT,
    created_by          INTEGER             REFERENCES users(id),
    created_at          TIMESTAMP           DEFAULT NOW()
);

CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_venue_id ON payments(venue_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
CREATE INDEX idx_payments_type ON payments(type);

COMMENT ON TABLE payments IS 'Immutable payment log. Each entry triggers recalculation of booking.paid_amount and balance_due.';

-- ============================================================================
-- TABLE: invoices
-- GST-compliant invoices. Permanently linked to booking + payment. Not editable.
-- ============================================================================

CREATE TABLE invoices (
    id              SERIAL PRIMARY KEY,
    venue_id        INTEGER             NOT NULL REFERENCES venues(id),
    booking_id      INTEGER             REFERENCES bookings(id),
    payment_id      INTEGER             REFERENCES payments(id),
    invoice_number  VARCHAR(50)         NOT NULL UNIQUE,
    invoice_date    DATE                NOT NULL,
    subtotal        NUMERIC(10, 2)      NOT NULL,
    gst_rate        NUMERIC(5, 2),
    gst_amount      NUMERIC(10, 2),
    total_amount    NUMERIC(10, 2)      NOT NULL,
    is_preview      BOOLEAN             DEFAULT FALSE,  -- ₹0 preview invoice (month 3)
    is_cancelled    BOOLEAN             DEFAULT FALSE,  -- Credit notes reference this
    notes           TEXT,
    created_at      TIMESTAMP           DEFAULT NOW()
);

CREATE INDEX idx_invoices_venue_id ON invoices(venue_id);
CREATE INDEX idx_invoices_booking_id ON invoices(booking_id);

COMMENT ON TABLE invoices IS 'Immutable GST invoices. Corrections via credit notes only, never by editing.';
COMMENT ON COLUMN invoices.is_preview IS 'TRUE for Month 3 ₹0 preview invoices before real billing starts.';

-- ============================================================================
-- TABLE: deposit_deductions
-- Post-event deductions from security deposit (damage, extra hours, cleaning).
-- ============================================================================

CREATE TABLE deposit_deductions (
    id          SERIAL PRIMARY KEY,
    booking_id  INTEGER         NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    reason      VARCHAR(255)    NOT NULL,
    amount      NUMERIC(10, 2)  NOT NULL,
    created_at  TIMESTAMP       DEFAULT NOW()
);

CREATE INDEX idx_deposit_deductions_booking_id ON deposit_deductions(booking_id);

-- ============================================================================
-- TABLE: staff
-- Staff master list. Soft-delete only (is_active flag).
-- ============================================================================

CREATE TABLE staff (
    id              SERIAL PRIMARY KEY,
    venue_id        INTEGER         NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    user_id         INTEGER         REFERENCES users(id),  -- linked login if any
    name            VARCHAR(255)    NOT NULL,
    role            VARCHAR(100),   -- Event Coordinator, Housekeeping, Security, etc.
    phone           VARCHAR(20),
    email           VARCHAR(255),
    joining_date    DATE,
    is_active       BOOLEAN         DEFAULT TRUE,           -- NEVER hard delete
    notes           TEXT,
    created_at      TIMESTAMP       DEFAULT NOW(),
    updated_at      TIMESTAMP       DEFAULT NOW()
);

CREATE INDEX idx_staff_venue_id ON staff(venue_id);

COMMENT ON COLUMN staff.is_active IS 'Soft-delete flag. Historical assignment records must be preserved.';

-- ============================================================================
-- TABLE: attendance
-- Daily attendance roster (independent of bookings).
-- ============================================================================

CREATE TABLE attendance (
    id          SERIAL PRIMARY KEY,
    staff_id    INTEGER     NOT NULL REFERENCES staff(id),
    venue_id    INTEGER     NOT NULL REFERENCES venues(id),
    date        DATE        NOT NULL,
    status      VARCHAR(20) DEFAULT 'present',  -- present | absent | half_day
    check_in    VARCHAR(10),    -- HH:MM
    check_out   VARCHAR(10),
    notes       TEXT,
    created_at  TIMESTAMP   DEFAULT NOW(),
    UNIQUE(staff_id, date)  -- one record per staff per day
);

CREATE INDEX idx_attendance_venue_id ON attendance(venue_id);
CREATE INDEX idx_attendance_date ON attendance(date);

-- ============================================================================
-- TABLE: booking_staff
-- Many-to-many: staff assignments to specific bookings.
-- ============================================================================

CREATE TABLE booking_staff (
    id          SERIAL PRIMARY KEY,
    booking_id  INTEGER     NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    staff_id    INTEGER     NOT NULL REFERENCES staff(id),
    role        VARCHAR(100),
    notes       TEXT,
    created_at  TIMESTAMP   DEFAULT NOW()
);

CREATE INDEX idx_booking_staff_booking_id ON booking_staff(booking_id);
CREATE INDEX idx_booking_staff_staff_id ON booking_staff(staff_id);

-- ============================================================================
-- TABLE: task_templates
-- Reusable housekeeping checklist templates per venue.
-- ============================================================================

CREATE TABLE task_templates (
    id          SERIAL PRIMARY KEY,
    venue_id    INTEGER         NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    name        VARCHAR(255)    NOT NULL,
    description TEXT,
    -- JSONB array of task titles: ["Setup chairs", "Clean restrooms", "Breakdown by 11 PM"]
    tasks       JSONB,
    is_active   BOOLEAN         DEFAULT TRUE,
    created_at  TIMESTAMP       DEFAULT NOW()
);

CREATE INDEX idx_task_templates_venue_id ON task_templates(venue_id);

-- ============================================================================
-- TABLE: booking_tasks
-- Individual housekeeping tasks applied to a specific booking.
-- ============================================================================

CREATE TABLE booking_tasks (
    id                  SERIAL PRIMARY KEY,
    booking_id          INTEGER         NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    title               VARCHAR(255)    NOT NULL,
    description         TEXT,
    assigned_staff_id   INTEGER         REFERENCES staff(id),
    status              task_status     DEFAULT 'pending',
    photo_url           TEXT,       -- Optional completion photo (via Mobile App)
    due_time            VARCHAR(10),
    completed_at        TIMESTAMP,
    created_at          TIMESTAMP       DEFAULT NOW(),
    updated_at          TIMESTAMP       DEFAULT NOW()
);

CREATE INDEX idx_booking_tasks_booking_id ON booking_tasks(booking_id);
CREATE INDEX idx_booking_tasks_assigned_staff ON booking_tasks(assigned_staff_id);

-- ============================================================================
-- TABLE: assets
-- Asset master (chairs, tables, sound systems, generators, etc.)
-- ============================================================================

CREATE TABLE assets (
    id                  SERIAL PRIMARY KEY,
    venue_id            INTEGER             NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    name                VARCHAR(255)        NOT NULL,
    category            VARCHAR(100),       -- Furniture, AV Equipment, Power, etc.
    total_quantity      INTEGER             DEFAULT 1,
    available_quantity  INTEGER             DEFAULT 1,  -- total - allocated
    purchase_date       DATE,
    purchase_cost       NUMERIC(10, 2),
    condition           asset_condition     DEFAULT 'good',
    notes               TEXT,
    is_active           BOOLEAN             DEFAULT TRUE,
    created_at          TIMESTAMP           DEFAULT NOW(),
    updated_at          TIMESTAMP           DEFAULT NOW()
);

CREATE INDEX idx_assets_venue_id ON assets(venue_id);

COMMENT ON COLUMN assets.available_quantity IS 'Must not go below 0. Double-allocation check across overlapping bookings.';

-- ============================================================================
-- TABLE: maintenance_logs
-- Asset maintenance/service history (independent of bookings).
-- ============================================================================

CREATE TABLE maintenance_logs (
    id          SERIAL PRIMARY KEY,
    asset_id    INTEGER         NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    service_date DATE           NOT NULL,
    description TEXT,
    cost        NUMERIC(10, 2),
    next_due_date DATE,
    technician  VARCHAR(255),
    created_at  TIMESTAMP       DEFAULT NOW()
);

CREATE INDEX idx_maintenance_logs_asset_id ON maintenance_logs(asset_id);
CREATE INDEX idx_maintenance_logs_next_due ON maintenance_logs(next_due_date);

-- ============================================================================
-- TABLE: booking_assets
-- Assets allocated to a specific booking.
-- ============================================================================

CREATE TABLE booking_assets (
    id                  SERIAL PRIMARY KEY,
    booking_id          INTEGER         NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    asset_id            INTEGER         NOT NULL REFERENCES assets(id),
    quantity_allocated  INTEGER         DEFAULT 1,
    return_status       VARCHAR(50)     DEFAULT 'pending',  -- pending | returned | damaged
    damage_notes        TEXT,
    created_at          TIMESTAMP       DEFAULT NOW()
);

CREATE INDEX idx_booking_assets_booking_id ON booking_assets(booking_id);
CREATE INDEX idx_booking_assets_asset_id ON booking_assets(asset_id);

-- ============================================================================
-- TABLE: vendors
-- Vendor master (caterers, decorators, generators, orchestra, etc.)
-- ============================================================================

CREATE TABLE vendors (
    id          SERIAL PRIMARY KEY,
    venue_id    INTEGER             NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    name        VARCHAR(255)        NOT NULL,
    category    vendor_category     NOT NULL,
    phone       VARCHAR(20),
    email       VARCHAR(255),
    address     TEXT,
    rate_card   TEXT,
    rating      NUMERIC(3, 1),      -- 1.0 to 5.0
    notes       TEXT,
    is_active   BOOLEAN             DEFAULT TRUE,
    created_at  TIMESTAMP           DEFAULT NOW(),
    updated_at  TIMESTAMP           DEFAULT NOW()
);

CREATE INDEX idx_vendors_venue_id ON vendors(venue_id);
CREATE INDEX idx_vendors_category ON vendors(category);

-- ============================================================================
-- TABLE: booking_vendors
-- Vendor engagements for a specific booking.
-- ============================================================================

CREATE TABLE booking_vendors (
    id              SERIAL PRIMARY KEY,
    booking_id      INTEGER         NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    vendor_id       INTEGER         NOT NULL REFERENCES vendors(id),
    service_details TEXT,
    agreed_amount   NUMERIC(10, 2),
    paid_amount     NUMERIC(10, 2)  DEFAULT 0,
    payment_status  VARCHAR(50)     DEFAULT 'pending',  -- pending | partial | paid
    created_at      TIMESTAMP       DEFAULT NOW()
);

CREATE INDEX idx_booking_vendors_booking_id ON booking_vendors(booking_id);
CREATE INDEX idx_booking_vendors_vendor_id ON booking_vendors(vendor_id);

-- ============================================================================
-- TABLE: expenses
-- Expense tracking: both recurring (independent) and booking-linked.
-- ============================================================================

CREATE TABLE expenses (
    id              SERIAL PRIMARY KEY,
    venue_id        INTEGER             NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    booking_id      INTEGER             REFERENCES bookings(id),  -- NULL for recurring/independent
    category        expense_category    NOT NULL,
    description     TEXT,
    amount          NUMERIC(10, 2)      NOT NULL,
    expense_date    DATE                NOT NULL,
    is_recurring    BOOLEAN             DEFAULT FALSE,
    frequency       VARCHAR(50),        -- monthly | quarterly | yearly
    receipt_url     TEXT,
    created_by      INTEGER             REFERENCES users(id),
    created_at      TIMESTAMP           DEFAULT NOW()
);

CREATE INDEX idx_expenses_venue_id ON expenses(venue_id);
CREATE INDEX idx_expenses_booking_id ON expenses(booking_id);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);

COMMENT ON COLUMN expenses.booking_id IS 'NULL for recurring/venue-level expenses. Non-null for booking-specific costs.';

-- ============================================================================
-- TABLE: communication_logs
-- Communication history per customer (notes, calls, messages).
-- ============================================================================

CREATE TABLE communication_logs (
    id          SERIAL PRIMARY KEY,
    customer_id INTEGER     NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    booking_id  INTEGER     REFERENCES bookings(id),
    type        VARCHAR(50),    -- call | whatsapp | email | note
    message     TEXT,
    created_by  INTEGER     REFERENCES users(id),
    created_at  TIMESTAMP   DEFAULT NOW()
);

CREATE INDEX idx_communication_logs_customer_id ON communication_logs(customer_id);
CREATE INDEX idx_communication_logs_booking_id ON communication_logs(booking_id);

-- ============================================================================
-- TABLE: subscription_invoices
-- VenueHub's own SaaS billing invoices to venues.
-- ============================================================================

CREATE TABLE subscription_invoices (
    id                      SERIAL PRIMARY KEY,
    venue_id                INTEGER         NOT NULL REFERENCES venues(id),
    invoice_number          VARCHAR(50)     NOT NULL UNIQUE,
    billing_period_start    DATE            NOT NULL,
    billing_period_end      DATE            NOT NULL,
    confirmed_bookings      INTEGER         DEFAULT 0,
    free_quota              INTEGER         DEFAULT 5,
    overage_bookings        INTEGER         DEFAULT 0,
    base_fee                NUMERIC(10, 2)  DEFAULT 0,
    overage_fee             NUMERIC(10, 2)  DEFAULT 0,
    total_amount            NUMERIC(10, 2)  NOT NULL,
    is_preview              BOOLEAN         DEFAULT FALSE,  -- Month 3: ₹0 preview
    status                  VARCHAR(50)     DEFAULT 'pending',  -- pending | paid | overdue
    due_date                DATE,
    paid_at                 TIMESTAMP,
    payment_mode            VARCHAR(50),
    payment_reference       VARCHAR(100),
    created_at              TIMESTAMP       DEFAULT NOW()
);

CREATE INDEX idx_subscription_invoices_venue_id ON subscription_invoices(venue_id);
CREATE INDEX idx_subscription_invoices_status ON subscription_invoices(status);

COMMENT ON TABLE subscription_invoices IS 'VenueHub platform billing. Separate from venue-customer invoices.';
COMMENT ON COLUMN subscription_invoices.is_preview IS 'Month 3 preview: shows real figure but charges ₹0. First real invoice from Month 4.';
COMMENT ON COLUMN subscription_invoices.confirmed_bookings IS 'Only confirmed + counted_for_billing bookings included in quota calculation.';

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_venues_updated_at
    BEFORE UPDATE ON venues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_halls_updated_at
    BEFORE UPDATE ON halls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at
    BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_tasks_updated_at
    BEFORE UPDATE ON booking_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: Auto-generate booking reference
CREATE OR REPLACE FUNCTION generate_booking_ref()
RETURNS TRIGGER AS $$
DECLARE
    ref_code VARCHAR(20);
    yr CHAR(2);
BEGIN
    IF NEW.booking_ref IS NULL THEN
        yr := TO_CHAR(NOW(), 'YY');
        ref_code := 'BK' || yr || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5));
        NEW.booking_ref := ref_code;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_booking_ref
    BEFORE INSERT ON bookings
    FOR EACH ROW EXECUTE FUNCTION generate_booking_ref();

-- Function: Validate hall is bookable before creating confirmed booking
CREATE OR REPLACE FUNCTION check_hall_bookable()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('confirmed', 'tentative') THEN
        IF NOT EXISTS (SELECT 1 FROM halls WHERE id = NEW.hall_id AND is_bookable = TRUE) THEN
            RAISE EXCEPTION 'Hall % is not set as bookable. Ensure capacity, pricing, and photos are configured.', NEW.hall_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Update booking counted_for_billing when status changes to confirmed
CREATE OR REPLACE FUNCTION update_billing_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
        NEW.counted_for_billing := TRUE;
    ELSIF NEW.status = 'cancelled' THEN
        NEW.counted_for_billing := FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_booking_billing_count
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_billing_count();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Booking summary with customer and hall details
CREATE VIEW v_booking_summary AS
SELECT
    b.id,
    b.booking_ref,
    b.event_date,
    b.session_type,
    b.event_type,
    b.status,
    b.source,
    b.guest_count,
    b.total_amount,
    b.paid_amount,
    b.balance_due,
    b.security_deposit,
    b.counted_for_billing,
    c.name AS customer_name,
    c.phone AS customer_phone,
    c.email AS customer_email,
    h.name AS hall_name,
    h.capacity AS hall_capacity,
    v.name AS venue_name,
    b.created_at,
    b.updated_at
FROM bookings b
LEFT JOIN customers c ON b.customer_id = c.id
LEFT JOIN halls h ON b.hall_id = h.id
LEFT JOIN venues v ON b.venue_id = v.id;

COMMENT ON VIEW v_booking_summary IS 'Denormalized booking view for listing and dashboard use.';

-- View: Outstanding dues
CREATE VIEW v_outstanding_dues AS
SELECT
    b.id AS booking_id,
    b.booking_ref,
    b.event_date,
    b.session_type,
    b.event_type,
    b.status,
    b.total_amount,
    b.paid_amount,
    b.balance_due,
    c.name AS customer_name,
    c.phone AS customer_phone,
    h.name AS hall_name,
    v.id AS venue_id,
    CASE WHEN b.event_date < CURRENT_DATE THEN TRUE ELSE FALSE END AS is_overdue
FROM bookings b
LEFT JOIN customers c ON b.customer_id = c.id
LEFT JOIN halls h ON b.hall_id = h.id
LEFT JOIN venues v ON b.venue_id = v.id
WHERE b.balance_due > 0
  AND b.status IN ('confirmed', 'tentative');

COMMENT ON VIEW v_outstanding_dues IS 'All bookings with unpaid balances, flagged as overdue if past event date.';

-- View: Monthly revenue by venue
CREATE VIEW v_monthly_revenue AS
SELECT
    p.venue_id,
    DATE_TRUNC('month', p.payment_date::DATE) AS month,
    SUM(p.amount) FILTER (WHERE p.type NOT IN ('refund', 'deposit_refund')) AS total_received,
    SUM(p.amount) FILTER (WHERE p.type IN ('refund', 'deposit_refund')) AS total_refunded,
    COUNT(DISTINCT p.booking_id) AS payment_count
FROM payments p
GROUP BY p.venue_id, DATE_TRUNC('month', p.payment_date::DATE);

-- View: Hall occupancy
CREATE VIEW v_hall_occupancy AS
SELECT
    b.hall_id,
    h.name AS hall_name,
    h.venue_id,
    DATE_TRUNC('month', b.event_date::DATE) AS month,
    COUNT(*) FILTER (WHERE b.status IN ('confirmed', 'completed')) AS confirmed_bookings,
    COUNT(*) FILTER (WHERE b.status = 'tentative') AS tentative_bookings,
    COUNT(*) FILTER (WHERE b.status = 'cancelled') AS cancelled_bookings,
    SUM(b.total_amount) FILTER (WHERE b.status IN ('confirmed', 'completed')) AS revenue
FROM bookings b
JOIN halls h ON b.hall_id = h.id
GROUP BY b.hall_id, h.name, h.venue_id, DATE_TRUNC('month', b.event_date::DATE);

-- View: Subscription quota usage per venue (current cycle)
CREATE VIEW v_subscription_usage AS
SELECT
    v.id AS venue_id,
    v.name AS venue_name,
    v.subscription_status,
    v.subscription_plan,
    v.current_cycle_start,
    v.free_booking_quota,
    v.per_booking_rate,
    COUNT(b.id) AS used_bookings,
    GREATEST(0, COUNT(b.id) - v.free_booking_quota) AS overage_bookings,
    GREATEST(0, COUNT(b.id) - v.free_booking_quota) * v.per_booking_rate AS estimated_overage_fee
FROM venues v
LEFT JOIN bookings b ON b.venue_id = v.id
    AND b.status = 'confirmed'
    AND b.counted_for_billing = TRUE
    AND b.created_at >= COALESCE(v.current_cycle_start::TIMESTAMP, NOW() - INTERVAL '30 days')
GROUP BY v.id, v.name, v.subscription_status, v.subscription_plan,
         v.current_cycle_start, v.free_booking_quota, v.per_booking_rate;

-- ============================================================================
-- DEMO DATA: Initial Seed
-- ============================================================================

-- Insert a demo venue
INSERT INTO venues (
    name, address, district, gst_number, phone, email,
    subscription_status, subscription_plan,
    trial_start_date, current_cycle_start,
    free_booking_quota, per_booking_rate,
    gst_rate, invoice_prefix, language,
    notify_whatsapp, notify_sms, notify_email,
    cancellation_policy, refund_policy
) VALUES (
    'Grand Celebration Venue',
    '123 Main Street, Thrissur',
    'Thrissur',
    '32ABCDE1234F1Z5',
    '9876543210',
    'info@grandcelebration.com',
    'active',
    'starter',
    '2024-01-01',
    '2024-12-01',
    5,
    99.00,
    18.00,
    'GCV',
    'en',
    TRUE, FALSE, TRUE,
    'Cancellations made 30 days before event: Full refund. 15-30 days: 50% refund. Less than 15 days: No refund.',
    'Refunds processed within 7-10 working days.'
);

-- Insert demo users (password: password123, bcrypt hash)
INSERT INTO users (venue_id, name, email, phone, password_hash, role, is_active)
VALUES
    (1, 'Rajesh Kumar', 'owner@grandcelebration.com', '9876543210',
     '$2b$10$rGHSPWGKEkTBNxGCUdQUjO9OmxXFUqr9.MjExAVdlkbFzBnMJR4V6', 'owner', TRUE),
    (1, 'Priya Nair', 'manager@grandcelebration.com', '9876543211',
     '$2b$10$rGHSPWGKEkTBNxGCUdQUjO9OmxXFUqr9.MjExAVdlkbFzBnMJR4V6', 'manager', TRUE),
    (1, 'Anita Sharma', 'accounts@grandcelebration.com', '9876543212',
     '$2b$10$rGHSPWGKEkTBNxGCUdQUjO9OmxXFUqr9.MjExAVdlkbFzBnMJR4V6', 'accountant', TRUE),
    (1, 'Ravi Staff', 'staff@grandcelebration.com', '9876543213',
     '$2b$10$rGHSPWGKEkTBNxGCUdQUjO9OmxXFUqr9.MjExAVdlkbFzBnMJR4V6', 'staff', TRUE);

-- Insert demo halls
INSERT INTO halls (venue_id, name, capacity, has_ac, parking_count, stage_size, stage_type,
    catering_rule, has_generator_backup, has_bridal_room, has_projector, has_av, is_accessible,
    description, is_bookable)
VALUES
    (1, 'Grand Ballroom', 500, TRUE, 100, '30x20 ft', 'Elevated',
     'in_house_only', TRUE, TRUE, TRUE, TRUE, TRUE,
     'Our premium ballroom for grand celebrations', TRUE),
    (1, 'Garden Pavilion', 200, FALSE, 50, '20x15 ft', 'Open Stage',
     'outside_allowed', TRUE, FALSE, TRUE, TRUE, TRUE,
     'Beautiful open-air garden venue', TRUE);

-- Pricing rules
INSERT INTO pricing_rules (hall_id, session_type, base_rate) VALUES
    (1, 'morning', 50000), (1, 'evening', 60000), (1, 'full_day', 100000), (1, 'hourly', 8000),
    (2, 'morning', 25000), (2, 'evening', 30000), (2, 'full_day', 50000), (2, 'hourly', 4000);

-- Packages
INSERT INTO packages (hall_id, name, description, price, includes) VALUES
    (1, 'Gold Package', 'Premium wedding package', 120000, '["Decoration", "Catering (500 pax)", "Bridal room", "Sound & Light"]'),
    (1, 'Silver Package', 'Standard event package', 80000, '["Basic Decoration", "Catering (300 pax)", "Sound system"]'),
    (2, 'Garden Basic', 'Garden event package', 40000, '["Basic Decoration", "Chairs & Tables", "Sound system"]');

-- Licence documents
INSERT INTO licence_documents (venue_id, name, document_type, expiry_date) VALUES
    (1, 'Fire Safety Certificate', 'Fire NOC', '2025-03-15'),
    (1, 'Food Safety License', 'FSSAI', '2025-06-30'),
    (1, 'Entertainment Tax License', 'Tax License', '2025-12-31');

-- Demo customers
INSERT INTO customers (venue_id, name, phone, email, address) VALUES
    (1, 'Arun Menon', '9800001111', 'arun.menon@email.com', '45 Lake Road, Thrissur'),
    (1, 'Sunitha Pillai', '9800002222', 'sunitha@email.com', '78 Garden Colony, Ernakulam'),
    (1, 'Mohammed Rafi', '9800003333', 'rafi@email.com', '12 Beach Road, Kozhikode'),
    (1, 'Deepa Krishnan', '9800004444', 'deepa@email.com', '34 Hill View, Palakkad');

-- Demo staff
INSERT INTO staff (venue_id, name, role, phone, joining_date) VALUES
    (1, 'Suresh Kumar', 'Event Coordinator', '9700001111', '2023-01-15'),
    (1, 'Lakshmi Devi', 'Housekeeping Lead', '9700002222', '2023-03-01'),
    (1, 'Vinod Kumar', 'Security', '9700003333', '2022-06-01'),
    (1, 'Meena Rajesh', 'Catering Staff', '9700004444', '2024-01-10');

-- Demo vendors
INSERT INTO vendors (venue_id, name, category, phone, rate_card, rating) VALUES
    (1, 'Royal Catering Services', 'catering', '9600001111', 'Veg: ₹350/plate, Non-veg: ₹450/plate', 4.5),
    (1, 'Floral Dreams Decoration', 'decoration', '9600002222', 'Basic: ₹25000, Premium: ₹75000', 4.8),
    (1, 'Power Backup Solutions', 'generator', '9600003333', '₹5000/day for 50KVA', 4.0),
    (1, 'Melody Orchestra', 'orchestra', '9600004444', '₹15000 for 4 hours', 4.6);

-- Demo assets
INSERT INTO assets (venue_id, name, category, total_quantity, available_quantity, purchase_cost, condition) VALUES
    (1, 'Banquet Chairs', 'Furniture', 600, 600, 300000, 'good'),
    (1, 'Round Tables', 'Furniture', 60, 60, 120000, 'good'),
    (1, 'Sound System', 'AV Equipment', 2, 2, 500000, 'excellent'),
    (1, 'Projector', 'AV Equipment', 3, 3, 150000, 'excellent'),
    (1, 'Generator (25KVA)', 'Power', 1, 1, 450000, 'fair');

-- ============================================================================
-- PERMISSION MATRIX (Reference - Appendix A)
-- ============================================================================
-- Module                    | Owner | Manager | Accountant | Staff
-- --------------------------|-------|---------|------------|-------
-- Dashboard                 |  ✓    |   ✓     |     ✓      |  ✓
-- Booking Management        |  ✓    |   ✓     |   View     |  —
-- Customer Management       |  ✓    |   ✓     |   View     |  —
-- Payments & Invoicing      |  ✓    |  View   |     ✓      |  —
-- Venue & Hall Setup        |  ✓    |   ✓     |     —      |  —
-- Housekeeping (assign)     |  ✓    |   ✓     |     —      | Execute (assigned)
-- Staff Management          |  ✓    |   ✓     |     —      |  —
-- Assets & Inventory        |  ✓    |   ✓     |   View     | Check-in/out
-- Vendor Management         |  ✓    |   ✓     |   View     |  —
-- Expense Management        |  ✓    |   —     |     ✓      |  —
-- Reports                   |  ✓    |  Ops    |  Financial  |  —
-- Subscription & Billing    |  ✓    |   —     |   View     |  —
-- User & Access Mgmt        |  ✓    |   —     |     —      |  —
-- Settings                  |  ✓    |   —     |     —      |  —

-- ============================================================================
-- BUSINESS RULES SUMMARY (Encoded as Comments)
-- ============================================================================
--
-- 1. BOOKING AVAILABILITY: hall_id + event_date + session_type must be unique
--    among non-cancelled bookings. Full-day sessions conflict with all others.
--
-- 2. HALL BOOKABLE GATE: is_bookable cannot be TRUE unless:
--    - capacity IS NOT NULL
--    - At least 1 pricing_rule exists for this hall
--    - At least 1 hall_photo exists for this hall
--
-- 3. SUBSCRIPTION BLOCK: When venues.subscription_status = 'blocked',
--    INSERT on bookings is prevented (enforced at app layer, not DB trigger).
--    All other reads/writes are unrestricted.
--
-- 4. BILLING QUOTA: COUNT(bookings WHERE status='confirmed' AND counted_for_billing=TRUE)
--    Only these bookings count toward free_booking_quota per cycle.
--    Enquiry/Tentative/Cancelled bookings do NOT count.
--
-- 5. STAFF SOFT DELETE: staff.is_active = FALSE instead of DELETE.
--    All booking_staff and booking_task assignments must be preserved.
--
-- 6. INVOICE IMMUTABILITY: Invoices are never UPDATE-d after creation.
--    Corrections require a new credit note invoice referencing original.
--
-- 7. CUSTOMER DEDUPLICATION: Check by phone before INSERT. Return existing
--    customer ID if phone already exists for this venue.
--
-- 8. REPORTS ALWAYS ACCESSIBLE: Even when subscription is 'blocked' or
--    'suspended', all SELECT queries on reports must succeed.
--
-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
