import { NextResponse } from "next/server";
import { ATTACHMENT_BUCKET, opensInBrowser } from "@/lib/attachments";
import { createClient } from "@/lib/supabase/server";

// Opens an attachment. Files are private: this checks the visitor is a logged-in active user
// (the database rules hide the record otherwise), then hands out a link that expires in 60 seconds.
export async function GET(_request: Request, { params }: RouteContext<"/attachments/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: attachment } = await supabase
    .from("task_attachments")
    .select("kind, url, storage_path, name, mime_type")
    .eq("id", id)
    .maybeSingle();
  if (!attachment) return new NextResponse("Not found, or you don't have access.", { status: 404 });

  if (attachment.kind === "link" && attachment.url) return NextResponse.redirect(attachment.url);

  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(attachment.storage_path!, 60, {
      download: opensInBrowser(attachment.mime_type) ? false : attachment.name,
    });
  if (error || !data) return new NextResponse("Could not open the file. Please try again.", { status: 502 });

  return NextResponse.redirect(data.signedUrl);
}
