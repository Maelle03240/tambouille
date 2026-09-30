import { Suspense } from "react";
import { EditScreen } from "@/components/screens/EditScreen";

export default function Page() {
  return (
    <Suspense>
      <EditScreen />
    </Suspense>
  );
}
