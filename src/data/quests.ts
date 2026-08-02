export type QuestId = 'main_ley_wraith' | 'ruins_echo';

export interface QuestDef {
  id: QuestId;
  title: string;
  objective: string;
  completeText: string;
}

export const QUESTS: Record<QuestId, QuestDef> = {
  main_ley_wraith: {
    id: 'main_ley_wraith',
    title: 'The Ley Breach',
    objective: 'Outfit your party, then defeat the Ley Wraith in the southern cave.',
    completeText: 'The Ley Wraith is banished. The ley lines are calm.',
  },
  ruins_echo: {
    id: 'ruins_echo',
    title: 'Echoes Below',
    objective: 'Enter the Ruins of Echoes (southeast) and defeat the Echo Knight.',
    completeText: 'The Echo Knight is silenced. The ruins are still.',
  },
};

export function activeQuestText(state: {
  flags: Record<string, boolean>;
  dungeonCleared: boolean;
  ruinsCleared: boolean;
}): { title: string; body: string } {
  if (!state.dungeonCleared && !state.flags.quest_main_complete) {
    const q = QUESTS.main_ley_wraith;
    return { title: q.title, body: q.objective };
  }
  if (!state.ruinsCleared) {
    const q = QUESTS.ruins_echo;
    return { title: q.title, body: q.objective };
  }
  if (state.flags.game_cleared) {
    return { title: 'Seven Traditions', body: 'All threats are ended. The circle stands.' };
  }
  return {
    title: QUESTS.main_ley_wraith.title,
    body: `${QUESTS.main_ley_wraith.completeText} ${QUESTS.ruins_echo.completeText}`,
  };
}
