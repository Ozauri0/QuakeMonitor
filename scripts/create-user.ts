#!/usr/bin/env bun
import { MongoClient } from "mongodb";

const URI = process.env.MONGODB_URI || "mongodb://localhost:27017/quakes";

async function hashPassword(pw: string): Promise<string> {
  return await Bun.password.hash(pw, "bcrypt");
}

function main() {
  const a = process.argv.slice(2);
  if (a.length < 4) {
    console.log("Usage: bun run scripts/create-user.ts <email> <pass> <first> <last>");
    process.exit(1);
  }
  run(a[0], a[1], a[2], a[3]);
}

async function run(email: string, password: string, first: string, last: string) {
  console.log("");
  console.log("Creating admin: " + first + " " + last + " <" + email + ">");
  console.log("");
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db();
  const users = db.collection<any>("users");
  const existing = await users.findOne({ _id: email.toLowerCase() });
  if (existing) {
    console.error("Error: user already exists: " + email);
    await client.close();
    process.exit(1);
  }
  const hash = await hashPassword(password);
  await users.insertOne({
    _id: email.toLowerCase(),
    firstName: first,
    lastName: last,
    email: email.toLowerCase(),
    passwordHash: hash,
    role: "admin",
    createdAt: Date.now(),
  });
  console.log("Admin created!");
  console.log("  Email: " + email.toLowerCase());
  console.log("  Name:  " + first + " " + last);
  console.log("  Role:  admin");
  await client.close();
}

main();
