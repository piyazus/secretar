// POST /api/chat — принимает текстовую команду директора, роутит через
// lib/llm (Haiku -> классификация intent, Sonnet -> исполнение), вызывает
// lib/calendar или lib/gmail, пишет в audit_log.

import { NextRequest, NextResponse } from "next/server";
import { callLlm } from "@lib/llm";

export async function POST(req: NextRequest) {
  const { message } = await req.json();

  // TODO: 1) callLlm({task:'routing', ...}) -> определить intent
  //       2) выполнить соответствующую функцию из lib/calendar | lib/gmail
  //       3) callLlm({task:'complex', ...}) -> сформулировать ответ директору
  //       4) записать действие в audit_log

  return NextResponse.json({ reply: "TODO: не реализовано", received: message });
}
