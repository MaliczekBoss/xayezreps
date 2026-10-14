export type NoticeIcon = "copy" | "remove" | "truck" | "alert" | "undo" | "heart";

export type NoticeAction = {
  label: string;
  href?: string;
  external?: boolean;
  onClick?: () => void;
};

export type IslandNotice = {
  id: number;
  title: string;
  text?: string;
  image?: string;
  logo?: boolean;
  onDismiss?: () => void;
  icon?: NoticeIcon;
  tone?: "brand" | "success" | "neutral" | "warning";
  action?: NoticeAction;
  duration?: number;
};

type Listener = (notice: IslandNotice) => void;

const listeners = new Set<Listener>();
let counter = 0;

export function notify(notice: Omit<IslandNotice, "id">) {
  const full = { ...notice, id: ++counter };
  listeners.forEach((l) => l(full));
}

export function onNotify(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
