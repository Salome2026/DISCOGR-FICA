import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { getShow } from "@discografica/shared/api/booking";
import type { BookingShow } from "@discografica/shared/types/booking";
import { ShowFormScreen } from "@/components/show-form";

export default function EditShowScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [show, setShow] = useState<BookingShow | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    getShow(id).then((d) => setShow(d.show ?? null));
  }, [id]);

  if (!show) {
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
      <ShowFormScreen show={show} />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: "#000000", alignItems: "center", justifyContent: "center" },
});
