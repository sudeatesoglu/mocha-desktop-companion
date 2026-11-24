import type { DatabaseSync } from 'node:sqlite';
import { type ChatTurn, CONVERSATION_IDLE_MS, MAX_MEMORIES } from '@mocha/core';

/** A memory as the Tower lists it. */
export interface Memory {
  id: number;
  text: string;
  pinned: boolean;
  createdAt: number;
}

const DAY_MS = 24 * 60 * 60_000;

/**
 * Mocha's memory in mocha.db (ADR-0013): conversations, summaries, the
 * facts it remembers and the weekly insight. Times come from the caller;
 * values always go through bound parameters. What may be stored is decided
 * before it gets here (cleanMemory, cleanAnswer).
 */
export function createMemoryRepository(db: DatabaseSync) {
  const inTransaction = <T>(work: () => T): T => {
    db.exec('BEGIN');
    try {
      const result = work();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  };

  const openConversation = db.prepare(
    // Quiet for the whole idle time: that conversation has ended.
    'SELECT id FROM conversations WHERE last_message_at > ? ORDER BY last_message_at DESC LIMIT 1',
  );
  const insertConversation = db.prepare(
    'INSERT INTO conversations (started_at, last_message_at) VALUES (?, ?)',
  );
  const touchConversation = db.prepare('UPDATE conversations SET last_message_at = ? WHERE id = ?');
  const insertMessage = db.prepare(
    'INSERT INTO messages (conversation_id, role, text, created_at) VALUES (?, ?, ?, ?)',
  );
  const selectTurns = db.prepare(`
    SELECT role, text FROM (
      SELECT id, role, text FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ?
    ) ORDER BY id
  `);
  const selectUnsummarized = db.prepare(`
    SELECT id FROM conversations
    WHERE summary IS NULL AND last_message_at < ?
      AND EXISTS (SELECT 1 FROM messages WHERE conversation_id = conversations.id)
    ORDER BY last_message_at LIMIT ?
  `);
  const updateSummary = db.prepare('UPDATE conversations SET summary = ? WHERE id = ?');
  const selectSummaries = db.prepare(
    'SELECT summary FROM conversations WHERE summary IS NOT NULL ORDER BY last_message_at DESC LIMIT ?',
  );
  const insertMemory = db.prepare(
    'INSERT INTO memories (text, created_at) VALUES (?, ?) ON CONFLICT (text) DO NOTHING',
  );
  // Over the cap, the least used and longest unused go first; pinned stay.
  const trimMemories = db.prepare(`
    DELETE FROM memories WHERE id IN (
      SELECT id FROM memories WHERE pinned = 0
      ORDER BY uses, coalesce(last_used_at, created_at), id
      LIMIT max(0, (SELECT count(*) FROM memories) - ?)
    )
  `);
  const selectPinned = db.prepare(
    'SELECT id, text FROM memories WHERE pinned = 1 ORDER BY coalesce(last_used_at, created_at) DESC LIMIT ?',
  );
  const selectMatching = db.prepare(`
    SELECT memories.id, memories.text FROM memories_fts
    JOIN memories ON memories.id = memories_fts.rowid
    WHERE memories_fts MATCH ? AND memories.pinned = 0
    ORDER BY bm25(memories_fts), memories.uses DESC LIMIT ?
  `);
  const selectUseful = db.prepare(`
    SELECT id, text FROM memories WHERE pinned = 0
    ORDER BY uses DESC, coalesce(last_used_at, created_at) DESC LIMIT ?
  `);
  const markMemoryUsed = db.prepare(
    'UPDATE memories SET uses = uses + 1, last_used_at = ? WHERE id = ?',
  );
  const selectMemories = db.prepare(
    'SELECT id, text, pinned, created_at AS createdAt FROM memories ORDER BY pinned DESC, created_at DESC, id DESC',
  );
  const updateMemory = db.prepare('UPDATE memories SET text = ? WHERE id = ?');
  const updatePinned = db.prepare('UPDATE memories SET pinned = ? WHERE id = ?');
  const deleteMemory = db.prepare('DELETE FROM memories WHERE id = ?');
  const deleteOldMessages = db.prepare('DELETE FROM messages WHERE created_at < ?');
  const deleteEmptyConversations = db.prepare(`
    DELETE FROM conversations WHERE summary IS NULL
      AND NOT EXISTS (SELECT 1 FROM messages WHERE conversation_id = conversations.id)
  `);
  const upsertInsight = db.prepare(`
    INSERT INTO insights (week_start, text, created_at) VALUES (?, ?, ?)
    ON CONFLICT (week_start) DO UPDATE SET text = excluded.text, created_at = excluded.created_at
  `);
  const deleteOtherInsights = db.prepare('DELETE FROM insights WHERE week_start <> ?');
  const selectInsight = db.prepare(
    'SELECT week_start AS weekStart, text FROM insights ORDER BY week_start DESC LIMIT 1',
  );

  const asTurn = ({ role, text }: { role: string; text: string }): ChatTurn => ({
    role: role === 'user' ? 'user' : 'assistant',
    content: text,
  });

  return {
    /** The conversation still going at `now`, if any. */
    currentConversation(now: number): number | undefined {
      const row = openConversation.get(now - CONVERSATION_IDLE_MS) as { id: number } | undefined;
      return row?.id;
    },

    /** Adds a message to the conversation going on, or starts one. */
    addMessage(role: 'user' | 'mocha', text: string, now: number): number {
      return inTransaction(() => {
        const open = openConversation.get(now - CONVERSATION_IDLE_MS) as { id: number } | undefined;
        const id = open?.id ?? Number(insertConversation.run(now, now).lastInsertRowid);
        insertMessage.run(id, role, text, now);
        touchConversation.run(now, id);
        return id;
      });
    },

    /** The last `limit` turns of a conversation, oldest first. */
    turns(conversationId: number, limit: number): ChatTurn[] {
      return (selectTurns.all(conversationId, limit) as { role: string; text: string }[]).map(
        asTurn,
      );
    },

    /** Ended conversations still to be summed up, with their turns. */
    toSummarize(now: number, limit: number): { id: number; turns: ChatTurn[] }[] {
      const rows = selectUnsummarized.all(now - CONVERSATION_IDLE_MS, limit) as { id: number }[];
      return rows.map(({ id }) => ({ id, turns: this.turns(id, 200) }));
    },

    saveSummary(conversationId: number, summary: string): void {
      updateSummary.run(summary, conversationId);
    },

    /** The newest summaries first. */
    summaries(limit: number): string[] {
      return (selectSummaries.all(limit) as { summary: string }[]).map(({ summary }) => summary);
    },

    /** Keeps new facts, then drops the least used beyond the cap. */
    remember(facts: readonly string[], now: number): void {
      inTransaction(() => {
        for (const fact of facts) insertMemory.run(fact, now);
        trimMemories.run(MAX_MEMORIES);
      });
    },

    /**
     * Up to `limit` memories for a prompt: pinned ones first, then those
     * matching `query` best, then the most used. Marks them used.
     */
    recall(query: string | null, limit: number, now: number): string[] {
      const picked = new Map<number, string>();
      const add = (rows: unknown[]) => {
        for (const { id, text } of rows as { id: number; text: string }[]) {
          if (picked.size < limit) picked.set(id, text);
        }
      };
      add(selectPinned.all(limit));
      if (query) add(selectMatching.all(query, limit));
      add(selectUseful.all(limit));
      inTransaction(() => {
        for (const id of picked.keys()) markMemoryUsed.run(now, id);
      });
      return [...picked.values()];
    },

    /** Every memory, pinned first, for the Tower's list. */
    memories(): Memory[] {
      return (
        selectMemories.all() as { id: number; text: string; pinned: number; createdAt: number }[]
      ).map((row) => ({ ...row, pinned: row.pinned === 1 }));
    },

    /** False when another memory already says the same. */
    editMemory(id: number, text: string): boolean {
      try {
        updateMemory.run(text, id);
        return true;
      } catch {
        return false;
      }
    },

    pinMemory(id: number, pinned: boolean): void {
      updatePinned.run(pinned ? 1 : 0, id);
    },

    forgetMemory(id: number): void {
      deleteMemory.run(id);
    },

    /** Deletes messages older than `retentionDays`; summaries stay. */
    prune(now: number, retentionDays: number): void {
      inTransaction(() => {
        deleteOldMessages.run(now - retentionDays * DAY_MS);
        deleteEmptyConversations.run();
      });
    },

    /** Keeps the insight of the week starting at `weekStart`, and only that one. */
    saveInsight(weekStart: number, text: string, now: number): void {
      inTransaction(() => {
        upsertInsight.run(weekStart, text, now);
        deleteOtherInsights.run(weekStart);
      });
    },

    insight(): { weekStart: number; text: string } | undefined {
      return selectInsight.get() as { weekStart: number; text: string } | undefined;
    },

    /**
     * Deletes every conversation, summary, memory and insight, then
     * rewrites the file so nothing of them is left in it (ADR-0013).
     */
    forgetEverything(): void {
      inTransaction(() => {
        db.exec('DELETE FROM messages; DELETE FROM conversations;');
        db.exec('DELETE FROM memories; DELETE FROM insights;');
      });
      db.exec("INSERT INTO memories_fts (memories_fts) VALUES ('optimize')");
      db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
      db.exec('VACUUM');
      db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    },
  };
}

export type MemoryRepository = ReturnType<typeof createMemoryRepository>;
