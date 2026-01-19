import { Suspense } from "react";
import InboxClient from "./InboxClient";

export default function MessagesPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading messages...</p>}>
      <InboxClient />
    </Suspense>
  );
}
