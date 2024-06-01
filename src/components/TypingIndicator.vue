<script setup lang="ts">
import { computed, ref } from "vue";
import { Keyboard } from "lucide-vue-next";
import { useI18n } from "vue-i18n";
import { z } from "zod";
import { APIChat } from "../lib/schemas/chat";
import { useCloudlinkStore } from "../stores/cloudlink";
import { useAuthStore } from "../stores/auth";
import { useRelationshipStore } from "../stores/relationship";

const { chat } = defineProps<{
  chat?: APIChat;
}>();

const cloudlinkStore = useCloudlinkStore();
const authStore = useAuthStore();
const relationshipStore = useRelationshipStore();
const { t } = useI18n();

const typingUsers = ref(new Map<string, number>());
const shownTypingUsers = computed(() =>
  [...typingUsers.value.keys()].filter(
    (item) =>
      item !== authStore.username &&
      (!chat || chat.members.includes(item)) &&
      !relationshipStore.blockedUsers.has(item),
  ),
);

const typingIndicatorSchema = z.object({
  cmd: z.literal("direct"),
  val: z
    .object({
      u: z.string(),
      state: z.literal(chat ? 100 : 101),
    })
    .and(
      chat
        ? z.object({
            chatid: z.literal(chat._id),
          })
        : z.object({}),
    ),
});
cloudlinkStore.cloudlink.on("direct", (packet: unknown) => {
  const safeTypingIndicator = typingIndicatorSchema.safeParse(packet);
  if (!safeTypingIndicator.success) {
    return;
  }
  const time = new Date().getTime();
  typingUsers.value.set(safeTypingIndicator.data.val.u, time);
  typingUsers.value = typingUsers.value;
  setTimeout(() => {
    if (typingUsers.value.get(safeTypingIndicator.data.val.u) !== time) {
      return;
    }
    typingUsers.value.delete(safeTypingIndicator.data.val.u);
    typingUsers.value = typingUsers.value;
  }, 3000);
});
</script>

<template>
  <span
    :class="`flex items-center gap-1 ${
      shownTypingUsers.length === 0 ? 'italic opacity-40' : ''
    }`"
  >
    <Keyboard class="inline-block h-5 w-5" aria-hidden />
    <template v-if="shownTypingUsers.length === 0">
      {{ t("noTypingUsers") }}
    </template>
    <template v-else>
      <span class="sr-only">{{ t("typingUsers") }}</span>
      {{ shownTypingUsers.join(", ") }}
    </template>
  </span>
</template>
