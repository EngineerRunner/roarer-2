export const DISCORD_REGEX = /<a?:([\w\*]+):(\d+)>/;

export const discordEmoji = [
  "<:zed:1208625071766114364>",
  "<:wow:952755842095132752>",
  "<:wiwwy:953882510167773184>",
  "<:whar:1143938761919570000>",
  "<:upvote:1010035340851023892>",
  "<:trol:1010322254065848361>",
  "<:this:1068710522561773719>",
  "<:thehorror:1158484835090833508>",
  "<:tehduck:1055226916409458808>",
  "<:sus:1199167654972375090>",
  "<:stretchcat:1210253516417798194>",
  "<:soon:932400780072349726>",
  "<:shakespeare:982709311702716457>",
  "<:sadmeow:954781179704393769>",
  "<:robotop:1148967341409976411>",
  "<:rehehehehehehe:1123971249442406521>",
  "<:ratestar:957320841538982018>",
  "<:quacker:959421966148857906>",
  "<:planktonpog:995896283833323520>",
  "<:pixelmeowy:1125502216090951840>",
  "<:mikeisgettingsickofyou:1143348848085962855>",
  "<:meowytroll:1111415513462079628>",
  "<:meowybutton:950192902708019200>",
  "<a:meowyspin:1008194132067483678>",
  "<a:meowyplanets:1008194354197831800>",
  "<a:meowyplanet:1008194232282009640>",
  "<:meowspin:1017901487810170940>",
  "<:mainispain:939326396977795113>",
  "<:madmeow:954780476067946638>",
  "<:happymeow:954779471330816040>",
  "<:halfstar:957320841241169991>",
  "<:gun:1015228426778578966>",
  "<:fortune:1210379302328078356>",
  "<:flipper:1011498926819520572>",
  "<:finalboss:954783074586095636>",
  "<a:duckyspeen:995024774348668968>",
  "<:ducky:1001974772051234950>",
  "<a:duckspinningcube:1152410546893770783>",
  "<:drunkmeow:1026159952038985829>",
  "<:drinkmilk:1151681105615929435>",
  "<:downvote:1010035793819091068>",
  "<:darkstar:957320841044045905>",
  "<:chainbrokerestartingnow:1149502765542953021>",
  "<a:caughtin4k:1102387987838402574>",
  "<:catlick:1180505322851414206>",
  "<:bred:959422100458844160>",
  "<:blank:1018231234553446411>",
  "<:aaaaaaaaaaa:1149352246572761120>",
  "<:acatonmeower:1021912187163394138>",
  "<:atticusaijkndemw:1212216821625917450>",
  "<:meowy2:1214405335666925568>",
  "<:wooftheheck:1217544930847625427>",
  "<:POWER:1215322815105077279>",
  "<:fubgingcloudlink:1224195287178936392>",
  "<:consume:1224195139082125322>",
  "<:meowyhadsomepepsi:1224195086951383113>",
  "<:yuhhuh:1227268820213698611>",
  "<:nuhhuh:1233290735999258664>",
].map((emoji) => {
  const match = emoji.match(DISCORD_REGEX);
  if (!match) {
    throw new Error(`${emoji} isn't discord emoji`);
  }
  const name = match[1];
  const id = match[2];
  if (!name || !id) {
    console.error("Name or ID of Discord emoji not defined", { name, id });
    throw new Error("Name or ID of Discord emoji not defined");
  }
  return { emoji, name, id, isGif: emoji.startsWith("<a") };
});

export type Emoji = (typeof discordEmoji)[number];

export const discordStickers = [
  {
    url: "https://uploads.meower.org/attachments/ayCczbR2YbdAU5tm0hc1PwEa/toasty.png",
    name: "toasty",
  },
  {
    url: "https://uploads.meower.org/attachments/JpFAWNuQZt2v8bMrSYIEWadd/holy.png",
    name: "holy",
  },
  {
    url: "https://uploads.meower.org/attachments/yizn1BdxYL863TqW8PxNK4Kt/wagoogus.png",
    name: "wagoogus",
  },
  {
    url: "https://uploads.meower.org/attachments/r1XZXoBEGILa1b9XzeyRTkE2/toasty-stare.png",
    name: "toasty stare",
  },
  {
    url: "https://uploads.meower.org/attachments/gGXEFRsbVcOwa72V6qmN8TwP/screwyou.png",
    name: "screwyou",
  },
] satisfies DiscordSticker[];

export type DiscordSticker = {
  url: string;
  name: string;
};
