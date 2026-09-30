import { Suspense } from "react";
import { AddScreen } from "@/components/screens/AddScreen";

export default function Page() {
  return (
    <Suspense>
      <AddScreen />
    </Suspense>
  );
}
