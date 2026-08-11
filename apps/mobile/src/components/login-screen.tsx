import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useAuth, loginErrorMessage } from "@/lib/auth-context";

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.content}>
        <Image source={require("@/assets/images/icon.png")} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>Centro de control</Text>
        <Text style={styles.subtitle}>Acceso interno</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#5a5d68"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#5a5d68"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Ingresar</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 32 },
  logo: { width: 160, height: 84, alignSelf: "center", marginBottom: 24 },
  title: { color: "#fff", fontSize: 20, fontWeight: "700", textAlign: "center" },
  subtitle: { color: "#8b8e97", fontSize: 13, textAlign: "center", marginBottom: 32 },
  input: {
    backgroundColor: "#15161a",
    borderWidth: 1,
    borderColor: "#2a2b30",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 15,
    marginBottom: 12,
  },
  error: { color: "#e5484d", fontSize: 13, marginBottom: 12, textAlign: "center" },
  button: {
    backgroundColor: "#3fc6d1",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#000", fontWeight: "700", fontSize: 15 },
});
