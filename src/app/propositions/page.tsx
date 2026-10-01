import { Suspense } from "react";
import { ProposalsScreen } from "@/components/screens/ProposalsScreen";

export default function Page() {
  return (
    <Suspense>
      <ProposalsScreen />
    </Suspense>
  );
}
