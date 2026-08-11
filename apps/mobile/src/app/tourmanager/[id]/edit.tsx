import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { getHoja } from "@discografica/shared/api/tourManager";
import type { HojaDeRuta } from "@discografica/shared/types/tourManager";
import { HojaFormScreen } from "@/components/hoja-form";

export default function EditHojaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [hoja, setHoja] = useState<HojaDeRuta | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    getHoja(id).then((d) => setHoja(d.hoja ?? null));
  }, [id]);

  if (!hoja) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color="#3fc6d1" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <HojaFormScreen hoja={hoja} />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: "#000000", alignItems: "center", justifyContent: "center" },
});
