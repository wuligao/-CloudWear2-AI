import assert from "node:assert/strict";
import test from "node:test";
import * as h5Config from "../src/lib/h5-config.ts";

const h5ConfigModule = (
  "mergeH5ConfigOptions" in h5Config
    ? h5Config
    : (h5Config as unknown as { default: typeof h5Config }).default
) as typeof h5Config;
const {
  defaultH5OutfitConfigOptions,
  mergeH5ConfigOptions,
  normalizeTomorrowRecommendationStartHour,
} = h5ConfigModule;

test("mergeH5ConfigOptions reads tomorrow recommendation start hour from backend options", () => {
  const options = mergeH5ConfigOptions({
    tomorrowRecommendationStartHour: 22,
  });

  assert.equal(options.tomorrowRecommendationStartHour, 22);
});

test("mergeH5ConfigOptions defaults guest login on and preserves explicit disable", () => {
  assert.equal(defaultH5OutfitConfigOptions.login.guestEnabled, true);

  const options = mergeH5ConfigOptions({
    login: {
      guestEnabled: false,
    } as Partial<typeof defaultH5OutfitConfigOptions.login>,
  });

  assert.equal(options.login.guestEnabled, false);
  assert.equal(options.login.phonePasswordEnabled, true);
});

test("default H5 image model matches the enabled runtime image model", () => {
  assert.deepEqual(defaultH5OutfitConfigOptions.imageModels, [
    { label: "gpt-image-2", value: "gpt-image-2" },
  ]);
});

test("normalizeTomorrowRecommendationStartHour clamps invalid configured hours", () => {
  assert.equal(normalizeTomorrowRecommendationStartHour(-1), 0);
  assert.equal(normalizeTomorrowRecommendationStartHour(24), 23);
  assert.equal(
    normalizeTomorrowRecommendationStartHour("bad"),
    defaultH5OutfitConfigOptions.tomorrowRecommendationStartHour,
  );
});
