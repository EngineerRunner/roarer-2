<script setup lang="ts">
import { ref } from "vue";
import type { EmojiClickEventDetail } from "emoji-picker-element/shared";
import { Laugh, Upload } from "lucide-vue-next";
import {
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
} from "radix-vue";
import { useI18n } from "vue-i18n";
import { onBeforeRouteLeave, RouterLink, useRoute } from "vue-router";
import DynamicTextArea from "./DynamicTextArea.vue";
import PickEmoji from "./PickEmoji.vue";
import TypingIndicator from "./TypingIndicator.vue";
import { APIChat } from "../lib/schemas/chat";
import { apiRequest, getResponseFromAPIRequest } from "../lib/api/request";
import { getRestrictions } from "../lib/bitwise";
import { DiscordSticker } from "../lib/discordEmoji";
import { getReply } from "../lib/getReply";
import { postSchema, APIPost } from "../lib/schemas/post";
import { upload } from "../lib/upload";
import { useAuthStore } from "../stores/auth";
import { useDialogStore } from "../stores/dialog";
import { useIdsStore } from "../stores/uniqueIds";
import { useSettingsStore } from "../stores/settings";

const { chat } = defineProps<{
  chat?: APIChat | "livechat";
}>();
const emit = defineEmits<{
  optimistic: [post: APIPost];
  pessimistic: [id: string];
}>();

const authStore = useAuthStore();
const dialogStore = useDialogStore();
const settingsStore = useSettingsStore();
const idsStore = useIdsStore();
const route = useRoute();
const { t } = useI18n();

const postContent = ref(
  typeof route.query["post"] === "string" ? route.query["post"] : "",
);
const posting = ref(false);

const post = async () => {
  if (
    posting.value ||
    imageUploading.value ||
    (!postContent.value.trim() && !attachments.value.length)
  ) {
    return;
  }
  posting.value = true;
  let content = postContent.value.trim();
  if (settingsStore.isJoker) {
    content += " /j";
  }
  postContent.value = "";
  const id = emitOptimistic(content);
  const response = await getResponseFromAPIRequest(
    chat ? `/posts/${chat === "livechat" ? "livechat" : chat._id}` : "/home",
    {
      method: "POST",
      auth: true,
      body: JSON.stringify({
        content: content,
        attachments: attachments.value,
      }),
      schema: postSchema,
    },
  );
  if ("status" in response) {
    await dialogStore.alert(t("postFail", { status: response.status }));
    posting.value = false;
    emit("pessimistic", id);
    return;
  }
  posting.value = false;
  attachments.value = [];
};

const postSubmit = (e: Event) => {
  e.preventDefault();
  post();
};

const trimmedPost = (post: string) => {
  const reply = getReply(post);
  const postContent = reply ? reply.postContent : post;
  const slicedPostContent = postContent.slice(0, 40);
  const replacedPostContent = slicedPostContent
    .slice(0, 40)
    .replace(/: /g, ":  ") // images shouldn't appear in replies

    .replace(/!/g, "!\u200c") // markdown images
    .replace(/`/g, "\\`") // code blocks can span  new lines
    .replace(/\n/g, " ");
  return `"${replacedPostContent.slice(0, 40).trim()}${
    postContent.length > 39 ? "…" : ""
  }"`;
};

const emitOptimistic = (content: string) => {
  if (!authStore.username) {
    throw new Error("Auth required to post");
  }
  const id = idsStore.newOptimisicPostId();
  emit("optimistic", {
    attachments: [],
    edited_at: undefined,
    isDeleted: false,
    p: content,
    post_id: id,
    post_origin: chat === "livechat" ? "livechat" : chat ? chat._id : "home",
    t: {
      e: new Date().getTime() / 1000,
    },
    type: 1,
    u: authStore.username,
  });
  return id;
};

const inputRef = ref<InstanceType<typeof DynamicTextArea> | null>(null);
const reply = (username: string, content: string, postId: string) => {
  postContent.value =
    `@${username} ${trimmedPost(content)} (${postId})\n` + postContent.value;
  if (inputRef.value) {
    inputRef.value.focus();
  }
};

addEventListener("beforeunload", (e) => {
  if (postContent.value.trim() !== "") {
    e.preventDefault();
  }
});
onBeforeRouteLeave(async () => {
  return (
    postContent.value.trim() === "" ||
    (await dialogStore.confirm(t("confirmLeave")))
  );
});

const lastTypingIndicatorSent = ref<number | null>(null);
const input = async () => {
  if (chat === "livechat") {
    return;
  }
  const currentDate = new Date().getTime();
  if (
    lastTypingIndicatorSent.value === null ||
    lastTypingIndicatorSent.value + 1500 < currentDate
  ) {
    lastTypingIndicatorSent.value = currentDate;
    const status = await apiRequest(
      chat ? `/chats/${chat._id}/typing` : "/home/typing",
      {
        auth: true,
        method: "POST",
      },
    );
    if (status.status !== 200) {
      // intentionally not localized, this is a console error
      console.error(`Failed to send typing indicator (${status.status})`);
    }
  }
};

const addEmoji = (emoji: EmojiClickEventDetail) => {
  postContent.value += emoji.unicode ?? emoji.emoji.shortcodes?.[0];
};

const postSticker = (sticker: DiscordSticker) => {
  postContent.value += ` [(sticker) ${sticker.name}: ${sticker.url}]`;
};

const attachments = ref<string[]>([]);

const imageUploading = ref(false);
const uploadFile = async (files: FileList) => {
  imageUploading.value = true;
  const uplaodedAttachments = await Promise.all(
    [...files].map(async (file) => {
      const uploaded = await upload(file, "attachments");
      if (uploaded.error === "tooLarge") {
        await dialogStore.alert(
          t("uploadTooLarge", { size: uploaded.readableMaxSize }),
        );
        return;
      }
      return uploaded.image.id;
    }),
  );
  attachments.value = [
    ...attachments.value,
    ...uplaodedAttachments.filter(
      (attachment): attachment is string => typeof attachment === "string",
    ),
  ];
  imageUploading.value = false;
};

const uploadFileFromEvent = (e: ClipboardEvent) => {
  if (!e.clipboardData?.files.length) {
    return;
  }
  uploadFile(e.clipboardData.files);
};

const fileInput = ref<HTMLInputElement | null>(null);
const uploadFileFromFileInput = () => {
  if (!fileInput.value?.files) {
    return;
  }
  uploadFile(fileInput.value.files);
  fileInput.value.value = "";
};

defineExpose({ reply });
</script>

<template>
  <div
    class="text-center italic"
    v-if="
      authStore.ban &&
      getRestrictions(authStore.ban.restrictions).has(
        chat ? 'chatPosts' : 'homePosts',
      )
    "
  >
    {{ t("creatingPostsRestriction") }}
  </div>
  <form
    @submit="postSubmit"
    class="flex gap-2"
    v-else-if="authStore.isLoggedIn"
  >
    <button
      class="rounded-xl bg-accent px-2 py-1 text-accent-text"
      type="button"
      @click="fileInput?.click()"
    >
      <Upload aria-hidden />
      <span class="sr-only">{{ t("uploadFile") }}</span>
      <input
        type="file"
        multiple
        hidden
        ref="fileInput"
        @change="uploadFileFromFileInput"
      />
    </button>
    <DynamicTextArea
      class="border-accent disabled:opacity-50"
      :placeholder="t('enterPostPlaceholder')"
      @input="input"
      @paste="uploadFileFromEvent"
      v-model="postContent"
      ref="inputRef"
    />
    <PopoverRoot>
      <PopoverTrigger class="rounded-xl bg-accent px-2 py-1 text-accent-text">
        <Laugh aria-hidden />
        <span class="sr-only">Emoji</span>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent
          class="z-20 mt-2 rounded-lg bg-accent px-2 py-1 text-accent-text shadow-lg"
        >
          <PickEmoji @emoji="addEmoji" @sticker="postSticker" />
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
    <button
      type="submit"
      class="whitespace-nowrap rounded-xl bg-accent px-2 py-1 text-accent-text disabled:opacity-50"
      :disabled="imageUploading"
      v-if="postContent.trim() || attachments.length"
    >
      {{ t("enterPostSend") }}
    </button>
  </form>
  <div v-if="attachments.length || imageUploading">
    {{
      imageUploading
        ? t("uploadingAttachments")
        : t("attachmentsCount", { amount: attachments.length })
    }}
  </div>
  <div class="flex justify-between">
    <TypingIndicator :chat="chat" v-if="chat !== 'livechat'" />
    <RouterLink to="/syntax" class="text-nowrap text-right text-link underline">
      {{ t("syntaxInfo") }}
    </RouterLink>
  </div>
</template>
