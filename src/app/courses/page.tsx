import { Suspense } from "react";
import { ShoppingScreen } from "@/components/screens/ShoppingScreen";

export default function Page() {
  return (
    <Suspense>
      <ShoppingScreen />
    </Suspense>
  );
}
