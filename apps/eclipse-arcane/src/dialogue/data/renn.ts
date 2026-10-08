/**
 * Captain Renn — Emberwood Guard.
 *
 * Implements Section 1.4 of "Emberwood Village — Dialogue Scripts & Side Quests"
 * line for line. State selection follows the document's rules:
 *
 *   quest_main_complete (highest) → quest_main_active → quest_available → default
 *
 * The main quest "The Forgotten Flame" is not implemented yet, so the quest
 * flags start at `not_started` and Renn opens in `default`. Finishing the
 * opening conversation posts the quest to the board (flag → `available`), which
 * naturally moves him to `quest_available`; `active` / `complete` are driven by
 * dev hooks until the quest itself exists.
 */

import { QUEST_FORGOTTEN_FLAME } from '../../state/GameFlags';
import type { DialogueTarget, DialogueTree } from '../types';
import { node, state, toNode, toReturn, toState } from '../types';

/** Hand-off to the shared gossip branch, then back to this state's greeting. */
const toGossip = (): DialogueTarget => toState('gossip');

export const CAPTAIN_RENN_TREE: DialogueTree = {
  npcId: 'captain_renn',
  npcName: 'Captain Renn',
  title: 'Captain Renn — Emberwood Guard',
  defaultStateId: 'default',
  states: [
    // ---------------------------------------------------------------- default
    state('default', 'greeting', [
      node('greeting', ['State your business, stranger. We don\'t get many visitors.'], {
        choices: [
          {
            text: "I just woke up here. I don't remember anything.",
            goto: toNode('memory_lost'),
          },
          {
            text: 'I can handle myself.',
            goto: toNode('handle_myself'),
          },
          {
            text: "What's going on around here?",
            goto: toGossip(),
          },
        ],
      }),

      // Choice 1
      node('memory_lost', [
        'Is that so.',
        "You've got that look — the one people get when they've seen something they can't explain. Or *were* something they can't explain. Either way, you're awake now, and you're here.",
        'The ruins to the north have been spitting smoke for three nights now. Thought it was bandits, but my scouts came back pale as ghosts. Wouldn\'t talk about what they saw.',
        "I don't know who you are or where you came from, but if you're looking to prove yourself — or just earn some coin — check it out. There's a quest posted on the board. 'The Forgotten Flame.' Take it if you've got the steel for it.",
      ], { goto: toNode('post_quest') }),

      // Choice 2
      node('handle_myself', [
        'Can you? Most people who say that end up dead in a ditch.',
        '...But you\'ve got something. That glow in your chest — I saw it when you walked up. Don\'t know what it is, but it\'s not normal. And \'not normal\' might be exactly what we need right now.',
      ], { goto: toNode('quest_offer') }),

      // Shared quest offer, appended to both opening branches.
      node('quest_offer', [
        'The ruins to the north have been spitting smoke for three nights now. Thought it was bandits, but my scouts came back pale as ghosts. Wouldn\'t talk about what they saw.',
        "I don't know who you are or where you came from, but if you're looking to prove yourself — or just earn some coin — check it out. There's a quest posted on the board. 'The Forgotten Flame.' Take it if you've got the steel for it.",
      ], { goto: toNode('post_quest') }),

      // Posts the quest to the board (spec: "[End dialogue. Quest available on
      // Quest Board.]") and ends the conversation.
      node('post_quest', ['Board\'s by the gate. Don\'t keep me waiting.'], {
        onEnter: { type: 'questStatus', questId: QUEST_FORGOTTEN_FLAME, status: 'available' },
        goto: { kind: 'end' },
      }),
    ], {
      // First meeting, no quest accepted.
      priority: 10,
      condition: (flags) => !flags.isQuestAccepted(QUEST_FORGOTTEN_FLAME)
        && !flags.isQuestStatus(QUEST_FORGOTTEN_FLAME, 'available'),
    }),

    // -------------------------------------------------------- quest_available
    state('quest_available', 'greeting', [
      node('greeting', ["The quest is on the board. 'The Forgotten Flame.' Check the ruins north of the village. Come back when you know something."], {
        choices: [
          { text: "I'll check it out.", goto: { kind: 'end' } },
          { text: 'What should I expect out there?', goto: toGossip() },
        ],
      }),
    ], {
      priority: 20,
      condition: (flags) => flags.isQuestStatus(QUEST_FORGOTTEN_FLAME, 'available'),
    }),

    // ------------------------------------------------------ quest_main_active
    state('quest_main_active', 'greeting', [
      node('greeting', [
        "The ruins are northeast of the village — follow the forest path, you can't miss 'em. Big stone archway, half-sunk into the ground.",
        "Watch yourself. Whatever's in there, my guards wouldn't go near it.",
      ], {
        choices: [
          { text: "I'm on my way.", goto: { kind: 'end' } },
          {
            text: 'Any advice?',
            goto: toNode('advice'),
          },
        ],
      }),

      node('advice', [
        "Stay mobile. Goblins are stupid but they swarm. If you see something bigger than the others — something with a club or wearing robes — don't stand still.",
      ], { goto: { kind: 'end' } }),
    ], {
      priority: 40,
      condition: (flags) => flags.isQuestStatus(QUEST_FORGOTTEN_FLAME, 'active'),
    }),

    // ---------------------------------------------------- quest_main_complete
    state('quest_main_complete', 'greeting', [
      node('greeting', [
        'You came back alive. And... different.',
        "I've seen that fire in a fighter's eyes before. The guard could use someone like you. Come back when you're stronger — there's more happening out there than one ruined shrine.",
      ], {
        choices: [
          { text: 'What kind of work?', goto: toNode('work') },
          { text: "You said the scouts wouldn't talk. What did they see?", goto: toNode('scouts') },
          { text: "What's happening around here?", goto: toGossip() },
        ],
      }),

      node('work', [
        "Scouting. Clearing. Maybe escort duty if the roads ever open up again. Nothing glamorous. But it pays, and you'd have the guard's backing. Think about it.",
      ], { goto: { kind: 'end' } }),

      node('scouts', [
        "One of them — boy named Kell, barely eighteen — kept saying 'the fire had eyes.' Wouldn't say more. Hasn't spoken a word since.",
        "Whatever you fought in there... it wasn't just a goblin.",
      ], { goto: { kind: 'end' } }),
    ], {
      priority: 60,
      condition: (flags) => flags.isQuestStatus(QUEST_FORGOTTEN_FLAME, 'complete'),
    }),

    // ------------------------------------------------------- gossip (shared)
    // Reachable from every state via "What's happening around here?" and loops
    // back to the greeting of whichever state the player arrived from.
    state('gossip', 'greeting', [
      node('greeting', [
        "The Academy's gone silent. No messengers, no supply wagons. I've sent three riders. None returned.",
        "That place trained the greatest mages in the kingdom. If something's strong enough to cut it off from the world... we're all in more danger than anyone wants to admit.",
      ], {
        choices: [
          { text: 'What about the bridge?', goto: toNode('bridge') },
          { text: 'I should get moving.', goto: toReturn() },
        ],
      }),

      node('bridge', [
        "Collapsed. Landslide, supposedly — but it happened the same week the caravans stopped. I don't believe in coincidences.",
      ], { goto: toReturn() }),
    ], {
      // Never auto-selected as a greeting: only entered via an explicit jump.
      priority: -100,
      condition: () => false,
    }),
  ],
};
