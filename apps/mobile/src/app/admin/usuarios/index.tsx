import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Modal, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { router, Stack } from "expo-router";
import { listAppUsers, createAppUser, setUserRole, setUserActive, resetUserPassword, forceUserLogout } from "@discografica/shared/api/admin";
import { ROLES_BY_ACCOUNT_TYPE, type Role, type AccountType } from "@discografica/shared/permissions";
import type { AppUser } from "@discografica/shared/types/admin";

function RolePickerModal({ accountType, current, onSelect, onClose }: { accountType: AccountType; current: Role; onSelect: (r: Role) => void; onClose: () => void }) {
  const options = ROLES_BY_ACCOUNT_TYPE[accountType];
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Elegir rol</Text>
          <FlatList
            data={options}
            keyExtractor={(r) => r}
            contentContainerStyle={{ paddingBottom: 30 }}
            renderItem={({ item }) => (
              <Pressable onPress={() => onSelect(item)} style={[styles.roleOption, item === current && styles.roleOptionActive]}>
                <Text style={[styles.roleOptionText, item === current && styles.roleOptionTextActive]}>{item}</Text>
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

function ResetPasswordModal({ email, onClose, onDone }: { email: string; onClose: () => void; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (password.length < 8) {
      setError("Mínimo 8 caracteres.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await resetUserPassword(email, password);
      if (res.error) setError(res.error);
      else onDone();
    } catch {
      setError("No se pudo actualizar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Nueva contraseña temporal</Text>
          <Text style={styles.sheetSub}>{email}</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Mínimo 8 caracteres"
            placeholderTextColor="#5a5d68"
            secureTextEntry
            style={styles.input}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={styles.cancelButton}><Text style={styles.cancelText}>Cancelar</Text></Pressable>
            <Pressable onPress={submit} disabled={saving} style={styles.saveButton}>
              {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveText}>Guardar</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("empresa");
  const [role, setRole] = useState<Role>(ROLES_BY_ACCOUNT_TYPE.empresa[0]);
  const [pickingRole, setPickingRole] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim() || !name.trim() || password.length < 8) {
      setError("Completá nombre, email y una contraseña de al menos 8 caracteres.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createAppUser({ email: email.trim(), name: name.trim(), password, accountType, role });
      onCreated();
    } catch {
      setError("No se pudo crear el usuario.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ScrollView style={styles.sheet} contentContainerStyle={{ paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.sheetTitle}>Nuevo usuario</Text>
          <Text style={styles.label}>Nombre</Text>
          <TextInput value={name} onChangeText={setName} placeholderTextColor="#5a5d68" style={styles.input} />
          <Text style={styles.label}>Email</Text>
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholderTextColor="#5a5d68" style={styles.input} />
          <Text style={styles.label}>Contraseña temporal</Text>
          <TextInput value={password} onChangeText={setPassword} placeholderTextColor="#5a5d68" style={styles.input} />
          <Text style={styles.label}>Tipo de cuenta</Text>
          <View style={styles.chipRow}>
            {(["empresa", "artista"] as AccountType[]).map((at) => (
              <Pressable key={at} onPress={() => { setAccountType(at); setRole(ROLES_BY_ACCOUNT_TYPE[at][0]); }} style={[styles.chip, accountType === at && styles.chipActive]}>
                <Text style={[styles.chipText, accountType === at && styles.chipTextActive]}>{at}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Rol</Text>
          <Pressable onPress={() => setPickingRole(true)} style={styles.input}>
            <Text style={{ color: "#fff", fontSize: 14 }}>{role}</Text>
          </Pressable>

          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={styles.cancelButton}><Text style={styles.cancelText}>Cancelar</Text></Pressable>
            <Pressable onPress={submit} disabled={saving} style={styles.saveButton}>
              {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveText}>Crear</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </View>
      {pickingRole && (
        <RolePickerModal accountType={accountType} current={role} onSelect={(r) => { setRole(r); setPickingRole(false); }} onClose={() => setPickingRole(false)} />
      )}
    </Modal>
  );
}

export default function AdminUsuariosScreen() {
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [pickingRoleFor, setPickingRoleFor] = useState<AppUser | null>(null);
  const [resettingFor, setResettingFor] = useState<AppUser | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    listAppUsers().then((d) => setUsers(d.users ?? [])).catch(() => setUsers([]));
  }, []);

  useEffect(load, [load]);

  async function toggleActive(u: AppUser) {
    await setUserActive(u.email, !u.active).catch(() => {});
    load();
  }

  function confirmForceLogout(u: AppUser) {
    Alert.alert("Forzar logout", `¿Cerrar todas las sesiones de ${u.email}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Forzar logout", style: "destructive", onPress: async () => { await forceUserLogout(u.email).catch(() => {}); load(); } },
    ]);
  }

  async function changeRole(u: AppUser, role: Role) {
    await setUserRole(u.email, role).catch(() => {});
    setPickingRoleFor(null);
    load();
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 48 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Atrás</Text>
        </Pressable>
        <Text style={styles.title}>Usuarios</Text>
        <Pressable onPress={() => setShowCreate(true)} style={styles.newButton}>
          <Text style={styles.newButtonText}>+ Nuevo usuario</Text>
        </Pressable>
      </View>

      {users === null ? (
        <ActivityIndicator color="#3fc6d1" style={{ marginTop: 24 }} />
      ) : (
        <View style={styles.list}>
          {users.map((u) => (
            <View key={u.email} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.cardName}>{u.name}</Text>
                  <Text style={styles.cardEmail}>{u.email}</Text>
                </View>
                <View style={[styles.statusPill, u.active ? styles.statusActive : styles.statusInactive]}>
                  <Text style={[styles.statusText, { color: u.active ? "#7fae6f" : "#e5484d" }]}>{u.active ? "Activo" : "Desactivado"}</Text>
                </View>
              </View>

              <Pressable onPress={() => setPickingRoleFor(u)} style={styles.roleButton}>
                <Text style={styles.roleButtonLabel}>Rol</Text>
                <Text style={styles.roleButtonValue}>{u.role}</Text>
              </Pressable>

              <Text style={styles.lastLogin}>
                Último acceso: {u.last_login ? new Date(u.last_login).toLocaleString("es-AR") : "Nunca"}
              </Text>

              <View style={styles.actionsRow}>
                <Pressable onPress={() => toggleActive(u)} style={styles.actionButton}>
                  <Text style={styles.actionText}>{u.active ? "Desactivar" : "Activar"}</Text>
                </Pressable>
                <Pressable onPress={() => setResettingFor(u)} style={styles.actionButton}>
                  <Text style={styles.actionText}>Reset pass</Text>
                </Pressable>
                <Pressable onPress={() => confirmForceLogout(u)} style={styles.actionButton}>
                  <Text style={styles.actionText}>Forzar logout</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      {pickingRoleFor && (
        <RolePickerModal
          accountType={pickingRoleFor.account_type}
          current={pickingRoleFor.role}
          onSelect={(r) => changeRole(pickingRoleFor, r)}
          onClose={() => setPickingRoleFor(null)}
        />
      )}
      {resettingFor && (
        <ResetPasswordModal email={resettingFor.email} onClose={() => setResettingFor(null)} onDone={() => { setResettingFor(null); Alert.alert("Listo", "Contraseña actualizada."); }} />
      )}
      {showCreate && (
        <CreateUserModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 },
  backButton: { width: "100%" },
  backText: { color: "#8b8e97", fontSize: 14 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", flex: 1 },
  newButton: { backgroundColor: "#3fc6d1", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  newButtonText: { color: "#000", fontWeight: "700", fontSize: 12.5 },
  list: { paddingHorizontal: 20, gap: 10 },
  card: { backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 12, padding: 14, gap: 8 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  cardName: { color: "#fff", fontSize: 14.5, fontWeight: "700" },
  cardEmail: { color: "#8b8e97", fontSize: 12, marginTop: 1 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 100 },
  statusActive: { backgroundColor: "rgba(127,174,106,0.16)" },
  statusInactive: { backgroundColor: "rgba(229,72,77,0.16)" },
  statusText: { fontSize: 10, fontWeight: "700" },
  roleButton: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#0c0c0e", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  roleButtonLabel: { color: "#5a5d68", fontSize: 11 },
  roleButtonValue: { color: "#fff", fontSize: 12.5, fontWeight: "600" },
  lastLogin: { color: "#5a5d68", fontSize: 11 },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  actionButton: { borderWidth: 1, borderColor: "#2a2b30", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  actionText: { color: "#8b8e97", fontSize: 11.5 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#0c0c0e", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "80%", padding: 20, borderWidth: 1, borderColor: "#2a2b30", borderBottomWidth: 0 },
  sheetTitle: { color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 4 },
  sheetSub: { color: "#8b8e97", fontSize: 12.5, marginBottom: 14 },
  roleOption: { paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: "#2a2b30" },
  roleOptionActive: { backgroundColor: "rgba(63,198,209,0.08)" },
  roleOptionText: { color: "#8b8e97", fontSize: 14 },
  roleOptionTextActive: { color: "#3fc6d1", fontWeight: "700" },
  label: { color: "#8b8e97", fontSize: 12, marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: "#15161a", borderWidth: 1, borderColor: "#2a2b30", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, color: "#fff", fontSize: 14, marginTop: 12 },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: { borderWidth: 1, borderColor: "#2a2b30", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: "#15161a" },
  chipActive: { backgroundColor: "#3fc6d1", borderColor: "#3fc6d1" },
  chipText: { color: "#8b8e97", fontSize: 12.5 },
  chipTextActive: { color: "#000", fontWeight: "700" },
  error: { color: "#e5484d", fontSize: 12, marginTop: 12 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancelButton: { flex: 1, borderWidth: 1, borderColor: "#2a2b30", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  cancelText: { color: "#8b8e97", fontWeight: "600", fontSize: 13.5 },
  saveButton: { flex: 1, backgroundColor: "#3fc6d1", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  saveText: { color: "#000", fontWeight: "700", fontSize: 13.5 },
});
