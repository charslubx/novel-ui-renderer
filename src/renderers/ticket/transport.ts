import type { NovelUIRenderer } from "../../core/renderer-registry";
import { element } from "../../utils/dom";
import common from "../../styles/common.css?inline";
import styles from "../../styles/ticket.css?inline";

type TicketTheme = "blue" | "red" | "green" | "gold";
interface Place {
  code?: string;
  name: string;
}
export interface TransportTicketProps {
  operator: string;
  operatorCode?: string;
  theme?: TicketTheme;
  ticketNumber: string;
  passenger: string;
  origin: Place;
  destination: Place;
  date: string;
  departure: string;
  arrival?: string;
  serviceNumber: string;
  seat?: string;
  travelClass?: string;
  boardingTime?: string;
  gate?: string;
  platform?: string;
  pier?: string;
  terminal?: string;
  duration?: string;
}
const isPlace = (value: unknown): value is Place => {
  const p = value as Place;
  return (
    !!p &&
    typeof p.name === "string" &&
    (p.code === undefined || typeof p.code === "string")
  );
};
export function isTransportTicket(
  value: unknown,
): value is TransportTicketProps {
  const p = value as TransportTicketProps;
  return (
    !!p &&
    [
      p.operator,
      p.ticketNumber,
      p.passenger,
      p.date,
      p.departure,
      p.serviceNumber,
    ].every((x) => typeof x === "string") &&
    isPlace(p.origin) &&
    isPlace(p.destination) &&
    [
      p.operatorCode,
      p.arrival,
      p.seat,
      p.travelClass,
      p.boardingTime,
      p.gate,
      p.platform,
      p.pier,
      p.terminal,
      p.duration,
    ].every((x) => x === undefined || typeof x === "string") &&
    (p.theme === undefined ||
      ["blue", "red", "green", "gold"].includes(p.theme))
  );
}
function barcode(seed: string) {
  const root = element("div", "ticket__barcode");
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  for (let index = 0; index < 34; index++) {
    hash = (Math.imul(hash, 1664525) + 1013904223) >>> 0;
    const bar = element("span", "ticket__bar");
    bar.style.width = `${1 + (hash % 4)}px`;
    root.append(bar);
  }
  return root;
}
interface TicketLabels {
  kind: string;
  service: string;
  location: string;
  locationValue: (p: TransportTicketProps) => string | undefined;
  routeIcon: string;
}
function createTransportRenderer(
  variant: string,
  labels: TicketLabels,
): NovelUIRenderer<TransportTicketProps> {
  return {
    component: "ticket",
    variant,
    styles: common + styles,
    validate: isTransportTicket,
    render(props) {
      const sizeClass = variant === "flight" ? "ticket--wide" : "ticket--compact";
      const root = element(
        "article",
        `novel-ui ticket ticket--${variant} ${sizeClass} ticket--${props.theme ?? "blue"}`,
      );
      const header = element("header", "ticket__header"),
        brand = element("div");
      brand.append(
        element("div", "ticket__operator", props.operator),
        element("div", "ticket__operator-code", props.operatorCode ?? ""),
      );
      header.append(brand, element("div", "ticket__kind", labels.kind));
      const route = element("section", "ticket__route");
      for (const [place, side] of [
        [props.origin, "origin"],
        [props.destination, "destination"],
      ] as const) {
        const box = element("div", `ticket__place ticket__place--${side}`);
        box.append(
          element(
            "div",
            "ticket__code",
            place.code ?? place.name.slice(0, 3).toUpperCase(),
          ),
          element("div", "ticket__name", place.name),
        );
        if (side === "origin")
          route.append(
            box,
            element("div", "ticket__route-line", labels.routeIcon),
          );
        else route.append(box);
      }
      const details = element("section", "ticket__details");
      const fields:
        [[string, string | undefined]] | [string, string | undefined][] = [
        ["PASSENGER", props.passenger],
        ["DATE", props.date],
        ["DEPARTURE", props.departure],
        ["ARRIVAL", props.arrival],
        [labels.service, props.serviceNumber],
        ["CLASS", props.travelClass],
        ["SEAT", props.seat],
        ["BOARDING", props.boardingTime],
        [labels.location, labels.locationValue(props)],
        ["TERMINAL", props.terminal],
        ["DURATION", props.duration],
      ];
      fields
        .filter(([, value]) => value)
        .forEach(([label, value]) => {
          const field = element("div", "ticket__field");
          field.append(
            element("div", "ticket__label", label),
            element("div", "ticket__value", value),
          );
          details.append(field);
        });
      const footer = element("footer", "ticket__footer");
      footer.append(
        element("div", "ticket__number", `TICKET ${props.ticketNumber}`),
        barcode(props.ticketNumber),
      );
      root.append(
        header,
        route,
        details,
        footer,
        element("span", "ticket__notice", "FICTIONAL TRAVEL DOCUMENT"),
      );
      return root;
    },
  };
}
export const FlightTicketRenderer = createTransportRenderer("flight", {
  kind: "BOARDING PASS",
  service: "FLIGHT",
  location: "GATE",
  locationValue: (p) => p.gate,
  routeIcon: "✈",
});
export const FerryTicketRenderer = createTransportRenderer("ferry", {
  kind: "FERRY PASS",
  service: "VESSEL / VOYAGE",
  location: "PIER",
  locationValue: (p) => p.pier,
  routeIcon: "≈",
});
export const RailTicketRenderer = createTransportRenderer("rail", {
  kind: "RAIL TICKET",
  service: "TRAIN",
  location: "PLATFORM",
  locationValue: (p) => p.platform,
  routeIcon: "→",
});
export const BusTicketRenderer = createTransportRenderer("bus", {
  kind: "COACH TICKET",
  service: "SERVICE",
  location: "PLATFORM",
  locationValue: (p) => p.platform,
  routeIcon: "→",
});
