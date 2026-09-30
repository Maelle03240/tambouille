import { Suspense } from "react";
import { ReviewScreen } from "@/components/screens/ReviewScreen";

export default function Page() {
  return (
    <Suspense>
      <ReviewScreen />
    </Suspense>
  );
}
