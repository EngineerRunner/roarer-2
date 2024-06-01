<script setup lang="ts">
import { effect, ref } from "vue";
import { Upload } from "lucide-vue-next";
import { z } from "zod";
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import DynamicTextArea from "../DynamicTextArea.vue";
import LanguageSwitcher from "../LanguageSwitcher.vue";
import ProfilePicture from "../ProfilePicture.vue";
import { profilePictures } from "../../assets/pfp";
import { apiRequest, getResponseFromAPIRequest } from "../../lib/api/request";
import { getRestrictions } from "../../lib/bitwise";
import { profileSchema } from "../../lib/schemas/profile";
import { upload } from "../../lib/upload";
import { useCloudlinkStore } from "../../stores/cloudlink";
import { useDialogStore } from "../../stores/dialog";
import { useAuthStore } from "../../stores/auth";
import { useSettingsStore } from "../../stores/settings";

const cloudlinkStore = useCloudlinkStore();
const dialogStore = useDialogStore();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const { t } = useI18n();

const quote = ref("");
const profilePicture = ref<number | string>(0);
const uploadedProfilePicture = ref<string | null>(null);
const hasUploadedProfilePicture = ref(false);
const pfpColor = ref("");
(async () => {
  const response = await getResponseFromAPIRequest(
    `/users/${authStore.username}`,
    {
      schema: profileSchema,
    },
  );
  if (response.error !== null) {
    await dialogStore.alert(
      t("profileInformationFail", { status: response.error }),
    );
    return;
  }
  quote.value = response.data.quote ?? "";
  profilePicture.value = response.data.pfp_data ?? 1;
  if (response.data.avatar) {
    profilePicture.value = response.data.avatar;
    uploadedProfilePicture.value = response.data.avatar;
  }
  pfpColor.value = "#" + response.data.avatar_color;
})();

const updateConfigSchema = z.object({
  mode: z.literal("update_config"),
  payload: z.object({
    quote: z.string().optional(),
    pfp_data: z.number().optional(),
  }),
});
cloudlinkStore.lookFor(
  z.object({
    cmd: z.literal("direct"),
    val: updateConfigSchema,
  }),
  (packet) => {
    quote.value = packet.val.payload.quote ?? quote.value;
    profilePicture.value = packet.val.payload.pfp_data ?? profilePicture.value;
  },
  false,
);

const me = async (e: Event) => {
  e.preventDefault();
  const response = await apiRequest("/me/config", {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({
      quote: quote.value,
      ...(typeof profilePicture.value === "string"
        ? hasUploadedProfilePicture.value
          ? {
              avatar: profilePicture.value,
              avatar_color: pfpColor.value.slice(1),
            }
          : {}
        : {
            pfp_data: profilePicture.value,
            avatar: "",
            avatar_color: "000000",
          }),
    }),
  });
  if (typeof profilePicture.value !== "string") {
    uploadedProfilePicture.value = null;
  }
  hasUploadedProfilePicture.value = false;
  if (response.status === 200) {
    await dialogStore.alert(t("configSuccess"));
  } else {
    await dialogStore.alert(t("configFail", { errmsg: response.status }));
  }
};

const pfpUpload = ref<HTMLInputElement | null>(null);
effect(() => {
  if (!pfpUpload.value) {
    return;
  }
  pfpUpload.value.addEventListener("change", async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    const result = await upload(file, "icons");
    if (result.error === "tooLarge") {
      alert(t("uploadTooLarge", { size: result.readableMaxSize }));
      return;
    }
    uploadedProfilePicture.value = result.image.id;
    profilePicture.value = result.image.id;
    hasUploadedProfilePicture.value = true;
  });
});

const changePassword = async () => {
  const newPassword = await dialogStore.prompt(
    t("newPassword"),
    t("newPasswordPlaceholder"),
    { password: true },
  );
  if (!newPassword) {
    return;
  }
  const oldPassword = await dialogStore.prompt(
    t("oldPassword"),
    t("oldPasswordPlaceholder"),
    { password: true },
  );
  if (!oldPassword) {
    return;
  }
  try {
    await cloudlinkStore.send(
      {
        cmd: "change_pswd",
        val: {
          old: oldPassword,
          new: newPassword,
        },
      },
      z.object({
        cmd: z.literal("statuscode"),
        val: z.literal("I:100 | OK"),
      }),
      false,
    );
  } catch (e) {
    await dialogStore.alert(t("passwordChangeFail", { errmsg: e }));
    return;
  }
  if (await dialogStore.confirm(t("alsoRevokeTokens"))) {
    revokeTokens();
  }
};

const revokeTokens = async () => {
  if (!(await dialogStore.confirm(t("revokeTokensConfirm")))) {
    return;
  }
  try {
    await cloudlinkStore.send(
      {
        cmd: "del_tokens",
        val: {},
      },
      z.literal("I:024 | Logged out"),
    );
  } catch (e) {
    await dialogStore.alert(t("revokeTokensFail", { errmsg: e }));
    return;
  }
  authStore.username = null;
  authStore.token = null;
  location.reload();
};

const deleteAccount = async () => {
  if (!(await dialogStore.confirm(t("deleteAccountConfirm")))) {
    return;
  }
  const password = await dialogStore.prompt(
    t("deleteAccountPasswordPrompt"),
    t("deleteAccountPasswordPlaceholder"),
    { password: true },
  );
  if (!password) {
    return;
  }
  try {
    await cloudlinkStore.send(
      {
        cmd: "del_account",
        val: password,
      },
      z.literal("I:024 | Logged out"),
    );
  } catch (e) {
    await dialogStore.alert(t("deleteAccountFail", { errmsg: e }));
    return;
  }
  authStore.username = null;
  authStore.token = null;
  location.reload();
};

const KONAMI =
  "ArrowUp,ArrowUp,ArrowDown,ArrowDown,ArrowLeft,ArrowRight,ArrowLeft,ArrowRight,b,a";
const enteredKonami = ref(false);
let enteredKeys: string[] = [];
addEventListener("keydown", (e) => {
  enteredKeys.push(e.key);
  if (enteredKeys.toString().includes(KONAMI)) {
    enteredKonami.value = true;
    settingsStore.isJoker = true;
    enteredKeys = [];
  }
});
</script>

<template>
  <div class="flex flex-col gap-2" v-if="enteredKonami">
    <h2 class="text-xl font-bold">{{ t("hi") }}</h2>
    <label class="flex items-baseline gap-2">
      <input type="checkbox" v-model="settingsStore.isJoker" />
      <div>
        {{ t("settingJoker") }}
      </div>
    </label>
  </div>
  <div class="flex flex-col gap-2" v-else>
    <template v-if="authStore.isLoggedIn">
      <div class="flex items-baseline gap-2">
        <h2 class="inline-block text-lg font-bold">
          {{ t("usersSectionMe") }}
        </h2>
        <RouterLink to="/settings/reportHistory" class="text-link underline">
          {{ t("reportHistory") }}
        </RouterLink>
      </div>
      <div
        class="text-center italic"
        v-if="
          authStore.ban &&
          getRestrictions(authStore.ban.restrictions).has('editingProfile')
        "
      >
        {{ t("editingProfileRestriction") }}
      </div>
      <form class="contents" @submit="me" v-else>
        <label class="flex gap-2">
          {{ t("usersMeQuote") }}
          <DynamicTextArea class="border-accent" v-model="quote" />
        </label>
        <div class="space-x-2" v-if="uploadedProfilePicture">
          {{ t("usersMePfpColor") }}
          <label class="inline-flex items-center gap-1">
            <input
              type="radio"
              name="pfpColor"
              value="color"
              :checked="pfpColor !== '#!color'"
              @input="
                if (pfpColor === '#!color') {
                  pfpColor = '#000';
                }
              "
            />
            <input type="color" v-model="pfpColor" class="bg-transparent" />
          </label>
          <label class="inline-flex items-center gap-1">
            <input
              type="radio"
              name="pfpColor"
              value="#000000"
              :checked="pfpColor === '#!color'"
              @input="pfpColor = '#!color'"
            />
            {{ t("usersMePfpColorNo") }}
          </label>
        </div>
        <label>
          {{ t("usersMePfp") }}
          <div class="flex flex-wrap gap-2">
            <button
              class="box-content flex items-center justify-center rounded-xl bg-accent p-2"
              type="button"
              :title="t('uploadProfilePicture')"
              @click="pfpUpload?.click()"
            >
              <Upload class="h-16 w-16" />
              <input
                type="file"
                class="hidden"
                accept="image/png, image/jpeg, image/webp, image/gif"
                ref="pfpUpload"
              />
            </button>
            <button
              class="rounded-xl bg-accent p-2 aria-selected:outline aria-selected:outline-2 aria-selected:outline-green-500"
              :aria-selected="profilePicture === uploadedProfilePicture"
              type="button"
              :title="t('uploadedPfp')"
              @click="profilePicture = uploadedProfilePicture!"
              v-if="uploadedProfilePicture"
            >
              <ProfilePicture
                class="h-16 w-16"
                :pfp="{ avatar: uploadedProfilePicture, bg: pfpColor }"
              />
            </button>
            <button
              class="rounded-xl bg-accent p-2 aria-selected:outline aria-selected:outline-2 aria-selected:outline-green-500"
              :aria-selected="profilePicture === key"
              type="button"
              :title="`Profile picture #${key}`"
              @click="profilePicture = key"
              v-for="[key] of profilePictures"
            >
              <ProfilePicture class="h-16 w-16" :pfp="{ pfp: key }" />
            </button>
          </div>
        </label>
        <button
          class="rounded-xl bg-accent px-2 py-1 text-accent-text"
          type="submit"
        >
          {{ t("updateProfile") }}
        </button>
      </form>
    </template>
    <h2 class="text-lg font-bold">{{ t("roarer") }}</h2>
    <label class="flex items-baseline gap-2">
      <input type="checkbox" v-model="settingsStore.anyImageHost" />
      <div>
        {{ t("settingAnyImageHost") }}
        <p>
          <strong>{{ t("settingAnyImageHostWarn") }}</strong>
        </p>
      </div>
    </label>
    <label class="flex items-baseline gap-2" v-if="authStore.isLoggedIn">
      <input type="checkbox" v-model="settingsStore.enterSends" />
      <div>
        {{ t("settingEnterSends") }}
      </div>
    </label>
    <label class="flex items-baseline gap-2" v-if="authStore.isLoggedIn">
      <input type="checkbox" v-model="settingsStore.hideBlockedMentions" />
      <div>
        {{ t("settingHideBlockedMentions") }}
      </div>
    </label>
    <label class="flex items-baseline gap-2">
      <input type="checkbox" v-model="settingsStore.useScratch2Blocks" />
      <div>
        {{ t("settingUseScratch2Blocks") }}
      </div>
    </label>
    <label class="flex items-baseline gap-2">
      <input type="checkbox" v-model="settingsStore.showPfps" />
      <div>
        {{ t("settingShowPfps") }}
      </div>
    </label>
    <label class="flex items-baseline gap-2">
      <input type="checkbox" v-model="settingsStore.confirmExternalLinks" />
      <div>
        {{ t("settingConfirmExternalLinks") }}
      </div>
    </label>
    <div>
      <button
        type="button"
        class="justify-start rounded-xl bg-accent px-2 py-1 text-accent-text"
      >
        <RouterLink to="/settings/theme">
          {{ t("themeSettings") }}
        </RouterLink>
      </button>
    </div>
    <template v-if="authStore.isLoggedIn">
      <h2 class="text-lg font-bold">{{ t("myAccount") }}</h2>
      <div>
        <button
          class="rounded-xl bg-accent px-2 py-1 text-accent-text"
          @click="changePassword"
        >
          {{ t("changePassword") }}
        </button>
      </div>
      <div>
        <button
          class="rounded-xl bg-accent px-2 py-1 text-accent-text"
          @click="revokeTokens"
        >
          {{ t("revokeTokens") }}
        </button>
        {{ t("revokeTokensInfo") }}
      </div>
      <div>
        <button
          class="rounded-xl bg-accent px-2 py-1 text-accent-text"
          @click="deleteAccount"
        >
          {{ t("deleteAccount") }}
        </button>
        {{ t("deleteAccountInfo") }}
      </div>
    </template>
    <h2 class="text-lg font-bold">{{ t("language") }}</h2>
    <LanguageSwitcher />
    <p>
      {{ t("languageContributing.start")
      }}<a
        href="https://github.com/engineerrunner/roarer-2/tree/main/src/i18n"
        class="text-link underline"
        >{{ t("languageContributing.githubLink") }}</a
      >{{ t("languageContributing.end") }}
    </p>
    <h2 class="text-lg font-bold">{{ t("credits") }}</h2>
    <p>
      {{ t("contributorsThanks.start")
      }}<a
        href="https://github.com/EngineerRunner/roarer-2?tab=readme-ov-file#contributors"
        class="text-link underline"
        >{{ t("contributorsThanks.contributorsLink") }}</a
      >{{ t("contributorsThanks.end") }}
    </p>
    <p>
      {{ t("mascotThanks.start")
      }}<RouterLink class="text-link underline" to="/users/Supernoodles99">
        @Supernoodles99</RouterLink
      >{{ t("mascotThanks.end") }}
    </p>
    <p>
      {{ t("notoColorEmoji") }}
    </p>
  </div>
</template>
