import { Suspense } from "react";
import ExploreClient from "./ExploreClient";

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6">Loading explore...</p>}>
      <ExploreClient />
    </Suspense>
  );
}
