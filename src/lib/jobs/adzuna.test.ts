import { afterEach, describe, expect, it, vi } from "vitest";

import {
  adzunaCurrencyForCountry,
  getSalaryBand,
  getSalaryHistogram,
  parseSalaryHistogram,
  salaryBandFromHistogram,
} from "./adzuna";

/* ------------------------------------------------------------------ */
/* Fixture — the exact response shape from the official Adzuna docs    */
/* (developer.adzuna.com/docs/histogram, read 2026-11-20).             */
/* ------------------------------------------------------------------ */

const DOC_HISTOGRAM_RESPONSE = {
  __CLASS__: "Adzuna::API::Response::SalaryHistogram",
  histogram: {
    "10000": "31",
    "20000": "154",
    "30000": "69",
    "40000": "51",
    "50000": "42",
    "60000": "55",
    "70000": "69",
  },
};

describe("parseSalaryHistogram", () => {
  it("parses the documented response shape", () => {
    expect(parseSalaryHistogram(DOC_HISTOGRAM_RESPONSE)).toEqual({
      10000: 31,
      20000: 154,
      30000: 69,
      40000: 51,
      50000: 42,
      60000: 55,
      70000: 69,
    });
  });

  it("returns null for an unexpected shape instead of throwing", () => {
    expect(parseSalaryHistogram(null)).toBeNull();
    expect(parseSalaryHistogram({})).toBeNull();
    expect(parseSalaryHistogram({ histogram: "nope" })).toBeNull();
  });

  it("skips non-numeric buckets", () => {
    expect(
      parseSalaryHistogram({ histogram: { "20000": "10", junk: "x" } }),
    ).toEqual({ 20000: 10 });
  });
});

describe("salaryBandFromHistogram", () => {
  it("computes vacancy-weighted p25 / median / p75", () => {
    // 471 vacancies total. Cumulative: 31 @10000, 185 @20000, 254 @30000,
    // 305 @40000, 347 @50000, 402 @60000, 471 @70000.
    // p25 target 117.75 → bucket 20000. Median target 235.5 → bucket 30000.
    // p75 target 353.25 → bucket 60000 (347 at 50000 is not enough).
    const band = salaryBandFromHistogram(
      parseSalaryHistogram(DOC_HISTOGRAM_RESPONSE)!,
      "gb",
      "finance officer",
    );
    expect(band).toMatchObject({
      p25: 20000,
      median: 30000,
      p75: 60000,
      minBucket: 10000,
      maxBucket: 70000,
      totalVacancies: 471,
      currency: "GBP",
      country: "gb",
      query: "finance officer",
    });
  });

  it("returns null for an empty histogram — no data, no band", () => {
    expect(salaryBandFromHistogram({}, "gb", "x")).toBeNull();
    expect(
      salaryBandFromHistogram({ 20000: 0, 30000: 0 }, "gb", "x"),
    ).toBeNull();
  });

  it("handles unsorted keys (Adzuna does not guarantee key order)", () => {
    const band = salaryBandFromHistogram(
      { 50000: 10, 10000: 10, 30000: 10 },
      "us",
      "engineer",
    );
    expect(band).toMatchObject({
      p25: 10000,
      median: 30000,
      p75: 50000,
      minBucket: 10000,
      maxBucket: 50000,
      totalVacancies: 30,
      currency: "USD",
    });
  });
});

describe("adzunaCurrencyForCountry", () => {
  it("maps known countries and returns null for unknown ones", () => {
    expect(adzunaCurrencyForCountry("gb")).toBe("GBP");
    expect(adzunaCurrencyForCountry("US")).toBe("USD");
    expect(adzunaCurrencyForCountry("de")).toBe("EUR");
    expect(adzunaCurrencyForCountry("pk")).toBeNull();
  });
});

describe("getSalaryBand without credentials", () => {
  it("returns null — the caller keeps the stale dataset, nothing invented", async () => {
    await expect(getSalaryBand(null, "gb", "engineer")).resolves.toBeNull();
  });
});

describe("live client (mocked fetch — no network in tests)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches the histogram endpoint with app_id + app_key", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => DOC_HISTOGRAM_RESPONSE,
    });
    vi.stubGlobal("fetch", fetchMock);
    const { histogram } = await getSalaryHistogram(
      { appId: "id", appKey: "key" },
      "gb",
      "finance officer",
      "London",
    );
    expect(histogram).toEqual({
      10000: 31,
      20000: 154,
      30000: 69,
      40000: 51,
      50000: 42,
      60000: 55,
      70000: 69,
    });
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain(
      "https://api.adzuna.com/v1/api/jobs/gb/histogram",
    );
    expect(calledUrl).toContain("app_id=id");
    expect(calledUrl).toContain("app_key=key");
    expect(calledUrl).toContain("what=finance+officer");
    expect(calledUrl).toContain("location0=London");
  });

  it("returns a band with provenance when configured", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => DOC_HISTOGRAM_RESPONSE,
      }),
    );
    const result = await getSalaryBand(
      { appId: "id", appKey: "key" },
      "gb",
      "finance officer",
    );
    expect(result?.band?.median).toBe(30000);
    expect(result?.source).toMatch(/Adzuna/);
    expect(result?.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("throws on an HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({}),
      }),
    );
    await expect(
      getSalaryHistogram({ appId: "bad", appKey: "bad" }, "gb", "x"),
    ).rejects.toThrow(/HTTP 403/);
  });
});
