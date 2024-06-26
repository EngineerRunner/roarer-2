<script setup lang="ts">
import { ref } from "vue";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogRoot,
} from "radix-vue";
import { useI18n } from "vue-i18n";
import { useDialogStore } from "../stores/dialog";

const dialogStore = useDialogStore();
const { t } = useI18n();

const promptResponse = ref("");
</script>

<template>
  <DialogRoot :open="!!dialogStore.shownDialog" v-if="dialogStore.shownDialog">
    <DialogPortal>
      <DialogOverlay
        class="fixed left-0 top-0 h-full w-full bg-background opacity-40"
      />
      <div
        class="fixed left-0 top-0 flex h-full w-full items-center justify-center"
      >
        <DialogContent
          class="flex w-[min(calc(100ch-8rem),95%)] flex-col items-start gap-2 whitespace-normal break-words rounded-xl bg-accent px-2 py-2 text-accent-text"
        >
          <DialogTitle class="sr-only">
            {{ t(`dialogTitle_${dialogStore.shownDialog.type}`) }}
          </DialogTitle>
          <DialogDescription>
            {{ dialogStore.shownDialog.message }}
          </DialogDescription>
          <DialogClose
            class="rounded-xl bg-background px-2 py-1 text-text"
            @click="dialogStore.shownDialog.okClick()"
            v-if="
              dialogStore.shownDialog.type === 'alert' &&
              dialogStore.shownDialog.closable
            "
          >
            {{ t("okButton") }}
          </DialogClose>
          <div
            class="space-x-2"
            v-else-if="dialogStore.shownDialog.type === 'confirm'"
          >
            <DialogClose
              class="rounded-xl bg-background px-2 py-1 text-text"
              @click="dialogStore.shownDialog.yesClick()"
            >
              {{ t("yesButton") }}
            </DialogClose>
            <DialogClose
              class="rounded-xl bg-background px-2 py-1 text-text"
              @click="dialogStore.shownDialog.noClick()"
            >
              {{ t("noButton") }}
            </DialogClose>
          </div>
          <form
            class="contents"
            @submit="
              dialogStore.shownDialog.okClick(promptResponse);
              promptResponse = '';
            "
            v-else-if="dialogStore.shownDialog.type === 'prompt'"
          >
            <input
              :type="dialogStore.shownDialog.password ? 'password' : 'text'"
              class="w-full rounded-lg border-2 border-background bg-transparent px-2 py-1"
              v-model="promptResponse"
              :placeholder="dialogStore.shownDialog.placeholder"
            />
            <div class="space-x-2">
              <DialogClose
                type="submit"
                class="rounded-xl bg-background px-2 py-1 text-text"
              >
                {{ t("okButton") }}
              </DialogClose>
              <DialogClose
                class="rounded-xl bg-background px-2 py-1 text-text"
                @click="dialogStore.shownDialog.cancelClick()"
                type="button"
              >
                {{ t("cancelButton") }}
              </DialogClose>
            </div>
          </form>
        </DialogContent>
      </div>
    </DialogPortal>
  </DialogRoot>
</template>
