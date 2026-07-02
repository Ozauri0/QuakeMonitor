import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUsersCollection } from "@/lib/mongodb";

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "email query param required" }, { status: 400 });
    }

    // Prevent deleting yourself
    if (email.toLowerCase() === session.email) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }

    const col = await getUsersCollection();
    const result = await col.deleteOne({ _id: email.toLowerCase() });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[AUTH] Delete user error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
