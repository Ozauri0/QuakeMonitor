import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUsersCollection, createUser } from "@/lib/mongodb";

// Bootstrap: create first admin when no admin exists yet.
// No auth required, but only works once (when users collection is empty).
export async function POST(request: NextRequest) {
  try {
    const col = await getUsersCollection();
    const adminCount = await col.countDocuments({ role: "admin" });

    if (adminCount > 0) {
      return NextResponse.json(
        { error: "Admin already exists. Use /api/auth/create-user (authenticated) to add more users." },
        { status: 403 }
      );
    }

    const { email, password, firstName, lastName } = await request.json();

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: "email, password, firstName, lastName are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const ok = await createUser({
      firstName,
      lastName,
      email,
      passwordHash,
      role: "admin",
    });

    if (!ok) {
      return NextResponse.json({ error: "Failed to create admin" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: { email: email.toLowerCase(), firstName, lastName, role: "admin" },
    });
  } catch (err) {
    console.error("[BOOTSTRAP] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
