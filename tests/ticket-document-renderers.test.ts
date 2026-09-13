import { describe, expect, it } from "vitest";
import {
  BusTicketRenderer,
  FerryTicketRenderer,
  FlightTicketRenderer,
  RailTicketRenderer,
} from "../src/renderers/ticket/transport";
import { IdentityCardRenderer } from "../src/renderers/document/identity-card";
import { WorkCardRenderer } from "../src/renderers/document/work-card";

const ticket = {
  operator: "Test Air",
  ticketNumber: "T-1",
  passenger: "TEST USER",
  origin: { code: "AAA", name: "Alpha" },
  destination: { code: "BBB", name: "Beta" },
  date: "2026-09-13",
  departure: "10:00",
  serviceNumber: "TA100",
};
describe("ticket and document renderers", () => {
  for (const renderer of [
    FlightTicketRenderer,
    FerryTicketRenderer,
    RailTicketRenderer,
    BusTicketRenderer,
  ])
    it(`renders ${renderer.variant}`, () => {
      expect(renderer.validate(ticket)).toBe(true);
      const result = renderer.render(ticket, { raw: "", debug: false });
      expect(result.querySelector(".ticket__barcode")).not.toBeNull();
      expect(result.classList.contains(`ticket--${renderer.variant}`)).toBe(true);
      expect(
        result.classList.contains(
          renderer.variant === "flight" ? "ticket--wide" : "ticket--compact",
        ),
      ).toBe(true);
    });
  it("uses a default silhouette on fictional identity cards", () => {
    const props = {
      country: "Fiction",
      fullName: "Name",
      idNumber: "ID-1",
      birthDate: "2000-01-01",
      validUntil: "2030-01-01",
    };
    expect(IdentityCardRenderer.validate(props)).toBe(true);
    expect(
      IdentityCardRenderer.render(props, {
        raw: "",
        debug: false,
      }).querySelector(".person-avatar"),
    ).not.toBeNull();
  });
  it("uses a default silhouette on work cards", () => {
    const props = {
      organization: "Company",
      fullName: "Name",
      title: "Pilot",
      employeeId: "E-1",
    };
    expect(WorkCardRenderer.validate(props)).toBe(true);
    expect(
      WorkCardRenderer.render(props, { raw: "", debug: false }).querySelector(
        ".person-avatar",
      ),
    ).not.toBeNull();
  });
});
