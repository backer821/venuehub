import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  venues,
  users,
  halls,
  hallPhotos,
  pricingRules,
  packages,
  customers,
  bookings,
  payments,
  staff,
  assets,
  vendors,
  expenses,
  taskTemplates,
  licenceDocuments,
  bookingTasks,
  bookingStaff,
} from "@/db/schema";
import bcrypt from "bcryptjs";

export async function POST() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "true") {
    return NextResponse.json(
      { error: "Seeding is disabled in production. Set ALLOW_SEED=true to override." },
      { status: 403 }
    );
  }

  try {
    // Clear existing data
    await db.delete(bookingStaff);
    await db.delete(bookingTasks);
    await db.delete(payments);
    await db.delete(bookings);
    await db.delete(customers);
    await db.delete(expenses);
    await db.delete(staff);
    await db.delete(assets);
    await db.delete(vendors);
    await db.delete(taskTemplates);
    await db.delete(licenceDocuments);
    await db.delete(hallPhotos);
    await db.delete(packages);
    await db.delete(pricingRules);
    await db.delete(halls);
    await db.delete(users);
    await db.delete(venues);

    // Create venue
    const [venue] = await db
      .insert(venues)
      .values({
        name: "Grand Celebration Venue",
        address: "123 Main Street, Thrissur",
        district: "Thrissur",
        gstNumber: "32ABCDE1234F1Z5",
        phone: "9876543210",
        email: "info@grandcelebration.com",
        subscriptionStatus: "active",
        trialStartDate: "2024-01-01",
        currentCycleStart: "2024-12-01",
        freeBookingQuota: 5,
        perBookingRate: "99.00",
        gstRate: "18.00",
        invoicePrefix: "GCV",
        invoiceSequence: 1,
        language: "en",
        notifyWhatsapp: true,
        notifySms: false,
        notifyEmail: true,
        cancellationPolicy: "Cancellations made 30 days before event: Full refund. 15-30 days: 50% refund. Less than 15 days: No refund.",
        refundPolicy: "Refunds processed within 7-10 working days.",
      })
      .returning();

    const hash = await bcrypt.hash("password123", 10);

    // Create users
    const [ownerUser] = await db
      .insert(users)
      .values({
        venueId: venue.id,
        name: "Rajesh Kumar",
        email: "owner@grandcelebration.com",
        phone: "9876543210",
        passwordHash: hash,
        role: "owner",
        isActive: true,
      })
      .returning();

    const [managerUser] = await db
      .insert(users)
      .values({
        venueId: venue.id,
        name: "Priya Nair",
        email: "manager@grandcelebration.com",
        phone: "9876543211",
        passwordHash: hash,
        role: "manager",
        isActive: true,
      })
      .returning();

    await db.insert(users).values({
      venueId: venue.id,
      name: "Anita Sharma",
      email: "accounts@grandcelebration.com",
      phone: "9876543212",
      passwordHash: hash,
      role: "accountant",
      isActive: true,
    });

    await db.insert(users).values({
      venueId: venue.id,
      name: "Ravi Staff",
      email: "staff@grandcelebration.com",
      phone: "9876543213",
      passwordHash: hash,
      role: "staff",
      isActive: true,
    });

    // Create halls
    const [hall1] = await db
      .insert(halls)
      .values({
        venueId: venue.id,
        name: "Grand Ballroom",
        capacity: 500,
        hasAc: true,
        parkingCount: 100,
        stageSize: "30x20 ft",
        stageType: "Elevated",
        cateringRule: "in_house_only",
        hasGeneratorBackup: true,
        hasBridalRoom: true,
        hasProjector: true,
        hasAv: true,
        isAccessible: true,
        description: "Our premium ballroom for grand celebrations",
        isBookable: true,
      })
      .returning();

    const [hall2] = await db
      .insert(halls)
      .values({
        venueId: venue.id,
        name: "Garden Pavilion",
        capacity: 200,
        hasAc: false,
        parkingCount: 50,
        stageSize: "20x15 ft",
        stageType: "Open Stage",
        cateringRule: "outside_allowed",
        hasGeneratorBackup: true,
        hasBridalRoom: false,
        hasProjector: true,
        hasAv: true,
        isAccessible: true,
        description: "Beautiful open-air garden venue",
        isBookable: true,
      })
      .returning();

    // Hall photos
    await db.insert(hallPhotos).values([
      {
        hallId: hall1.id,
        url: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800",
        caption: "Main Hall Setup",
        isPrimary: true,
      },
      {
        hallId: hall1.id,
        url: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800",
        caption: "Stage View",
        isPrimary: false,
      },
      {
        hallId: hall2.id,
        url: "https://images.unsplash.com/photo-1561564645-40a6c5e59e7a?w=800",
        caption: "Garden View",
        isPrimary: true,
      },
    ]);

    // Pricing rules
    await db.insert(pricingRules).values([
      { hallId: hall1.id, sessionType: "morning", baseRate: "50000" },
      { hallId: hall1.id, sessionType: "evening", baseRate: "60000" },
      { hallId: hall1.id, sessionType: "full_day", baseRate: "100000" },
      { hallId: hall1.id, sessionType: "hourly", baseRate: "8000" },
      { hallId: hall2.id, sessionType: "morning", baseRate: "25000" },
      { hallId: hall2.id, sessionType: "evening", baseRate: "30000" },
      { hallId: hall2.id, sessionType: "full_day", baseRate: "50000" },
      { hallId: hall2.id, sessionType: "hourly", baseRate: "4000" },
    ]);

    // Packages
    await db.insert(packages).values([
      {
        hallId: hall1.id,
        name: "Gold Package",
        description: "Premium wedding package with all amenities",
        price: "120000",
        includes: ["Decoration", "Catering (500 pax)", "Bridal room", "Sound & Light"],
      },
      {
        hallId: hall1.id,
        name: "Silver Package",
        description: "Standard package for events",
        price: "80000",
        includes: ["Basic Decoration", "Catering (300 pax)", "Sound system"],
      },
      {
        hallId: hall2.id,
        name: "Garden Basic",
        description: "Garden event package",
        price: "40000",
        includes: ["Basic Decoration", "Chairs & Tables", "Sound system"],
      },
    ]);

    // Licence documents
    await db.insert(licenceDocuments).values([
      {
        venueId: venue.id,
        name: "Fire Safety Certificate",
        documentType: "Fire NOC",
        expiryDate: "2025-03-15",
        reminderSent: false,
      },
      {
        venueId: venue.id,
        name: "Food Safety License",
        documentType: "FSSAI",
        expiryDate: "2025-06-30",
        reminderSent: false,
      },
      {
        venueId: venue.id,
        name: "Entertainment Tax License",
        documentType: "Tax License",
        expiryDate: "2025-12-31",
        reminderSent: false,
      },
    ]);

    // Customers
    const [customer1] = await db
      .insert(customers)
      .values({
        venueId: venue.id,
        name: "Arun Menon",
        phone: "9800001111",
        email: "arun.menon@email.com",
        address: "45 Lake Road, Thrissur",
        notes: "Regular customer, prefers morning sessions",
      })
      .returning();

    const [customer2] = await db
      .insert(customers)
      .values({
        venueId: venue.id,
        name: "Sunitha Pillai",
        phone: "9800002222",
        email: "sunitha@email.com",
        address: "78 Garden Colony, Ernakulam",
      })
      .returning();

    const [customer3] = await db
      .insert(customers)
      .values({
        venueId: venue.id,
        name: "Mohammed Rafi",
        phone: "9800003333",
        email: "rafi@email.com",
        address: "12 Beach Road, Kozhikode",
        notes: "Requires halal catering",
      })
      .returning();

    const [customer4] = await db
      .insert(customers)
      .values({
        venueId: venue.id,
        name: "Deepa Krishnan",
        phone: "9800004444",
        email: "deepa@email.com",
        address: "34 Hill View, Palakkad",
      })
      .returning();

    // Bookings
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const nextMonth = new Date(today);
    nextMonth.setDate(today.getDate() + 30);
    const lastMonth = new Date(today);
    lastMonth.setDate(today.getDate() - 30);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const fmtDate = (d: Date) => d.toISOString().split("T")[0];

    const [booking1] = await db
      .insert(bookings)
      .values({
        venueId: venue.id,
        hallId: hall1.id,
        customerId: customer1.id,
        bookingRef: "BK24A001",
        eventDate: fmtDate(nextWeek),
        sessionType: "full_day",
        eventType: "Wedding",
        guestCount: 450,
        totalAmount: "120000",
        advanceAmount: "50000",
        paidAmount: "50000",
        balanceDue: "70000",
        securityDeposit: "10000",
        status: "confirmed",
        source: "phone",
        specialRequirements: "Need extra parking arrangements",
        internalNotes: "VIP client",
        countedForBilling: true,
        createdBy: managerUser.id,
        statusHistory: [
          { status: "enquiry", date: fmtDate(lastMonth), by: "Manager" },
          { status: "tentative", date: fmtDate(lastMonth), by: "Manager" },
          { status: "confirmed", date: fmtDate(today), by: "Manager" },
        ],
      })
      .returning();

    const [booking2] = await db
      .insert(bookings)
      .values({
        venueId: venue.id,
        hallId: hall2.id,
        customerId: customer2.id,
        bookingRef: "BK24A002",
        eventDate: fmtDate(tomorrow),
        sessionType: "evening",
        eventType: "Birthday Party",
        guestCount: 150,
        totalAmount: "35000",
        advanceAmount: "15000",
        paidAmount: "35000",
        balanceDue: "0",
        status: "confirmed",
        source: "walk_in",
        countedForBilling: true,
        createdBy: managerUser.id,
        statusHistory: [
          { status: "enquiry", date: fmtDate(lastMonth), by: "Manager" },
          { status: "confirmed", date: fmtDate(today), by: "Manager" },
        ],
      })
      .returning();

    const [booking3] = await db
      .insert(bookings)
      .values({
        venueId: venue.id,
        hallId: hall1.id,
        customerId: customer3.id,
        bookingRef: "BK24A003",
        eventDate: fmtDate(nextMonth),
        sessionType: "morning",
        eventType: "Engagement",
        guestCount: 200,
        totalAmount: "60000",
        advanceAmount: "20000",
        paidAmount: "20000",
        balanceDue: "40000",
        status: "tentative",
        source: "online",
        createdBy: managerUser.id,
        statusHistory: [
          { status: "enquiry", date: fmtDate(today), by: "Manager" },
          { status: "tentative", date: fmtDate(today), by: "Manager" },
        ],
      })
      .returning();

    const [booking4] = await db
      .insert(bookings)
      .values({
        venueId: venue.id,
        hallId: hall2.id,
        customerId: customer4.id,
        bookingRef: "BK24A004",
        eventDate: fmtDate(yesterday),
        sessionType: "full_day",
        eventType: "Corporate Event",
        guestCount: 180,
        totalAmount: "55000",
        advanceAmount: "25000",
        paidAmount: "55000",
        balanceDue: "0",
        status: "completed",
        source: "phone",
        countedForBilling: true,
        createdBy: managerUser.id,
        statusHistory: [
          { status: "enquiry", date: fmtDate(lastMonth), by: "Manager" },
          { status: "confirmed", date: fmtDate(lastMonth), by: "Manager" },
          { status: "completed", date: fmtDate(yesterday), by: "System" },
        ],
      })
      .returning();

    await db.insert(bookings).values({
      venueId: venue.id,
      hallId: hall1.id,
      customerId: customer1.id,
      bookingRef: "BK24A005",
      eventDate: fmtDate(today),
      sessionType: "morning",
      eventType: "Wedding Reception",
      guestCount: 300,
      totalAmount: "80000",
      advanceAmount: "30000",
      paidAmount: "30000",
      balanceDue: "50000",
      status: "confirmed",
      source: "phone",
      countedForBilling: true,
      createdBy: managerUser.id,
      statusHistory: [
        { status: "confirmed", date: fmtDate(today), by: "Manager" },
      ],
    });

    // Payments
    await db.insert(payments).values([
      {
        bookingId: booking1.id,
        venueId: venue.id,
        type: "advance",
        amount: "50000",
        mode: "upi",
        paymentDate: fmtDate(lastMonth),
        referenceNumber: "UPI123456",
        createdBy: ownerUser.id,
      },
      {
        bookingId: booking2.id,
        venueId: venue.id,
        type: "advance",
        amount: "15000",
        mode: "cash",
        paymentDate: fmtDate(lastMonth),
        createdBy: managerUser.id,
      },
      {
        bookingId: booking2.id,
        venueId: venue.id,
        type: "balance",
        amount: "20000",
        mode: "card",
        paymentDate: fmtDate(today),
        referenceNumber: "CARD789012",
        createdBy: managerUser.id,
      },
      {
        bookingId: booking3.id,
        venueId: venue.id,
        type: "advance",
        amount: "20000",
        mode: "netbanking",
        paymentDate: fmtDate(today),
        referenceNumber: "NB345678",
        createdBy: ownerUser.id,
      },
      {
        bookingId: booking4.id,
        venueId: venue.id,
        type: "advance",
        amount: "25000",
        mode: "cheque",
        paymentDate: fmtDate(lastMonth),
        referenceNumber: "CHQ001234",
        createdBy: ownerUser.id,
      },
      {
        bookingId: booking4.id,
        venueId: venue.id,
        type: "balance",
        amount: "30000",
        mode: "upi",
        paymentDate: fmtDate(yesterday),
        referenceNumber: "UPI567890",
        createdBy: ownerUser.id,
      },
    ]);

    // Staff
    const [staff1] = await db
      .insert(staff)
      .values({
        venueId: venue.id,
        name: "Suresh Kumar",
        role: "Event Coordinator",
        phone: "9700001111",
        email: "suresh@venue.com",
        joiningDate: "2023-01-15",
        isActive: true,
      })
      .returning();

    const [staff2] = await db
      .insert(staff)
      .values({
        venueId: venue.id,
        name: "Lakshmi Devi",
        role: "Housekeeping Lead",
        phone: "9700002222",
        email: "lakshmi@venue.com",
        joiningDate: "2023-03-01",
        isActive: true,
      })
      .returning();

    await db.insert(staff).values({
      venueId: venue.id,
      name: "Vinod Kumar",
      role: "Security",
      phone: "9700003333",
      joiningDate: "2022-06-01",
      isActive: true,
    });

    await db.insert(staff).values({
      venueId: venue.id,
      name: "Meena Rajesh",
      role: "Catering Staff",
      phone: "9700004444",
      joiningDate: "2024-01-10",
      isActive: true,
    });

    // Assign staff to booking
    await db.insert(bookingStaff).values([
      {
        bookingId: booking1.id,
        staffId: staff1.id,
        role: "Event Coordinator",
      },
      {
        bookingId: booking1.id,
        staffId: staff2.id,
        role: "Housekeeping Lead",
      },
    ]);

    // Task template
    const [template] = await db
      .insert(taskTemplates)
      .values({
        venueId: venue.id,
        name: "Standard Wedding Checklist",
        description: "Default tasks for wedding events",
        tasks: [
          "Setup chairs and tables",
          "Arrange floral decoration",
          "Sound & light check",
          "Bridal room preparation",
          "Parking arrangement",
          "Cleanup after event",
          "Breakdown by 11 PM",
        ],
        isActive: true,
      })
      .returning();

    // Booking tasks
    await db.insert(bookingTasks).values([
      {
        bookingId: booking1.id,
        title: "Setup chairs and tables",
        assignedStaffId: staff2.id,
        status: "pending",
        dueTime: "08:00",
      },
      {
        bookingId: booking1.id,
        title: "Sound & light check",
        assignedStaffId: staff1.id,
        status: "pending",
        dueTime: "09:00",
      },
      {
        bookingId: booking1.id,
        title: "Bridal room preparation",
        assignedStaffId: staff2.id,
        status: "done",
        dueTime: "10:00",
        completedAt: new Date(),
      },
      {
        bookingId: booking2.id,
        title: "Setup chairs and tables",
        assignedStaffId: staff2.id,
        status: "done",
        completedAt: new Date(),
      },
      {
        bookingId: booking2.id,
        title: "Cleanup after event",
        assignedStaffId: staff2.id,
        status: "in_progress",
      },
    ]);

    // Assets
    await db.insert(assets).values([
      {
        venueId: venue.id,
        name: "Banquet Chairs",
        category: "Furniture",
        totalQuantity: 600,
        availableQuantity: 600,
        purchaseDate: "2022-01-01",
        purchaseCost: "300000",
        condition: "good",
      },
      {
        venueId: venue.id,
        name: "Round Tables",
        category: "Furniture",
        totalQuantity: 60,
        availableQuantity: 60,
        purchaseDate: "2022-01-01",
        purchaseCost: "120000",
        condition: "good",
      },
      {
        venueId: venue.id,
        name: "Sound System",
        category: "AV Equipment",
        totalQuantity: 2,
        availableQuantity: 2,
        purchaseDate: "2023-06-01",
        purchaseCost: "500000",
        condition: "excellent",
      },
      {
        venueId: venue.id,
        name: "Projector",
        category: "AV Equipment",
        totalQuantity: 3,
        availableQuantity: 3,
        purchaseDate: "2023-01-01",
        purchaseCost: "150000",
        condition: "excellent",
      },
      {
        venueId: venue.id,
        name: "Generator (25KVA)",
        category: "Power",
        totalQuantity: 1,
        availableQuantity: 1,
        purchaseDate: "2021-06-01",
        purchaseCost: "450000",
        condition: "fair",
      },
    ]);

    // Vendors
    await db.insert(vendors).values([
      {
        venueId: venue.id,
        name: "Royal Catering Services",
        category: "catering",
        phone: "9600001111",
        email: "royal@catering.com",
        rateCard: "Veg: ₹350/plate, Non-veg: ₹450/plate",
        rating: "4.5",
      },
      {
        venueId: venue.id,
        name: "Floral Dreams Decoration",
        category: "decoration",
        phone: "9600002222",
        email: "floral@decoration.com",
        rateCard: "Basic: ₹25000, Premium: ₹75000",
        rating: "4.8",
      },
      {
        venueId: venue.id,
        name: "Power Backup Solutions",
        category: "generator",
        phone: "9600003333",
        rateCard: "₹5000/day for 50KVA",
        rating: "4.0",
      },
      {
        venueId: venue.id,
        name: "Melody Orchestra",
        category: "orchestra",
        phone: "9600004444",
        email: "melody@orchestra.com",
        rateCard: "₹15000 for 4 hours",
        rating: "4.6",
      },
    ]);

    // Expenses
    await db.insert(expenses).values([
      {
        venueId: venue.id,
        category: "electricity",
        description: "Monthly electricity bill",
        amount: "45000",
        expenseDate: fmtDate(lastMonth),
        isRecurring: true,
        frequency: "monthly",
        createdBy: ownerUser.id,
      },
      {
        venueId: venue.id,
        category: "salaries",
        description: "Staff salaries - December",
        amount: "120000",
        expenseDate: fmtDate(lastMonth),
        isRecurring: true,
        frequency: "monthly",
        createdBy: ownerUser.id,
      },
      {
        venueId: venue.id,
        category: "maintenance",
        description: "AC servicing - Grand Ballroom",
        amount: "8000",
        expenseDate: fmtDate(today),
        isRecurring: false,
        createdBy: ownerUser.id,
      },
      {
        venueId: venue.id,
        bookingId: booking4.id,
        category: "other",
        description: "Extra cleaning after corporate event",
        amount: "2500",
        expenseDate: fmtDate(yesterday),
        isRecurring: false,
        createdBy: ownerUser.id,
      },
    ]);

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully",
      credentials: {
        owner: { email: "owner@grandcelebration.com", password: "password123" },
        manager: { email: "manager@grandcelebration.com", password: "password123" },
        accountant: { email: "accounts@grandcelebration.com", password: "password123" },
        staff: { email: "staff@grandcelebration.com", password: "password123" },
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Seed failed", details: String(error) },
      { status: 500 }
    );
  }
}
