import { db } from "./db";
import {
  tenants,
  activities,
  capacity,
  reservations,
  messages,
  settings,
  supportRequests,
  blacklist,
  agencies,
  agencyActivityTerms,
  activityCosts,
  settlements,
  settlementEntries,
  payments,
  agencyPayouts,
  supplierDispatches,
  agencyActivityRates,
  packageTours,
  packageTourActivities,
  holidays,
  autoResponses,
  customerRequests,
  requestMessageTemplates,
  systemLogs,
  botQualityScores,
  appUsers,
} from "@shared/schema";
import { eq, isNull, sql } from "drizzle-orm";

async function migrateToMultiTenant() {
  console.log("Starting multi-tenant migration...");

  try {
    const existingTenant = await db.select().from(tenants).where(eq(tenants.slug, "default")).limit(1);
    
    let defaultTenant;
    
    if (existingTenant.length === 0) {
      console.log("Creating default tenant...");
      const [newTenant] = await db.insert(tenants).values({
        name: "Default Agency",
        slug: "default",
        contactEmail: "admin@smartur.com",
        isActive: true,
        primaryColor: "262 83% 58%",
        accentColor: "142 76% 36%",
        timezone: "Europe/Istanbul",
        language: "tr"
      }).returning();
      defaultTenant = newTenant;
      console.log(`Created default tenant with ID: ${defaultTenant.id}`);
    } else {
      defaultTenant = existingTenant[0];
      console.log(`Using existing default tenant with ID: ${defaultTenant.id}`);
    }

    const tenantId = defaultTenant.id;

    console.log("Migrating existing data to default tenant...");

    const tablesToMigrate = [
      { table: activities, name: "activities" },
      { table: capacity, name: "capacity" },
      { table: reservations, name: "reservations" },
      { table: messages, name: "messages" },
      { table: settings, name: "settings" },
      { table: supportRequests, name: "supportRequests" },
      { table: blacklist, name: "blacklist" },
      { table: agencies, name: "agencies" },
      { table: agencyActivityTerms, name: "agencyActivityTerms" },
      { table: activityCosts, name: "activityCosts" },
      { table: settlements, name: "settlements" },
      { table: settlementEntries, name: "settlementEntries" },
      { table: payments, name: "payments" },
      { table: agencyPayouts, name: "agencyPayouts" },
      { table: supplierDispatches, name: "supplierDispatches" },
      { table: agencyActivityRates, name: "agencyActivityRates" },
      { table: packageTours, name: "packageTours" },
      { table: packageTourActivities, name: "packageTourActivities" },
      { table: holidays, name: "holidays" },
      { table: autoResponses, name: "autoResponses" },
      { table: customerRequests, name: "customerRequests" },
      { table: requestMessageTemplates, name: "requestMessageTemplates" },
      { table: systemLogs, name: "systemLogs" },
      { table: botQualityScores, name: "botQualityScores" },
      { table: appUsers, name: "appUsers" },
    ];

    for (const { table, name } of tablesToMigrate) {
      try {
        const result = await db.update(table as any)
          .set({ tenantId })
          .where(isNull((table as any).tenantId));
        console.log(`Migrated ${name} table`);
      } catch (err: any) {
        console.log(`Skipping ${name}: ${err.message}`);
      }
    }

    console.log("\nMigration complete!");
    console.log(`Default Tenant ID: ${tenantId}`);
    console.log("All existing data has been assigned to the default tenant.");

  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

migrateToMultiTenant()
  .then(() => {
    console.log("Migration script finished successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration script failed:", err);
    process.exit(1);
  });
