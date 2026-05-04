import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { Input } from '@/components/Input';
import { Text } from '@/components/Text';
import { useTheme } from '@/design/ThemeProvider';
import { overlay } from '@/design/tokens';
import { supabase } from '@/services/api/supabase';
import { useAuthStore } from '@/state/authStore';
import { useTenantStore } from '@/state/tenantStore';
import { useToastStore } from '@/state/toastStore';
import { type TenantRole } from '@/types/db';

type MemberRow = {
  key: string;
  user_id: string | null;
  role: TenantRole;
  email: string | null;
  display_name: string | null;
  pending: boolean;
};

type MembershipRowRaw = {
  user_id: string;
  role: TenantRole;
};

type PendingRowRaw = {
  email: string;
  role: TenantRole;
};

async function getMembers(tenantId: string): Promise<MemberRow[]> {
  const [memberships, pending] = await Promise.all([
    supabase
      .from('memberships')
      .select('user_id, role')
      .eq('tenant_id', tenantId),
    supabase
      .from('pending_memberships')
      .select('email, role')
      .eq('tenant_id', tenantId),
  ]);
  if (memberships.error) throw memberships.error;
  if (pending.error) throw pending.error;

  // Fetch display names separately. memberships.user_id references auth.users
  // (not profiles directly), so PostgREST can't auto-embed across the two — we
  // resolve the join in the client.
  const userIds = (memberships.data ?? []).map((row) => row.user_id);
  const profilesById = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);
    for (const p of profiles ?? []) {
      profilesById.set(p.id, p.full_name);
    }
  }

  const accepted = ((memberships.data ?? []) as unknown as MembershipRowRaw[]).map(
    (row): MemberRow => ({
      key: `m:${row.user_id}`,
      user_id: row.user_id,
      role: row.role,
      email: null,
      display_name: profilesById.get(row.user_id) ?? null,
      pending: false,
    }),
  );
  const invited = ((pending.data ?? []) as unknown as PendingRowRaw[]).map(
    (row): MemberRow => ({
      key: `p:${row.email}`,
      user_id: null,
      role: row.role,
      email: row.email,
      display_name: null,
      pending: true,
    }),
  );
  return [...accepted, ...invited];
}

const ROLE_RANK: Record<TenantRole, number> = {
  owner: 4,
  admin: 3,
  staff: 2,
  customer: 1,
};

export default function TeamScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const session = useAuthStore((s) => s.session);
  const tenant = useTenantStore((s) =>
    s.tenants.find((tt) => tt.id === s.currentTenantId),
  );
  const showToast = useToastStore((s) => s.show);
  const myUserId = session?.user.id;
  const myRole = tenant?.role;
  const myRank = myRole ? ROLE_RANK[myRole] : 0;
  const canManage = myRank >= ROLE_RANK.admin;

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TenantRole>('staff');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-team', tenant?.id],
    queryFn: () => getMembers(tenant?.id ?? ''),
    enabled: !!tenant?.id,
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      if (!tenant) throw new Error('no tenant');
      const { error } = await supabase
        .from('memberships')
        .delete()
        .eq('tenant_id', tenant.id)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-team', tenant?.id] });
      showToast({ kind: 'success', message: t('admin.teamMemberRemoved') });
    },
    onError: (err) => {
      showToast({
        kind: 'danger',
        message: err instanceof Error ? err.message : 'unknown',
      });
    },
  });

  const cancelInvite = useMutation({
    mutationFn: async (email: string) => {
      if (!tenant) throw new Error('no tenant');
      const { error } = await supabase
        .from('pending_memberships')
        .delete()
        .eq('tenant_id', tenant.id)
        .eq('email', email);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-team', tenant?.id] });
      showToast({ kind: 'success', message: t('admin.teamInviteCancelled') });
    },
    onError: (err) => {
      showToast({
        kind: 'danger',
        message: err instanceof Error ? err.message : 'unknown',
      });
    },
  });

  const confirmRemove = (member: MemberRow) => {
    if (member.pending && member.email) {
      Alert.alert(
        t('admin.teamCancelInviteTitle'),
        t('admin.teamCancelInviteBody', { email: member.email }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('admin.teamCancelInviteConfirm'),
            style: 'destructive',
            onPress: () => cancelInvite.mutate(member.email!),
          },
        ],
      );
      return;
    }
    if (!member.user_id) return;
    Alert.alert(
      t('admin.teamRemoveMemberTitle'),
      t('admin.teamRemoveMemberBody', {
        name: member.display_name ?? member.email ?? '—',
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.teamRemoveMemberConfirm'),
          style: 'destructive',
          onPress: () => removeMember.mutate(member.user_id!),
        },
      ],
    );
  };

  const invite = useMutation({
    mutationFn: async () => {
      if (!tenant || !inviteEmail.trim()) throw new Error('missing fields');
      const { data: result, error } = await supabase.functions.invoke<{
        ok?: boolean;
        error?: string;
      }>('invite-member', {
        body: { tenant_id: tenant.id, email: inviteEmail.trim(), role: inviteRole },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      showToast({ kind: 'success', message: t('admin.teamInviteSent') });
      setShowInvite(false);
      setInviteEmail('');
      setInviteRole('staff');
      void queryClient.invalidateQueries({ queryKey: ['admin-team', tenant?.id] });
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'unknown';
      showToast({
        kind: 'danger',
        message: msg.includes('forbidden_role')
          ? t('admin.teamForbiddenRole')
          : msg,
      });
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.brand[500]} />
      </View>
    );
  }

  const others = (data ?? []).filter((m) => m.user_id !== myUserId);
  const sortedOthers = [...others].sort((a, b) => {
    if (a.pending !== b.pending) return a.pending ? 1 : -1;
    return (a.display_name ?? a.email ?? '').localeCompare(b.display_name ?? b.email ?? '');
  });

  return (
    <View style={styles.flex}>
      {sortedOthers.length === 0 ? (
        <View style={styles.center}>
          <EmptyState icon="users" title={t('admin.teamEmpty')} />
        </View>
      ) : (
        <FlatList
          data={sortedOthers}
          keyExtractor={(m) => m.key}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const primary = item.display_name ?? item.email ?? '—';
            const secondary = item.display_name && item.email ? item.email : null;
            return (
              <Card style={styles.memberCard}>
                <View style={styles.memberHeader}>
                  <View style={styles.flex}>
                    <Text variant="bodyStrong">{primary}</Text>
                    {secondary ? (
                      <Text variant="caption" color="muted">
                        {secondary}
                      </Text>
                    ) : null}
                    {item.pending ? (
                      <Text variant="caption" color="muted" style={styles.pendingHint}>
                        {t('admin.teamPending')}
                      </Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.roleChip,
                      {
                        backgroundColor: item.pending
                          ? theme.colors.muted + '20'
                          : theme.colors.brand[500] + '20',
                      },
                    ]}
                  >
                    <Text
                      variant="label"
                      style={{
                        color: item.pending ? theme.colors.muted : theme.colors.brand[500],
                      }}
                    >
                      {t(`admin.role.${item.role}`)}
                    </Text>
                  </View>
                  {canManage ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        item.pending
                          ? t('admin.teamCancelInvite')
                          : t('admin.teamRemoveMember')
                      }
                      onPress={() => confirmRemove(item)}
                      hitSlop={8}
                      style={styles.removeBtn}
                    >
                      <Icon name="trash" size={18} color="danger" />
                    </Pressable>
                  ) : null}
                </View>
              </Card>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
      {canManage && (
        <Pressable
          onPress={() => setShowInvite(true)}
          accessibilityRole="button"
          accessibilityLabel={t('admin.teamInvite')}
          style={[styles.fab, { backgroundColor: theme.colors.brand[500] }]}
        >
          <Icon name="plus" size={24} colorHex={theme.colors.white} />
        </Pressable>
      )}

      <Modal visible={showInvite} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
            <Text variant="h2">{t('admin.teamInvite')}</Text>
            <Input
              label={t('booking.email')}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text variant="label" color="muted">
              {t('admin.teamRole')}
            </Text>
            <View style={styles.rolePicker}>
              {(['staff', 'admin', ...(myRole === 'owner' ? (['owner'] as TenantRole[]) : [])] as TenantRole[]).map((r) => (
                <Pressable
                  key={r}
                  accessibilityRole="button"
                  onPress={() => setInviteRole(r)}
                  style={[
                    styles.roleOption,
                    {
                      borderColor:
                        inviteRole === r ? theme.colors.brand[500] : theme.colors.border,
                      backgroundColor:
                        inviteRole === r ? theme.colors.brandTint : 'transparent',
                    },
                  ]}
                >
                  <Text variant="bodyStrong">{t(`admin.role.${r}`)}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.modalActions}>
              <Button
                label={t('common.cancel')}
                variant="ghost"
                onPress={() => setShowInvite(false)}
              />
              <Button
                label={t('admin.teamInviteSend')}
                variant="primary"
                loading={invite.isPending}
                disabled={!inviteEmail.trim()}
                onPress={() => invite.mutate()}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 16 },
  memberCard: {},
  memberHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roleChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  pendingHint: { marginTop: 4 },
  removeBtn: { padding: 4 },
  separator: { height: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  fab: {
    position: 'absolute',
    end: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: overlay,
    justifyContent: 'flex-end',
  },
  modal: { padding: 24, gap: 12, borderTopStartRadius: 24, borderTopEndRadius: 24 },
  rolePicker: { flexDirection: 'row', gap: 8 },
  roleOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
});
