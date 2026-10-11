// Powiadomienia wyświetlane w dynamicznej wyspie w nagłówku.

export type NoticeIcon = "copy" | "remove" | "truck" | "alert" | "undo";

export type NoticeAction = { label: string; href?: string; onClick?: () => void };

export type IslandNotice = {
  id: number;
  title: string;
  text?: string;
  /** Miniatura produktu; bez niej wyspa pokazuje ikonę */
  image?: string;
  icon?: NoticeIcon;
  tone?: "brand" | "success" | "neutral" | "warning";
  action?: NoticeAction;
  /** Jak długo wyspa zostaje rozwinięta, w milisekundach */
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
