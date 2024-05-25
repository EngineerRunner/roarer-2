<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink, onBeforeRouteLeave } from "vue-router";
import EnterPost from "./EnterPost.vue";
import PostPopup from "./PostPopup.vue";
import OnlineList from "./OnlineList.vue";
import Post from "./Post.vue";
import { useCloudlinkStore } from "../stores/cloudlink";
import { useAuthStore } from "../stores/auth";
import { useDialogStore } from "../stores/dialog";
import { useRelationshipStore } from "../stores/relationship";
import { useSettingsStore } from "../stores/settings";
import { getResponseFromAPIRequest } from "../lib/api/request";
import { APIChat } from "../lib/schemas/chat";
import { postSchema, APIPost } from "../lib/schemas/post";
import { z } from "zod";

const { chat, inbox } = defineProps<{
  chat?: APIChat | "livechat";
  inbox?: boolean;
}>();

const cloudlinkStore = useCloudlinkStore();
const dialogStore = useDialogStore();
const authStore = useAuthStore();
const relationshipStore = useRelationshipStore();
const settingsStore = useSettingsStore();
const { t } = useI18n();

const POSTS_PER_REQUESTS = 25;
const requestURL =
  chat === "livechat"
    ? ""
    : chat
      ? `/posts/${chat._id}?autoget=1`
      : `/${inbox ? "inbox" : "home"}?autoget=1`;

const posts = ref<APIPost[]>([]);
const postComponents = ref<InstanceType<typeof Post>[] | null>(null);
const gotPosts = ref(false);
const newPostsAmount = ref(0);
const stopShowingLoadMore = ref(false);

const isChatOwner = computed(
  () => chat && chat !== "livechat" && chat.owner === authStore.username,
);
const showPosts = computed(() =>
  posts.value.filter(
    (post) =>
      !settingsStore.hideBlockedMentions ||
      ![...relationshipStore.blockedUsers].some((user) =>
        post.p.toLowerCase().includes(`@${user.toLowerCase()}`),
      ),
  ),
);

const postsSchema = z.object({
  autoget: postSchema.array(),
  pages: z.number(),
});
(async () => {
  if (chat !== "livechat") {
    const response = await getResponseFromAPIRequest(requestURL, {
      auth: true,
      schema: postsSchema,
    });
    if (response.error !== null) {
      await dialogStore.alert(t("getPostsFail", { status: response.error }));
      return;
    }
    posts.value = response.data.autoget;
    stopShowingLoadMore.value = response.data.pages === 1;
  } else {
    stopShowingLoadMore.value = true;
  }

  const newPostSchema = z.object({
    cmd: z.literal("direct"),
    val: postSchema.and(
      z.object({
        post_origin: z.literal(
          chat === "livechat" ? "livechat" : chat?._id ?? "home",
        ),
      }),
    ),
  });
  if (!inbox) {
    cloudlinkStore.lookFor(
      newPostSchema,
      ({ val: post }) => {
        newPost(post);
      },
      false,
    );
  }
  newPostsAmount.value = 25;
  gotPosts.value = true;
})();

const popupPost = ref<string | null>(null);
onBeforeRouteLeave((route) => {
  if (
    route.path.startsWith("/posts/") &&
    typeof route.params.post === "string"
  ) {
    const postComponent = postComponents.value?.find(
      (component) => component.$props.post.post_id === route.params.post,
    );
    if (postComponent) {
      postComponent.highlight();
    } else {
      popupPost.value = route.params.post;
    }
    return false;
  }
});

const newPost = (newPost: APIPost) => {
  posts.value.unshift(newPost);
  posts.value = posts.value;
  newPostsAmount.value++;
  if (!newPost.post_id.startsWith("_")) {
    const duplicateIndex = posts.value.findIndex(
      (post) => post.post_id.startsWith("_") && post.p === newPost.p,
    );
    if (duplicateIndex !== -1) {
      posts.value = posts.value
        .slice(0, duplicateIndex)
        .concat(posts.value.slice(duplicateIndex + 1));
      newPostsAmount.value--;
    }
  }
};

const handleOptimisic = (post: APIPost) => {
  newPost(post);
};

const handlePessmistic = (id: string) => {
  const index = posts.value.findIndex((post) => post.post_id === id);
  posts.value = posts.value
    .slice(0, index)
    .concat(posts.value.slice(index + 1));
  newPostsAmount.value--;
};

const enterPost = ref<InstanceType<typeof EnterPost> | null>(null);

const loadingMore = ref(false);
const loadMore = async () => {
  if (loadingMore.value) {
    return;
  }
  loadingMore.value = true;
  const page =
    newPostsAmount.value < 1
      ? 1
      : Math.floor(newPostsAmount.value / POSTS_PER_REQUESTS) + 1;
  const postsToRemove =
    newPostsAmount.value <= -25
      ? 0
      : newPostsAmount.value < 0
        ? POSTS_PER_REQUESTS + (newPostsAmount.value % POSTS_PER_REQUESTS)
        : newPostsAmount.value % POSTS_PER_REQUESTS;
  const response = await getResponseFromAPIRequest(
    requestURL + `&page=${page}`,
    {
      auth: true,
      schema: postsSchema,
    },
  );
  if (response.error !== null) {
    await dialogStore.alert(t("loadMoreFail", { status: response.error }));
    return;
  }
  const newPosts = response.data.autoget.slice(postsToRemove);
  posts.value.push(...newPosts);
  newPostsAmount.value += newPosts.length;
  loadingMore.value = false;
  stopShowingLoadMore.value = response.data.pages === page;
};
</script>

<template>
  <div class="flex items-center gap-2" v-if="chat">
    <h2 class="text-lg font-bold" v-if="chat">
      {{
        chat === "livechat"
          ? t("livechat")
          : chat.nickname ??
            (chat.owner
              ? t("namelessChat")
              : chat.members.find((user) => user !== authStore.username))
      }}
    </h2>
    <RouterLink to="/chats" class="text-link underline">
      {{ t("back") }}
    </RouterLink>
  </div>
  <OnlineList :chat="chat" v-if="!inbox && chat !== 'livechat'" />
  <EnterPost
    ref="enterPost"
    :chat="chat"
    @optimistic="handleOptimisic"
    @pessimistic="handlePessmistic"
    v-if="!inbox"
  />
  <Post
    :post="post"
    :key="post.post_id"
    :inbox="inbox"
    :isChatOwner="isChatOwner"
    :hideControls="chat === 'livechat'"
    @reply="enterPost?.reply"
    @delete="newPostsAmount--"
    ref="postComponents"
    v-for="post in showPosts"
  />
  <button
    type="button"
    class="w-full rounded-xl bg-accent py-1 text-accent-text"
    :disabled="loadingMore"
    @click="loadMore"
    v-if="!stopShowingLoadMore && gotPosts"
  >
    {{ loadingMore ? t("loadingMore") : t("loadMore") }}
  </button>
  <PostPopup
    :post="popupPost"
    :inbox="inbox"
    :isChatOwner="isChatOwner"
    @reply="
      (username, postContent, postId) => {
        enterPost?.reply(username, postContent, postId);
        popupPost = null;
      }
    "
    @delete="
      newPostsAmount--;
      popupPost = null;
    "
    @close="popupPost = null"
    v-if="popupPost"
  />
</template>
