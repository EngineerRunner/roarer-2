<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { ChevronDown } from "lucide-vue-next";
import {
  DropdownMenuRoot,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "radix-vue";
import { RouterLink } from "vue-router";
import Login from "./Login.vue";
import { tabs } from "../lib/tabs";
import { useCloudlinkStore } from "../stores/cloudlink";
import { useIsDevStore } from "../stores/isDev";
import { useSettingsStore } from "../stores/settings";

const { t } = useI18n();
const route = useRoute();

const cloudlinkStore = useCloudlinkStore();
const isDevStore = useIsDevStore();
const settingsStore = useSettingsStore();
</script>

<template>
  <div>
    <div class="mb-2 flex flex-col items-center gap-1">
      <div class="flex flex-wrap items-center gap-x-4">
        <h1 class="text-3xl font-bold">
          <template v-if="settingsStore.isJoker">R🤡arer 2: Electric B🤡🤡gal🤡🤡</template>
          <template v-else>{{ t("roarer") }}</template>
        </h1>
        <Login />
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <RouterLink
          :class="`flex whitespace-nowrap text-link underline ${
            route.meta.tab === tab.name ? 'font-bold' : ''
          }`"
          :to="tab.to"
          v-for="tab in tabs"
        >
          {{ t(tab.name) }}
        </RouterLink>
        <DropdownMenuRoot>
          <DropdownMenuTrigger>
            <span
              class="flex items-center whitespace-nowrap text-link underline"
            >
              {{ t("routeRelated") }}
              <ChevronDown class="h-5 w-5" />
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent
              class="ml-2 mt-0.5 rounded-xl bg-accent px-2 py-1 text-accent-text shadow-lg"
            >
              <DropdownMenuItem>
                <a
                  class="flex whitespace-nowrap text-link underline"
                  href="https://github.com/engineerrunner/roarer-2"
                  target="_blank"
                >
                  {{ t("linkGithub") }}
                </a>
                <RouterLink
                  class="flex whitespace-nowrap text-link underline"
                  to="/syntax"
                >
                  {{ t("routeSyntax") }}
                </RouterLink>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenuRoot>
      </div>
      <p v-if="isDevStore.isDev">
        {{ t("inDevelopmentMode") }}
        <a
          href="https://github.com/meower-media-co/Meower-Server/tree/main"
          class="text-link underline"
          target="_blank"
          >Meower Server</a
        >
        -
        <a
          href="https://github.com/meower-media-co/Meower-Svelte/tree/master"
          class="text-link underline"
          target="_blank"
          >Meower Svelte</a
        >
        -
        <button
          class="rounded-xl bg-accent px-2 py-1 text-accent-text"
          @click="cloudlinkStore.cloudlink.disconnect()"
        >
          {{ t("devDisconnect") }}
        </button>
      </p>
    </div>
  </div>
</template>
