<script setup lang="ts">
import { computed, effect, ref } from "vue";
import { z } from "zod";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import ChatView from "../ChatView.vue";
import { apiRequest, getResponseFromAPIRequest } from "../../lib/api/request";
import { chatSchema, APIChat } from "../../lib/schemas/chat";
import { updateChatSchema } from "../../lib/schemas/updateChat";
import { useCloudlinkStore } from "../../stores/cloudlink";
import { useDialogStore } from "../../stores/dialog";
import { useOnlinelistStore } from "../../stores/onlinelist";

const cloudlinkStore = useCloudlinkStore();
const dialogStore = useDialogStore();
const onlineListStore = useOnlinelistStore();
const { t } = useI18n();

const chats = ref<APIChat[]>([]);
const chatsLoaded = ref(false);
const schema = z.object({
  autoget: chatSchema.array(),
});
effect(async () => {
  const response = await getResponseFromAPIRequest("/chats?autoget=1", {
    auth: true,
    schema,
  });
  if (response.error !== null) {
    await dialogStore.alert(t("getChatsFail", { status: response.error }));
    return;
  }
  chats.value = response.data.autoget;
  chatsLoaded.value = true;
});

const sortedChats = computed(() =>
  chats.value.sort(
    (a, b) =>
      new Date(b.last_active * 1000).getTime() -
      new Date(a.last_active * 1000).getTime(),
  ),
);

const chatNickname = ref("");
const createChat = async (e?: Event) => {
  e?.preventDefault();
  if (chatNickname.value === null) {
    return;
  }
  const response = await apiRequest("/chats", {
    method: "POST",
    auth: true,
    body: JSON.stringify({
      nickname: chatNickname.value,
    }),
  });
  if (response.status !== 200) {
    await dialogStore.alert(t("chatCreateFail", { status: response.status }));
  }
};

const newChatSchema = z.object({
  cmd: z.literal("direct"),
  val: z.object({
    mode: z.literal("create_chat"),
    payload: chatSchema,
  }),
});
cloudlinkStore.lookFor(
  newChatSchema,
  (packet) => {
    chats.value.push(packet.val.payload);
    chats.value = chats.value;
  },
  false,
);

const deleteChatSchema = z.object({
  cmd: z.literal("direct"),
  val: z.object({
    mode: z.literal("delete"),
    id: z.string(),
  }),
});
cloudlinkStore.lookFor(deleteChatSchema, (packet) => {
  chats.value = chats.value.filter((chat) => chat._id !== packet.val.id);
});

cloudlinkStore.lookFor(
  updateChatSchema,
  (packet) => {
    const index = chats.value.findIndex(
      (chat) => packet.val.payload._id === chat._id,
    );
    const chat = chats.value[index];
    if (!chat) {
      return;
    }
    if (packet.val.payload.nickname) {
      chat.nickname = packet.val.payload.nickname;
    }
    if (packet.val.payload.owner) {
      chat.owner = packet.val.payload.owner;
    }
    if (packet.val.payload.members) {
      chat.members = packet.val.payload.members;
    }
    chats.value = chats.value;
  },
  false,
);
</script>

<template>
  <div class="block space-y-2">
    <form class="flex gap-2" @submit="createChat">
      <input
        type="text"
        :placeholder="t('chatNickname')"
        class="w-full rounded-lg border-2 border-accent bg-transparent px-2 py-1"
        v-model="chatNickname"
      />
      <button
        type="submit"
        class="whitespace-nowrap rounded-xl bg-accent px-2 py-1 text-accent-text"
      >
        {{ t("createChat") }}
      </button>
    </form>
    <div
      class="my-2 text-center"
      v-if="
        chatsLoaded &&
        !chats.some(
          (chat) => chat._id === 'bad46026-0fde-451b-9b7d-24f98b336788',
        )
      "
    >
      {{ t("roarerGc.introduction") }}
      <RouterLink
        class="text-link underline"
        to="/home?post=@gc join bad46026-0fde-451b-9b7d-24f98b336788"
        v-if="onlineListStore.online.includes('gc')"
      >
        {{ t("roarerGc.gcBot") }}
      </RouterLink>
      <RouterLink
        class="text-link underline"
        to="/users/mybearworld/dm?post=hey!%20can%20i%20join%20the%20roarer%20gc?"
        v-else
      >
        {{ t("roarerGc.dm") }}
      </RouterLink>
    </div>
    <ChatView chat="livechat" />
    <ChatView :chat="chat" v-for="chat in sortedChats" />
  </div>
</template>
