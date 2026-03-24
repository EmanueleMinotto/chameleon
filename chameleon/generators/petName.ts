import type { GeneratorContext } from "@chameleon/core";

/**
 * Custom generator: creates creative pet names by combining an adjective with an animal name.
 *
 * This file demonstrates the custom generator contract:
 * - Default export is a function
 * - Receives a GeneratorContext (with faker, schemaField, and optional request)
 * - Returns any value (here a string)
 *
 * Usage in annotations:
 *   "$.name":
 *     custom: "./chameleon/generators/petName.ts"
 */
export default function generatePetName({ faker }: GeneratorContext): string {
  const adjectives = [
    "Fluffy",
    "Mighty",
    "Tiny",
    "Grumpy",
    "Lazy",
    "Bouncy",
    "Sneaky",
    "Brave",
    "Gentle",
    "Fierce",
    "Sleepy",
    "Happy",
    "Silly",
    "Noble",
    "Swift",
  ];

  const animals = [
    faker.animal.dog(),
    faker.animal.cat(),
    faker.animal.rabbit(),
    faker.animal.bird(),
    faker.animal.fish(),
  ];

  const adjective = faker.helpers.arrayElement(adjectives);
  const animal = faker.helpers.arrayElement(animals);

  // Sometimes add a human first name for extra personality
  const withName = faker.datatype.boolean(0.3);
  if (withName) {
    return `${adjective} ${faker.person.firstName()}'s ${animal}`;
  }

  return `${adjective} ${animal}`;
}
