import { NextResponse } from "next/server";
import { authed } from "@/lib/api";
import { exportAccountData } from "@/services/account/account-service";

export const GET = authed("We couldn't prepare your data export. Please try again.", async (_request, user) => {
  const data = await exportAccountData(user.id);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="ayakara-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
});
