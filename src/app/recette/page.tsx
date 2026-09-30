import { Suspense } from "react";
import { RecipeScreen } from "@/components/screens/RecipeScreen";

export default function Page() {
  return (
    <Suspense>
      <RecipeScreen />
    </Suspense>
  );
}
