import React from "react";
import { Stack } from "expo-router";
import { ShowFormScreen } from "@/components/show-form";

export default function NewShowScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ShowFormScreen show={null} />
    </>
  );
}
