import { ref, watch } from "vue";
import { defineStore } from "pinia";
import { APIBan } from "../lib/schemas/ban";

const USERNAME_STORAGE = "roarer:username";
const TOKEN_STORAGE = "roarer:token";

export const useAuthStore = defineStore("auth", () => {
  const username = ref<string | null>(
    localStorage.getItem(USERNAME_STORAGE) ?? null,
  );
  const token = ref<string | null>(localStorage.getItem(TOKEN_STORAGE) ?? null);
  const ban = ref<APIBan | null>(null);
  const isLoggedIn = ref(false);

  watch([username, token], (n) => {
    const [u, t] = n;
    if (u === null) {
      localStorage.removeItem(USERNAME_STORAGE);
    } else {
      localStorage.setItem(USERNAME_STORAGE, u);
    }
    if (t === null) {
      localStorage.removeItem(TOKEN_STORAGE);
    } else {
      localStorage.setItem(TOKEN_STORAGE, t);
    }
  });

  return { username, token, isLoggedIn, ban };
});
