import type { OutfitPlan } from '../types/outfit'

export function buildPhotoStyleGuidePrompt(plan: OutfitPlan) {
  const itemList = plan.items
    .map(
      (item) =>
        `${item.category}: ${item.name}, ${item.color}, ${item.material}, ${item.reason}`
    )
    .join('; ')
  const styleText = plan.styleTags.join(', ')

  return [
    'Create a polished vertical fashion style guide poster, not a simple portrait edit.',
    'Use the uploaded person as the main character and identity reference for the poster.',
    'Preserve recognizable face, hair, and overall presence, but you may change pose, framing, and background to fit the poster composition.',
    "Respect the uploaded person's apparent gender presentation and do not feminize or masculinize them unless explicitly requested in the fashion image direction.",
    'Design the final image like a premium summer outfit guide board with a clean editorial layout.',
    'Include a full-body hero portrait, a secondary half-body portrait, an outfit recommendation cards section, a color palette section, a fabric recommendation section, and a styling tips section.',
    'Use card-based visual grouping, soft blue and white summer tones, airy spacing, fashion magazine polish, subtle icons, and realistic clothing textures.',
    'Tiny decorative labels are allowed, but prioritize clear visual sections over dense text rendering.',
    `Poster title theme: ${plan.outfitTitle}.`,
    `Overall styling summary: ${plan.summary}.`,
    `Style tags: ${styleText}.`,
    `Temperature guidance: ${plan.temperatureAdvice}.`,
    `Occasion guidance: ${plan.occasionReason}.`,
    `Recommended outfit pieces: ${itemList}.`,
    `Fashion image direction: ${plan.imagePrompt}.`,
    'The guide should feel like a complete wearable styling reference image for the same person.',
    'No logo, no watermark, no unrelated collage elements.',
  ].join(' ')
}
