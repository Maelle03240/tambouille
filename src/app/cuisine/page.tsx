import { Suspense } from "react";
import { CookScreen } from "@/components/screens/CookScreen";

export default function Page() {
  return (
    <Suspense>
      <CookScreen />
    </Suspense>
  );
}
