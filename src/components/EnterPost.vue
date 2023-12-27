<script setup lang="ts">
import { ref } from "vue";
import { z } from "zod";
import { postSchema } from "../lib/postSchema";
import { useCloudlinkStore } from "../stores/cloudlink";
import { useLoginStatusStore } from "../stores/loginStatus";

const cloudlinkStore = useCloudlinkStore();
const loginStatusStore = useLoginStatusStore();

const postContent = ref("");
const errorMessage = ref("");

const post = async (e: Event) => {
  e.preventDefault();
  const username = loginStatusStore.username;
  if (username === null) {
    throw new Error("Not logged in");
  }
  try {
    await cloudlinkStore.send(
      {
        cmd: "post_home",
        val: postContent.value,
      },
      postSchema.and(z.object({ u: z.literal(username) })),
    );
  } catch (e) {
    errorMessage.value = e as string;
  }
  postContent.value = "";
};
</script>

<template>
  <form v-on:submit="post" class="flex space-x-2">
    <input
      class="rounded-lg bg-slate-800 px-2"
      placeholder="Say something!"
      v-model="postContent"
    />
    <button type="submit" class="rounded-xl bg-slate-800 px-2 py-1">
      Send!
    </button>
  </form>
  <p v-if="errorMessage">{{ errorMessage }}</p>
</template>