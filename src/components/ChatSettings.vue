<script setup lang="ts">
import { ref } from "vue";
import { z } from "zod";
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import { Crown, X } from "lucide-vue-next";
import { apiRequest } from "../lib/api/request";
import { getRestrictions } from "../lib/bitwise";
import { APIChat } from "../lib/schemas/chat";
import { updateChatSchema } from "../lib/schemas/updateChat";
import { useCloudlinkStore } from "../stores/cloudlink";
import { useDialogStore } from "../stores/dialog";
import { useAuthStore } from "../stores/auth";

const cloudlinkStore = useCloudlinkStore();
const dialogStore = useDialogStore();
const authStore = useAuthStore();
const { t } = useI18n();

const { chat } = defineProps<{
  chat: APIChat;
}>();
const emit = defineEmits<{
  back: [];
}>();

if (!chat.owner) {
  throw new Error("ChatSettings can only be used on group chats, not DMs");
}

const name = ref(chat.nickname);
const members = ref(chat.members);
const owner = ref(chat.owner);

const newChatName = ref(name.value);
const rename = async (e?: Event) => {
  e?.preventDefault();
  const response = await apiRequest(`/chats/${chat._id}`, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify({
      nickname: newChatName.value,
    }),
  });
  if (response.status !== 200) {
    await dialogStore.alert(t("renameChatFail", { status: response.status }));
  }
};

const addUserName = ref("");
const addUser = async (e?: Event) => {
  e?.preventDefault();
  const response = await apiRequest(
    `/chats/${chat._id}/members/${addUserName.value}`,
    {
      auth: true,
      method: "PUT",
    },
  );
  if (response.status !== 200) {
    await dialogStore.alert(
      t("addMemberChatFail", { status: response.status }),
    );
  }
  addUserName.value = "";
};

const remove = async (person: string) => {
  if (
    !(await dialogStore.confirm(
      `Are you sure you want to remove ${person}? You can add them back afterwards.`,
    ))
  ) {
    return;
  }
  const response = await apiRequest(`/chats/${chat._id}/members/${person}`, {
    method: "DELETE",
    auth: true,
  });
  if (response.status !== 200) {
    await dialogStore.alert(
      t("removeMemberChatFail", { status: response.status }),
    );
  }
};

const leave = async () => {
  const response = await apiRequest(`/chats/${chat._id}`, {
    method: "DELETE",
    auth: true,
  });
  if (response.status !== 200) {
    await dialogStore.alert(t("leaveChatFail", { status: response.status }));
  }
};

const promote = async (person: string) => {
  if (
    !(await dialogStore.confirm(
      `Are you sure you want to promote ${person}?\nYou will lose ownership of the group.`,
    ))
  ) {
    return;
  }
  const response = await apiRequest(
    `/chats/${chat._id}/members/${person}/transfer`,
    {
      method: "POST",
      auth: true,
    },
  );
  if (response.status !== 200) {
    await dialogStore.alert(t("promoteChatFail", { status: response.status }));
  }
};

const specificUpdateChatSchema = updateChatSchema.and(
  z.object({
    val: z.object({
      payload: z.object({
        _id: z.literal(chat._id),
      }),
    }),
  }),
);
cloudlinkStore.lookFor(
  specificUpdateChatSchema,
  (packet) => {
    if (packet.val.payload.nickname) {
      name.value = packet.val.payload.nickname;
    }
    if (packet.val.payload.owner) {
      owner.value = packet.val.payload.owner;
    }
    if (packet.val.payload.members) {
      members.value = packet.val.payload.members;
    }
  },
  false,
);
</script>

<template>
  <div
    class="text-center italic"
    v-if="
      authStore.ban &&
      getRestrictions(authStore.ban.restrictions).has('editingChatDetails')
    "
  >
    {{ t("editingChatsRestriction") }}
  </div>
  <div class="space-y-4" v-else>
    <div class="flex items-center gap-2">
      <h2 class="text-xl font-bold">{{ name ?? t("namelessChat") }}</h2>
      <RouterLink to="/chats" class="text-link underline">
        {{ t("back") }}
      </RouterLink>
    </div>
    <div class="space-y-2">
      <h3 class="text-lg font-bold">{{ t("chatSettings") }}</h3>
      <form
        class="flex gap-2"
        v-if="authStore.username === owner"
        @submit="rename"
      >
        <input
          class="w-full rounded-lg border-2 border-accent bg-transparent px-2 py-1"
          type="text"
          v-model="newChatName"
        />
        <button
          type="submit"
          class="rounded-xl bg-accent px-2 py-1 text-accent-text"
        >
          {{ t("chatRename") }}
        </button>
      </form>
      <form class="flex gap-2" @submit="addUser">
        <input
          class="w-full rounded-lg border-2 border-accent bg-transparent px-2 py-1"
          placeholder="User..."
          type="text"
          v-model="addUserName"
        />
        <button
          type="submit"
          class="rounded-xl bg-accent px-2 py-1 text-accent-text"
        >
          {{ t("chatAddMember") }}
        </button>
      </form>
    </div>
    <div class="space-y-2">
      <h3 class="text-lg font-bold">{{ t("chatPeople") }}</h3>
      <div class="flex gap-2" v-for="person in members">
        <div
          class="flex w-full items-center gap-2 rounded-xl bg-accent px-2 py-1 text-accent-text"
        >
          <h3 class="inline-block text-lg font-bold">{{ person }}</h3>
          <Crown class="inline-block" aria-hidden v-if="person === owner" />
          <span class="sr-only">{{ t("chatOwner") }}</span>
        </div>
        <button
          type="button"
          class="rounded-xl bg-accent px-2 py-1 text-accent-text"
          @click="promote(person)"
          v-if="owner === authStore.username && person !== authStore.username"
        >
          <Crown aria-hidden />
          <span class="sr-only">{{ t("chatPromote") }}</span>
        </button>
        <button
          type="button"
          class="rounded-xl bg-accent px-2 py-1 text-accent-text"
          @click="person === authStore.username ? leave() : remove(person)"
          v-if="owner === authStore.username || person === authStore.username"
        >
          <X aria-hidden />
          <span class="sr-only">{{ t("chatRemove") }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
