import assert from "node:assert/strict";
import test from "node:test";
import {
  authRouteHash,
  resolveAuthRoute,
} from "../features/auth/authNavigation";
import { createLongPress, type PressClock } from "../utils/longPress";
import { classOpeningLabel, latestClassOpening } from "../utils/classOpening";
import { assertValidClasses } from "../api/_lib/validate";
import * as typography from "../constants/typography";
import {
  applyRegistrationSetup,
  registrationSetupFromDraft,
  type RegistrationDraft,
} from "../features/auth/registrationSetup";
import { CLASS_LEVELS_BY_CYCLE, classLevelGroupsForCycle } from "../constants";
import { switchAccountWorkspace } from "../utils/accountWorkspace";

test("dernière ouverture : une ancienne synchronisation ne fait pas reculer la date", () => {
  assert.equal(
    latestClassOpening("2026-08-30T08:00:00Z", "2026-08-31T08:00:00Z"),
    "2026-08-31T08:00:00.000Z",
  );
  assert.equal(latestClassOpening(undefined, "bad"), undefined);
});
test("API : conserve la date valide et ignore une valeur invalide", () => {
  const item = {
    id: "class-a",
    name: "1AC 1",
    subject: "Mathématiques",
    lastOpenedAt: "2026-08-31T08:00:00Z",
  };
  assert.equal(
    Reflect.get(assertValidClasses([item])[0], "lastOpenedAt"),
    "2026-08-31T08:00:00.000Z",
  );
  assert.equal(
    Reflect.get(
      assertValidClasses([{ ...item, lastOpenedAt: "bad" }])[0],
      "lastOpenedAt",
    ),
    undefined,
  );
});

test("nouveau visiteur : entrée principale et inscription après préparation", () => {
  assert.deepEqual(resolveAuthRoute("", false), {
    view: "landing",
    mode: "login",
  });
  assert.equal(resolveAuthRoute("#register", false).view, "onboarding");
  assert.equal(resolveAuthRoute("#register", true).view, "auth");
  assert.equal(resolveAuthRoute("#start", false).view, "onboarding");
  assert.equal(authRouteHash("onboarding", "register"), "#start");
});
test("connexion directe conservée ; ancien lien preview encore reconnu", () => {
  assert.deepEqual(resolveAuthRoute("", false, true), {
    view: "auth",
    mode: "login",
  });
  assert.deepEqual(resolveAuthRoute("#login", true), {
    view: "auth",
    mode: "login",
  });
  assert.equal(resolveAuthRoute("#preview", false).view, "onboarding");
  assert.equal(resolveAuthRoute("#onboarding", false).view, "onboarding");
  assert.equal(resolveAuthRoute("#landing", false, true).view, "landing");
});
const point = {
  pointerId: 1,
  pointerType: "touch",
  clientX: 20,
  clientY: 20,
  isPrimary: true,
  button: 0,
};
const draft: RegistrationDraft = {
  cycle: "college",
  levelGroup: "",
  level: CLASS_LEVELS_BY_CYCLE.college[0],
  subject: "Mathématiques",
  group: "3",
};
test("inscription : groupe arabe normalisé et préparation marquée terminée", () => {
  const value = registrationSetupFromDraft({ ...draft, group: "٣" }, "ar");
  assert.ok(value);
  assert.equal(value.className, `${draft.level} 3`);
  assert.equal(value.preparationCompleted, true);
  assert.equal(value.applicationLocale, "ar");
});
test("inscription : zéro, groupe vide et parcours incomplet sont refusés", () => {
  for (const patch of [
    { group: "0" },
    { group: "" },
    { group: "100" },
    { cycle: "" as const },
    { level: "" },
    { subject: "" },
  ]) {
    assert.equal(
      registrationSetupFromDraft({ ...draft, ...patch }, "fr"),
      null,
    );
  }
});
test("inscription : changement de cycle ne conserve pas un niveau incompatible", () => {
  assert.equal(
    registrationSetupFromDraft({ ...draft, cycle: "lycee" }, "fr"),
    null,
  );
  const branch = classLevelGroupsForCycle("lycee")[0];
  assert.ok(
    registrationSetupFromDraft(
      {
        ...draft,
        cycle: "lycee",
        levelGroup: branch.key,
        level: branch.levels[0],
      },
      "fr",
    ),
  );
});
test("inscription : matières invalides et niveaux inventés sont refusés", () => {
  assert.equal(
    registrationSetupFromDraft({ ...draft, subject: "__invalid__" }, "fr"),
    null,
  );
  assert.equal(
    registrationSetupFromDraft({ ...draft, level: "__invalid__" }, "fr"),
    null,
  );
});
function gesture() {
  let pending: (() => void) | null = null;
  let holds = 0;
  const clock: PressClock = {
    start: (callback) => {
      pending = callback;
      return 1;
    },
    stop: () => {
      pending = null;
    },
  };
  const press = createLongPress(() => holds++, clock);
  return {
    press,
    fire: () => {
      const action = pending;
      pending = null;
      action?.();
    },
    holds: () => holds,
    pending: () => Boolean(pending),
  };
}
test("appui prolongé : paramètres une fois et clic suivant supprimé", () => {
  const g = gesture();
  g.press.start(point);
  g.fire();
  g.press.end();
  assert.equal(g.holds(), 1);
  assert.equal(g.press.consumeClick(), true);
  assert.equal(g.press.consumeClick(), false);
});
test("toucher simple ouvre le cahier sans ouvrir les paramètres", () => {
  const g = gesture();
  g.press.start(point);
  g.press.end();
  g.fire();
  assert.equal(g.holds(), 0);
  assert.equal(g.press.consumeClick(), false);
});
test("défilement, annulation et multi-touch ne déclenchent pas de paramètres", () => {
  for (const cancel of [
    (g: ReturnType<typeof gesture>) => g.press.move({ ...point, clientY: 40 }),
    (g: ReturnType<typeof gesture>) => g.press.cancel(),
    (g: ReturnType<typeof gesture>) =>
      g.press.start({ ...point, isPrimary: false }),
  ]) {
    const g = gesture();
    g.press.start(point);
    cancel(g);
    g.fire();
    assert.equal(g.holds(), 0);
    assert.equal(g.pending(), false);
  }
});
test("souris inchangée ; stylet reconnu ; démontage nettoie la minuterie", () => {
  const g = gesture();
  g.press.start({ ...point, pointerType: "mouse" });
  g.fire();
  assert.equal(g.holds(), 0);
  g.press.start({ ...point, pointerType: "pen" });
  g.fire();
  assert.equal(g.holds(), 1);
  g.press.start(point);
  g.press.dispose();
  g.fire();
  assert.equal(g.holds(), 1);
});
test("menu contextuel natif après appui : pas de double ouverture", () => {
  const g = gesture();
  g.press.start(point);
  g.fire();
  g.press.context();
  assert.equal(g.holds(), 1);
  g.press.start(point);
  g.press.context();
  g.fire();
  assert.equal(g.holds(), 2);
});
test("date réelle, état jamais ouvert et invalides sans date inventée", () => {
  assert.match(classOpeningLabel(undefined, "fr"), /première séance/);
  assert.equal(classOpeningLabel("bad", "ar"), "جاهز لأول حصة");
  assert.match(
    classOpeningLabel("2026-08-31T09:30:00.000Z", "fr"),
    /Dernière ouverture/,
  );
  assert.match(classOpeningLabel("2026-08-31T09:30:00.000Z", "ar"), /آخر فتح/);
});
test("Lateef par défaut ; choix explicite IBM conservé", () => {
  assert.equal(Reflect.get(typography, "DEFAULT_ARABIC_FONT"), "lateef");
  assert.equal(typography.getArabicFontFamily(), "'Lateef', serif");
  assert.equal(
    typography.getArabicFontFamily("ibm-plex"),
    "'IBM Plex Sans Arabic', sans-serif",
  );
});
test("préparation terminée : cahier et checklist, pas de deuxième onboarding", () => {
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return values.size;
    },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
    clear: () => values.clear(),
  };
  switchAccountWorkspace("0600000001", { storage });
  const id = applyRegistrationSetup(
    {
      cycle: "college",
      className: "1AC 1",
      subject: "Mathématiques",
      applicationLocale: "ar",
      firstTitle: "الدوال",
      preparationCompleted: true,
    },
    "0600000001",
    storage,
  );
  assert.ok(id);
  const config = JSON.parse(storage.getItem("appConfig_v1")!);
  assert.equal(config.hasCompletedWelcome, true);
  assert.equal(config.showGettingStarted, true);
  assert.equal(
    JSON.parse(storage.getItem("classData_v1_" + id)!).lessonsData[0].title,
    "الدوال",
  );
});
