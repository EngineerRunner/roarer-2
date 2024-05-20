<script setup lang="ts">
import { effect, ref } from "vue";
import {
  Check,
  MessageSquareMore,
  MessageSquareReply,
  Flag,
  Link,
  Pencil,
  Reply,
  RotateCw,
  Shield,
  Trash,
  UserRoundX,
  Waves,
  X,
} from "lucide-vue-next";
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import { z } from "zod";
import DynamicTextArea from "./DynamicTextArea.vue";
import Markdown from "./Markdown.vue";
import Post from "./Post.vue";
import ProfilePicture from "./ProfilePicture.vue";
import { admin } from "../lib/env";
import { apiRequest, getResponseFromAPIRequest } from "../lib/api/request";
import { addOntoPost } from "../lib/addOntoPost";
import { formatDate } from "../lib/formatDate";
import { getPostInfo } from "../lib/postInfo";
import { postSchema, APIPost } from "../lib/schemas/post";
import { APIProfile } from "../lib/schemas/profile";
import { useCloudlinkStore } from "../stores/cloudlink";
import { useAuthStore } from "../stores/auth";
import { useDialogStore } from "../stores/dialog";
import { useOnlinelistStore } from "../stores/onlinelist";
import { useRelationshipStore } from "../stores/relationship";
import { useProfilesStore } from "../stores/profiles";
import { useSettingsStore } from "../stores/settings";

const cloudlinkStore = useCloudlinkStore();
const authStore = useAuthStore();
const dialogStore = useDialogStore();
const onlineListStore = useOnlinelistStore();
const profilesStore = useProfilesStore();
const relationshipStore = useRelationshipStore();
const settingsStore = useSettingsStore();
const { t } = useI18n();

const {
  post: rawPost,
  inbox,
  dontUpdate,
  reply,
  isChatOwner,
  closable,
  noColorTransition,
} = defineProps<{
  post: APIPost;
  inbox?: boolean;
  dontUpdate?: boolean;
  reply?: boolean;
  isChatOwner?: boolean;
  hideControls?: boolean;
  closable?: boolean;
  noColorTransition?: boolean;
}>();
const emit = defineEmits<{
  reply: [username: string, postContent: string, postId: string];
  delete: [];
  close: [];
}>();

const post = addOntoPost(rawPost);

const postInfo = getPostInfo(post, { inbox });

const profile = ref<APIProfile | null>(null);
(async () => {
  if (!postInfo.isMeowerUser) return;
  profile.value = await profilesStore.getUser(postInfo.username);
})();

const isDeleted = ref(false);
const edited = ref<null | APIPost>(null);
const deleteSchema = z.object({
  cmd: z.literal("direct"),
  val: z.object({
    mode: z.literal("delete"),
    id: z.literal(post.post_id),
  }),
});
const editSchema = z.object({
  cmd: z.literal("direct"),
  val: z.object({
    mode: z.literal("update_post"),
    payload: postSchema.and(
      z.object({
        post_id: z.literal(post.post_id),
      }),
    ),
  }),
});
if (!dontUpdate) {
  cloudlinkStore.lookFor(deleteSchema, () => {
    isDeleted.value = true;
  });
  cloudlinkStore.lookFor(editSchema, (packet) => {
    edited.value = packet.val.payload;
  });
}

const remove = async () => {
  if (!(await dialogStore.confirm(t("deletePostConfirm")))) {
    return;
  }
  const response = await apiRequest(`/posts?id=${post.post_id}`, {
    method: "DELETE",
    auth: true,
  });
  if (response.status !== 200) {
    await dialogStore.alert(t("deletePostFail", { status: response.status }));
    return;
  }
  emit("delete");
};

const editing = ref(false);
const editContent = ref(post.p);
const edit = async (e?: Event) => {
  e?.preventDefault();
  editing.value = false;
  const response = await apiRequest(`/posts?id=${post.post_id}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({
      content: editContent.value,
    }),
  });
  if (response.status !== 200) {
    await dialogStore.alert(t("editPostFail", { status: response.status }));
  }
};

const replyPost = ref<APIPost | string | null>(null);
effect(async () => {
  if (!postInfo.reply) {
    return;
  }
  if (!postInfo.reply.id) {
    replyPost.value = postInfo.reply.replyText;
    return;
  }
  const response = await getResponseFromAPIRequest(
    `/posts?id=${postInfo.reply.id}`,
    {
      schema: postSchema,
      auth: true,
    },
  );
  if (response.error !== null) {
    replyPost.value = postInfo.reply.replyText;
    return;
  }
  replyPost.value = response.data;
});

const copiedLink = ref(false);
const copy = async () => {
  await navigator.clipboard.writeText(
    `https://mybearworld.github.io/roarer#/posts/${post.post_id}`,
  );
  copiedLink.value = true;
  setTimeout(() => {
    copiedLink.value = false;
  }, 750);
};

const report = async () => {
  const reason = await dialogStore.prompt(
    t("reportReason"),
    t("reportReasonPlaceholder"),
  );
  if (!reason) {
    return;
  }
  if (
    !(await dialogStore.confirm(t("confirmReport", { reason, post: post.p })))
  ) {
    return;
  }
  try {
    await cloudlinkStore.send(
      {
        cmd: "report",
        val: {
          type: 0,
          id: post.post_id,
          reason,
          comment: "Reported with Roarer.",
        },
      },
      z.object({}), // for obvious reasons, reports aren't public and there's no response associated with them
    );
  } catch {}
  await dialogStore.alert(t("reportSuccess"));
};

const reload = () => location.reload();

const editedPost = ref<InstanceType<typeof Post> | null>(null);
const main = ref<HTMLDivElement | null>(null);
const highlight = () => {
  if (editedPost.value) {
    editedPost.value.highlight();
    return;
  }
  if (!main.value) {
    return;
  }
  main.value.scrollIntoView();
  const property =
    settingsStore.theme.roarer_postStyle === "filled"
      ? "backgroundColor"
      : "borderColor";

  main.value.style[property] =
    "color-mix(in lch, var(--base-highlight), white var(--highlight-mix))";
  setTimeout(() => {
    if (!main.value) {
      return;
    }
    main.value.style[property] = "var(--base-highlight)";
  }, 500);
};

defineExpose({ highlight });
</script>

<template>
  <Post
    :post="edited"
    :reply="reply"
    v-if="edited && !relationshipStore.blockedUsers.has(postInfo.username)"
    ref="editedPost"
    @reply="(u, p) => emit('reply', u, p, post.post_id)"
  />
  <div
    class="flex gap-2"
    v-else
    v-if="!isDeleted && !relationshipStore.blockedUsers.has(postInfo.username)"
  >
    <RouterLink
      class="mr-2 mt-1 flex max-w-full px-1"
      :to="`/users/${postInfo.username}`"
      v-if="
        !reply &&
        (profile ||
          inbox ||
          postInfo.username === 'Server' ||
          !postInfo.isMeowerUser) &&
        settingsStore.showPfps
      "
    >
      <ProfilePicture
        class="h-10 min-h-10 w-10 min-w-10"
        :height="40"
        :width="40"
        :pfp="
          inbox
            ? { pfp: 101 }
            : postInfo.username === 'Server' || !postInfo.isMeowerUser
              ? { pfp: 500 }
              : {
                  pfp: profile?.pfp_data!,
                  avatar: profile?.avatar!,
                  bg: profile?.avatar_color!,
                }
        "
        :online="!inbox && onlineListStore.online.includes(postInfo.username)"
      />
    </RouterLink>
    <div
      :class="`group flex rounded-xl [--base-highlight:theme('colors.accent')] filled:[--highlight-mix:10%] bordered:border-2 bordered:border-accent bordered:bg-transparent bordered:[--highlight-mix:60%] ${
        reply
          ? 'gap-2 border-none bg-transparent italic text-text opacity-40 '
          : 'grow flex-col overflow-auto px-2 py-1 filled:bg-accent filled:text-accent-text'
      } ${noColorTransition ? '' : 'transition-colors  duration-500'}`"
      ref="main"
    >
      <div class="flex items-center gap-x-2">
        <Reply class="inline-block" aria-hidden v-if="reply" />
        <span
          v-if="!postInfo.italic || reply"
          class="whitespace-nowrap font-bold"
        >
          <RouterLink
            :to="`/users/${postInfo.username}`"
            v-if="!reply && postInfo.isMeowerUser"
          >
            {{ postInfo.username }}</RouterLink
          >
          <span v-else>{{ postInfo.username }}</span>
        </span>
        <span
          :title="t('discordBridgePost')"
          v-if="postInfo.bridged && post.u === 'Discord'"
        >
          <MessageSquareReply class="inline-block w-5" aria-hidden />
          <span class="sr-only">{{ t("discordBridgePost") }}</span>
        </span>
        <span
          :title="t('gcBridgePost')"
          v-if="postInfo.bridged && post.u === 'gc'"
        >
          <MessageSquareMore class="inline-block w-5" aria-hidden />
          <span class="sr-only">{{ t("gcBridgePost") }}</span>
        </span>
        <span
          :title="t('webhookBridgePost')"
          v-if="postInfo.bridged && post.u === 'Webhooks'"
        >
          <UserRoundX class="inline-block w-5" />
          <span class="sr-only">{{ t("webhookBridgePost") }}</span>
        </span>
        <span
          :title="t('splashBridgePost')"
          v-if="postInfo.bridged && post.u === 'SplashBridge'"
        >
          <Waves class="inline-block w-5" />
          <span class="sr-only">{{ t("splashBridgePost") }}</span>
        </span>
        <span
          :title="t('revoltBridgePost')"
          v-if="postInfo.bridged && post.u === 'RevowerJS'"
        >
          <MessageSquareReply class="inline-block w-5" />
          <span class="sr-only">{{ t("revoltBridgePost") }}</span>
        </span>
        <span :title="t('adminPost')" v-if="profile?.permissions">
          <Shield class="inline-block w-5" />
          <span class="sr-only">{{ t("adminPost") }}</span>
        </span>
        <button v-if="closable" @click="emit('close')">
          <X class="inline-block w-5" />
          <span class="sr-only">{{ t("closePost") }}</span>
        </button>
        <div
          :class="`visible w-full text-sm italic opacity-40 ${
            !postInfo.italic && !hideControls
              ? 'hidden w-auto group-hover:sm:inline-block'
              : ''
          }`"
          v-if="!reply"
        >
          {{ formatDate(post.t.e) }}
          <span v-if="edited || post.edited_at">(edited)</span>
        </div>
        <div
          class="visible flex grow justify-end space-x-1 sm:invisible sm:grow group-focus-within:sm:visible group-hover:sm:visible"
          v-if="
            !editing &&
            !inbox &&
            !reply &&
            !hideControls &&
            !post.post_id.startsWith('_')
          "
        >
          <button v-if="post.post_origin === 'home'" @click="copy">
            <Check class="h-5 w-5" aria-hidden v-if="copiedLink" />
            <Link class="h-5 w-5" aria-hidden v-else />
            <span class="sr-only">{{ t("linkPost") }}</span>
          </button>
          <button
            @click="remove"
            v-if="isChatOwner || post.u === authStore.username"
          >
            <Trash class="h-5 w-5" aria-hidden />
            <span class="sr-only">{{ t("deletePost") }}</span>
          </button>
          <button @click="editing = true" v-if="post.u === authStore.username">
            <Pencil class="h-5 w-5" aria-hidden />
            <span class="sr-only">{{ t("editPost") }}</span>
          </button>
          <button
            @click="report"
            v-if="post.u !== authStore.username && authStore.isLoggedIn"
          >
            <Flag class="h-5 w-5" heigh aria-hidden />
            <span class="sr-only">{{ t("reportPost") }}</span>
          </button>
          <button
            @click="
              emit('reply', postInfo.username, postInfo.content, post.post_id)
            "
            v-if="authStore.isLoggedIn"
          >
            <Reply class="h-5 w-5" heigh aria-hidden />
            <span class="sr-only">{{ t("replyPost") }}</span>
          </button>
        </div>
      </div>
      <div
        :class="`w-full text-sm italic opacity-40 sm:hidden ${
          !postInfo.italic ? 'inline-block w-auto' : ''
        }`"
        v-if="!reply && !postInfo.italic && !hideControls"
      >
        {{ formatDate(post.t.e) }}
        <span v-if="edited || post.edited_at">(edited)</span>
      </div>
      <div
        class="overflow-hidden"
        v-if="replyPost && typeof replyPost !== 'string' && !reply && !editing"
      >
        <RouterLink :to="`/posts/${replyPost.post_id}`">
          <Post :post="replyPost" reply />
        </RouterLink>
      </div>
      <form class="mt-2" v-if="editing" @submit="edit">
        <DynamicTextArea
          class="filled:border-background bordered:border-accent"
          v-model="editContent"
        />
        <div class="space-x-2">
          <button
            type="submit"
            class="rounded-xl px-2 py-1 filled:bg-background filled:text-text bordered:bg-accent bordered:text-accent-text"
          >
            {{ t("editPost") }}
          </button>
          <button
            class="rounded-xl px-2 py-1 filled:bg-background filled:text-text bordered:bg-accent bordered:text-accent-text"
            type="button"
            @click="editing = false"
          >
            {{ t("cancelEditingPost") }}
          </button>
        </div>
      </form>
      <div :class="editing ? 'hidden' : ''">
        <div
          :class="`${postInfo.italic ? 'italic' : ''} ${
            reply ? 'line-clamp-1 overflow-hidden' : 'overflow-y-auto'
          }`"
        >
          <Markdown
            :md="`${typeof replyPost === 'string' ? replyPost : ''}${
              postInfo.content
            }`"
            :inline="reply"
            :noImages="reply"
            :attachments="reply ? [] : post.attachments"
          />
        </div>
        <button
          class="mt-2 flex items-center gap-1 rounded-xl px-2 py-1 filled:bg-background filled:text-text bordered:bg-accent bordered:text-accent-text"
          v-if="
            postInfo.content.endsWith('\u200c') &&
            postInfo.username === admin &&
            !postInfo.bridged &&
            !reply
          "
          @click="reload"
        >
          <RotateCw class="inline-block h-5 w-5" aria-hidden />
          {{ t("reloadPostButton") }}
        </button>
      </div>
    </div>
  </div>
</template>
