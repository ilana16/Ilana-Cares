import { beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  auth: vi.fn(),
  email: vi.fn(),
}));
vi.mock("./db", () => ({ getDb: mocks.getDb }));
vi.mock("./reviewAuth", () => ({ requireReviewAdmin: mocks.auth }));
vi.mock("./email", () => ({ sendReviewEmail: mocks.email }));
import { reviewsRouter } from "./reviews";
const values = vi.fn();
const where = vi.fn();
const select = vi.fn();
const update = vi.fn();
const del = vi.fn();
const db = { insert: () => ({ values }), select, update, delete: del };
const caller = reviewsRouter.createCaller({
  req: { ip: "127.0.0.1", socket: {} },
  res: {},
  user: null,
} as any);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getDb.mockResolvedValue(db);
  mocks.email.mockResolvedValue(true);
  mocks.auth.mockImplementation(async token => {
    if (token !== "verified") throw new Error("Forbidden");
  });
  values.mockResolvedValue([{ insertId: 42 }]);
  where.mockResolvedValue([]);
  update.mockReturnValue({ set: () => ({ where }) });
  del.mockReturnValue({ where });
});
describe("reviews workflow", () => {
  it("saves a public submission as pending and sends an email", async () => {
    await caller.submit({
      publicName: "Parent",
      email: "parent@example.com",
      rating: 5,
      comment: "Wonderful care",
      consent: true,
    });
    expect(values).toHaveBeenCalledWith({
      publicName: "Parent",
      email: "parent@example.com",
      rating: 5,
      comment: "Wonderful care",
      status: "pending",
    });
    expect(mocks.email).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42, publicName: "Parent", rating: 5 })
    );
    expect(mocks.email.mock.calls[0][0]).not.toHaveProperty("email");
    expect(update).toHaveBeenCalled();
  });
  it("keeps failed email delivery queued without losing the review", async () => {
    mocks.email.mockResolvedValue(false);
    await expect(
      caller.submit({
        publicName: "Parent",
        email: "parent@example.com",
        rating: 4,
        comment: "Good",
        consent: true,
      })
    ).resolves.toEqual({ success: true });
    expect(update).not.toHaveBeenCalled();
  });
  it("only exposes approved reviews and excludes internal fields", async () => {
    const filter = vi
      .fn()
      .mockReturnValue({ orderBy: () => Promise.resolve([]) });
    select.mockReturnValue({ from: () => ({ where: filter }) });
    await caller.list();
    expect(
      new MySqlDialect().sqlToQuery(filter.mock.calls[0][0]).params
    ).toEqual(["approved"]);
    expect(Object.keys(select.mock.calls[0][0])).not.toContain(
      "notificationSentAt"
    );
    expect(Object.keys(select.mock.calls[0][0])).not.toContain("status");
    expect(Object.keys(select.mock.calls[0][0])).not.toContain("email");
  });
  it.each([0, 6, 2.5])("rejects invalid rating %s", async rating => {
    await expect(
      caller.submit({
        publicName: "Parent",
        email: "parent@example.com",
        rating,
        comment: "Good",
        consent: true,
      })
    ).rejects.toBeDefined();
    expect(values).not.toHaveBeenCalled();
  });
  it("rejects missing publication consent and honeypot submissions", async () => {
    await expect(
      caller.submit({
        publicName: "Parent",
        email: "parent@example.com",
        rating: 5,
        comment: "Good",
        consent: false,
      } as any)
    ).rejects.toBeDefined();
    await expect(
      caller.submit({
        publicName: "Parent",
        email: "parent@example.com",
        rating: 5,
        comment: "Good",
        consent: true,
        website: "spam",
      })
    ).rejects.toBeDefined();
    expect(values).not.toHaveBeenCalled();
  });
  it.each([undefined, "invalid"])(
    "requires a valid private email: %s",
    async email => {
      await expect(
        caller.submit({
          publicName: "Parent",
          email,
          rating: 5,
          comment: "Good",
          consent: true,
        } as any)
      ).rejects.toBeDefined();
      expect(values).not.toHaveBeenCalled();
    }
  );
  it("blocks every admin endpoint before any database access", async () => {
    for (const call of [
      () => caller.adminList({ token: "fake" }),
      () => caller.moderate({ token: "fake", id: 1, status: "approved" }),
      () => caller.reply({ token: "fake", id: 1, reply: "Thanks" }),
      () => caller.remove({ token: "fake", id: 1 }),
    ])
      await expect(call()).rejects.toBeDefined();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
  it("allows verified admin moderation, replies and removal", async () => {
    await caller.moderate({ token: "verified", id: 1, status: "approved" });
    await caller.reply({ token: "verified", id: 1, reply: "Thank you" });
    await caller.remove({ token: "verified", id: 1 });
    expect(update).toHaveBeenCalledTimes(2);
    expect(del).toHaveBeenCalledTimes(1);
  });
});
