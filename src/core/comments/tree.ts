/** What a thread needs to know of a reply to set it in place. */
export interface ThreadNode {
  id: number;
  parentId: number | null;
  /** Whether the piece's own writer wrote it. */
  byWriter: boolean;
}

/** A thread's replies, gathered under the comment each answers, in the order given. */
export class ThreadTree<T extends ThreadNode> {
  private readonly children = new Map<number, T[]>();

  constructor(replies: readonly T[]) {
    for (const reply of replies) {
      if (reply.parentId === null) continue;
      const siblings = this.children.get(reply.parentId) ?? [];
      siblings.push(reply);
      this.children.set(reply.parentId, siblings);
    }
  }

  /** The replies that answer `id` directly. */
  repliesTo(id: number): readonly T[] {
    return this.children.get(id) ?? [];
  }

  /** How many replies sit anywhere beneath `id`, and whether the piece's writer wrote any of them. */
  beneath(id: number): { replies: number; writerReplied: boolean } {
    let replies = 0;
    let writerReplied = false;
    const stack = [...this.repliesTo(id)];
    while (stack.length > 0) {
      const reply = stack.pop()!;
      replies++;
      writerReplied ||= reply.byWriter;
      stack.push(...this.repliesTo(reply.id));
    }
    return { replies, writerReplied };
  }
}
