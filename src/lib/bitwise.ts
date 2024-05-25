const getBitwise = <TPerms extends readonly string[]>(
  number: number,
  perms: TPerms,
): Set<TPerms[number]> => {
  return new Set(perms.filter((_, index) => number & (1 << index)));
};

export const getPermissions = (permissionSet: number) => {
  return getBitwise(permissionSet, permissions);
};
export type Permission = (typeof permissions)[number];
export const permissions = [
  "permSysadmin",
  "permViewReports",
  "permEditReports",
  "permViewNotes",
  "permEditNotes",
  "permViewPosts",
  "permDeletePosts",
  "permViewAlts",
  "permSendAlerts",
  "permKickUsers",
  "permClearUserQuotes",
  "permViewBanStates",
  "permEditBanStates",
  "permDeleteUsers",
  "permViewIPs",
  "permBlockIPs",
  "permViewChats",
  "permEditChats",
  "permSendAnnouncements",
] as const;

export const getRestrictions = (restrictionSet: number) => {
  return getBitwise(restrictionSet, restrictions);
};
export type Restriction = (typeof permissions)[number];
export const restrictions = [
  "homePosts",
  "chatPosts",
  "newChats",
  "editingChatDetails",
  "editingProfile",
] as const;
