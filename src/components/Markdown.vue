<script setup lang="ts">
import { ref } from "vue";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";
import linkifyHtml from "linkify-html";
import "linkify-plugin-mention";
import markdownit from "markdown-it";
import Token from "markdown-it/lib/token";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { url as baseURL } from "../lib/env";
import { linkPills } from "../lib/linkPills";
import { hostWhitelist } from "../lib/hostWhitelist";
import { DISCORD_REGEX } from "../lib/discordEmoji";
import { APIAttachment } from "../lib/schemas/post";
import { useDialogStore } from "../stores/dialog";
import { useIdsStore } from "../stores/uniqueIds";
import { useSettingsStore } from "../stores/settings";
import { effect } from "vue";
// @ts-expect-error
import scratchblocks from "scratchblocks";

const { md, inline, noImages, attachments } = defineProps<{
  md: string;
  inline?: boolean;
  noImages?: boolean;
  attachments?: APIAttachment[];
}>();

const dialogStore = useDialogStore();
const settingsStore = useSettingsStore();
const { t } = useI18n();
const router = useRouter();

const ATTACHMENT_REGEX = /\[([^\]]+?): (?! )([^\]]+?)\]/;
const IMAGE_REGEX = new RegExp(
  ATTACHMENT_REGEX.source + "|" + DISCORD_REGEX.source,
  "g",
);

const id = useIdsStore().newMarkdownId();

const escapedMarkdown = md
  .replace(/(?:\s|\u200c)+$/, "")
  .replace(/&/g, "&amp;")
  // I'm sorry for including such a bad word in the Roarer source code, but it
  // needs to be censored.
  .replace(/s\x6bi\x62i\x64i/g, "****");

const markdown = markdownit({
  breaks: true,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(str, { language: lang }).value;
    }
    return "";
  },
});
const main = ref<HTMLDivElement | null>(null);

const tokens = inline
  ? markdown.parseInline(escapedMarkdown, {})
  : markdown.parse(escapedMarkdown, {});
const newTokens: Token[] = [];
tokens.forEach((token) => {
  if (token.type !== "inline" || !token.children) {
    newTokens.push(token);
    return;
  }
  const newChildren: Token[] = [];
  token.children.forEach((child) => {
    if (child.type !== "text") {
      newChildren.push(child);
      return;
    }
    const content = child.content;
    const images = [...content.matchAll(IMAGE_REGEX)];
    if (images.length === 0) {
      newChildren.push(child);
      return;
    }
    const newTextTokens: Token[] = [];
    const matches = images.map(
      (image) =>
        ({
          originalMatch: image,
          specificMatch:
            image[0].match(ATTACHMENT_REGEX) ??
            image[0].match(DISCORD_REGEX) ??
            (() => {
              throw new Error("this can't happen");
            })(),
        }) as const,
    );
    let previousIndex: number | null = null;
    matches.forEach(({ originalMatch, specificMatch }, i) => {
      const index = originalMatch.index;
      if (index === undefined) {
        return;
      }
      const beforeText = content
        .slice(previousIndex ?? 0, index)
        .replace(IMAGE_REGEX, "");
      previousIndex = index;
      const beforeTextToken = new Token("text", "", 0);
      beforeTextToken.content = beforeText;
      newTextTokens.push(beforeTextToken);
      const [fullMatch, alt, src] = specificMatch;
      if (!alt || !src) {
        console.error("alt or src are undefined", { alt, src });
        throw new Error("alt or src are undefined");
      }
      const imageToken = new Token("image", "", 0);
      imageToken.content = alt;
      imageToken.tag = "img";
      imageToken.attrs = [
        ["alt", ""],
        [
          "src",
          fullMatch.startsWith("<")
            ? `https://cdn.discordapp.com/emojis/${src}.${
                fullMatch.startsWith("<a") ? "gif" : "webp"
              }?size=24&quality=lossless`
            : src,
        ],
        ["data-original", fullMatch],
      ];
      const altTextToken = new Token("text", "", 0);
      altTextToken.content = alt;
      imageToken.children = [altTextToken];
      newTextTokens.push(imageToken);
      if (i === images.length - 1) {
        const afterText = content.slice(index + fullMatch.length);
        const afterTextToken = new Token("text", "", 0);
        afterTextToken.content = afterText;
        newTextTokens.push(afterTextToken);
      }
    });
    newChildren.push(...newTextTokens);
  });
  token.children = newChildren;
  newTokens.push(token);
});
const renderedMarkdown = markdown.renderer.render(tokens, markdown.options, {});
effect(() => {
  if (!main.value) {
    return;
  }
  const element = main.value;
  const virtualDocument = new DOMParser().parseFromString(
    renderedMarkdown,
    "text/html",
  );
  attachments?.forEach((attachment) => {
    const img = document.createElement("img");
    img.src = `https://uploads.meower.org/attachments/${attachment.id}/${attachment.filename}`;
    img.alt = attachment.filename;
    virtualDocument.body.appendChild(img);
  });
  virtualDocument.querySelectorAll("img").forEach((img) => {
    if (
      noImages ||
      (!settingsStore.anyImageHost &&
        !hostWhitelist.some((host) => img.src.startsWith(host)))
    ) {
      const span = document.createElement("span");
      span.textContent = img.dataset.original || `![${img.alt}](${img.src})`;
      img.replaceWith(span);
      return;
    }
    img.title ||= img.alt;
    if (
      img.dataset.attachment ||
      (img.dataset.original && !img.dataset.original.startsWith("<"))
    ) {
      const clonedImg = img.cloneNode();
      virtualDocument.body.append(clonedImg);
      img.remove();
    } else {
      img.classList.add("inline-block");
    }
  });
  // using the built in linkify feature of markdown-it would not allow the
  // above change for images
  element.innerHTML = linkifyHtml(virtualDocument.body.innerHTML, {
    formatHref: {
      mention: (href) => `${baseURL}#/users${href}`,
    },
    ignoreTags: ["code"],
  });
  [...element.querySelectorAll("img")].forEach((element) => {
    if (element.alt.startsWith("(sticker) ")) {
      element.alt = element.alt.replace("(sticker) ", "");
      element.classList.add("rounded-xl");
    }
  });
  element.querySelectorAll("a").forEach(async (el) => {
    let url: URL;
    try {
      url = new URL(el.href);
    } catch {
      return;
    }
    el.target = "_blank";
    el.addEventListener("click", (e) => {
      if ((url.origin + url.pathname).replace(/\/$/, "") === baseURL) {
        e.preventDefault();
        router.push(url.hash.slice(1));
      } else if (settingsStore.confirmExternalLinks) {
        e.preventDefault();
        (async () => {
          if (await dialogStore.confirm(t("externalSite", { link: el.href }))) {
            open(el.href);
          }
        })();
      }
    });

    const match = url.pathname.match(
      /^(?:\/[a-zA-Z\-]+)?\/view\/[a-z%0-9\-]+?(\d+)\/?$/,
    );
    if (!noImages && match && url.hostname === "tenor.com") {
      const id = match[1];
      if (!id) {
        throw new Error("RegExp didn't output ID");
      }
      const iframe = document.createElement("iframe");
      iframe.className = "tenor aspect-square h-96 [color-scheme:auto]";
      iframe.src = `https://tenor.com/embed/${id}`;
      element.append(iframe);
      el.remove();
      return;
    }

    if (
      el.href !== el.textContent &&
      url.href.replace(url.protocol + "//", "") !== el.textContent
    )
      return;

    const matchingLinks = linkPills.filter((link) =>
      typeof link.base === "string"
        ? link.base === url.hostname
        : link.base.test(url.hostname),
    );
    for (const link of matchingLinks) {
      const match = (
        url.pathname +
        (link.includeSearch ? url.search : "") +
        (link.includeHash ? url.hash : "")
      ).match(link.path);
      if (!match) continue;
      if (link.convertLink) {
        const newLink = link.convertLink(match);
        el.href = newLink;
        url = new URL(newLink);
      }
      el.className =
        "no-style filled:bg-background filled:text-text bordered:bg-accent bordered:text-accent-text rounded-lg px-2 gap-1 inline-flex items-center align-middle";
      const icon = document.createElement("img");
      icon.ariaLabel = link.name;
      icon.src =
        typeof link.icon === "string"
          ? link.icon
          : settingsStore.theme.roarer_colorScheme === "dark"
            ? link.icon.dark
            : link.icon.light;
      icon.className = "inline-block h-[1em]";
      icon.dataset.isImage = "";
      el.innerHTML = "";
      const text = document.createElement("span");
      text.className = "flex gap-1 flex-wrap items-center";
      el.append(icon, text);
      const show = await link.text?.(match);
      if (show) {
        if (typeof show === "string") {
          el.append(show);
        } else {
          show.forEach((part) => {
            if (typeof part === "string") {
              text.append(part);
            } else if ("sm" in part) {
              const span = document.createElement("span");
              span.className = "opacity-60 font-bold text-xs text-nowrap";
              span.textContent = part.sm;
              text.append(span);
            } else if ("code" in part) {
              const code = document.createElement("code");
              code.textContent = part.code;
              text.append(code);
            } else {
              part satisfies never;
            }
          });
        }
      } else {
        const show = match[1];
        if (!show) {
          console.warn(link, "didn't output anything to show");
          continue;
        }
        el.append(show);
      }
      break;
    }
  });
  element.querySelectorAll("code").forEach((element) => {
    if (element.parentElement!.tagName === "PRE") return;
    const match = element.textContent!.match(/^\(([a-z0-9]+)\) (.+)/);
    if (!match) return;
    const language = match[1];
    const rest = match[2];
    if (!language || !rest) return;
    if (
      language === "scratch" ||
      language === "scratch2" ||
      language === "scratch3"
    ) {
      element.classList.add(`inline-${language}`);
      element.textContent = rest;
      return;
    }
    if (!hljs.getLanguage(language)) return;
    element.innerHTML = hljs.highlight(rest, { language }).value;
  });
  [...element.querySelectorAll("img")].forEach(async (element) => {
    if (element.dataset.isImage !== undefined) {
      return;
    }
    let request;
    try {
      request = await fetch(element.src);
    } catch {
      return;
    }
    if (request.status !== 200) {
      return;
    }
    const contentType = request.headers.get("content-type")?.split(";")[0];
    if (!contentType) {
      return;
    }
    const isAudio = contentType.startsWith("audio/");
    const isVideo = contentType.startsWith("video/");
    if (isAudio || isVideo) {
      const newElement = document.createElement(isAudio ? "audio" : "video");
      newElement.src = element.src;
      newElement.controls = true;
      if (isVideo) {
        newElement.addEventListener("loadeddata", () => {
          const computedStyle = getComputedStyle(newElement);
          newElement.style.height = computedStyle.height;
          newElement.style.width = computedStyle.width;
        });
      }
      element.replaceWith(newElement);
      return;
    }
    if (contentType.startsWith("image/")) {
      return;
    }
    const downloadButton = document.createElement("button");
    downloadButton.className =
      "rounded-xl px-2 py-1 bordered:bg-accent bordered:text-accent-text filled:bg-background filled:text-text";
    const download = document.createElement("a");
    download.className = "no-style";
    download.textContent = t("download", {
      fileName: element.alt,
      contentType,
    });
    download.href = URL.createObjectURL(await request.blob());
    download.download = element.alt;
    downloadButton.append(download);
    element.replaceWith(downloadButton);
  });

  const SCRATCH_2 = {};
  const SCRATCH_3 = {
    style: "scratch3",
    scale: 0.675,
  };
  scratchblocks.renderMatching(
    `#${id} pre code.language-scratch`,
    settingsStore.useScratch2Blocks ? SCRATCH_2 : SCRATCH_3,
  );
  scratchblocks.renderMatching(`#${id} .inline-scratch`, {
    ...(settingsStore.useScratch2Blocks ? SCRATCH_2 : SCRATCH_3),
    inline: true,
  });
  scratchblocks.renderMatching(`#${id} pre code.language-scratch3`, SCRATCH_3);
  scratchblocks.renderMatching(`#${id} .inline-scratch3`, {
    ...SCRATCH_3,
    inline: true,
  });
  scratchblocks.renderMatching(`#${id} pre code.language-scratch2`, SCRATCH_2);
  scratchblocks.renderMatching(`#${id} .inline-scratch2`, {
    ...SCRATCH_2,
    inline: true,
  });
});
</script>

<template>
  <div class="style-prose max-h-96" :id="id" ref="main"></div>
</template>
