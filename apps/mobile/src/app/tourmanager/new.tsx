import React from "react";
import { Stack } from "expo-router";
import { HojaFormScreen } from "@/components/hoja-form";

export default function NewHojaScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <HojaFormScreen hoja={null} />
    </>
  );
}
