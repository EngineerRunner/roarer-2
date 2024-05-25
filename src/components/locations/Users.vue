<script lang="ts" setup>
import { computed, effect, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter, useRoute } from "vue-router";
import { z } from "zod";
import Markdown from "../Markdown.vue";
import ProfilePicture from "../ProfilePicture.vue";
import Statistics from "../Statistics.vue";
import { apiRequest, getResponseFromAPIRequest } from "../../lib/api/request";
import { formatDate } from "../../lib/formatDate";
import { getPermissions } from "../../lib/bitwise";
import { profileSchemaOrError, APIProfile } from "../../lib/schemas/profile";
import { useCloudlinkStore } from "../../stores/cloudlink";
import { useDialogStore } from "../../stores/dialog";
import { useAuthStore } from "../../stores/auth";
import { useOnlinelistStore } from "../../stores/onlinelist";
import { useRelationshipStore } from "../../stores/relationship";

const cloudlinkStore = useCloudlinkStore();
const dialogStore = useDialogStore();
const authStore = useAuthStore();
const onlinelistStore = useOnlinelistStore();
const relationshipStore = useRelationshipStore();
const { t } = useI18n();
const router = useRouter();
const route = useRoute();

const username = ref("");

const submit = (e: Event) => {
  e.preventDefault();
  if (!username.value) {
    return;
  }
  router.push(`/users/${username.value}`);
};

const userProfile = ref<APIProfile | null>(null);
effect(async () => {
  if (!route.params.username) {
    return;
  }
  const response = await getResponseFromAPIRequest(
    `/users/${route.params.username}`,
    {
      schema: profileSchemaOrError,
    },
  );
  if (response.error !== null) {
    await dialogStore.alert(
      t("profileInformationFail", { status: response.error }),
    );
    return;
  }
  if (response.data.error) {
    await dialogStore.alert(
      t("profileInformationFail", { status: response.data.type }),
    );
    return;
  }
  userProfile.value = response.data;
});

const isBlocked = computed(() => {
  if (typeof route.params.username !== "string") {
    throw new Error(`Incorrect query param type: ${route.params.username}`);
  }
  return relationshipStore.blockedUsers.has(route.params.username);
});
const block = async () => {
  if (!route.params.username) {
    return;
  }
  if (
    !(await dialogStore.confirm(
      t(isBlocked.value ? "unblockUserConfirm" : "blockUserConfirm"),
    ))
  ) {
    return;
  }
  const response = await apiRequest(
    `/users/${route.params.username}/relationship`,
    {
      method: "PATCH",
      auth: true,
      body: JSON.stringify({
        state: isBlocked.value ? 0 : 2,
      }),
    },
  );
  if (response.status !== 200) {
    await dialogStore.alert(
      t(isBlocked.value ? "blockFail" : "unblockFail", {
        status: response.status,
      }),
    );
  }
};

const report = async () => {
  if (!userProfile.value) {
    return;
  }
  const reason = await dialogStore.prompt(
    t("reportReason"),
    t("reportReasonPlaceholder"),
  );
  if (!reason) {
    return;
  }
  if (
    !(await dialogStore.confirm(
      t("confirmUserReport", { reason, username: userProfile.value._id }),
    ))
  ) {
    return;
  }
  try {
    await cloudlinkStore.send(
      {
        cmd: "report",
        val: {
          type: 1,
          id: userProfile.value._id,
          reason,
          comment: "Reported with Roarer.",
        },
      },
      z.object({}), // for obvious reasons, reports aren't public and there's no response associated with them
    );
  } catch {}
  await dialogStore.alert(t("reportSuccess"));
};

const permissions = computed(() =>
  userProfile.value?.permissions
    ? getPermissions(userProfile.value?.permissions)
    : null,
);
</script>

<template>
  <div class="flex flex-col gap-2">
    <form class="flex gap-2" @submit="submit">
      <input
        class="w-full rounded-lg border-2 border-accent bg-transparent px-2 py-1"
        :placeholder="t('username')"
        type="text"
        v-model="username"
      />
      <button class="whitespace-nowrap rounded-xl bg-accent px-2 py-1">
        {{ t("userSearch") }}
      </button>
    </form>
    <div class="mt-5 space-y-5" v-if="userProfile === null">
      <div class="text-center text-xl italic">
        <Statistics />
      </div>
      <div v-if="authStore.isLoggedIn">
        <p>{{ t("blockedUsers") }}</p>
        <ul>
          <li
            class="list-inside list-disc"
            v-for="user in relationshipStore.blockedUsers"
          >
            <RouterLink :to="`/users/${user}`" class="text-link underline">
              {{ user }}
            </RouterLink>
          </li>
        </ul>
      </div>
    </div>
    <div class="mx-auto mt-5 flex gap-2" v-else>
      <div
        class="flex min-w-[calc(70px+theme(spacing.4))] items-center justify-center rounded-xl bg-accent py-4"
      >
        <ProfilePicture
          class="h-16 w-16"
          :pfp="{
            pfp: userProfile.pfp_data,
            avatar: userProfile.avatar,
            bg: userProfile.avatar_color,
          }"
        />
      </div>
      <div class="">
        <h2 class="text-xl font-bold">{{ userProfile._id }}</h2>
        <Markdown
          class="text-lg"
          inline
          noImages
          :md="userProfile.quote"
          v-if="userProfile.quote"
        />
        <div class="mt-2"></div>
        <p
          v-if="
            typeof route.params.username === 'string' &&
            onlinelistStore.online.includes(route.params.username)
          "
        >
          {{ t("online") }}
        </p>
        <p v-else-if="userProfile.last_seen">
          {{
            t("lastSeenUser", {
              date: formatDate(userProfile!.last_seen),
            })
          }}
        </p>
        <p v-if="userProfile.banned">{{ t("banned") }}</p>
        <div class="mt-2"></div>
        <p v-if="userProfile.created">
          {{
            t("accountCreated", {
              date: formatDate(userProfile.created),
            })
          }}
        </p>
        <ul class="mt-2" v-if="permissions && permissions.size">
          <li v-for="permission in permissions">
            {{ t(permission) }}
          </li>
        </ul>
        <div class="mt-2"></div>
        <div class="space-x-2" v-if="authStore.isLoggedIn">
          <RouterLink
            :to="`/users/${userProfile._id}/dm`"
            class="rounded-xl bg-accent px-2 py-1 text-accent-text"
            v-if="!isBlocked && authStore.username !== userProfile._id"
          >
            {{ t("chatDM") }}
          </RouterLink>
          <button
            type="button"
            class="rounded-xl bg-accent px-2 py-1 text-accent-text"
            @click="block"
            v-if="route.params.username !== authStore.username"
          >
            {{ t(isBlocked ? "unblock" : "block") }}
          </button>
          <button
            type="button"
            class="rounded-xl bg-accent px-2 py-1 text-accent-text"
            @click="report"
          >
            {{ t("reportUser") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
