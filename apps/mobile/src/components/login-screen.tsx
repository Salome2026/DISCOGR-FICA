import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Animated,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@discografica/shared/theme";
import { useAuth, loginErrorMessage } from "@/lib/auth-context";
import { forgotPasswordRequest } from "@/lib/api";
import { GlassCard } from "./glass-card";
import { ScrollHero, ScrollHeroSpacer, usePinDistance } from "./scroll-hero";

// Mirrors app/page.tsx's Landing component exactly: the same scroll-pinned
// intro (see scroll-hero.tsx, a 1:1 port of VPOScrollHero's Framer Motion
// transforms), the same 7 access cards, the same expanding glass login
// panel with the same field labels/copy/forgot-password flow.
type Card = "label" | "pm" | "legal" | "editorial" | "management" | "booking" | "tourmanager" | null;

const CARDS: { key: Exclude<Card, null>; title: string; description: string; panelTitle: string }[] = [
  { key: "label", title: "Label", description: "Acceso para administradores y gestión de sellos.", panelTitle: "Acceso Label" },
  { key: "pm", title: "Project Managers", description: "Acceso para project managers y seguimiento de releases.", panelTitle: "Acceso Project Managers" },
  { key: "legal", title: "Legales", description: "Acceso para el equipo legal y aprobación de lanzamientos.", panelTitle: "Acceso Legales" },
  { key: "editorial", title: "Publishing", description: "Acceso para Tango Made In Argentina Publishing.", panelTitle: "Acceso Publishing" },
  { key: "management", title: "Management", description: "Acceso al roster, calendario y próximos lanzamientos.", panelTitle: "Acceso Management" },
  { key: "booking", title: "Booking", description: "Acceso a la agenda de shows, mapa y contactos.", panelTitle: "Acceso Booking" },
  { key: "tourmanager", title: "Tour Manager", description: "Acceso para quienes acompañan a los artistas de gira.", panelTitle: "Acceso Tour Manager" },
];

export function LoginScreen() {
  const { login } = useAuth();
  const [active, setActive] = useState<Card>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);

  const scrollY = useRef(new Animated.Value(0)).current;
  const pinDistance = usePinDistance();
  const insets = useSafeAreaInsets();

  function selectCard(key: Exclude<Card, null>) {
    setActive(key);
  }

  function backToCards() {
    setActive(null);
    setForgotMode(false);
    setForgotEmail("");
    setForgotMsg(null);
    setError(null);
  }

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

  async function handleForgotSubmit() {
    if (!forgotEmail.trim()) return;
    setForgotSubmitting(true);
    setForgotMsg(null);
    try {
      const res = await forgotPasswordRequest(forgotEmail.trim());
      setForgotMsg(res.message);
    } catch {
      setForgotMsg("Hubo un error de conexión. Intentá de nuevo en unos minutos.");
    } finally {
      setForgotSubmitting(false);
    }
  }

  const activeCard = CARDS.find((c) => c.key === active);

  if (active === null) {
    return (
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollHero scrollY={scrollY} />
        <Animated.ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        >
          <ScrollHeroSpacer height={pinDistance} />
          <View style={[styles.cards, { paddingTop: insets.top + theme.space.lg }]}>
            {CARDS.map((c) => (
              <GlassCard key={c.key} radius={theme.radiusXl} style={styles.card}>
                <Text style={styles.cardTitle}>{c.title}</Text>
                <Text style={styles.cardDescription}>{c.description}</Text>
                <Pressable style={styles.accessButton} onPress={() => selectCard(c.key)}>
                  <Text style={styles.accessButtonText}>Ingresar</Text>
                </Pressable>
              </GlassCard>
            ))}
          </View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Deliberately a separate, un-pinned screen (no ScrollHero/spacer sharing
  // the cards' ScrollView): the panel's content is much shorter than the
  // 7-card list, and reusing the same scroll position across that height
  // change was snapping the view back toward the top — right back to the
  // hero — instead of landing on the form.
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.space.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <GlassCard strong radius={theme.radiusXl} style={styles.panel}>
          <Pressable onPress={backToCards} style={styles.backLink}>
            <Text style={styles.backLinkText}>← Volver</Text>
          </Pressable>
          <Text style={styles.panelTitle}>{forgotMode ? "Restablecer contraseña" : activeCard?.panelTitle}</Text>

          {!forgotMode ? (
            <>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Usuario o email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Contraseña</Text>
                <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
              </View>

              {error && <Text style={styles.error}>{error}</Text>}

              <Pressable style={styles.accessButton} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color={theme.text1} /> : <Text style={styles.accessButtonText}>Ingresar</Text>}
              </Pressable>

              <Pressable
                onPress={() => {
                  setForgotMode(true);
                  setForgotEmail(email);
                  setForgotMsg(null);
                }}
                style={styles.forgotLink}
              >
                <Text style={styles.forgotLinkText}>¿Olvidaste tu contraseña?</Text>
              </Pressable>

              <Text style={styles.footnote}>No hay registro público — tu cuenta la crea un administrador.</Text>
            </>
          ) : (
            <>
              <Text style={styles.forgotIntro}>
                Ingresá tu correo electrónico y, si está registrado, te enviamos un enlace para restablecer tu contraseña.
              </Text>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Correo electrónico</Text>
                <TextInput
                  style={styles.input}
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!forgotMsg}
                />
              </View>
              {forgotMsg && <Text style={styles.forgotSuccess}>{forgotMsg}</Text>}
              {!forgotMsg && (
                <Pressable style={styles.accessButton} onPress={handleForgotSubmit} disabled={forgotSubmitting}>
                  {forgotSubmitting ? <ActivityIndicator color={theme.text1} /> : <Text style={styles.accessButtonText}>Enviar enlace</Text>}
                </Pressable>
              )}
              <Pressable onPress={() => { setForgotMode(false); setForgotMsg(null); }} style={styles.forgotLink}>
                <Text style={styles.forgotLinkText}>← Volver a iniciar sesión</Text>
              </Pressable>
            </>
          )}
        </GlassCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg0 },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
  cards: { gap: 14 },
  card: { padding: 24 },
  cardTitle: { color: theme.text1, fontSize: 17, fontWeight: "600", marginBottom: 6, textAlign: "center" },
  cardDescription: { color: theme.text2, fontSize: 13, lineHeight: 18, textAlign: "center", marginBottom: 18 },
  accessButton: { width: "100%", backgroundColor: theme.accentGlassBg, borderWidth: 1, borderColor: theme.accentGlassBorder, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  accessButtonText: { color: theme.text1, fontWeight: "600", fontSize: 13.5 },
  panel: { padding: 28 },
  backLink: { alignSelf: "flex-start", marginBottom: 16 },
  backLinkText: { color: theme.text3, fontSize: 12.5 },
  panelTitle: { color: theme.text1, fontSize: 16, fontWeight: "600", marginBottom: 16 },
  field: { marginBottom: 14 },
  fieldLabel: { color: theme.text2, fontSize: 12.5, marginBottom: 6 },
  input: { backgroundColor: theme.bg2, borderWidth: 1, borderColor: theme.lineSoft, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: theme.text1, fontSize: 13.5 },
  error: { color: theme.critInk, fontSize: 12.5, marginBottom: 14 },
  forgotLink: { marginTop: 14, alignItems: "center" },
  forgotLinkText: { color: theme.text3, fontSize: 12, textDecorationLine: "underline" },
  footnote: { color: theme.text3, fontSize: 11.5, marginTop: 16, textAlign: "center", lineHeight: 16 },
  forgotIntro: { color: theme.text3, fontSize: 12.5, marginBottom: 14, lineHeight: 17 },
  forgotSuccess: { color: theme.goodInk, fontSize: 12.5 },
});
