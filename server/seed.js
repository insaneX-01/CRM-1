import dotenv from "dotenv";
import connectDB from "./config/db.js";
import User from "./models/userModel.js";
import Dealer from "./models/dealerModel.js";
import Lead from "./models/leadModel.js";
import Scheme from "./models/schemeModel.js";
import SalesProfile from "./models/salesProfileModel.js";
import { provisionLinkedProfile } from "./utils/provisionUserProfile.js";

dotenv.config();

const seed = async () => {
  try {
    await connectDB();

    await Promise.all([
      User.deleteMany(),
      Dealer.deleteMany(),
      Lead.deleteMany(),
      Scheme.deleteMany(),
      SalesProfile.deleteMany(),
    ]);

    const admin = await User.create({
      name: "Admin User",
      email: "admin@techfanatics.com",
      phone: "9999999999",
      password: "Admin@123",
      role: "admin",
    });

    const dealerUser = await User.create({
      name: "Dealer User",
      email: "dealer@techfanatics.com",
      phone: "9876543210",
      password: "Dealer@123",
      role: "dealer",
      area: "North",
    });

    const salesUser = await User.create({
      name: "Sales User",
      email: "sales@techfanatics.com",
      phone: "9123456789",
      password: "Sales@123",
      role: "salesperson",
      area: "North",
    });

    const dealer = await provisionLinkedProfile({
      user: dealerUser,
      role: "dealer",
      payload: {
        phone: dealerUser.phone,
        area: dealerUser.area,
        businessName: "North Region Dealer",
        address: "North Region Office",
      },
      actorId: admin._id,
    });

    await provisionLinkedProfile({
      user: salesUser,
      role: "salesperson",
      payload: {
        phone: salesUser.phone,
        area: salesUser.area,
        assignedAreas: [salesUser.area],
      },
      actorId: admin._id,
    });

    await Lead.create([
      {
        name: "Acme Corp",
        phone: "9000000001",
        area: "North",
        requirement: "Construction equipment",
        status: "New",
        assignedDealer: dealer._id,
        assignedSales: salesUser._id,
        createdBy: admin._id,
      },
      {
        name: "BuildTech",
        phone: "9000000002",
        area: "North",
        requirement: "Excavators",
        status: "Contacted",
        assignedDealer: dealer._id,
        assignedSales: salesUser._id,
        createdBy: admin._id,
      },
    ]);

    await Scheme.create([
      {
        name: "Monthly Conversion Bonus",
        description: "Bonus based on number of converted leads per month.",
        criteria: "Convert 10 leads per month",
        incentiveRate: 5,
        active: true,
      },
      {
        name: "High Value Order Incentive",
        description: "Extra incentive on orders above 50000",
        criteria: "Order total exceeds 50000",
        incentiveRate: 3,
        active: true,
      },
    ]);

    console.log("Seed data created.");
    console.log("Admin: admin@techfanatics.com / Admin@123");
    console.log("Dealer: dealer@techfanatics.com / Dealer@123");
    console.log("Sales: sales@techfanatics.com / Sales@123");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seed();
